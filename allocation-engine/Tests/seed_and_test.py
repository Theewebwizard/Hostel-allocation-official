import requests
import random
import time
import uuid
import psycopg2

NEST_API = "http://localhost:3000"
FASTAPI_ENGINE = "http://localhost:8000"

# --- CONFIGURATION ---
# Set how many students per year to generate for the test
STUDENTS_PER_YEAR = 8  
STUDENTS_BRANCHES = ["CSE", "ECE", "ME", "Civil"]  # Different branches
ROOM_CAPACITY = 2 # Testing with double occupancy

session = requests.Session()
admin_token = None
student_tokens = {}  # Store tokens for each student to accept invitations

def create_admin():
    global admin_token
    print("👤 Creating/Logging in Warden User...")
    payload = {
        "email": "warden@gmail.com",
        "password": "warden"
    }
    
    # Try to register first
    response = session.post(f"{NEST_API}/auth/register", json={
        **payload,
        "role": "warden"
    })
    
    if response.status_code in [200, 201]:
        try:
            admin_token = response.json().get('accessToken')
            session.headers.update({"Authorization": f"Bearer {admin_token}"})
            print("✅ Warden created and authenticated.")
        except Exception as e:
            print(f"⚠️ Error extracting token: {e}")
    elif response.status_code == 409:
        # Warden already exists, try to login
        print("   ℹ️ Warden already exists, logging in...")
        login_response = session.post(f"{NEST_API}/auth/login", json=payload)
        
        if login_response.status_code in [200, 201]:
            try:
                admin_token = login_response.json().get('accessToken')
                session.headers.update({"Authorization": f"Bearer {admin_token}"})
                print("✅ Warden logged in and authenticated.")
            except Exception as e:
                print(f"⚠️ Error extracting token from login: {e}")

def clear_database():
    """Clear all database data except warden user using direct PostgreSQL connection"""
    print("\n🗑️ Clearing Database (keeping warden login)...")
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host="localhost",
            port=5433,  # Docker container port
            database="hostel_allocation",  # Correct database name
            user="postgres",
            password="postgres"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Truncate tables with CASCADE
        tables_to_truncate = [
            "allocation_decisions",
            "allocation_runs", 
            "group_memberships",
            "groups",
            "rooms",
            "hostels",
            "students"
        ]
        
        for table in tables_to_truncate:
            cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")
            print(f"   🗑️ Truncated {table}")
        
        # Delete non-warden users
        cursor.execute("DELETE FROM users WHERE role != 'warden';")
        print("   🗑️ Deleted non-warden users")
        
        cursor.close()
        conn.close()
        
        print("✅ Database cleared (warden login preserved)")
        
    except Exception as e:
        print(f"   ⚠️ Error clearing database: {e}")
        print("   Falling back to API-based clearing...")
        # Fallback to old method if psycopg2 fails
        endpoints_to_clear = [
            ("Allocation Rules", "/admin/rules"),
            ("Rooms", "/admin/rooms"),
            ("Hostels", "/admin/hostels"),
        ]
        
        for entity_name, endpoint in endpoints_to_clear:
            try:
                get_response = session.get(f"{NEST_API}{endpoint}")
                if get_response.status_code == 200:
                    items = get_response.json()
                    if isinstance(items, list) and len(items) > 0:
                        print(f"   🗑️ Deleting {len(items)} {entity_name}...")
                        for item in reversed(items):
                            item_id = item.get('id')
                            if item_id:
                                delete_response = session.delete(f"{NEST_API}{endpoint}/{item_id}")
                                if delete_response.status_code not in [200, 204]:
                                    print(f"     ⚠️ Failed to delete {entity_name} {item_id}: {delete_response.status_code}")
                    else:
                        print(f"   ℹ️ No {entity_name} to delete")
                else:
                    print(f"   ⚠️ Could not fetch {entity_name}: {get_response.status_code}")
            except Exception as e2:
                print(f"   ⚠️ Error clearing {entity_name}: {e2}")
        
        print("✅ Database cleared via API (warden login preserved)")

