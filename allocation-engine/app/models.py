from pydantic import BaseModel
from typing import List, Optional, Dict
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
    OCCUPIED = "occupied"


class Student(BaseModel):
    user_id: str
    roll_number: str
    full_name: str
    year: int
    gender: GenderType = GenderType.MALE
    program: Optional[str] = None
    application_timestamp: Optional[str] = None  # ISO format timestamp
    current_room_id: Optional[int] = None
    hostel_preferences: List[int] = []



class Group(BaseModel):
    id: int
    name: str
    creator_id: str
    members: List[Student]
    group_preferences: List[int] = []



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
    match_priority: int = 0


class AllocationRule(BaseModel):
    id: int
    hostel_id: Optional[int] = None
    year: Optional[int] = None
    room_type: Optional[str] = None
    wing: Optional[str] = None
    is_allowed: bool = True
    priority: int = 0


class RoommateInvitation(BaseModel):
    id: int
    sender_id: str
    receiver_id: str
    group_id: Optional[int] = None
    status: str = "accepted"


class AllocationRequest(BaseModel):
    allocation_run_id: Optional[str] = None
    rules: List[AllocationRule]
    allocation_mode: str = "group_based"  # "group_based", "fcfs", or "wing_fcfs"
    roommate_invitations: List[RoommateInvitation] = []
    # Phased allocation fields
    locked_assignments: Dict[int, List[str]] = {}  # room_id -> [student_id, ...]
    target_years: List[int] = []      # empty = all years (no filter)
    target_programs: List[str] = []   # empty = all programs (no filter)
    # Webhook: NestJS supplies this URL so Python can push results instead of being polled
    callback_url: Optional[str] = None


class AllocationResult(BaseModel):
    student_id: str
    room_id: Optional[int] = None
    hostel_name: Optional[str] = None
    room_number: Optional[str] = None
    wing: Optional[str] = None
    floor: Optional[int] = None
    group_id: Optional[int] = None
    happiness: int = 50  # 0-100 score
    reason: Optional[str] = None


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
