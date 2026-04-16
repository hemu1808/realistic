import os
import uuid
import json
import base64
import asyncio
import shutil
import logging
import time
import re
import secrets
from collections import deque, OrderedDict
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("realhistic")

# ---------------------------------------------------------------------------
# Configuration (all from environment — no hardcoded secrets)
# ---------------------------------------------------------------------------
MONGO_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")
NVIDIA_API_BASE = os.environ.get("NVIDIA_API_BASE", "https://ai.api.nvidia.com/v1/genai")
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "stabilityai/stable-diffusion-xl")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
API_KEY_SECRET = os.environ.get("REALHISTIC_API_KEY", "")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_IN_MEMORY_JOBS = 1000
MAX_BATCH_CONCURRENT = 10  # semaphore limit for batch processing

# Filename sanitizer — only allow alphanumeric, dash, underscore, dot
_SAFE_FILENAME_RE = re.compile(r"[^a-zA-Z0-9._-]")

def _sanitize_filename(name: str) -> str:
    """Strip directory components and unsafe chars from a filename."""
    base = Path(name).name  # remove any path components
    return _SAFE_FILENAME_RE.sub("_", base)

# ---------------------------------------------------------------------------
# In-memory LRU job store
# ---------------------------------------------------------------------------
_in_memory_jobs: OrderedDict[str, Dict[str, Any]] = OrderedDict()
_batch_semaphore = asyncio.Semaphore(MAX_BATCH_CONCURRENT)

async def prune_old_uploads():
    """Background task to delete uploads older than 24 hours."""
    while True:
        try:
            now = time.time()
            for f in os.listdir(UPLOAD_DIR):
                fpath = os.path.join(UPLOAD_DIR, f)
                if os.path.isfile(fpath) and os.stat(fpath).st_mtime < now - 86400:
                    os.remove(fpath)
            logger.info("🧹 Uploads pruned")
        except Exception as e:
            logger.error(f"Pruning error: {e}")
        await asyncio.sleep(21600)  # Every 6 hours


def _write_file(path: str, data: bytes):
    """Write bytes to file with proper resource handling."""
    with open(path, "wb") as f:
        f.write(data)

async def _download_model(url: str, dest: str):
    """Download AI models natively if they don't exist."""
    if not os.path.exists(dest):
        logger.info(f"Downloading model {url} to {dest}...")
        try:
            async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
                async with client.stream("GET", url) as response:
                    response.raise_for_status()
                    with open(dest, "wb") as f:
                        async for chunk in response.aiter_bytes():
                            f.write(chunk)
            logger.info(f"Model downloaded: {dest}")
        except Exception as e:
            logger.error(f"Failed to download model {url}: {e}")


# ---------------------------------------------------------------------------
# Lifespan – gracefully degrade if MongoDB/Redis are missing
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- MongoDB ---
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=3000)
        await client.admin.command("ping")
        app.state.db_client = client
        app.state.db = client.realhistic_db
        app.state.mongo_ok = True
        logger.info("✅ MongoDB connected")
    except Exception as e:
        app.state.db_client = None
        app.state.db = None
        app.state.mongo_ok = False
        logger.warning(f"⚠️  MongoDB unavailable ({e}). Using in-memory job store.")

    # --- Redis / ARQ ---
    try:
        from arq import create_pool
        from arq.connections import RedisSettings
        app.state.redis = await create_pool(RedisSettings())
        app.state.redis_ok = True
        logger.info("✅ Redis connected")
    except Exception as e:
        app.state.redis = None
        app.state.redis_ok = False
        logger.warning(f"⚠️  Redis unavailable ({e}). Jobs will run in-process.")

    # --- NVIDIA API ---
    if NVIDIA_API_KEY:
        logger.info("✅ NVIDIA API key loaded")
        app.state.nvidia_ok = True
    else:
        logger.warning("⚠️  NVIDIA_API_KEY not set. AI jobs will return source image.")
        app.state.nvidia_ok = False

    app.state.prune_task = asyncio.create_task(prune_old_uploads())
    
    # Download FSRCNN models for Upscale node
    app.state.dl_task_1 = asyncio.create_task(_download_model(
        "https://github.com/Saafke/FSRCNN_Tensorflow/raw/master/models/FSRCNN_x2.pb", 
        os.path.join(MODELS_DIR, "FSRCNN_x2.pb")
    ))
    app.state.dl_task_2 = asyncio.create_task(_download_model(
        "https://github.com/Saafke/FSRCNN_Tensorflow/raw/master/models/FSRCNN_x4.pb", 
        os.path.join(MODELS_DIR, "FSRCNN_x4.pb")
    ))
    
    yield
    app.state.prune_task.cancel()

    # Shutdown
    if app.state.db_client:
        app.state.db_client.close()


def verify_api_key(request: Request):
    """Check X-API-Key header only — no query params to avoid leaking secrets in logs."""
    if not API_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server API key not configured. Set REALHISTIC_API_KEY env var.",
        )
    key = request.headers.get("X-API-Key")
    if not key or key != API_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
    return key


# Stream tokens: short-lived opaque tokens for SSE endpoints (avoids API key in query params)
_stream_tokens: Dict[str, str] = {}  # token -> job_id

def _create_stream_token(job_id: str) -> str:
    """Create a one-time stream token tied to a specific job."""
    token = secrets.token_urlsafe(32)
    _stream_tokens[token] = job_id
    return token

def _verify_stream_token(token: str, job_id: str) -> bool:
    """Verify a stream token matches the expected job_id."""
    return _stream_tokens.get(token) == job_id


app = FastAPI(title="Realhistic AI Processing API", lifespan=lifespan)
# Static files are public, but filenames are randomized UUIDs
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS — allow configured frontend + common dev ports
_cors_origins = [o.strip() for o in FRONTEND_URL.split(",") if o.strip()]
if "http://localhost:3000" not in _cors_origins:
    _cors_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers – abstract away Mongo vs in-memory
