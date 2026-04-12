import os
import uuid
import json
import base64
import asyncio
import shutil
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("realhistic")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MONGO_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")
NVIDIA_API_BASE = "https://ai.api.nvidia.com/v1/genai"
NVIDIA_MODEL = "stabilityai/stable-diffusion-xl"

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# In-memory fallback job store (used when MongoDB is unavailable)
# ---------------------------------------------------------------------------
_in_memory_jobs: Dict[str, Dict[str, Any]] = {}

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

    yield

    # Shutdown
    if app.state.db_client:
        app.state.db_client.close()


app = FastAPI(title="Realhistic AI Processing API", lifespan=lifespan)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3001"],
    allow_credentials=True,
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
# Topological Sort
# ---------------------------------------------------------------------------
def topological_sort(nodes: List[NodeModel], edges: List[EdgeModel]) -> List[NodeModel]:
    adj_list = {node.id: [] for node in nodes}
    in_degree = {node.id: 0 for node in nodes}
    node_lookup = {node.id: node for node in nodes}

    for edge in edges:
        if edge.source in adj_list and edge.target in in_degree:
            adj_list[edge.source].append(edge.target)
            in_degree[edge.target] += 1

    queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
    sorted_nodes = []

    while queue:
        current = queue.pop(0)
        sorted_nodes.append(node_lookup[current])
        for neighbor in adj_list[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(sorted_nodes) != len(nodes):
        raise HTTPException(status_code=400, detail="Cycle detected in node graph.")
    return sorted_nodes


# ---------------------------------------------------------------------------
# NVIDIA API Call
# ---------------------------------------------------------------------------
async def _call_nvidia_api(image_url: Optional[str], preset_id: str, base_url: str) -> Optional[str]:
    """Call NVIDIA Stable Diffusion XL API for image style transfer."""
    if not NVIDIA_API_KEY:
        logger.warning("NVIDIA_API_KEY not set — returning source image.")
        return image_url

    preset = STYLE_PRESETS.get(preset_id, STYLE_PRESETS["neon-cyberpunk"])
    full_prompt = f"{preset['prompt']}, {preset['a_prompt']}"

    payload: Dict[str, Any] = {
        "text_prompts": [
            {"text": full_prompt, "weight": 1.0},
            {"text": preset["n_prompt"], "weight": -1.0},
        ],
        "cfg_scale": 7.5,
        "steps": 30,
        "seed": 0,
        "sampler": "K_DPM_2_ANCESTRAL",
    }

    # Attempt to include source image for img2img conditioning
    if image_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as img_client:
                img_resp = await img_client.get(image_url)
                if img_resp.status_code == 200:
                    img_b64 = base64.b64encode(img_resp.content).decode()
                    payload["init_image"] = img_b64
                    payload["image_strength"] = 0.65
                    logger.info("Source image encoded for img2img")
        except Exception as e:
            logger.warning(f"Could not download source image for img2img: {e}")

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{NVIDIA_API_BASE}/{NVIDIA_MODEL}",
                headers=headers,
                json=payload,
            )

        if response.status_code == 200:
            data = response.json()
            artifacts = data.get("artifacts", [])
            if artifacts:
                artifact = artifacts[0]
                reason = artifact.get("finishReason", "")
                if reason == "SUCCESS":
                    img_b64 = artifact.get("base64", "")
                    output_filename = f"{uuid.uuid4()}_nvidia_output.png"
                    output_path = os.path.join(UPLOAD_DIR, output_filename)
                    with open(output_path, "wb") as f:
                        f.write(base64.b64decode(img_b64))
                    result_url = f"{base_url}/uploads/{output_filename}"
                    logger.info(f"NVIDIA API success → {output_filename}")
                    return result_url
                else:
                    logger.warning(f"NVIDIA artifact finish reason: {reason}")
        else:
            logger.error(f"NVIDIA API error {response.status_code}: {response.text[:400]}")

    except Exception as e:
        logger.error(f"NVIDIA API call exception: {e}")

    return image_url  # fallback to source image