def create_hostel(name, gender):
    res = session.post(f"{NEST_API}/admin/hostels", json={"name": name, "genderType": gender})
    if res.status_code in [200, 201]:
        hostel_id = res.json().get("id")
        print(f"   ✅ Created hostel '{name}' (ID: {hostel_id})")
        return hostel_id
    elif res.status_code == 409:
        # Hostel already exists, fetch it by name
        print(f"   ℹ️ Hostel '{name}' already exists, fetching ID...")
        hostels_res = session.get(f"{NEST_API}/admin/hostels")
        if hostels_res.status_code in [200, 201]:
            hostels = hostels_res.json()
            for hostel in hostels:
                if hostel.get("name") == name:
                    hostel_id = hostel.get("id")
                    print(f"   ✅ Found hostel '{name}' (ID: {hostel_id})")
                    return hostel_id
        print(f"   ❌ Hostel '{name}' not found in list")
        return None
    else:
        print(f"   ❌ Failed to create hostel '{name}': {res.status_code}")
        print(f"   Response: {res.text}")
        return None

def create_rooms(hostel_id, wing, floors, rooms_per_floor):
    rooms = []
    for floor in range(1, floors + 1):
        for room_num in range(1, rooms_per_floor + 1):
            room_name = f"{wing}-{floor}{room_num:02d}"
            rooms.append({
                "hostelId": hostel_id,
                "roomNumber": room_name,
                "floor": floor,
                "wing": wing,
                "capacity": ROOM_CAPACITY,
                "roomType": "double"
            })
    
    # Create rooms via /admin/rooms endpoint
    created_count = 0
    skipped_count = 0
    for room in rooms:
        res = session.post(f"{NEST_API}/admin/rooms", json=room)
        if res.status_code in [200, 201]:
            created_count += 1
        elif res.status_code == 409:
            skipped_count += 1
        else:
            print(f"   ⚠️ Failed to create room {room['roomNumber']}: {res.status_code}")
    
    if skipped_count > 0:
        print(f"   🏢 Created {created_count} rooms, {skipped_count} already existed in Wing {wing}.")
    else:
        print(f"   🏢 Created {created_count}/{len(rooms)} rooms in Wing {wing}.")


def create_rooms_with_capacity(hostel_id, wing, floors, rooms_per_floor, capacity, room_type):
    """Create rooms with specific capacity and room type"""
    rooms = []
    for floor in range(1, floors + 1):
        for room_num in range(1, rooms_per_floor + 1):
            room_name = f"{wing}-{floor}{room_num:02d}"
            rooms.append({
                "hostelId": hostel_id,
                "roomNumber": room_name,
                "floor": floor,
                "wing": wing,
                "capacity": capacity,
                "roomType": room_type
            })
    
    # Create rooms via /admin/rooms endpoint
    created_count = 0
    skipped_count = 0
    for room in rooms:
        res = session.post(f"{NEST_API}/admin/rooms", json=room)
        if res.status_code in [200, 201]:
            created_count += 1
        elif res.status_code == 409:
            skipped_count += 1
        else:
            print(f"   ⚠️ Failed to create room {room['roomNumber']}: {res.status_code}")
    
    if skipped_count > 0:
        print(f"   🏢 Created {created_count} {room_type}(capacity {capacity}) rooms, {skipped_count} already existed in Wing {wing}.")
    else:
        print(f"   🏢 Created {created_count}/{len(rooms)} {room_type}(capacity {capacity}) rooms in Wing {wing}.")