# ---------------------------------------------------------------------------
async def _save_job(job: Dict[str, Any]):
    if app.state.mongo_ok:
        await app.state.db.jobs.insert_one(job.copy())
    else:
        # LRU Logic: remove oldest if full
        if len(_in_memory_jobs) >= MAX_IN_MEMORY_JOBS:
            _in_memory_jobs.popitem(last=False)
        _in_memory_jobs[job["_id"]] = job


async def _get_job(job_id: str) -> Optional[Dict[str, Any]]:
    if app.state.mongo_ok:
        return await app.state.db.jobs.find_one({"_id": job_id})
    return _in_memory_jobs.get(job_id)


async def _update_job(job_id: str, update: Dict[str, Any]):
    if app.state.mongo_ok:
        await app.state.db.jobs.update_one({"_id": job_id}, {"$set": update})
    else:
        if job_id in _in_memory_jobs:
            _in_memory_jobs[job_id].update(update)


async def _list_jobs(limit: int = 100) -> List[Dict[str, Any]]:
    if app.state.mongo_ok:
        cursor = app.state.db.jobs.find(
            {},
            {"_id": 1, "status": 1, "preset_id": 1, "created_at": 1,
             "execution_order": 1, "result_image_url": 1, "duration_seconds": 1}
        ).sort("created_at", -1).limit(limit)
        jobs = await cursor.to_list(length=limit)
        for j in jobs:
            j["id"] = str(j.get("_id", ""))
        return jobs
    else:
        all_jobs = list(_in_memory_jobs.values())
        all_jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return [
            {
                "id": j["_id"],
                "status": j.get("status", "unknown"),
                "preset_id": j.get("preset_id", ""),
                "created_at": j.get("created_at", ""),
                "execution_order": j.get("execution_order", []),
                "result_image_url": j.get("result_image_url"),
                "duration_seconds": j.get("duration_seconds"),
            }
            for j in all_jobs[:limit]
        ]


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------
class NodeModel(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]

class EdgeModel(BaseModel):
    id: str
    source: str
    target: str

class WorkflowRequest(BaseModel):
    nodes: List[NodeModel]
    edges: List[EdgeModel]

# ---------------------------------------------------------------------------
# Style Presets Registry
# ---------------------------------------------------------------------------
STYLE_PRESETS: Dict[str, Dict[str, str]] = {
    "neon-cyberpunk": {
        "label": "Neon Cyberpunk",
        "prompt": "Neon Cyberpunk city aesthetic, high detail, masterpiece",
        "a_prompt": "best quality, extremely detailed, neon lights, rain reflections",
        "n_prompt": "lowres, bad anatomy, bad hands, missing fingers",
    },
    "night-vision": {
        "label": "Night Vision",
        "prompt": "change scene to Night vision green phosphor goggles view, tactical, high contrast, grainy, glowing green elements",
        "a_prompt": "change scene to Night vision green phosphor goggles view, tactical, high contrast, grainy, glowing green elements",
        "n_prompt": "change scene to bright daylight, normal camera view, clear image, no green tint, no grainy, no tactical",
    },
    "studio-ghibli": {
        "label": "Studio Ghibli",
        "prompt": "Studio Ghibli anime art style, lush landscapes, dreamy atmosphere",
        "a_prompt": "best quality, hand-painted, soft lighting, whimsical",
        "n_prompt": "photorealistic, 3d render, lowres",
    },
    "oil-painting": {
        "label": "Oil Painting",
        "prompt": "Classical oil painting on canvas, rich brushstrokes, museum quality",
        "a_prompt": "best quality, impasto technique, dramatic chiaroscuro",
        "n_prompt": "digital art, flat colors, lowres",
    },
    "watercolor": {
        "label": "Watercolor",
        "prompt": "Delicate watercolor painting, soft washes, paper texture visible",
        "a_prompt": "best quality, transparent layers, subtle color bleeding",
        "n_prompt": "digital art, hard edges, photorealistic",
    },
    "pixel-art": {
        "label": "Pixel Art",
        "prompt": "Retro pixel art style, 16-bit graphics, limited palette",
        "a_prompt": "crisp pixels, dithering, nostalgic video game aesthetic",
        "n_prompt": "smooth gradients, photorealistic, high resolution",
    },
    "dark-fantasy": {
        "label": "Dark Fantasy",
        "prompt": "Dark fantasy art, gothic atmosphere, dramatic lighting",
        "a_prompt": "best quality, extremely detailed, moody, ominous",
        "n_prompt": "bright colors, cheerful, lowres",
    },
    "vaporwave": {
        "label": "Vaporwave",
        "prompt": "Vaporwave aesthetic, pastel gradients, retro 80s, Greek statues",
        "a_prompt": "best quality, glitch effects, sunset palette, chrome",
        "n_prompt": "realistic, natural colors, lowres",
    },
    "cinematic": {
        "label": "Cinematic",
        "prompt": "Cinematic film still, anamorphic lens, color graded, moody",
        "a_prompt": "best quality, depth of field, volumetric lighting, 35mm film",
        "n_prompt": "flat lighting, amateur, lowres",
    },
    "comic-book": {
        "label": "Comic Book",
        "prompt": "Bold comic book illustration, heavy ink outlines, halftone dots",
        "a_prompt": "best quality, dynamic perspective, vibrant colors, action scene",
        "n_prompt": "photorealistic, soft edges, lowres",
    },
    "photorealistic": {
        "label": "Photorealistic",
        "prompt": "Ultra photorealistic, 8K, shot on Canon EOS R5, natural lighting",
        "a_prompt": "best quality, extremely detailed, sharp focus, HDR",
        "n_prompt": "illustration, painting, cartoon, lowres",
    },
    "art-deco": {
        "label": "Art Deco",
        "prompt": "Art Deco style, geometric patterns, gold and black, 1920s glamour",
        "a_prompt": "best quality, symmetrical, elegant, ornate details",
        "n_prompt": "modern, minimalist, lowres",
    },
    "ukiyo-e": {
        "label": "Ukiyo-e",
        "prompt": "Traditional Japanese ukiyo-e woodblock print, flat colors, nature",
        "a_prompt": "best quality, flowing lines, wave patterns, cherry blossoms",
        "n_prompt": "photorealistic, 3d render, lowres",
    },
    "synthwave": {
        "label": "Synthwave",
        "prompt": "Synthwave retro-futuristic, neon grid, sunset horizon, chrome",
        "a_prompt": "best quality, glowing neon, purple and cyan palette",
        "n_prompt": "natural, realistic, daylight, lowres",
    },
    "low-poly": {
        "label": "Low Poly",
        "prompt": "Low-poly 3D art style, geometric facets, vibrant flat shading",
        "a_prompt": "best quality, triangular mesh, minimalist, modern",
        "n_prompt": "photorealistic, smooth surfaces, lowres",
    },
    "pencil-sketch": {
        "label": "Pencil Sketch",
        "prompt": "Detailed pencil sketch on paper, graphite shading, realistic",
        "a_prompt": "best quality, cross-hatching, fine line work, textured paper",
        "n_prompt": "color, digital art, lowres",
    },
    "steampunk": {
        "label": "Steampunk",
        "prompt": "Steampunk mechanical world, brass gears, Victorian sci-fi",
        "a_prompt": "best quality, intricate machinery, copper tones, fog",
        "n_prompt": "modern, clean, minimalist, lowres",
    },
    "pop-art": {
        "label": "Pop Art",
        "prompt": "Andy Warhol pop art style, bold primary colors, Ben-Day dots",
        "a_prompt": "best quality, screen-printing effect, iconic, high contrast",
        "n_prompt": "photorealistic, subtle colors, lowres",
    },
    "isometric": {
        "label": "Isometric",
        "prompt": "Isometric 3D illustration, miniature diorama, clean lines",
        "a_prompt": "best quality, precise geometry, pastel palette, cozy",
        "n_prompt": "perspective, photorealistic, lowres",
    },
    "noir": {
        "label": "Film Noir",
        "prompt": "Film noir style, high contrast black and white, dramatic shadows",
        "a_prompt": "best quality, venetian blinds, cigarette smoke, mystery",
        "n_prompt": "color, bright, cheerful, lowres",
    },
    "impressionist": {
        "label": "Impressionist",
        "prompt": "Impressionist painting, visible brushstrokes, light and color study",
        "a_prompt": "best quality, en plein air, soft focus, golden hour",
        "n_prompt": "sharp edges, photorealistic, digital, lowres",
    },
}

