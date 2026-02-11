"""
ACC ClubHub - FastAPI Backend Application
Phase 4.3: Email-based event registration + subscription
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings, get_allowed_origins
from routes import events, rsvp

app = FastAPI(
    title="ACC ClubHub API",
    description="ACC (Across Cycling Club Munich) Backend Services - Event Registration System",
    version="0.4.3",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================================
# CORS Configuration
# ============================================================
# Dynamically configure CORS origins from environment variable
allowed_origins = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Health Check
# ============================================================
@app.get("/", tags=["Root"])
def read_root():
    """Root endpoint - API information"""
    return {
        "message": "Welcome to ACC ClubHub API",
        "version": "0.4.3",
        "docs": "/docs",
        "status": "operational"
    }

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for monitoring"""
    from config import is_production_mode

    health_status = {
        "status": "healthy",
        "service": "acc-clubhub-backend",
        "version": "0.4.3",
        "mode": "production" if is_production_mode() else "development"
    }

    if not is_production_mode():
        health_status["warning"] = "Running in development mode - some features may not work"

    return health_status

# ============================================================
# Route Registration
# ============================================================
# Events API - 活动管理
app.include_router(events.router, tags=["Events"])

# RSVP + Subscription API - 报名管理 + 活动订阅
app.include_router(rsvp.router, tags=["RSVP & Subscription"])

# ============================================================
# Vercel Serverless Handler
# ============================================================
# This is required for Vercel's Python runtime
handler = app