def setup_hostels():
    print("\n🏗️ Building Hostels and Rooms...")
    hostel_ids = {}

    # BH1 - Male Hostel (1st & 4th Year)
    bh1_id = create_hostel("BH1", "male")
    hostel_ids['BH1'] = bh1_id
    if bh1_id:
        print("➡️ Setting up BH1 (1st & 4th Year - Single & Double Rooms)")
        # Wing A: Single rooms for 1st year
        create_rooms_with_capacity(bh1_id, 'A', floors=2, rooms_per_floor=5, capacity=1, room_type="single")
        # Wing B: Double rooms for 4th year
        create_rooms_with_capacity(bh1_id, 'B', floors=2, rooms_per_floor=5, capacity=2, room_type="double")

    # BH2 - Male Hostel (1st & 4th Year)
    bh2_id = create_hostel("BH2", "male")
    hostel_ids['BH2'] = bh2_id
    if bh2_id:
        print("➡️ Setting up BH2 (1st & 4th Year - Triple & Double Rooms)")
        # Wing C: Triple rooms for 1st year
        create_rooms_with_capacity(bh2_id, 'C', floors=2, rooms_per_floor=5, capacity=3, room_type="triple")
        # Wing D: Double rooms for 4th year
        create_rooms_with_capacity(bh2_id, 'D', floors=2, rooms_per_floor=5, capacity=2, room_type="double")

    # BH3 - Male Hostel (3rd Year ONLY)
    bh3_id = create_hostel("BH3", "male")
    hostel_ids['BH3'] = bh3_id
    if bh3_id:
        print("➡️ Setting up BH3 (3rd Year Only - Double Rooms)")
        # Wings A & B: Double rooms for 3rd year
        create_rooms_with_capacity(bh3_id, 'A', floors=2, rooms_per_floor=5, capacity=2, room_type="double")
        create_rooms_with_capacity(bh3_id, 'B', floors=2, rooms_per_floor=5, capacity=2, room_type="double")

    # BH4 - Male Hostel (2nd Year ONLY)
    bh4_id = create_hostel("BH4", "male")
    hostel_ids['BH4'] = bh4_id
    if bh4_id:
        print("➡️ Setting up BH4 (2nd Year Only - Double Rooms)")
        # Wings A & B: Double rooms for 2nd year
        create_rooms_with_capacity(bh4_id, 'A', floors=2, rooms_per_floor=5, capacity=2, room_type="double")
        create_rooms_with_capacity(bh4_id, 'B', floors=2, rooms_per_floor=5, capacity=2, room_type="double")

    # GH1 - Female Hostel (ALL YEARS)
    gh1_id = create_hostel("GH1", "female")
    hostel_ids['GH1'] = gh1_id
    if gh1_id:
        print("➡️ Setting up GH1 (Girls - All Years - Mixed Rooms)")
        create_rooms_with_capacity(gh1_id, 'A', floors=2, rooms_per_floor=5, capacity=2, room_type="double")

    return hostel_ids