# ---------------------------------------------------------------------------
# Topological Sort (using deque for O(1) popleft)
# ---------------------------------------------------------------------------
def topological_sort(nodes: List[NodeModel], edges: List[EdgeModel]) -> List[NodeModel]:
    adj_list = {node.id: [] for node in nodes}
    in_degree = {node.id: 0 for node in nodes}
    node_lookup = {node.id: node for node in nodes}

    for edge in edges:
        if edge.source in adj_list and edge.target in in_degree:
            adj_list[edge.source].append(edge.target)
            in_degree[edge.target] += 1

    queue = deque(node_id for node_id, degree in in_degree.items() if degree == 0)
    sorted_nodes: List[NodeModel] = []

    while queue:
        current = queue.popleft()
        sorted_nodes.append(node_lookup[current])
        for neighbor in adj_list[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(sorted_nodes) != len(nodes):
        raise HTTPException(status_code=400, detail="Cycle detected in node graph.")
    return sorted_nodes


# ---------------------------------------------------------------------------
# Night Vision — local PIL img2img filter
# ---------------------------------------------------------------------------
def _apply_night_vision(image_path: str) -> str:
    """Apply a realistic green phosphor night-vision effect to the source image."""
    import numpy as np
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            # 1. Convert to grayscale for luminance
            gray = ImageOps.grayscale(img)
            # 2. Boost contrast heavily
            gray = ImageEnhance.Contrast(gray).enhance(1.8)
            gray = ImageEnhance.Brightness(gray).enhance(1.3)
            # 3. Tint green (map grayscale to green channel)
            arr = np.array(gray)
            green_img = np.zeros((*arr.shape, 3), dtype=np.uint8)
            green_img[:, :, 0] = (arr * 0.05).astype(np.uint8)   # very faint red
            green_img[:, :, 1] = (arr * 0.95).astype(np.uint8)   # strong green
            green_img[:, :, 2] = (arr * 0.08).astype(np.uint8)   # very faint blue
            processed = Image.fromarray(green_img)
            # 4. Add slight noise for film grain
            noise = np.random.randint(0, 20, arr.shape, dtype=np.uint8)
            noise_green = np.zeros((*arr.shape, 3), dtype=np.uint8)
            noise_green[:, :, 1] = noise
            noise_img = Image.fromarray(noise_green)
            from PIL import ImageChops
            processed = ImageChops.add(processed, noise_img)
            # 5. Slight vignette (darken edges)
            processed = ImageEnhance.Sharpness(processed).enhance(1.5)
            out_filename = f"{uuid.uuid4()}_nightvision.png"
            out_path = os.path.join(UPLOAD_DIR, out_filename)
            processed.save(out_path)
            return out_path
    except Exception as e:
        logger.error(f"Night vision filter error: {e}")
        return image_path


async def _apply_night_vision_async(image_path: str) -> str:
    """Run the night vision filter in a thread."""
    return await asyncio.to_thread(_apply_night_vision, image_path)

# ---------------------------------------------------------------------------
# Traditional CV Utilities
# ---------------------------------------------------------------------------
def _apply_auto_adjust_cv(image_path: str, intensity: float = 1.0) -> str:
    """Apply Auto-Adjust using CLAHE, Gray World White Balance, and Gamma Correction."""
    import cv2
    import numpy as np
    import math
    try:
        img = cv2.imread(image_path)
        if img is None:
            return image_path
            
        # 1. Gray World White Balance
        result = img.astype(np.float32)
        avg_b = np.mean(result[:, :, 0])
        avg_g = np.mean(result[:, :, 1])
        avg_r = np.mean(result[:, :, 2])
        avg_gray = (avg_b + avg_g + avg_r) / 3
        
        # Scale channels
        if avg_b > 0 and avg_g > 0 and avg_r > 0:
            result[:, :, 0] = result[:, :, 0] * (avg_gray / avg_b)
            result[:, :, 1] = result[:, :, 1] * (avg_gray / avg_g)
            result[:, :, 2] = result[:, :, 2] * (avg_gray / avg_r)
        
        result = np.clip(result, 0, 255).astype(np.uint8)

        # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization) on LAB space
        lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        
        clahe = cv2.createCLAHE(clipLimit=2.0 * intensity, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)
        
        # Blend original L and CLAHE L based on intensity
        blended_l = cv2.addWeighted(l_channel, 1.0 - intensity, cl, intensity, 0)
        
        merged_lab = cv2.merge((blended_l, a_channel, b_channel))
        result = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)
        
        # 3. Gamma Correction
        mid = 127.5
        mean_brightness = np.mean(result)
        if mean_brightness > 10:
            gamma = math.log(mid * 255.0) / math.log(mean_brightness * 255.0)
            gamma = np.clip(gamma, 0.5, 2.0)
            target_gamma = 1.0 + (gamma - 1.0) * intensity
            
            lookUpTable = np.empty((1,256), np.uint8)
            for i in range(256):
                lookUpTable[0,i] = np.clip(pow(i / 255.0, target_gamma) * 255.0, 0, 255)
            result = cv2.LUT(result, lookUpTable)

        out_filename = f"{uuid.uuid4()}_autocv.png"
        out_path = os.path.join(UPLOAD_DIR, out_filename)
        cv2.imwrite(out_path, result)
        return out_path
    except Exception as e:
        logger.error(f"Auto-adjust CV filter error: {e}")
        return image_path

