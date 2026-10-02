"""Main FastAPI Application for FlowSentinel AI."""
from __future__ import annotations
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .config import CORS_ORIGINS
from .services.ml_engine import get_ml_engine
from .services.simulation_service import get_simulation_service
from .services.hardware_service import get_hardware_service
from .routes import (
    telemetry_router,
    simulation_router,
    hardware_router,
    training_router,
    analytics_router,
    alerts_router,
    mode_router,
    ws_router,
)
from .services.app_state import get_app_state


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load models and start default background simulation
    print("==================================================")
    print("[INFO] FlowSentinel AI BACKEND INITIALIZED")
    print("==================================================")
    ml_engine = get_ml_engine()
    sim_service = get_simulation_service()
    app_state = get_app_state()
    # Start background live simulation by default if in simulation mode
    if app_state.mode == "simulation":
        sim_service.start()
    yield
    # Shutdown: clean up background tasks and hardware connections
    sim_service.stop()
    get_hardware_service().disconnect()
    print("[INFO] FlowSentinel AI BACKEND STOPPED")


app = FastAPI(
    title="FlowSentinel AI — Industrial Chute Blockage Intelligence API",
    description="Full-stack AI monitoring, multi-sensor fusion, anomaly detection, and early warning platform.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(telemetry_router)
app.include_router(simulation_router)
app.include_router(hardware_router)
app.include_router(training_router)
app.include_router(analytics_router)
app.include_router(alerts_router)
app.include_router(mode_router)
app.include_router(ws_router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    ml_engine = get_ml_engine()
    sim_service = get_simulation_service()
    hw_service = get_hardware_service()
    app_state = get_app_state()
    return {
        "status": "healthy",
        "version": "2.0.0",
        "app_mode": app_state.mode,
        "model_source": ml_engine.model_source,
        "models_loaded": ml_engine.classifier is not None and ml_engine.anomaly_model is not None,
        "simulation_running": sim_service.running,
        "hardware_connected": hw_service.is_connected,
        "hardware_port": hw_service.port,
    }



# Static Frontend Distribution Mount (if built)
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