def generate_students_and_groups():
    global student_tokens
    import uuid
    import random

    print("\n🎓 Generating Students & Groups with Advanced Configuration...")

    # Predefined group configurations for realistic distribution
    GROUP_CONFIGS = [
        # Year 1: Mostly singles and small groups
        {"year": 1, "gender": "male", "sizes": [1, 2, 3], "distribution": [0.6, 0.3, 0.1], "count": 25},
        {"year": 1, "gender": "female", "sizes": [1, 2, 3], "distribution": [0.6, 0.3, 0.1], "count": 25},

        # Year 2: Mix of small groups
        {"year": 2, "gender": "male", "sizes": [2, 3, 4], "distribution": [0.4, 0.4, 0.2], "count": 20},
        {"year": 2, "gender": "female", "sizes": [2, 3, 4], "distribution": [0.4, 0.4, 0.2], "count": 20},

        # Year 3: Medium groups
        {"year": 3, "gender": "male", "sizes": [3, 4, 5], "distribution": [0.3, 0.4, 0.3], "count": 15},
        {"year": 3, "gender": "female", "sizes": [3, 4, 5], "distribution": [0.3, 0.4, 0.3], "count": 15},

        # Year 4: Larger groups
        {"year": 4, "gender": "male", "sizes": [4, 5, 6], "distribution": [0.3, 0.4, 0.3], "count": 10},
        {"year": 4, "gender": "female", "sizes": [4, 5, 6], "distribution": [0.3, 0.4, 0.3], "count": 10},
    ]

    students_data = []
    groups_data = []

    # Generate unique identifier to avoid conflicts from previous runs
    unique_id = str(uuid.uuid4())[:4]
    print(f"   🔑 Using unique ID: {unique_id}")

    # Create students based on group configurations
    print("  Creating students with realistic group distributions...")

    for config in GROUP_CONFIGS:
        year = config["year"]
        gender = config["gender"]
        sizes = config["sizes"]
        distribution = config["distribution"]
        count = config["count"]

        print(f"    📚 Year {year} {gender.title()}: Creating {count} groups")

        # Generate students for this configuration
        for group_idx in range(count):
            # Select group size based on distribution
            group_size = random.choices(sizes, weights=distribution, k=1)[0]

            # Create students for this group
            group_students = []
            for student_idx in range(group_size):
                roll_number = f"{gender[0].upper()}{year}{group_idx:02d}{student_idx:02d}{unique_id}"
                email = f"{gender}_{year}_g{group_idx}_s{student_idx}_{unique_id}@example.com"
                branch = random.choice(STUDENTS_BRANCHES) if gender == "male" else "CSE"

                res = session.post(f"{NEST_API}/auth/register", json={
                    "email": email,
                    "password": "password123",
                    "role": "student",
                    "rollNumber": roll_number,
                    "fullName": f"{branch} Student Year-{year} Group-{group_idx}",
                    "year": year,
                    "gender": gender,
                    "program": branch
                })

                if res.status_code in [200, 201]:
                    data = res.json()
                    user_id = data['user']['id']
                    token = data.get('accessToken')
                    student_tokens[email] = {
                        'userId': user_id,
                        'token': token,
                        'rollNumber': roll_number
                    }
                    student_info = {
                        'email': email,
                        'rollNumber': roll_number,
                        'gender': gender,
                        'year': year,
                        'branch': branch,
                        'group_id': f"{gender}_{year}_{group_idx}_{unique_id}"
                    }
                    students_data.append(student_info)
                    group_students.append(student_info)
                elif res.status_code == 409:
                    login_res = session.post(f"{NEST_API}/auth/login", json={
                        "email": email,
                        "password": "password123"
                    })
                    if login_res.status_code in [200, 201]:
                        data = login_res.json()
                        user_id = data['user']['id']
                        token = data.get('accessToken')
                        student_tokens[email] = {
                            'userId': user_id,
                            'token': token,
                            'rollNumber': roll_number
                        }
                        student_info = {
                            'email': email,
                            'rollNumber': roll_number,
                            'gender': gender,
                            'year': year,
                            'branch': branch,
                            'group_id': f"{gender}_{year}_{group_idx}_{unique_id}"
                        }
                        students_data.append(student_info)
                        group_students.append(student_info)

            # Store group information
            if group_students:
                groups_data.append({
                    'group_id': f"{gender}_{year}_{group_idx}_{unique_id}",
                    'students': group_students,
                    'size': len(group_students),
                    'year': year,
                    'gender': gender
                })

    print(f"✅ Created {len(students_data)} students in {len(groups_data)} groups.")

    # Form groups using API workflow (maintains existing logic)
    print("🤝 Forming Groups via API...")

    pending_invitations = []
    successful_groups = 0

    for group in groups_data:
        group_students = group['students']
        if len(group_students) < 2:
            continue  # Skip single-student groups

        # First student creates the group
        leader = group_students[0]
        leader_email = leader['email']
        leader_token = student_tokens[leader_email]['token']

        leader_session = requests.Session()
        leader_session.headers.update({
            "Authorization": f"Bearer {leader_token}"
        })

        # Create group
        group_name = f"Group_{group['gender']}_{group['year']}_{group['group_id'].split('_')[-1]}"
        group_res = leader_session.post(f"{NEST_API}/groups", json={"name": group_name})

        if group_res.status_code in [200, 201]:
            group_id = group_res.json().get('id')

            # Invite remaining students
            for member in group_students[1:]:
                member_roll = member['rollNumber']
                invite_res = leader_session.post(
                    f"{NEST_API}/groups/{group_id}/invitations",
                    json={"rollNumber": member_roll}
                )

                if invite_res.status_code in [200, 201]:
                    pending_invitations.append({
                        'group_id': group_id,
                        'member_email': member['email'],
                        'member_roll': member_roll
                    })
                else:
                    print(f"   ⚠️ Failed to invite {member_roll}: {invite_res.status_code}")

            successful_groups += 1
            print(f"   ✅ Group {successful_groups}: {group['size']} students (Year {group['year']} {group['gender']})")
        else:
            print(f"   ⚠️ Failed to create group: {group_res.status_code}")

    print(f"✅ Created {successful_groups} groups with pending invitations.")

    # Process invitations - members accept them
    print("\n📧 Members accepting group invitations...")
    time.sleep(1)

    accepted_count = 0
    for invitation in pending_invitations:
        group_id = invitation['group_id']
        member_email = invitation['member_email']
        member_roll = invitation['member_roll']
        member_token = student_tokens[member_email]['token']

        member_session = requests.Session()
        member_session.headers.update({
            "Authorization": f"Bearer {member_token}"
        })

        accept_res = member_session.patch(
            f"{NEST_API}/groups/me/invitations/{group_id}",
            json={"status": "accepted"}
        )

        if accept_res.status_code in [200, 201]:
            accepted_count += 1
        else:
            print(f"   ⚠️ {member_roll} failed to accept invitation: {accept_res.status_code}")

    print(f"✅ {accepted_count} group invitations accepted. All groups formed successfully.")