async def _apply_auto_adjust_cv_async(image_path: str, intensity: float) -> str:
    return await asyncio.to_thread(_apply_auto_adjust_cv, image_path, intensity)

def _apply_rl_agent_inference(image_path: str) -> str:
    """Uses the Trained PPO Agent to figure out the best intensity/gamma/luma"""
    import cv2
    import numpy as np
    try:
        from stable_baselines3 import PPO
    except ImportError:
        logger.warning("Agent missing (stable_baselines3 absent). Falling back.")
        return _apply_auto_adjust_cv(image_path, 1.0)
        
    try:
        model_path = os.path.join(os.path.dirname(__file__), "models", "rl_agents", "ppo_retoucher")
        if not os.path.exists(model_path + ".zip"):
            logger.warning(f"Trained Agent missing at {model_path}! Fallback to base parameters.")
            clahe_intensity, gamma_shift, luma_shift = 1.0, 0.05, 0.05
        else:
            model = PPO.load(model_path, device="cpu")
            img = cv2.imread(image_path)
            if img is None: return image_path
            
            # Construct Gym Observation (768 length array)
            hist_b = cv2.calcHist([img], [0], None, [256], [0, 256])
            hist_g = cv2.calcHist([img], [1], None, [256], [0, 256])
            hist_r = cv2.calcHist([img], [2], None, [256], [0, 256])
            obs = np.concatenate([hist_b, hist_g, hist_r]).flatten()
            obs = obs / (obs.sum() + 1e-8)
            obs = obs.astype(np.float32)
            
            action, _ = model.predict(obs, deterministic=True)
            clahe_intensity, gamma_shift, luma_shift = action
        
        logger.info(f"RL Agent -> CLAHE: {clahe_intensity:.2f}, Gamma: {gamma_shift:.2f}, Luma: {luma_shift:.2f}")
        
        img = cv2.imread(image_path)
        if img is None: return image_path
        
        # apply luma drift safely
        img_float = img.astype(np.float32) / 255.0
        img_float = np.clip(img_float + luma_shift, 0, 1)
        
        # apply gamma shift explicitly
        img_float = np.power(img_float, 1.0 - gamma_shift)
        img_res = np.clip(img_float * 255.0, 0, 255).astype(np.uint8)
        
        # apply CLAHE via spatial luma
        lab = cv2.cvtColor(img_res, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=max(0.1, float(clahe_intensity)), tileGridSize=(8, 8))
        cl = clahe.apply(l)
        merged = cv2.merge((cl, a, b))
        final = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
        
        out_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_agent_tuned.png")
        cv2.imwrite(out_path, final)
        return out_path
    
    except Exception as e:
        logger.error(f"Agent Inference Error: {e}")
        return image_path

