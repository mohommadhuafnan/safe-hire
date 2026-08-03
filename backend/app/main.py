import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routes import auth, user, analyze, history, chat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("safe_hire.main")

app = FastAPI(
    title=settings.APP_NAME,
    description="SAFE-HIRE: AI-Powered Recruitment Scam Detector for Students and Job Seekers.",
    version="1.0.0"
)

# CORS middleware for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local dev frontend (http://localhost:5173 / 3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing SAFE-HIRE backend services...")
    await init_db()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "supported_languages": ["en", "si", "ta", "hi", "bn"],
        "pipeline_agents": ["IntakeAgent", "LinguisticRiskAgent", "VerificationAgent", "ReasoningAgent", "RecommendationAgent"]
    }

# Register Routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(analyze.router)
app.include_router(history.router)
app.include_router(chat.router)
