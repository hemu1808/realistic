"""
ARQ Background Worker — Realhistic AI Orchestrator
Run with: arq worker.WorkerSettings
Requires: Redis running on localhost:6379
"""
import asyncio
import os
import base64
import time
import logging
import uuid
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("realhistic.worker")
logging.basicConfig(level=logging.INFO)

MONGO_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")
NVIDIA_API_BASE = "https://ai.api.nvidia.com/v1/genai"
NVIDIA_MODEL = "stabilityai/stable-diffusion-xl"

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

STYLE_PRESETS = {
    "neon-cyberpunk":   {"prompt": "Neon Cyberpunk city aesthetic, high detail, masterpiece",          "a_prompt": "best quality, extremely detailed, neon lights, rain reflections", "n_prompt": "lowres, bad anatomy"},
    "studio-ghibli":   {"prompt": "Studio Ghibli anime art style, lush landscapes, dreamy atmosphere", "a_prompt": "best quality, hand-painted, soft lighting, whimsical",             "n_prompt": "photorealistic, 3d render, lowres"},
    "oil-painting":    {"prompt": "Classical oil painting on canvas, rich brushstrokes",               "a_prompt": "best quality, impasto technique, dramatic chiaroscuro",            "n_prompt": "digital art, flat colors, lowres"},
    "watercolor":      {"prompt": "Delicate watercolor painting, soft washes, paper texture visible",  "a_prompt": "best quality, transparent layers",                                  "n_prompt": "digital art, hard edges, photorealistic"},
    "cinematic":       {"prompt": "Cinematic film still, anamorphic lens, color graded, moody",        "a_prompt": "best quality, depth of field, volumetric lighting, 35mm film",     "n_prompt": "flat lighting, amateur, lowres"},
    "pencil-sketch":   {"prompt": "Detailed pencil sketch on paper, graphite shading, realistic",      "a_prompt": "best quality, cross-hatching, fine line work, textured paper",     "n_prompt": "color, digital art, lowres"},
    "photorealistic":  {"prompt": "Ultra photorealistic, 8K, shot on Canon EOS R5, natural lighting",  "a_prompt": "best quality, extremely detailed, sharp focus, HDR",               "n_prompt": "illustration, painting, cartoon, lowres"},
}
# Extend with a fallback for any missing preset
_DEFAULT_PRESET = STYLE_PRESETS["neon-cyberpunk"]


async def _call_nvidia(image_url, preset_id: str, base_url: str) -> str:
    preset = STYLE_PRESETS.get(preset_id, _DEFAULT_PRESET)
    full_prompt = f"{preset['prompt']}, {preset['a_prompt']}"

    payload = {
        "text_prompts": [
            {"text": full_prompt, "weight": 1.0},
            {"text": preset["n_prompt"], "weight": -1.0},
        ],
        "cfg_scale": 7.5,
        "steps": 30,
        "seed": 0,
        "sampler": "K_DPM_2_ANCESTRAL",
    }

    if image_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as c:
                r = await c.get(image_url)
                if r.status_code == 200:
                    payload["init_image"] = base64.b64encode(r.content).decode()
                    payload["image_strength"] = 0.65
        except Exception as e:
            logger.warning(f"Could not fetch source image: {e}")

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{NVIDIA_API_BASE}/{NVIDIA_MODEL}",
            headers=headers,
            json=payload,
        )

    if response.status_code == 200:
        data = response.json()
        artifacts = data.get("artifacts", [])
        if artifacts and artifacts[0].get("finishReason") == "SUCCESS":
            img_b64 = artifacts[0]["base64"]
            filename = f"{uuid.uuid4()}_nvidia_output.png"
            path = os.path.join(UPLOAD_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(img_b64))
            return f"{base_url}/uploads/{filename}"

    logger.error(f"NVIDIA API {response.status_code}: {response.text[:300]}")
    return image_url  # fallback to source


# ---------------------------------------------------------------------------
# ARQ task function  (called by main.py via redis.enqueue_job)
# ---------------------------------------------------------------------------
async def execute_nvidia_job(ctx, job_id: str, image_url: str, preset_id: str, base_url: str):
    """ARQ worker task — NVIDIA-powered image style transfer."""
    logger.info(f"[Worker] Starting job {job_id} | preset={preset_id}")

    # Update job status in MongoDB
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    db = client.realhistic_db
    jobs = db.jobs

    await jobs.update_one({"_id": job_id}, {"$set": {"status": "processing"}})

    start = time.monotonic()
    try:
        if not NVIDIA_API_KEY:
            logger.warning("[Worker] NVIDIA_API_KEY not set — returning source image.")
            result_url = image_url
        else:
            result_url = await _call_nvidia(image_url, preset_id, base_url)

        duration = round(time.monotonic() - start, 2)
        await jobs.update_one({"_id": job_id}, {"$set": {
            "status": "completed",
            "result_image_url": result_url,
            "duration_seconds": duration,
        }})
        logger.info(f"[Worker] Job {job_id} completed in {duration}s")

    except Exception as e:
        logger.error(f"[Worker] Job {job_id} failed: {e}")
        await jobs.update_one({"_id": job_id}, {"$set": {
            "status": "failed",
            "error": str(e),
            "duration_seconds": round(time.monotonic() - start, 2),
        }})
    finally:
        client.close()


# ---------------------------------------------------------------------------
# ARQ Worker Settings
# ---------------------------------------------------------------------------
async def startup(ctx):
    logger.info("[Worker] Started — MongoDB & Redis active.")

async def shutdown(ctx):
    logger.info("[Worker] Shutting down.")

from arq.connections import RedisSettings

class WorkerSettings:
    functions = [execute_nvidia_job]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings()  # defaults: localhost:6379
    max_jobs = 10
    job_timeout = 180  # 3 min max per job