def _apply_super_resolution(image_path: str, scale: int) -> str:
    """Uses OpenCV DNN Super-Resolution. Fallback to normal resize if model fails."""
    import cv2
    try:
        from cv2 import dnn_superres
    except ImportError:
        logger.warning("opencv-contrib-python not found. Falling back to PIL resize.")
        return image_path
    
    try:
        img = cv2.imread(image_path)
        if img is None: return image_path
        
        target_scale = 4 if scale > 2 else 2
        model_path = os.path.join(MODELS_DIR, f"FSRCNN_x{target_scale}.pb")
        
        if not os.path.exists(model_path):
            logger.warning(f"SuperRes model not found at {model_path}. Fallback.")
            return image_path
            
        sr = dnn_superres.DnnSuperResImpl_create()
        sr.readModel(model_path)
        sr.setModel("fsrcnn", target_scale)
        
        result = sr.upsample(img)
        
        if scale == 8:
            result = cv2.resize(result, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
            
        out_filename = f"{uuid.uuid4()}_ai_upscale.png"
        out_path = os.path.join(UPLOAD_DIR, out_filename)
        cv2.imwrite(out_path, result)
        return out_path
    except Exception as e:
        logger.error(f"SuperRes error: {e}")
        return image_path

def _apply_denoise(image_path: str, intensity: str) -> str:
    import cv2
    try:
        img = cv2.imread(image_path)
        if img is None: return image_path
        
        h_val = 5 if intensity == "Light" else (15 if intensity == "Heavy" else 10)
        result = cv2.fastNlMeansDenoisingColored(img, None, h=h_val, hColor=h_val, templateWindowSize=7, searchWindowSize=21)
        
        out_filename = f"{uuid.uuid4()}_denoise.png"
        out_path = os.path.join(UPLOAD_DIR, out_filename)
        cv2.imwrite(out_path, result)
        return out_path
    except Exception as e:
        logger.error(f"Denoise error: {e}")
        return image_path

def _apply_detail_enhance(image_path: str, amount: float) -> str:
    import cv2
    try:
        img = cv2.imread(image_path)
        if img is None: return image_path
        
        sigma_s = 5 + (amount * 20)
        sigma_r = 0.05 + (amount * 0.25)
        
        result = cv2.detailEnhance(img, sigma_s=sigma_s, sigma_r=sigma_r)
        
        out_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_detail.png")
        cv2.imwrite(out_path, result)
        return out_path
    except Exception as e:
        logger.error(f"Detail enhance error: {e}")
        return image_path

def _apply_color_grading(image_path: str, profile: str) -> str:
    import cv2
    import numpy as np
    try:
        img = cv2.imread(image_path).astype(np.float32) / 255.0
        
        b, g, r = cv2.split(img)
        luma = (0.2126 * r) + (0.7152 * g) + (0.0722 * b)
        
        if profile == "Teal & Orange":
            r = r + (luma * 0.15)
            b = b + ((1.0 - luma) * 0.2)
            g = g + ((1.0 - luma) * 0.1)
        elif profile == "Moody Film":
            r = r * 0.9 + 0.05
            g = g * 0.95 + 0.05 + ((1.0 - luma) * 0.05)
            b = b * 0.85 + 0.1
        elif profile == "Cyberpunk":
            r = np.clip((r - 0.5) * 1.2 + 0.5 + 0.1, 0, 1)
            b = np.clip((b - 0.5) * 1.2 + 0.5 + 0.15, 0, 1)
            g = g * 0.9
        elif profile == "Vintage":
            r = r * 0.9 + 0.1
            g = g * 0.85 + 0.1
            b = b * 0.7 + 0.05
            
        result = cv2.merge((b, g, r))
        result = np.clip(result * 255.0, 0, 255).astype(np.uint8)
        
        out_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_grading.png")
        cv2.imwrite(out_path, result)
        return out_path
    except Exception as e:
        logger.error(f"Color grading error: {e}")
        return image_path

async def _apply_super_resolution_async(image_path: str, scale: int) -> str:
    return await asyncio.to_thread(_apply_super_resolution, image_path, scale)

async def _apply_denoise_async(image_path: str, intensity: str) -> str:
    return await asyncio.to_thread(_apply_denoise, image_path, intensity)

async def _apply_detail_enhance_async(image_path: str, amount: float) -> str:
    return await asyncio.to_thread(_apply_detail_enhance, image_path, amount)

async def _apply_color_grading_async(image_path: str, profile: str) -> str:
    return await asyncio.to_thread(_apply_color_grading, image_path, profile)

async def _apply_rl_agent_inference_async(image_path: str) -> str:
    return await asyncio.to_thread(_apply_rl_agent_inference, image_path)



# ---------------------------------------------------------------------------
# NVIDIA API Call (txt2img only for Flux)
# ---------------------------------------------------------------------------
async def _call_nvidia_api(image_url: Optional[str], preset_id: str, base_url: str) -> Optional[str]:
    """Call NVIDIA API for text-to-image generation.
    For presets that need img2img (like night-vision), the caller should
    use the local PIL filter instead."""
    if not NVIDIA_API_KEY:
        logger.warning("NVIDIA_API_KEY not set — returning source image.")
        return image_url

    preset = STYLE_PRESETS.get(preset_id, STYLE_PRESETS["neon-cyberpunk"])
    is_flux = "flux" in NVIDIA_MODEL.lower()

    if is_flux:
        combined_prompt = f"{preset['prompt']}. {preset['a_prompt']}"
        full_payload: Dict[str, Any] = {
            "text_prompts": [{"text": combined_prompt}],
            "steps": 4,
            "seed": 0,
        }
    else:
        full_payload = {
            "text_prompts": [
                {"text": f"{preset['prompt']}, {preset['a_prompt']}", "weight": 1.0},
                {"text": preset["n_prompt"], "weight": -1.0},
            ],
            "cfg_scale": 7.5,
            "steps": 30,
            "seed": 0,
            "sampler": "K_DPM_2_ANCESTRAL",
        }

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    url = f"{NVIDIA_API_BASE}/{NVIDIA_MODEL}"

    async def _fire(pl: Dict, retries: int = 3) -> Optional[str]:
        wait = 2.0
        for i in range(retries):
            try:
                async with httpx.AsyncClient(timeout=240.0) as client:
                    resp = await client.post(url, headers=headers, json=pl)
                    if resp.status_code == 200:
                        arts = resp.json().get("artifacts", [])
                        if arts and arts[0].get("finishReason") == "SUCCESS":
                            b64 = arts[0]["base64"]
                            fname = f"{uuid.uuid4()}_ai.png"
                            fpath = os.path.join(UPLOAD_DIR, fname)
                            await asyncio.to_thread(_write_file, fpath, base64.b64decode(b64))
                            return f"{base_url}/uploads/{fname}"
                    else:
                        logger.error(f"NVIDIA API FAIL ({resp.status_code}): {resp.text}")
                        if resp.status_code >= 500:
                            logger.warning("Server error, retrying...")
                        else:
                            break
            except Exception as e:
                logger.error(f"NVIDIA retry {i+1} failed: {e}")
            await asyncio.sleep(wait)
            wait *= 2
        return None

    try:
        result = await _fire(full_payload)
        if result:
            return result
    except Exception as e:
        logger.error(f"NVIDIA API error: {e}")

    return image_url  # ultimate fallback


# ---------------------------------------------------------------------------
# Image Processing Filters (Pillow)
# ---------------------------------------------------------------------------
def _sync_process(image_path: str, node_type: str, data: Dict[str, Any]) -> str:
    """Clamped procedural logic for PIL."""
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            processed = img

            clamp = lambda v, min_v, max_v: max(min_v, min(v, max_v))

            if node_type == "blur":
                processed = img.filter(ImageFilter.GaussianBlur(radius=clamp(float(data.get("blur", 5)), 0, 50)))

            elif node_type == "colorAdjust":
                br = clamp(float(data.get("brightness", 1)), 0, 5)
                ct = clamp(float(data.get("contrast", 1)), 0, 5)
                st = clamp(float(data.get("saturation", 1)), 0, 5)
                sh = clamp(float(data.get("sharpness", 1)), 0, 5)

                processed = ImageEnhance.Brightness(processed).enhance(br)
                processed = ImageEnhance.Contrast(processed).enhance(ct)
                processed = ImageEnhance.Color(processed).enhance(st)
                processed = ImageEnhance.Sharpness(processed).enhance(sh)

            elif node_type == "grayscale":
                processed = ImageOps.grayscale(img).convert("RGB")

            elif node_type == "sharpen":
                # Convert 0-100 frontend scale to 0.0 - 5.0 Pillow multiplier
                sh = clamp(float(data.get("amount", 50)) / 25.0, 0.0, 5.0)
                processed = ImageEnhance.Sharpness(img).enhance(sh)

            elif node_type == "resize":
                w = clamp(int(data.get("width", 512)), 16, 4096)
                h = clamp(int(data.get("height", 512)), 16, 4096)
                processed = img.resize((w, h), Image.Resampling.LANCZOS)

            out_filename = f"{uuid.uuid4()}_step_{_sanitize_filename(node_type)}.png"
            out_path = os.path.join(UPLOAD_DIR, out_filename)
            processed.save(out_path)
            return out_path
    except Exception as e:
        logger.error(f"Sync process error: {e}")
        return image_path

async def _process_image_node(image_path: str, node_type: str, data: Dict[str, Any]) -> str:
    """Run blocking PIL operations in a separate thread."""
    return await asyncio.to_thread(_sync_process, image_path, node_type, data)

# ---------------------------------------------------------------------------
# Workflow Execution Job
# ---------------------------------------------------------------------------
async def _run_workflow_job(job_id: str, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], base_url: str):
    """Execute a multi-node workflow sequentially."""
    await _update_job(job_id, {"status": "processing"})
    start = time.monotonic()

    n_models = [NodeModel(id=n["id"], type=n["type"], data=n.get("data", {})) for n in nodes]
    e_models = [EdgeModel(id=e["id"], source=e["source"], target=e["target"]) for e in edges]

    try:
        sorted_nodes = topological_sort(n_models, e_models)
        node_outputs = {} # node.id -> {"path": str, "url": str}
        final_image_url = None

        for node in sorted_nodes:
            logger.info(f"Executing node: {node.id} ({node.type})")

            # Resolve incoming edges to get the correct state for THIS specific node
            incoming_edges = [edge for edge in edges if edge["target"] == node.id]
            
            if not incoming_edges and node.type != "imageUpload":
                logger.info(f"Node {node.id} is disconnected. Skipping execution.")
                continue
                
            current_image_path = None
            current_image_url = None
            if incoming_edges:
                source_id = incoming_edges[0]["source"]
                if source_id in node_outputs:
                    current_image_path = node_outputs[source_id].get("path")
                    current_image_url = node_outputs[source_id].get("url")

            if node.type == "imageUpload":
                current_image_url = node.data.get("imageUrl")
                if current_image_url:
                    # Sanitize: only use the last path segment, stripping traversal
                    fname = _sanitize_filename(current_image_url.split("/")[-1])
                    candidate = os.path.join(UPLOAD_DIR, fname)
                    # Verify the resolved path is inside UPLOAD_DIR
                    if os.path.commonpath([os.path.realpath(candidate), os.path.realpath(UPLOAD_DIR)]) == os.path.realpath(UPLOAD_DIR):
                        current_image_path = candidate
                    else:
                        logger.warning(f"Path traversal attempt blocked: {fname}")
                        current_image_path = None

            elif node.type == "aiRelight" and current_image_url:
                preset_id = node.data.get("preset", "neon-cyberpunk")

                # Night Vision uses local PIL img2img (Flux can't do img2img)
                if preset_id == "night-vision" and current_image_path:
                    new_path = await _apply_night_vision_async(current_image_path)
                    current_image_path = new_path
                    current_image_url = f"{base_url}/uploads/{os.path.basename(new_path)}"
                    logger.info(f"Night vision filter applied → {current_image_url}")
                else:
                    result_url = await _call_nvidia_api(current_image_url, preset_id, base_url)
                    if result_url:
                        current_image_url = result_url
                        current_image_path = os.path.join(UPLOAD_DIR, result_url.split("/")[-1])

            elif node.type == "autoAdjustNode" and current_image_path:
                mode = node.data.get("mode", "traditional")
                intensity = float(node.data.get("intensity", 1.0))
                
                if mode == "traditional":
                    new_path = await _apply_auto_adjust_cv_async(current_image_path, intensity)
                    current_image_path = new_path
                    current_image_url = f"{base_url}/uploads/{os.path.basename(new_path)}"
                    logger.info(f"Traditional Auto-Adjust applied → {current_image_url}")
                elif mode == "agent":
                    new_path = await _apply_rl_agent_inference_async(current_image_path)
                    current_image_path = new_path
                    current_image_url = f"{base_url}/uploads/{os.path.basename(new_path)}"
                    logger.info(f"RL Agent Auto-Adjust applied → {current_image_url}")
                else:
                    # AI Zero-shot approach via NVIDIA
                    # Swap preset for ai mode manually
                    temp_preset = {
                        "prompt": "well-exposed photo, natural lighting, perfectly color graded, physically based rendering, high dynamic range",
                        "a_prompt": "masterpiece, highly detailed, perfect contrast, cinematic lighting",
                        "n_prompt": "overexposed, underexposed, color cast, lowres, bad lighting"
                    }
                    STYLE_PRESETS["auto_adjust_temp"] = temp_preset
                    result_url = await _call_nvidia_api(current_image_url, "auto_adjust_temp", base_url)
                    if result_url:
                        current_image_url = result_url
                        current_image_path = os.path.join(UPLOAD_DIR, result_url.split("/")[-1])
                        logger.info(f"AI Auto-Adjust applied → {current_image_url}")

            elif node.type == "dayNightNode" and current_image_path:
                mode = node.data.get("mode", "day-to-night")
                if mode == "day-to-night":
                    temp_preset = {
                        "prompt": "change scene to beautiful nighttime, moonlight, glowing windows, dark sky, stars, night photography",
                        "a_prompt": "masterpiece, detailed shadows, dramatic night lighting, moody",
                        "n_prompt": "daylight, sun, bright sky, daytime, morning"
                    }
                else:
                    temp_preset = {
                        "prompt": "change scene to bright sunny daytime, sunshine, clear blue sky, natural daylight, day photography",
                        "a_prompt": "masterpiece, well lit, morning lighting, bright and cheerful",
                        "n_prompt": "night, dark, moonlight, stars, gloomy"
                    }
                STYLE_PRESETS["day_night_temp"] = temp_preset
                result_url = await _call_nvidia_api(current_image_url, "day_night_temp", base_url)
                if result_url:
                    current_image_url = result_url
                    current_image_path = os.path.join(UPLOAD_DIR, result_url.split("/")[-1])
                    logger.info(f"Day/Night ({mode}) applied → {current_image_url}")

            elif node.type == "upscale" and current_image_path:
                scale_val = int(node.data.get("scale", 2))
                new_path = await _apply_super_resolution_async(current_image_path, scale_val)
                if new_path == current_image_path:
                    # fallback to generic pillow resize if DNN model not present
                    new_path = await _process_image_node(current_image_path, "resize", {"width": 1024, "height": 1024})
                current_image_path = new_path
                current_image_url = f"{base_url}/uploads/{os.path.basename(new_path)}"
                logger.info(f"AI Upscale ({scale_val}x) applied → {current_image_url}")

            elif node.type == "denoiseNode" and current_image_path:
                new_path = await _apply_denoise_async(current_image_path, node.data.get("intensity", "Medium"))
                current_image_path = new_path
                current_image_url = f"{base_url}/uploads/{os.path.basename(new_path)}"
                logger.info(f"Denoise applied → {current_image_url}")

            elif node.type == "detailEnhanceNode" and current_image_path:
                new_path = await _apply_detail_enhance_async(current_image_path, float(node.data.get("amount", 0.5)))
                current_image_path = new_path
                current_image_url = f"{base_url}/uploads/{os.path.basename(new_path)}"
                logger.info(f"Detail Enhance applied → {current_image_url}")

            elif node.type == "colorGradingNode" and current_image_path:
                new_path = await _apply_color_grading_async(current_image_path, node.data.get("profile", "Teal & Orange"))
                current_image_path = new_path
                current_image_url = f"{base_url}/uploads/{os.path.basename(new_path)}"
                logger.info(f"Color Grading applied → {current_image_url}")

            elif node.type == "outputNode":
                final_image_url = current_image_url

            else:
                if current_image_path:
                    new_path = await _process_image_node(current_image_path, node.type, node.data)
                    if new_path != current_image_path:
                        current_image_path = new_path
                        current_image_url = f"{base_url}/uploads/{os.path.basename(new_path)}"
                        
            node_outputs[node.id] = {
                "path": current_image_path,
                "url": current_image_url
            }

        duration = round(time.monotonic() - start, 2)
        if final_image_url:
            await _update_job(job_id, {
                "status": "completed",
                "result_image_url": final_image_url,
                "duration_seconds": duration,
            })
            logger.info(f"Workflow {job_id} completed → {final_image_url}")
        else:
            raise Exception("Workflow completed but Output node was not reached or failed to receive an image.")

    except Exception as e:
        logger.error(f"Workflow {job_id} failed: {e}")
        await _update_job(job_id, {
            "status": "failed",
            "error": str(e),
            "duration_seconds": round(time.monotonic() - start, 2),
        })


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health_check(key: str = Depends(verify_api_key)):
    return {
        "status": "ok",
        "mongodb": "connected" if app.state.mongo_ok else "unavailable (in-memory fallback)",
        "redis": "connected" if app.state.redis_ok else "unavailable (in-process fallback)",
        "nvidia": "connected" if app.state.nvidia_ok else "unavailable (no API key)",
    }