def create_allocation_rules():
    """Create allocation rules to enforce hostel-year and wing-level constraints"""
    print("\n📋 Creating Allocation Rules...")
    
    # Fetch hostels to get their IDs
    hostels_res = session.get(f"{NEST_API}/admin/hostels")
    if hostels_res.status_code not in [200, 201]:
        print(f"❌ Failed to fetch hostels: {hostels_res.status_code}")
        return
    
    hostels = hostels_res.json()
    hostel_map = {h['name']: h['id'] for h in hostels}
    
    print(f"   Found hostels: {hostel_map}")
    
    rules_data = [
        # === BH1: WING-SPECIFIC RULES ===
        # Wing A & B: Single rooms for 1st year ONLY
        {"hostelId": hostel_map.get('BH1'), "wing": "A", "year": 1, "isAllowed": True, "priority": 15, "description": "BH1 Wing A (single) for 1st year"},
        {"hostelId": hostel_map.get('BH1'), "wing": "A", "year": 2, "isAllowed": False, "priority": 15, "description": "BH1 Wing A blocked for 2nd year"},
        {"hostelId": hostel_map.get('BH1'), "wing": "A", "year": 3, "isAllowed": False, "priority": 15, "description": "BH1 Wing A blocked for 3rd year"},
        {"hostelId": hostel_map.get('BH1'), "wing": "A", "year": 4, "isAllowed": False, "priority": 15, "description": "BH1 Wing A blocked for 4th year"},
        
        # Wing B: Double rooms for 4th year ONLY
        {"hostelId": hostel_map.get('BH1'), "wing": "B", "year": 4, "isAllowed": True, "priority": 15, "description": "BH1 Wing B (double) for 4th year"},
        {"hostelId": hostel_map.get('BH1'), "wing": "B", "year": 1, "isAllowed": False, "priority": 15, "description": "BH1 Wing B blocked for 1st year"},
        {"hostelId": hostel_map.get('BH1'), "wing": "B", "year": 2, "isAllowed": False, "priority": 15, "description": "BH1 Wing B blocked for 2nd year"},
        {"hostelId": hostel_map.get('BH1'), "wing": "B", "year": 3, "isAllowed": False, "priority": 15, "description": "BH1 Wing B blocked for 3rd year"},
        
        # === BH2: WING-SPECIFIC RULES ===
        # Wing C: Triple rooms for 1st year ONLY
        {"hostelId": hostel_map.get('BH2'), "wing": "C", "year": 1, "isAllowed": True, "priority": 15, "description": "BH2 Wing C (triple) for 1st year"},
        {"hostelId": hostel_map.get('BH2'), "wing": "C", "year": 2, "isAllowed": False, "priority": 15, "description": "BH2 Wing C blocked for 2nd year"},
        {"hostelId": hostel_map.get('BH2'), "wing": "C", "year": 3, "isAllowed": False, "priority": 15, "description": "BH2 Wing C blocked for 3rd year"},
        {"hostelId": hostel_map.get('BH2'), "wing": "C", "year": 4, "isAllowed": False, "priority": 15, "description": "BH2 Wing C blocked for 4th year"},
        
        # Wing D: Double rooms for 4th year ONLY
        {"hostelId": hostel_map.get('BH2'), "wing": "D", "year": 4, "isAllowed": True, "priority": 15, "description": "BH2 Wing D (double) for 4th year"},
        {"hostelId": hostel_map.get('BH2'), "wing": "D", "year": 1, "isAllowed": False, "priority": 15, "description": "BH2 Wing D blocked for 1st year"},
        {"hostelId": hostel_map.get('BH2'), "wing": "D", "year": 2, "isAllowed": False, "priority": 15, "description": "BH2 Wing D blocked for 2nd year"},
        {"hostelId": hostel_map.get('BH2'), "wing": "D", "year": 3, "isAllowed": False, "priority": 15, "description": "BH2 Wing D blocked for 3rd year"},
        
        # === BH3: For 3rd year ONLY ===
        {"hostelId": hostel_map.get('BH3'), "year": 3, "isAllowed": True, "priority": 10, "description": "BH3 for 3rd year"},
        {"hostelId": hostel_map.get('BH3'), "year": 1, "isAllowed": False, "priority": 10, "description": "BH3 blocked for 1st year"},
        {"hostelId": hostel_map.get('BH3'), "year": 2, "isAllowed": False, "priority": 10, "description": "BH3 blocked for 2nd year"},
        {"hostelId": hostel_map.get('BH3'), "year": 4, "isAllowed": False, "priority": 10, "description": "BH3 blocked for 4th year"},
        
        # === BH4: For 2nd year ONLY ===
        {"hostelId": hostel_map.get('BH4'), "year": 2, "isAllowed": True, "priority": 10, "description": "BH4 for 2nd year"},
        {"hostelId": hostel_map.get('BH4'), "year": 1, "isAllowed": False, "priority": 10, "description": "BH4 blocked for 1st year"},
        {"hostelId": hostel_map.get('BH4'), "year": 3, "isAllowed": False, "priority": 10, "description": "BH4 blocked for 3rd year"},
        {"hostelId": hostel_map.get('BH4'), "year": 4, "isAllowed": False, "priority": 10, "description": "BH4 blocked for 4th year"},
    ]
    
    # Create rules via API
    rules_created = 0
    for rule in rules_data:
        if rule.get('hostelId') is None:
            print(f"   ⚠️ Skipping rule - hostel not found")
            continue
            
        res = session.post(f"{NEST_API}/admin/rules", json=rule)
        if res.status_code in [200, 201]:
            hostel_name = next((k for k, v in hostel_map.items() if v == rule['hostelId']), 'Unknown')
            allowed = "✓" if rule.get('isAllowed') else "✗"
            wing_info = f" Wing {rule.get('wing')}" if rule.get('wing') else ""
            print(f"   ✅ {allowed} {hostel_name}{wing_info} - Year {rule.get('year')}: {rule.get('description')}")
            rules_created += 1
        elif res.status_code == 409:
            pass  # Rule already exists
        else:
            print(f"   ⚠️ Failed to create rule: {res.status_code} - {res.text}")
    
    print(f"✅ Allocation rules configured ({rules_created} new rules created).")

