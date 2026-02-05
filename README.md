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

- Register and manage profile
- Create groups with friends
- Invite friends with consent-based approval
- View allocation results

### For Wardens

- Manage hostels, wings, and rooms
- Configure allocation rules (year, room type restrictions)
- Run allocation algorithm
- Manual override capability

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
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=hostel_allocation
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
```

## 📄 License

MIT License
This is the official hostel allocation for LNMIIT