# ---------------------------------------------------------------------------
# Job Runner (in-process fallback when Redis is unavailable)
# ---------------------------------------------------------------------------
async def _run_nvidia_job(job_id: str, image_url: Optional[str], preset_id: str, base_url: str):
    """Run an AI style-transfer job using the NVIDIA API."""
    await _update_job(job_id, {"status": "processing"})
    start = time.monotonic()

    try:
        result_url = await _call_nvidia_api(image_url, preset_id, base_url)
        duration = round(time.monotonic() - start, 2)

        if result_url:
            await _update_job(job_id, {
                "status": "completed",
                "result_image_url": result_url,
                "duration_seconds": duration,
            })
            logger.info(f"Job {job_id} completed in {duration}s")
        else:
            await _update_job(job_id, {
                "status": "failed",
                "error": "No result returned",
                "duration_seconds": round(time.monotonic() - start, 2),
            })
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        await _update_job(job_id, {
            "status": "failed",
            "error": str(e),
            "duration_seconds": round(time.monotonic() - start, 2),
        })


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "mongodb": "connected" if app.state.mongo_ok else "unavailable (in-memory fallback)",
        "redis": "connected" if app.state.redis_ok else "unavailable (in-process fallback)",
        "nvidia": "connected" if app.state.nvidia_ok else "unavailable (no API key)",
        "upload_dir": UPLOAD_DIR,
    }


@app.get("/api/presets")
async def get_presets():
    return [
        {"id": preset_id, "label": preset["label"]}
        for preset_id, preset in STYLE_PRESETS.items()
    ]


@app.get("/api/jobs")
async def list_jobs(limit: int = 100):
    """Return execution history — real jobs from MongoDB or in-memory store."""
    jobs = await _list_jobs(limit=limit)
    return {"jobs": jobs, "total": len(jobs)}


@app.get("/api/assets")
async def list_assets(request: Request):
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
                    "uploaded_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
    return {"assets": files, "total": len(files)}


@app.post("/api/upload")
async def upload_image(request: Request, file: UploadFile = File(...)):
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    base_url = str(request.base_url).rstrip("/")
    url = f"{base_url}/uploads/{filename}"
    return {"url": url, "filename": filename}


@app.post("/api/workflow/execute", status_code=status.HTTP_202_ACCEPTED)
async def execute_workflow(request: Request, payload: WorkflowRequest):
    sorted_nodes = topological_sort(payload.nodes, payload.edges)
    execution_order = [node.type for node in sorted_nodes]

    input_node = next((n for n in sorted_nodes if n.type == "imageUpload"), None)
    image_url = input_node.data.get("imageUrl") if input_node else None

    processor_node = next((n for n in sorted_nodes if n.type == "aiRelight"), None)
    preset_id = processor_node.data.get("preset", "neon-cyberpunk") if processor_node else "neon-cyberpunk"

    job_id = str(uuid.uuid4())
    base_url = str(request.base_url).rstrip("/")

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
        "created_at": datetime.utcnow().isoformat(),
    }
    await _save_job(job_doc)

    # Try Redis/ARQ first, otherwise run in-process
    if app.state.redis_ok:
        try:
            await app.state.redis.enqueue_job(
                "execute_nvidia_job", job_id, image_url, preset_id, base_url
            )
        except Exception as e:
            logger.warning(f"Redis enqueue failed: {e}. Running in-process.")
            asyncio.create_task(_run_nvidia_job(job_id, image_url, preset_id, base_url))
    else:
        asyncio.create_task(_run_nvidia_job(job_id, image_url, preset_id, base_url))

    return {"status": "accepted", "job_id": job_id, "message": "Workflow queued."}


# ---------------------------------------------------------------------------
# Batch Processing
# ---------------------------------------------------------------------------

@app.post("/api/batch/upload")
async def batch_upload(request: Request, files: list[UploadFile] = File(...)):
    """Upload up to 50 files in one request."""
    results = []
    base_url = str(request.base_url).rstrip("/")
    for file in files[:50]:
        filename = f"{uuid.uuid4()}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        results.append({
            "filename": file.filename,
            "url": f"{base_url}/uploads/{filename}",
        })
    return {"uploaded": len(results), "files": results}


class BatchExecuteRequest(BaseModel):
    image_urls: List[str]
    preset_id: str = "neon-cyberpunk"


@app.post("/api/batch/execute", status_code=status.HTTP_202_ACCEPTED)
async def batch_execute(request: Request, payload: BatchExecuteRequest):
    """Queue up to 50 images for AI processing with the same preset."""
    job_ids = []
    base_url = str(request.base_url).rstrip("/")
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
            "created_at": datetime.utcnow().isoformat(),
        }
        await _save_job(job_doc)
        asyncio.create_task(_run_nvidia_job(job_id, url, payload.preset_id, base_url))
        job_ids.append(job_id)

    return {
        "status": "accepted",
        "total_jobs": len(job_ids),
        "job_ids": job_ids,
        "message": f"Queued {len(job_ids)} images for processing.",
    }


@app.get("/api/workflow/status/{job_id}")
async def get_job_status(job_id: str):
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
async def stream_job_status(job_id: str, request: Request):
    async def event_generator():
        while True:
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
                break

            await asyncio.sleep(1.5)

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
