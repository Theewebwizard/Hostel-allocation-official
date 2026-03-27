from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    WARDEN = "warden"


class GenderType(str, Enum):
    MALE = "male"
    FEMALE = "female"
    COED = "co-ed"


class RoomStatus(str, Enum):
    AVAILABLE = "available"
    MAINTENANCE = "maintenance"


class Student(BaseModel):
    user_id: str
    roll_number: str
    full_name: str
    year: int
    gender: GenderType = GenderType.MALE
    program: Optional[str] = None
    application_timestamp: Optional[str] = None  # ISO format timestamp


class Group(BaseModel):
    id: int
    name: str
    creator_id: str
    members: List[Student]


class Hostel(BaseModel):
    id: int
    name: str
    gender_type: GenderType


class Room(BaseModel):
    id: int
    hostel_id: int
    room_number: str
    floor: Optional[int] = None
    wing: Optional[str] = None
    capacity: int
    room_type: str = "double"
    status: RoomStatus = RoomStatus.AVAILABLE


class AllocationRule(BaseModel):
    id: int
    hostel_id: Optional[int] = None
    year: Optional[int] = None
    room_type: Optional[str] = None
    is_allowed: bool = True
    priority: int = 0


class AllocationRequest(BaseModel):
    allocation_run_id: Optional[str] = None
    rules: List[AllocationRule]
    allocation_mode: str = "group_based"  # "group_based", "fcfs", or "wing_fcfs"


class AllocationResult(BaseModel):
    student_id: str
    room_id: int
    hostel_name: str
    room_number: str
    wing: Optional[str] = None
    floor: Optional[int] = None
    group_id: Optional[int] = None
    happiness: int = 50  # 0-100 score


class AllocationDecisionLog(BaseModel):
    student_id: str
    decision_order: int
    available_rooms: List[dict]
    constraints_applied: List[dict]
    group_id: Optional[int] = None
    group_allocation_strategy: Optional[str] = None
    selected_room_id: Optional[int] = None
    decision_reason: str
    happiness_score: int
    alternatives_considered: Optional[List[dict]] = None


class AllocationResponse(BaseModel):
    run_id: str
    status: str
    total_students: int
    allocated_students: int
    allocations: List[AllocationResult]
    decision_logs: List[AllocationDecisionLog] = []
