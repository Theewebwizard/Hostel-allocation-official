# Intelligent Hostel Allocation System

An automated, intelligent hostel room allocation system built with NestJS (core services), React (frontend), and Python (allocation engine).

## 🏗️ Architecture

The system follows a microservices architecture:

- **Core Services (NestJS)** - Authentication, user management, hostel/room management
- **Frontend (React + React Router 7)** - Student and warden dashboards
- **Allocation Engine (Python + FastAPI)** - CSP + Bin Packing algorithm for smart allocation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### 1. Start the Database

```bash
# Using existing PostgreSQL or:
docker compose up -d
```

### 2. Start Core Services (NestJS)

```bash
cd core-services
npm install
npm run start:dev
```

The API will be available at:

- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs

### 3. Start Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend available at: http://localhost:5173 (or 5174)

### 4. Start Allocation Engine (Python)

```bash
cd allocation-engine
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

Allocation API at: http://localhost:8000

## 📁 Project Structure

```
├── core-services/          # NestJS backend
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── students/      # Student management
│   │   └── entities/      # TypeORM entities
│   └── ...
├── frontend/              # React frontend
│   ├── app/
│   │   ├── routes/        # Page components
│   │   ├── components/    # Reusable UI components
│   │   └── lib/           # API client & stores
│   └── ...
├── allocation-engine/     # Python allocation service
│   ├── app/
│   │   ├── allocation.py  # CSP + Bin Packing algorithm
│   │   └── main.py        # FastAPI server
│   └── ...
└── docker-compose.yml     # PostgreSQL setup
```

## 🔑 Features

### For Students

- Register/login with JWT auth
- Manage profile (roll number, year, gender, program)
- Create one group and invite by roll number
- Consent-based invitation flow (`pending`/`accepted`/`declined`)
- View and respond to swap requests

### For Wardens/Admin

- Manage hostels, wings, floors, and rooms
- Bulk room creation for faster setup
- Configure allocation rules (year, room type, priority, allow/deny)
- Run allocation in two modes: `group_based` and `fcfs`
- Review allocation history and per-run results
- View swap cycles and execute chain swaps

### Allocation Intelligence

- Two-stage allocation (CSP + First-Fit Decreasing bin packing)
- Gender-aware and rule-aware room eligibility filtering
- Group split fallback with proximity scoring
- Per-student happiness score in allocation results
- Allocation decision audit trail (`availableRooms`, `constraintsApplied`, `alternativesConsidered`)

## 📈 Current Delivery Status (March 2026)

### MVP Scope Progress

- Completed: core authentication, student profiles, consent-based groups, admin hostel/room/rules management, allocation engine integration, swaps, and frontend dashboards
- Partially complete: allocation approval/finalization workflow (UI placeholder exists; no dedicated finalize endpoint yet)
- Not started: notification microservice (email/SMS), RabbitMQ integration, Redis caching

Estimated MVP completion: **~82% complete**, **~18% remaining**.

### Full Roadmap Progress

The long-term plan also includes Phase 2/3 modules (maintenance, communication hub, payments, inventory, AI analytics). These are not implemented yet.

Estimated full roadmap completion: **~52% complete**, **~48% remaining**.

## 🧮 Allocation Algorithm

The system uses a two-stage hybrid algorithm:

1. **Stage 1: Constraint Satisfaction Problem (CSP)**
   - Filters valid room assignments based on rules
   - Uses python-constraint library

2. **Stage 2: Bin Packing (First-Fit Decreasing)**
   - Groups are "items", wings are "bins"
   - Maximizes group cohesion
   - Larger groups placed first

## 📚 API Documentation

Access Swagger UI at http://localhost:3000/api/docs for interactive API documentation.

### Key Endpoints

**Authentication:**

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/profile` - Get current user profile

**Students:**

- `GET /students` - List all students
- `GET /students/roll/:rollNumber` - Find by roll number

## 🛠️ Development

### Environment Variables

Core Services (`.env`):

```env
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=hostel_allocation
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
```

## 📄 License

MIT License
This is the official hostel allocation for LNMIIT
