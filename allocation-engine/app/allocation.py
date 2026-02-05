"""
Two-Stage Allocation Algorithm

Stage 1: Constraint Satisfaction Problem (CSP)
- Uses python-constraint to filter valid room assignments for each student

Stage 2: Bin Packing with First-Fit Decreasing (FFD)
- Optimizes group placement to maximize cohesion
"""

from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from collections import defaultdict
from constraint import Problem, AllDifferentConstraint

from .models import Student, Group, Room, Hostel, AllocationRule, AllocationResult


@dataclass
class Wing:
    """Represents a wing in a hostel with its available capacity"""
    hostel_id: int
    hostel_name: str
    wing_name: str
    floor: int
    rooms: List[Room]
    available_beds: int


@dataclass
class AllocationState:
    """Tracks the current state of allocation"""
    wing_capacities: Dict[str, int]  # wing_key -> available beds
    room_assignments: Dict[int, List[str]]  # room_id -> list of student_ids
    student_allocations: Dict[str, int]  # student_id -> room_id


class AllocationEngine:
    def __init__(
        self,
        students: List[Student],
        groups: List[Group],
        hostels: List[Hostel],
        rooms: List[Room],
        rules: List[AllocationRule]
    ):
        self.students = {s.user_id: s for s in students}
        self.groups = groups
        self.hostels = {h.id: h for h in hostels}
        self.rooms = {r.id: r for r in rooms}
        self.rules = rules
        
        # Build wing structure
        self.wings = self._build_wings(rooms)
        
    def _build_wings(self, rooms: List[Room]) -> Dict[str, Wing]:
        """Organize rooms into wings"""
        wing_rooms: Dict[str, List[Room]] = defaultdict(list)
        
        for room in rooms:
            if room.status.value == "available":
                wing_key = f"{room.hostel_id}_{room.wing or 'main'}_{room.floor or 0}"
                wing_rooms[wing_key].append(room)
        
        wings = {}
        for wing_key, rooms_list in wing_rooms.items():
            hostel_id, wing_name, floor = wing_key.split("_")
            hostel = self.hostels.get(int(hostel_id))
            
            wings[wing_key] = Wing(
                hostel_id=int(hostel_id),
                hostel_name=hostel.name if hostel else "Unknown",
                wing_name=wing_name,
                floor=int(floor),
                rooms=rooms_list,
                available_beds=sum(r.capacity for r in rooms_list)
            )
        
        return wings
    
    def _get_valid_rooms_for_student(self, student: Student) -> List[Room]:
        """
        Stage 1: CSP - Filter valid rooms for a student based on rules
        """
        valid_rooms = []
        
        for room in self.rooms.values():
            if room.status.value != "available":
                continue
                
            hostel = self.hostels.get(room.hostel_id)
            if not hostel:
                continue
            
            # Check all rules
            is_valid = True
            for rule in self.rules:
                # Check hostel-specific rules
                if rule.hostel_id and rule.hostel_id != room.hostel_id:
                    continue
                    
                # Check year restrictions
                if rule.year is not None and rule.year != student.year:
                    if rule.hostel_id == room.hostel_id:
                        is_valid = not rule.is_allowed
                        break
                        
                # Check room type restrictions
                if rule.room_type and rule.room_type != room.room_type:
                    continue
            
            if is_valid:
                valid_rooms.append(room)
        
        return valid_rooms
    
    def _sort_groups_by_size(self) -> List[Group]:
        """Sort groups by size (descending) for FFD algorithm"""
        return sorted(self.groups, key=lambda g: len(g.members), reverse=True)
    
    def _find_best_wing_for_group(
        self,
        group: Group,
        state: AllocationState
    ) -> Optional[str]:
        """
        Stage 2: Find the best wing to place a group
        Uses First-Fit Decreasing heuristic
        """
        group_size = len(group.members)
        
        # Sort wings by available capacity (descending)
        available_wings = [
            (wing_key, capacity) 
            for wing_key, capacity in state.wing_capacities.items()
            if capacity >= group_size
        ]
        available_wings.sort(key=lambda x: x[1], reverse=True)
        
        if available_wings:
            return available_wings[0][0]
        
        return None
    
    def _allocate_group_to_wing(
        self,
        group: Group,
        wing_key: str,
        state: AllocationState
    ) -> List[AllocationResult]:
        """Allocate all members of a group to rooms in a wing"""
        results = []
        wing = self.wings[wing_key]
        
        # Get available rooms in this wing sorted by capacity
        available_rooms = sorted(
            [r for r in wing.rooms if len(state.room_assignments.get(r.id, [])) < r.capacity],
            key=lambda r: r.capacity - len(state.room_assignments.get(r.id, []))
        )
        
        members_to_allocate = list(group.members)
        
        for room in available_rooms:
            if not members_to_allocate:
                break
                
            current_occupancy = len(state.room_assignments.get(room.id, []))
            available_spots = room.capacity - current_occupancy
            
            # Allocate as many members as possible to this room
            for _ in range(min(available_spots, len(members_to_allocate))):
                member = members_to_allocate.pop(0)
                
                # Update state
                if room.id not in state.room_assignments:
                    state.room_assignments[room.id] = []
                state.room_assignments[room.id].append(member.user_id)
                state.student_allocations[member.user_id] = room.id
                
                # Create result
                results.append(AllocationResult(
                    student_id=member.user_id,
                    room_id=room.id,
                    hostel_name=wing.hostel_name,
                    room_number=room.room_number,
                    wing=room.wing,
                    floor=room.floor
                ))
        
        # Update wing capacity
        allocated_count = len(group.members) - len(members_to_allocate)
        state.wing_capacities[wing_key] -= allocated_count
        
        return results
    
    def _allocate_individual(
        self,
        student: Student,
        state: AllocationState
    ) -> Optional[AllocationResult]:
        """Allocate a single student without a group"""
        valid_rooms = self._get_valid_rooms_for_student(student)
        
        for room in valid_rooms:
            current_occupancy = len(state.room_assignments.get(room.id, []))
            if current_occupancy < room.capacity:
                # Allocate
                if room.id not in state.room_assignments:
                    state.room_assignments[room.id] = []
                state.room_assignments[room.id].append(student.user_id)
                state.student_allocations[student.user_id] = room.id
                
                hostel = self.hostels.get(room.hostel_id)
                
                return AllocationResult(
                    student_id=student.user_id,
                    room_id=room.id,
                    hostel_name=hostel.name if hostel else "Unknown",
                    room_number=room.room_number,
                    wing=room.wing,
                    floor=room.floor
                )
        
        return None
    
    def run_allocation(self) -> List[AllocationResult]:
        """
        Execute the two-stage allocation algorithm
        """
        results: List[AllocationResult] = []
        
        # Initialize state
        state = AllocationState(
            wing_capacities={k: v.available_beds for k, v in self.wings.items()},
            room_assignments={},
            student_allocations={}
        )
        
        # Stage 2: Allocate groups using FFD
        sorted_groups = self._sort_groups_by_size()
        
        for group in sorted_groups:
            # Filter out already allocated members
            group.members = [m for m in group.members if m.user_id not in state.student_allocations]
            
            if not group.members:
                continue
            
            best_wing = self._find_best_wing_for_group(group, state)
            
            if best_wing:
                group_results = self._allocate_group_to_wing(group, best_wing, state)
                results.extend(group_results)
            else:
                # Group is too large for any single wing, split and allocate
                for member in group.members:
                    if member.user_id not in state.student_allocations:
                        result = self._allocate_individual(member, state)
                        if result:
                            results.append(result)
        
        # Allocate remaining individual students
        for student_id, student in self.students.items():
            if student_id not in state.student_allocations:
                result = self._allocate_individual(student, state)
                if result:
                    results.append(result)
        
        return results
