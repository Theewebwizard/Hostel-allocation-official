from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uuid
from typing import Dict, Any

from .config import get_settings
from .models import AllocationRequest, AllocationResponse, AllocationResult
from .allocation import AllocationEngine

settings = get_settings()

app = FastAPI(
    title="Hostel Allocation Engine",
    description="Python-based intelligent hostel room allocation using CSP + Bin Packing",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for allocation runs (in production, use database)
allocation_runs: Dict[str, Dict[str, Any]] = {}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "allocation-engine"}


async def fetch_data_from_core_services():
    """Fetch students, groups, hostels, and rooms from core services"""
    async with httpx.AsyncClient() as client:
        try:
            # In a real implementation, these would be actual API calls
            # For now, return empty data as placeholder
            return {
                "students": [],
                "groups": [],
                "hostels": [],
                "rooms": []
            }
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Core services unavailable: {str(e)}")


async def run_allocation_task(run_id: str, rules: list):
    """Background task to run allocation"""
    try:
        allocation_runs[run_id]["status"] = "running"
        
        # Fetch data from core services
        data = await fetch_data_from_core_services()
        
        # Create engine and run allocation
        engine = AllocationEngine(
            students=data["students"],
            groups=data["groups"],
            hostels=data["hostels"],
            rooms=data["rooms"],
            rules=rules
        )
        
        results = engine.run_allocation()
        
        allocation_runs[run_id].update({
            "status": "completed",
            "results": results,
            "total_students": len(data["students"]),
            "allocated_students": len(results)
        })
        
    except Exception as e:
        allocation_runs[run_id].update({
            "status": "failed",
            "error": str(e)
        })


@app.post("/allocate", response_model=dict)
async def trigger_allocation(request: AllocationRequest, background_tasks: BackgroundTasks):
    """
    Trigger a new allocation run
    
    This endpoint starts the allocation process in the background
    and returns a run_id to check the status
    """
    run_id = request.allocation_run_id or str(uuid.uuid4())
    
    allocation_runs[run_id] = {
        "status": "queued",
        "results": [],
        "total_students": 0,
        "allocated_students": 0
    }
    
    # Run allocation in background
    background_tasks.add_task(run_allocation_task, run_id, request.rules)
    
    return {
        "run_id": run_id,
        "status": "queued",
        "message": "Allocation process started"
    }


@app.get("/allocation/{run_id}", response_model=AllocationResponse)
async def get_allocation_result(run_id: str):
    """Get the result of an allocation run"""
    if run_id not in allocation_runs:
        raise HTTPException(status_code=404, detail="Allocation run not found")
    
    run = allocation_runs[run_id]
    
    return AllocationResponse(
        run_id=run_id,
        status=run["status"],
        total_students=run.get("total_students", 0),
        allocated_students=run.get("allocated_students", 0),
        allocations=run.get("results", [])
    )


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Hostel Allocation Engine",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