def run_allocation():
    print("\n🚀 Triggering Allocation Engine...")
    
    # 1. Fetch data from NestJS
    print("  Fetching allocation data from NestJS...")
    data_res = session.get(f"{NEST_API}/allocation-data")
    if data_res.status_code != 200:
        print(f"❌ Failed to fetch allocation data from NestJS: {data_res.status_code}")
        print(f"Response: {data_res.text}")
        return

    allocation_payload = data_res.json()
    
    # Ensure 'rules' field exists (add empty list if missing)
    if 'rules' not in allocation_payload:
        allocation_payload['rules'] = []
    
    print(f"  ✅ Fetched allocation data")
    print(f"     - Students: {len(allocation_payload.get('students', []))}")
    print(f"     - Groups: {len(allocation_payload.get('groups', []))}")
    print(f"     - Hostels: {len(allocation_payload.get('hostels', []))}")
    print(f"     - Rooms: {len(allocation_payload.get('rooms', []))}")
    print(f"     - Rules: {len(allocation_payload.get('rules', []))}")
    
    # Debug: Show first few rules
    rules = allocation_payload.get('rules', [])
    if rules:
        print(f"\n  📋 Sample Rules (first 5):")
        for rule in rules[:5]:
            print(f"     - Hostel {rule.get('hostelId')}, Wing {rule.get('wing')}, Year {rule.get('year')}: isAllowed={rule.get('isAllowed')}")

    # 2. Send to FastAPI Engine
    print("\n  Sending data to Allocation Engine...")
    engine_res = requests.post(f"{FASTAPI_ENGINE}/allocate", json=allocation_payload)
    
    if engine_res.status_code == 200:
        allocation_response = engine_res.json()
        run_id = allocation_response.get('run_id')
        print(f"✅ Allocation started with run_id: {run_id}")
        
        # Wait for allocation to complete
        print("  ⏳ Waiting for allocation to complete...")
        max_attempts = 30  # 30 seconds timeout
        attempt = 0
        
        while attempt < max_attempts:
            time.sleep(1)  # Wait 1 second
            status_res = requests.get(f"{FASTAPI_ENGINE}/allocation/{run_id}")
            
            if status_res.status_code == 200:
                status_data = status_res.json()
                current_status = status_data.get('status')
                
                if current_status == 'completed':
                    print("✅ Allocation Engine Completed Successfully!")
                    results = status_data
                    
                    # Log a summary of results
                    print("\n📊 Allocation Summary:")
                    allocations = results.get('allocations', [])
                    total_students = results.get('total_students', 0)
                    allocated_students = results.get('allocated_students', 0)
                    
                    print(f"  📊 Total Students: {total_students}")
                    print(f"  ✅ Successfully Allocated: {allocated_students}")
                    
                    if allocations:
                        print(f"  📋 Sample Allocations (first 5):")
                        for alloc in allocations[:5]:  # Show first 5
                            print(f"     - Student {alloc.get('student_id', 'N/A')} → Room {alloc.get('room_id', 'N/A')} ({alloc.get('hostel_name', 'N/A')} {alloc.get('room_number', 'N/A')})")
                        if len(allocations) > 5:
                            print(f"     ... and {len(allocations) - 5} more")
                    else:
                        print("  ⚠️ No allocations found in results")
                    
                    break
                elif current_status == 'failed':
                    print(f"❌ Allocation Engine Failed: {status_data.get('error', 'Unknown error')}")
                    break
                else:
                    print(f"  ⏳ Status: {current_status} (attempt {attempt + 1}/{max_attempts})")
            else:
                print(f"❌ Failed to check status: {status_res.status_code}")
                break
                
            attempt += 1
        
        if attempt >= max_attempts:
            print("❌ Allocation timed out")
    else:
        print(f"❌ Allocation Engine Failed with status: {engine_res.status_code}")
        print(f"Response: {engine_res.text}")

if __name__ == "__main__":
    print("=" * 60)
    print("🎓 HOSTEL ALLOCATION TEST SUITE")
    print("=" * 60)
    
    create_admin()
    clear_database()
    setup_hostels()
    create_allocation_rules()
    generate_students_and_groups()
    print("\n⏳ Waiting for database writes to commit...")
    time.sleep(2)
    run_allocation()
    
    print("\n" + "=" * 60)
    print("✅ TEST SUITE COMPLETED")
    print("=" * 60)