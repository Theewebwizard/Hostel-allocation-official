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

from .models import Student, Group, Room, Hostel, AllocationRule, AllocationResult, AllocationDecisionLog


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

        # Decision logging
        self.decision_logs: List[AllocationDecisionLog] = []
        self.decision_order = 0
        
    def _build_wings(self, rooms: List[Room]) -> Dict[str, Wing]:
        """Organize rooms into wings"""
        wing_rooms: Dict[str, List[Room]] = defaultdict(list)

        for room in rooms:
            if room.status.value == "available":
                # Use || separator to avoid conflicts with wing names containing underscores
                wing_key = f"{room.hostel_id}||{room.wing or 'main'}||{room.floor or 0}"
                wing_rooms[wing_key].append(room)

        wings = {}
        for wing_key, rooms_list in wing_rooms.items():
            parts = wing_key.split("||")
            hostel_id = int(parts[0])
            wing_name = parts[1]
            floor = int(parts[2])
            hostel = self.hostels.get(hostel_id)

            wings[wing_key] = Wing(
                hostel_id=hostel_id,
                hostel_name=hostel.name if hostel else "Unknown",
                wing_name=wing_name,
                floor=floor,
                rooms=rooms_list,
                available_beds=sum(r.capacity for r in rooms_list)
            )

        return wings

    def _room_to_wing_key(self, room: Room) -> str:
        """Convert room to wing key using consistent format"""
        return f"{room.hostel_id}||{room.wing or 'main'}||{room.floor or 0}"

    def _log_decision(
        self,
        student: Student,
        available_rooms: List[Room],
        constraints: List[dict],
        selected_room: Optional[Room],
        reason: str,
        state: 'AllocationState',
        group_id: Optional[int] = None,
        strategy: Optional[str] = None,
        happiness: int = 50,
        alternatives: Optional[List[dict]] = None
    ):
        """Log allocation decision for transparency"""
        self.decision_order += 1

        log = AllocationDecisionLog(
            student_id=student.user_id,
            decision_order=self.decision_order,
            available_rooms=[
                {
                    "roomId": r.id,
                    "roomNumber": r.room_number,
                    "hostelName": self.hostels[r.hostel_id].name if r.hostel_id in self.hostels else "Unknown",
                    "wing": r.wing,
                    "floor": r.floor,
                    "capacity": r.capacity,
                    "currentOccupancy": len(state.room_assignments.get(r.id, []))
                }
                for r in available_rooms[:20]  # Limit to top 20 for performance
            ],
            constraints_applied=constraints,
            group_id=group_id,
            group_allocation_strategy=strategy,
            selected_room_id=selected_room.id if selected_room else None,
            decision_reason=reason,
            happiness_score=happiness,
            alternatives_considered=alternatives
        )

        self.decision_logs.append(log)

    def _get_valid_rooms_for_student(self, student: Student) -> List[Room]:
        """
        Stage 1: CSP - Filter valid rooms for a student based on rules and gender constraints
        
        Rule Logic:
        - If a BLOCKING rule applies to (hostel, wing, year), student is blocked
        - If an ALLOWING rule applies to (hostel, wing, year), student is allowed
        - If NO rules apply to (hostel), student is allowed (default)
        """
        valid_rooms = []
        debug_info = f"Student {student.user_id} (Year {student.year}, Gender {student.gender.value})"

        for room in self.rooms.values():
            if room.status.value != "available":
                continue

            hostel = self.hostels.get(room.hostel_id)
            if not hostel:
                continue

            # Gender constraint validation
            if hostel.gender_type.value == "male" and student.gender.value == "female":
                continue
            if hostel.gender_type.value == "female" and student.gender.value == "male":
                continue

            # Rule-based constraints with priority evaluation
            is_blocked = False
            is_explicitly_allowed = False
            applied_rules = []
            
            # Sort rules by priority (highest first) for proper evaluation
            sorted_rules = sorted(self.rules, key=lambda r: r.priority, reverse=True)

            for rule in sorted_rules:
                # Skip rules that don't apply to this hostel
                if rule.hostel_id is not None and rule.hostel_id != room.hostel_id:
                    continue

                # Wing constraint: if rule specifies a wing, check room's wing
                if rule.wing is not None:
                    if rule.wing != room.wing:
                        continue  # This rule doesn't apply to this room

                # Check if this rule applies to this student's year
                if rule.year is not None and rule.year != student.year:
                    continue  # This rule doesn't apply to this student's year
                
                # At this point, the rule applies to (hostel, wing?, year?)
                applied_rules.append(f"Rule {rule.id}: hostel={rule.hostel_id}, wing={rule.wing}, year={rule.year}, isAllowed={rule.is_allowed}")
                
                # Check if it's a blocking or allowing rule
                if not rule.is_allowed:
                    # This is a BLOCKING rule
                    is_blocked = True
                    break  # Stop processing - highest priority blocking rule wins
                else:
                    # This is an ALLOWING rule
                    is_explicitly_allowed = True

            # Room is valid if:
            # 1. Not blocked by any rule, AND
            # 2. Either explicitly allowed by a rule OR no rules apply to this hostel
            if not is_blocked:
                valid_rooms.append(room)
                if len(valid_rooms) <= 3:  # Debug first few valid rooms
                    print(f"DEBUG: {debug_info} -> VALID room {room.room_number} in {hostel.name} Wing {room.wing}")
                    if applied_rules:
                        for rule in applied_rules[:2]:  # Show first 2 applied rules
                            print(f"  Applied: {rule}")
            elif len(valid_rooms) == 0 and len([r for r in self.rooms.values() if r.hostel_id == room.hostel_id]) <= 5:  # Debug why first few rooms are blocked
                print(f"DEBUG: {debug_info} -> BLOCKED room {room.room_number} in {hostel.name} Wing {room.wing}")
                if applied_rules:
                    for rule in applied_rules[:2]:
                        print(f"  Applied: {rule}")

        if not valid_rooms:
            print(f"DEBUG: {debug_info} -> NO VALID ROOMS FOUND!")
        
        return valid_rooms

    def _get_valid_wing_keys_for_student(self, student: Student) -> set:
        """Returns set of wing_keys this student is eligible for."""
        valid_rooms = self._get_valid_rooms_for_student(student)
        return {self._room_to_wing_key(r) for r in valid_rooms}

    def _proximity_score(self, wing_key_a: str, wing_key_b: str) -> int:
        """
        Score closeness between two wings (higher = closer).
        Same wing: 100, same floor: 60, same hostel: 30, different: 0
        """
        if wing_key_a == wing_key_b:
            return 100

        parts_a = wing_key_a.split("||")
        parts_b = wing_key_b.split("||")

        if parts_a[:2] == parts_b[:2]:  # same hostel+wing, different floor
            return 60
        if parts_a[0] == parts_b[0]:    # same hostel
            return 30
        return 0
    
    def _sort_groups_by_size(self) -> List[Group]:
        """Sort groups by size (descending) for FFD algorithm"""
        return sorted(self.groups, key=lambda g: len(g.members), reverse=True)
    
    def _find_best_wing_for_group(
        self,
        group_members: List[Student],
        state: AllocationState
    ) -> Optional[str]:
        """
        Stage 2: Find the best wing to place a group
        Uses First-Fit Decreasing heuristic with dynamic rule-based priority checking
        """
        if not group_members:
            return None

        group_size = len(group_members)

        # Find wings where ALL members are eligible AND there's enough capacity
        eligible_wing_keys = None
        for member in group_members:
            member_wings = self._get_valid_wing_keys_for_student(member)
            eligible_wing_keys = member_wings if eligible_wing_keys is None else eligible_wing_keys & member_wings

        if not eligible_wing_keys:
            return None

        available_wings = [
            wing_key
            for wing_key, capacity in state.wing_capacities.items()
            if wing_key in eligible_wing_keys and capacity >= group_size
        ]

        if not available_wings:
            return None

        # Determine group year (assuming all members are same year)
        group_year = group_members[0].year if group_members else None

        def wing_sort_key(wing_k):
            wing = self.wings[wing_k]
            cap = state.wing_capacities[wing_k]
            
            # Dynamically calculate priority from the rules engine
            rule_priority = 0
            if group_year is not None:
                for rule in self.rules:
                    # Look for ALLOWING rules that match this specific hostel, wing, and year
                    if rule.is_allowed and \
                       (rule.hostel_id is None or rule.hostel_id == wing.hostel_id) and \
                       (rule.wing is None or rule.wing == wing.wing_name) and \
                       (rule.year is None or rule.year == group_year):
                        
                        # Capture the highest priority among applicable rules
                        if rule.priority > rule_priority:
                            rule_priority = rule.priority
            
            # Sort by rule priority (highest first), then by capacity (highest first)
            # We use negative values because Python's sort() is ascending by default
            return (-rule_priority, -cap, wing_k)

        available_wings.sort(key=wing_sort_key)
        return available_wings[0]
    
    def _allocate_group_to_wing(
        self,
        group_members: List[Student],
        wing_key: str,
        state: AllocationState,
        group_id: Optional[int] = None,
        target_wing_for_happiness: Optional[str] = None
    ) -> List[AllocationResult]:
        """Allocate all members of a group to rooms in a wing"""
        results = []
        wing = self.wings[wing_key]

        # Get available rooms in this wing, sorted by floor and room number to ensure adjacency
        def room_sort_key(r):
            # Try to convert room_number to int for correct numeric sorting (10 after 2)
            try:
                num = int(''.join(filter(str.isdigit, r.room_number)))
            except ValueError:
                num = r.room_number
            return (r.floor or 0, num)

        available_rooms = sorted(
            [r for r in wing.rooms if len(state.room_assignments.get(r.id, [])) < r.capacity],
            key=room_sort_key
        )

        members_to_allocate = list(group_members)

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

                # Calculate happiness: 100 if in ideal wing, proximity-based if split
                happiness = 100
                if target_wing_for_happiness and wing_key != target_wing_for_happiness:
                    happiness = self._proximity_score(wing_key, target_wing_for_happiness)

                # Create result
                results.append(AllocationResult(
                    student_id=member.user_id,
                    room_id=room.id,
                    hostel_name=wing.hostel_name,
                    room_number=room.room_number,
                    wing=room.wing,
                    floor=room.floor,
                    group_id=group_id,
                    happiness=happiness
                ))

        # Update wing capacity
        allocated_count = len(group_members) - len(members_to_allocate)
        state.wing_capacities[wing_key] -= allocated_count

        return results

    def _allocate_group_split(
        self,
        group: Group,
        unallocated_members: List[Student],
        state: AllocationState
    ) -> List[AllocationResult]:
        """
        When no single wing fits the whole group, greedily fill wings ordered
        by proximity to the first wing used (keeps sub-groups close).
        """
        results = []
        remaining = list(unallocated_members)
        first_wing_used = None

        while remaining:
            # Find best wing for the largest possible sub-group from remaining
            best_wing = None
            best_eligible = []

            # Sort wings by proximity to first wing (if any), then by capacity
            wing_priorities = []
            for wing_key, capacity in state.wing_capacities.items():
                if capacity <= 0:
                    continue

                eligible_here = [
                    m for m in remaining
                    if wing_key in self._get_valid_wing_keys_for_student(m)
                ]

                if eligible_here:
                    proximity = self._proximity_score(wing_key, first_wing_used) if first_wing_used else 50
                    wing_priorities.append((wing_key, len(eligible_here), proximity, eligible_here))

            # Sort by proximity (desc), then by eligible count (desc)
            wing_priorities.sort(key=lambda x: (-x[2], -x[1]))

            if not wing_priorities:
                break  # no more valid wings

            best_wing, _, _, eligible_for_wing = wing_priorities[0]
            wing_capacity = state.wing_capacities[best_wing]
            batch = eligible_for_wing[:wing_capacity]

            if first_wing_used is None:
                first_wing_used = best_wing

            batch_results = self._allocate_group_to_wing(
                batch, best_wing, state,
                group_id=group.id,
                target_wing_for_happiness=first_wing_used
            )
            results.extend(batch_results)

            allocated_ids = {r.student_id for r in batch_results}
            remaining = [m for m in remaining if m.user_id not in allocated_ids]

        return results
    
    def _allocate_individual(
        self,
        student: Student,
        state: AllocationState
    ) -> Optional[AllocationResult]:
        """Allocate a single student without a group"""
        valid_rooms = self._get_valid_rooms_for_student(student)

        # Sort: prefer rooms with most occupancy for consolidation
        valid_rooms.sort(key=lambda r: -len(state.room_assignments.get(r.id, [])))

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
                    floor=room.floor,
                    group_id=None,
                    happiness=50  # Individual allocation gets neutral happiness
                )

        return None
    
    def run_allocation(self, mode: str = "group_based") -> List[AllocationResult]:
        """
        Execute the allocation algorithm based on mode
        """
        if mode == "fcfs":
            return self.run_fcfs_allocation()
        elif mode == "wing_fcfs":
            return self.run_wing_fcfs_allocation()
        else:
            return self.run_group_based_allocation()

    def run_fcfs_allocation(self) -> List[AllocationResult]:
        """
        Execute FCFS (First-Come-First-Serve) allocation algorithm.
        Students are allocated strictly by application timestamp.
        """
        results: List[AllocationResult] = []

        # Initialize state
        state = AllocationState(
            wing_capacities={k: v.available_beds for k, v in self.wings.items()},
            room_assignments={},
            student_allocations={}
        )

        # Sort students by application timestamp (earliest first)
        sorted_students = sorted(
            self.students.values(),
            key=lambda s: s.application_timestamp or "9999-12-31T23:59:59"
        )

        for student in sorted_students:
            if student.user_id in state.student_allocations:
                continue

            # Get valid rooms using existing CSP logic
            valid_rooms = self._get_valid_rooms_for_student(student)

            # Sort by occupancy (prefer partially filled rooms for consolidation)
            valid_rooms.sort(
                key=lambda r: (-len(state.room_assignments.get(r.id, [])), r.id)
            )

            # Allocate to first available room
            for room in valid_rooms:
                current_occupancy = len(state.room_assignments.get(room.id, []))
                if current_occupancy < room.capacity:
                    # Update state
                    if room.id not in state.room_assignments:
                        state.room_assignments[room.id] = []
                    state.room_assignments[room.id].append(student.user_id)
                    state.student_allocations[student.user_id] = room.id

                    # Update wing capacity
                    wing_key = self._room_to_wing_key(room)
                    if wing_key in state.wing_capacities:
                        state.wing_capacities[wing_key] -= 1

                    # Get hostel info
                    hostel = self.hostels.get(room.hostel_id)

                    # Create result
                    results.append(AllocationResult(
                        student_id=student.user_id,
                        room_id=room.id,
                        hostel_name=hostel.name if hostel else "Unknown",
                        room_number=room.room_number,
                        wing=room.wing,
                        floor=room.floor,
                        group_id=None,  # FCFS doesn't prioritize groups
                        happiness=60  # Neutral-positive happiness for FCFS
                    ))
                    break

        return results

    def run_wing_fcfs_allocation(self) -> List[AllocationResult]:
        """
        Execute Wing-FCFS allocation algorithm.
        Groups (treated as 'wings') are allocated in FCFS order based on earliest member timestamp.
        Each wing is placed compactly (same hostel, nearby rooms when possible).
        """
        results: List[AllocationResult] = []

        # Initialize state
        state = AllocationState(
            wing_capacities={k: v.available_beds for k, v in self.wings.items()},
            room_assignments={},
            student_allocations={}
        )

        # Sort groups by earliest application timestamp among members (FCFS)
        def get_wing_timestamp(group: Group) -> str:
            if not group.members:
                return "9999-12-31T23:59:59"
            timestamps = [m.application_timestamp or "9999-12-31T23:59:59" for m in group.members]
            return min(timestamps)

        sorted_wings = sorted(self.groups, key=get_wing_timestamp)

        # Allocate wings in FCFS order
        for wing_group in sorted_wings:
            unallocated_members = [
                m for m in wing_group.members
                if m.user_id not in state.student_allocations
            ]

            if not unallocated_members:
                continue

            # Try to find a single physical wing that can accommodate all members
            best_wing = self._find_best_wing_for_group(unallocated_members, state)

            if best_wing:
                # Entire wing fits in one physical wing - allocate together
                wing_results = self._allocate_group_to_wing(
                    unallocated_members, best_wing, state, group_id=wing_group.id
                )
                results.extend(wing_results)
            else:
                # Wing too large - use proximity-aware splitting to keep compact
                split_results = self._allocate_group_split(wing_group, unallocated_members, state)
                results.extend(split_results)

        # Allocate remaining individual students (not in any wing)
        for student_id, student in self.students.items():
            if student_id not in state.student_allocations:
                result = self._allocate_individual(student, state)
                if result:
                    results.append(result)

        return results

    def run_group_based_allocation(self) -> List[AllocationResult]:
        """
        Execute the two-stage group-based allocation algorithm (original logic)
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
            # FIX: Work on a copy of members to avoid mutating the original group
            unallocated_members = [
                m for m in group.members
                if m.user_id not in state.student_allocations
            ]

            if not unallocated_members:
                continue

            best_wing = self._find_best_wing_for_group(unallocated_members, state)

            if best_wing:
                # Whole group fits in one wing
                group_results = self._allocate_group_to_wing(
                    unallocated_members, best_wing, state, group_id=group.id
                )
                results.extend(group_results)
            else:
                # Group too large for any single wing - use proximity-aware splitting
                split_results = self._allocate_group_split(group, unallocated_members, state)
                results.extend(split_results)

        # Allocate remaining individual students
        for student_id, student in self.students.items():
            if student_id not in state.student_allocations:
                result = self._allocate_individual(student, state)
                if result:
                    results.append(result)

        return results