@app.get("/api/presets")
async def get_presets(key: str = Depends(verify_api_key)):
    return [
        {"id": preset_id, "label": preset["label"]}
        for preset_id, preset in STYLE_PRESETS.items()
    ]


@app.get("/api/jobs")
async def list_jobs(limit: int = 100, key: str = Depends(verify_api_key)):
    """Return execution history — real jobs from MongoDB or in-memory store."""
    jobs = await _list_jobs(limit=min(limit, 500))
    return {"jobs": jobs, "total": len(jobs)}


@app.get("/api/assets")
async def list_assets(request: Request, key: str = Depends(verify_api_key)):
    """List all uploaded files in the uploads directory."""
    base_url = str(request.base_url).rstrip("/")
    files = []
    if os.path.exists(UPLOAD_DIR):
        for f in sorted(
            os.listdir(UPLOAD_DIR),
            key=lambda x: os.path.getmtime(os.path.join(UPLOAD_DIR, x)),
            reverse=True,
        ):
            filepath = os.path.join(UPLOAD_DIR, f)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    "filename": f,
                    "url": f"{base_url}/uploads/{f}",
                    "size_bytes": stat.st_size,
                    "uploaded_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                })
    return {"assets": files, "total": len(files)}


@app.post("/api/upload")
async def upload_image(request: Request, file: UploadFile = File(...), key: str = Depends(verify_api_key)):
    # 1. Extension check
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file extension")

    # 2. MIME type check
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported MIME type: {file.content_type}")

    # 3. Size check
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 20MB)")

    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    await asyncio.to_thread(_write_file, filepath, content)

    base_url = str(request.base_url).rstrip("/")
    url = f"{base_url}/uploads/{filename}"
    return {"url": url, "filename": filename}


