# Hostel Allocation Engine

This is the Python-based allocation engine that implements the CSP + Bin Packing algorithm for intelligent hostel room allocation.

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Linux/Mac
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the allocation server:

```bash
uvicorn main:app --reload --port 8000
```

## Architecture

The allocation engine uses a two-stage algorithm:

1. **Stage 1: Constraint Satisfaction Problem (CSP)** - Filters valid room assignments
2. **Stage 2: Bin Packing (FFD Heuristic)** - Optimizes group placement

## API Endpoints

- `POST /allocate` - Trigger allocation run
- `GET /allocation/{run_id}` - Get allocation results
- `GET /health` - Health check
