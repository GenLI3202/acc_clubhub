"""
ACC ClubHub - FastAPI Backend Application
Phase 4.3: Email-based event registration + subscription
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

app = FastAPI(
    title="ACC ClubHub API",
    description="ACC (Across Cycling Club Munich) Backend Services - Event Registration System",
    version="0.4.3",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================================
# Try importing modules - catch and expose errors for debugging
# ============================================================
_startup_error = None

try:
    from config import settings, get_allowed_origins
    from routes import events, rsvp

    # CORS Configuration
    allowed_origins = get_allowed_origins()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Route Registration
    app.include_router(events.router, tags=["Events"])
    app.include_router(rsvp.router, tags=["RSVP & Subscription"])

except Exception as e:
    import traceback
    _startup_error = traceback.format_exc()


# ============================================================
# Endpoints
# ============================================================
@app.get("/", tags=["Root"])
def read_root():
    """Root endpoint - API information"""
    if _startup_error:
        return PlainTextResponse(
            f"STARTUP ERROR:\n\n{_startup_error}",
            status_code=500,
        )
    return {
        "message": "Welcome to ACC ClubHub API",
        "version": "0.4.3",
        "docs": "/docs",
        "status": "operational"
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for monitoring"""
    if _startup_error:
        return PlainTextResponse(
            f"STARTUP ERROR:\n\n{_startup_error}",
            status_code=500,
        )
    return {
        "status": "healthy",
        "service": "acc-clubhub-backend",
        "version": "0.4.3",
    }