@app.post("/api/workflow/execute", status_code=status.HTTP_202_ACCEPTED)
async def execute_workflow(request: Request, payload: WorkflowRequest, key: str = Depends(verify_api_key)):
    sorted_nodes = topological_sort(payload.nodes, payload.edges)
    execution_order = [node.type for node in sorted_nodes]

    input_node = next((n for n in sorted_nodes if n.type == "imageUpload"), None)
    image_url = input_node.data.get("imageUrl") if input_node else None

    processor_node = next((n for n in sorted_nodes if n.type == "aiRelight"), None)
    preset_id = processor_node.data.get("preset", "neon-cyberpunk") if processor_node else "neon-cyberpunk"

    job_id = str(uuid.uuid4())
    base_url = str(request.base_url).rstrip("/")

    stream_token = _create_stream_token(job_id)

    job_doc = {
        "_id": job_id,
        "status": "pending",
        "nodes": [n.model_dump() for n in payload.nodes],
        "edges": [e.model_dump() for e in payload.edges],
        "execution_order": execution_order,
        "preset_id": preset_id,
        "result_image_url": None,
        "duration_seconds": None,
        "base_url": base_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _save_job(job_doc)

    # Run in-process (Redis queue would be used via worker.py in production)
    nodes_data = [n.model_dump() for n in payload.nodes]
    edges_data = [e.model_dump() for e in payload.edges]
    asyncio.create_task(_run_workflow_job(job_id, nodes_data, edges_data, base_url))

    return {"status": "accepted", "job_id": job_id, "stream_token": stream_token, "message": "Workflow queued."}


# ---------------------------------------------------------------------------
# Batch Processing
# ---------------------------------------------------------------------------

@app.post("/api/batch/upload")
async def batch_upload(request: Request, files: list[UploadFile] = File(...), key: str = Depends(verify_api_key)):
    """Upload up to 50 files in one request."""
    results = []
    base_url = str(request.base_url).rstrip("/")
    for file in files[:50]:
        # Validate each file
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        if file.content_type not in ALLOWED_MIME_TYPES:
            continue

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            continue

        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        await asyncio.to_thread(_write_file, filepath, content)
        results.append({
            "filename": file.filename,
            "url": f"{base_url}/uploads/{filename}",
        })
    return {"uploaded": len(results), "files": results}


class BatchExecuteRequest(BaseModel):
    image_urls: List[str]
    preset_id: str = "neon-cyberpunk"


@app.post("/api/batch/execute", status_code=status.HTTP_202_ACCEPTED)
async def batch_execute(request: Request, payload: BatchExecuteRequest, key: str = Depends(verify_api_key)):
    """Queue up to 50 images for AI processing with the same preset."""
    job_ids = []
    base_url = str(request.base_url).rstrip("/")

    async def _limited_run(jid: str, n: list, e: list, bu: str):
        async with _batch_semaphore:
            await _run_workflow_job(jid, n, e, bu)

    for url in payload.image_urls[:50]:
        job_id = str(uuid.uuid4())
        job_doc = {
            "_id": job_id,
            "status": "pending",
            "nodes": [],
            "edges": [],
            "execution_order": ["batch"],
            "preset_id": payload.preset_id,
            "source_image_url": url,
            "result_image_url": None,
            "duration_seconds": None,
            "base_url": base_url,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await _save_job(job_doc)
        mock_nodes = [{"id": "batch-src", "type": "imageUpload", "data": {"imageUrl": url}}]
        mock_edges: list = []
        asyncio.create_task(_limited_run(job_id, mock_nodes, mock_edges, base_url))
        job_ids.append(job_id)

    return {
        "status": "accepted",
        "total_jobs": len(job_ids),
        "job_ids": job_ids,
        "message": f"Queued {len(job_ids)} images for processing.",
    }


@app.get("/api/workflow/status/{job_id}")
async def get_job_status(job_id: str, key: str = Depends(verify_api_key)):
    job = await _get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job["_id"],
        "status": job["status"],
        "result_image_url": job.get("result_image_url"),
        "duration_seconds": job.get("duration_seconds"),
    }


@app.get("/api/workflow/stream/{job_id}")
async def stream_job_status(job_id: str, request: Request, token: Optional[str] = None):
    """SSE endpoint authenticated via stream_token (not the API key).
    The token is a one-time opaque value returned by execute_workflow."""
    if not token or not _verify_stream_token(token, job_id):
        raise HTTPException(status_code=401, detail="Invalid or missing stream token")

    async def event_generator():
        loops = 0
        while loops < 600:
            loops += 1
            if await request.is_disconnected():
                break
            job = await _get_job(job_id)
            if not job:
                yield {"event": "error", "data": json.dumps({"detail": "Job not found"})}
                break

            s = job.get("status")
            payload = {
                "job_id": job_id,
                "status": s,
                "result_image_url": job.get("result_image_url"),
                "duration_seconds": job.get("duration_seconds"),
            }
            yield {"event": "message", "data": json.dumps(payload)}

            if s in ["completed", "failed"]:
                # Clean up the token once the job is done
                _stream_tokens.pop(token, None)
                break

            await asyncio.sleep(1.5)

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
