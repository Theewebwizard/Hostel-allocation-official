import requests
import random
import time
import uuid
import psycopg2

NEST_API = "http://localhost:3000"
FASTAPI_ENGINE = "http://localhost:8000"
ROOM_CAPACITY = 2 

STUDENTS_BRANCHES = ["CSE", "ECE", "ME", "CCE"]

session = requests.Session()
admin_token = None
student_tokens = {}

def create_admin():
    global admin_token
    print("👤 Creating/Logging in Warden User...")
    payload = {"email": "warden@gmail.com", "password": "warden"}
    response = session.post(f"{NEST_API}/auth/register", json={**payload, "role": "warden"})
    
    if response.status_code in [200, 201]:
        admin_token = response.json().get('accessToken')
        session.headers.update({"Authorization": f"Bearer {admin_token}"})
        print("✅ Warden created.")
    elif response.status_code == 409:
        login_response = session.post(f"{NEST_API}/auth/login", json=payload)
        admin_token = login_response.json().get('accessToken')
        session.headers.update({"Authorization": f"Bearer {admin_token}"})
        print("✅ Warden logged in.")

def enable_applications():
    print("\n🔓 Enabling student applications...")
    res = session.post(f"{NEST_API}/admin/applications-enabled", json={"enabled": True})
    if res.status_code in [200, 201]:
        print("✅ Applications enabled.")
    else:
        print(f"   ⚠️ Failed to enable applications: {res.text}")

def get_allocation_mode():
    print("🔍 Checking current allocation mode...")
    res = session.get(f"{NEST_API}/admin/policy")
    if res.status_code == 200:
        mode = res.json().get("policy")
        print(f"✅ Current mode detected: {mode}")
        return mode
    print("   ⚠️ Could not fetch mode, defaulting to group_based")
    return "group_based"

def clear_database():
    """Clear all database data except warden user using direct PostgreSQL connection"""
    print("\n🗑️ Clearing Database (keeping warden login)...")
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host="localhost",
            port=5433,  # Make sure this matches your docker port
            database="Hostel",  # Your corrected DB name
            user="postgres",
            password="postgres"
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Truncate tables with RESTART IDENTITY to reset IDs to 1
        tables_to_truncate = [
            "administrative_actions",
            "allocation_results",
            "allocation_decisions",
            "allocation_runs", 
            "allocation_rules",
            "roommate_invitations",
            "swap_requests",
            "swap_history",
            "group_memberships",
            "groups",
            "rooms",
            "hostels",
            "students",
            "wing_participation_settings"
        ]
        
        for table in tables_to_truncate:
            cursor.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;")
            print(f"   🗑️ Truncated {table}")
        
        # FIX: Delete by email to ensure Warden is absolutely preserved
        cursor.execute("DELETE FROM users WHERE email != 'warden@gmail.com';")
        print("   🗑️ Deleted non-warden users")
        
        cursor.close()
        conn.close()
        
        print("✅ Database cleared (warden login preserved)")
        
    except Exception as e:
        print(f"   ⚠️ Error clearing database: {e}")
        # ... (keep your existing fallback code here) ...

def create_hostel(name, gender):
    res = session.post(f"{NEST_API}/admin/hostels", json={"name": name, "genderType": gender})
    if res.status_code in [200, 201]: return res.json().get("id")
    elif res.status_code == 409:
        hostels = session.get(f"{NEST_API}/admin/hostels").json()
        return next((h.get("id") for h in hostels if h.get("name") == name), None)
    return None

def create_rooms_with_capacity(hostel_id, wing, floors, rooms_per_floor, capacity, room_type):
    rooms = [{"hostelId": hostel_id, "roomNumber": f"{wing}-{floor}{r:02d}", "floor": floor, "wing": wing, "capacity": capacity, "roomType": room_type} for floor in range(1, floors + 1) for r in range(1, rooms_per_floor + 1)]
    for room in rooms:
        session.post(f"{NEST_API}/admin/rooms", json=room)
    print(f"   🏢 Created {len(rooms)} {room_type} rooms in Wing {wing}.")

def setup_hostels():
    print("\n🏗️ Building Hostels and Rooms...")
    hostel_ids = {}
    h1 = create_hostel("BH1", "male")
    if h1:
        hostel_ids['BH1'] = h1
        create_rooms_with_capacity(h1, 'A', 2, 5, 1, "single")
        create_rooms_with_capacity(h1, 'B', 2, 5, 1, "single")
        create_rooms_with_capacity(h1, 'C', 2, 5, 2, "double")
        create_rooms_with_capacity(h1, 'D', 2, 5, 2, "double")
        create_rooms_with_capacity(h1, 'E', 2, 5, 3, "triple")
    h2 = create_hostel("BH2", "male")
    if h2:
        hostel_ids['BH2'] = h2
        create_rooms_with_capacity(h2, 'C', 2, 5, 3, "triple")
        create_rooms_with_capacity(h2, 'D', 2, 5, 2, "double")
    h3 = create_hostel("BH3", "male")
    if h3:
        hostel_ids['BH3'] = h3
        create_rooms_with_capacity(h3, 'A', 2, 5, 2, "double")
        create_rooms_with_capacity(h3, 'B', 2, 5, 2, "double")
    h4 = create_hostel("BH4", "male")
    if h4:
        hostel_ids['BH4'] = h4
        create_rooms_with_capacity(h4, 'A', 2, 5, 2, "double")
        create_rooms_with_capacity(h4, 'B', 2, 5, 2, "double")
    g1 = create_hostel("GH1", "female")
    if g1:
        hostel_ids['GH1'] = g1
        create_rooms_with_capacity(g1, 'A', 2, 5, 2, "double")
    return hostel_ids

def create_allocation_rules():
    print("\n📋 Configuring Rules Matrix (Hierarchical & Synchronized)...")
    
    # 1. Fetch the initialized matrix from backend
    # This ensures we have all hostels and wings currently in the DB
    res = session.get(f"{NEST_API}/admin/rules/matrix")
    if res.status_code != 200:
        print(f"⚠️ Failed to fetch initial rules matrix: {res.text}")
        return
    
    matrix = res.json()
    hostels = session.get(f"{NEST_API}/admin/hostels").json()
    hm = {h['name']: str(h['id']) for h in hostels}

    def set_rule(hostel_id, year, is_allowed, wing=None):
        """Helper to set rules with UI-like synchronization"""
        if hostel_id not in matrix:
            return
            
        if wing is None:
            # Hostel-wide toggle: Sync all wings
            matrix[hostel_id]["years"][str(year)] = is_allowed
            for w in matrix[hostel_id]["wings"]:
                matrix[hostel_id]["wings"][w][str(year)] = is_allowed
        else:
            # Wing-specific toggle: Partial logic
            if wing in matrix[hostel_id]["wings"]:
                matrix[hostel_id]["wings"][wing][str(year)] = is_allowed
                
                # If we manually set a wing to false, the hostel-wide rule for that year 
                # should also be false (to show as 'partial' or 'off')
                if not is_allowed:
                    matrix[hostel_id]["years"][str(year)] = False
                else:
                    # If all wings are now true, hostel-wide becomes true
                    all_true = all(w_map.get(str(year), False) for w_map in matrix[hostel_id]["wings"].values())
                    matrix[hostel_id]["years"][str(year)] = all_true

    # 2. Configure the specific rules for the test scenario
    
    # BH1: Year 4 allowed everywhere. Year 1 allowed ONLY in Wing E.
    if 'BH1' in hm:
        set_rule(hm['BH1'], 4, True) # Syncs all wings to Y4: True
        set_rule(hm['BH1'], 1, True, wing="E") # Partial rule (Y1: True only for E)

    # BH2: Year 1 allowed ONLY in Wing C. Year 4 allowed ONLY in Wing D.
    if 'BH2' in hm:
        set_rule(hm['BH2'], 1, True, wing="C")
        set_rule(hm['BH2'], 4, True, wing="D")

    # BH3: Year 3 allowed everywhere
    if 'BH3' in hm:
        set_rule(hm['BH3'], 3, True)

    # BH4: Year 2 allowed everywhere
    if 'BH4' in hm:
        set_rule(hm['BH4'], 2, True)

    # GH1: All years allowed everywhere
    if 'GH1' in hm:
        for y in [1, 2, 3, 4]:
            set_rule(hm['GH1'], y, True)
    
    # 3. Save the synchronized matrix
    res = session.post(f"{NEST_API}/admin/rules/matrix", json={"matrix": matrix})
    if res.status_code in [200, 201]:
        print(f"✅ Rules matrix synchronized and saved: {res.json().get('count')} rules generated.")
    else:
        print(f"⚠️ Failed to save rules matrix: {res.text}")

def generate_students_and_groups(mode="group_based"):
    print(f"\n🎓 Generating Students & Groups (Exactly 240) for mode: {mode}...")
    GROUP_CONFIGS = [
        {"year": 1, "gender": "female", "sizes": [2], "distribution": [1.0], "count": 2}, 
        {"year": 2, "gender": "female", "sizes": [2], "distribution": [1.0], "count": 2}, 
        {"year": 3, "gender": "female", "sizes": [2], "distribution": [1.0], "count": 3}, 
        {"year": 4, "gender": "female", "sizes": [2], "distribution": [1.0], "count": 3}, 
        {"year": 1, "gender": "male", "sizes": [3], "distribution": [1.0], "count": 10}, 
        {"year": 1, "gender": "male", "sizes": [2], "distribution": [1.0], "count": 25}, 
        {"year": 1, "gender": "male", "sizes": [1], "distribution": [1.0], "count": 20}, 
        {"year": 2, "gender": "male", "sizes": [2], "distribution": [1.0], "count": 20}, 
        {"year": 3, "gender": "male", "sizes": [2], "distribution": [1.0], "count": 20}, 
        {"year": 4, "gender": "male", "sizes": [1], "distribution": [1.0], "count": 20}, 
        {"year": 4, "gender": "male", "sizes": [2], "distribution": [1.0], "count": 10}
    ]

    uid = str(uuid.uuid4())[:4]
    groups_data = []

    for c_idx, cfg in enumerate(GROUP_CONFIGS):
        for g_idx in range(cfg["count"]):
            size = random.choices(cfg["sizes"], weights=cfg["distribution"], k=1)[0]
            grp_students = []
            for s_idx in range(size):
                roll = f"{cfg['gender'][0].upper()}{cfg['year']}C{c_idx}G{g_idx:02d}S{s_idx:02d}{uid}"
                email = f"{cfg['gender']}_{cfg['year']}_c{c_idx}_g{g_idx}_s{s_idx}_{uid}@ex.com"
                
                # Pick a random branch using the array we added at the top
                branch = random.choice(STUDENTS_BRANCHES)
                
                res = session.post(f"{NEST_API}/auth/register", json={
                    "email": email, 
                    "password": "password123", # 👈 Restored to a valid length!
                    "role": "student", 
                    "rollNumber": roll,
                    "fullName": f"Student Y{cfg['year']} G{g_idx} S{s_idx}", 
                    "year": cfg["year"], 
                    "gender": cfg["gender"], 
                    "program": branch
                })
                
                if res.status_code in [200, 201]:
                    token = res.json().get('accessToken')
                    student_tokens[email] = {'token': token, 'rollNumber': roll}
                    
                    # Automatically apply so they have an applicationTimestamp
                    s_session = requests.Session()
                    s_session.headers.update({"Authorization": f"Bearer {token}"})
                    s_session.post(f"{NEST_API}/students/me/apply")
                    
                    info = {'email': email, 'rollNumber': roll, 'group_id': f"{cfg['gender']}_{cfg['year']}_c{c_idx}_{g_idx}_{uid}"}
                    grp_students.append(info)
                else:
                    # 👈 CRITICAL FIX: Print the exact error if NestJS rejects it!
                    print(f"   ❌ Failed to register {email}: Status {res.status_code} | Error: {res.text}")

            if grp_students:
                groups_data.append({'group_id': info['group_id'], 'students': grp_students, 'size': size})

    if mode == "fcfs":
        print("ℹ️ FCFS mode: Skipping group formation and roommate invitations.")
        print("✅ All students generated individually!")
        return

    print("🤝 Forming Groups...")
    pending = []
    for g in groups_data:
        if g['size'] < 2: continue
        leader = g['students'][0]
        ls = requests.Session()
        ls.headers.update({"Authorization": f"Bearer {student_tokens[leader['email']]['token']}"})
        
        g_res = ls.post(f"{NEST_API}/groups", json={"name": f"Group_{g['group_id']}"})
        if g_res.status_code in [200, 201]:
            gid = g_res.json().get('id')
            for m in g['students'][1:]:
                ls.post(f"{NEST_API}/groups/{gid}/invitations", json={"rollNumber": m['rollNumber']})
                pending.append({'gid': gid, 'email': m['email']})

    print("📧 Accepting invitations...")
    for p in pending:
        ms = requests.Session()
        ms.headers.update(
            {"Authorization": f"Bearer {student_tokens[p['email']]['token']}"}
        )
        ms.patch(
            f"{NEST_API}/groups/me/invitations/{p['gid']}", json={"status": "accepted"}
        )

    print("🤝 Creating Roommate Preferences...")
    for g in groups_data:
        if g["size"] < 2:
            continue
        # Only create roommate preferences for 50% of multi-person groups
        if random.random() > 0.5:
            continue

        # Pick two students from the group to be roommates
        members = g["students"]
        if len(members) >= 2:
            s1, s2 = members[0], members[1]

            s1_session = requests.Session()
            s1_session.headers.update(
                {"Authorization": f"Bearer {student_tokens[s1['email']]['token']}"}
            )

            # s1 sends invitation to s2
            rm_res = s1_session.post(
                f"{NEST_API}/roommate-invitations/send",
                json={"receiverRollNumber": s2["rollNumber"]},
            )
            if rm_res.status_code in [200, 201]:
                inv_id = rm_res.json().get("id")

                s2_session = requests.Session()
                s2_session.headers.update(
                    {"Authorization": f"Bearer {student_tokens[s2['email']]['token']}"}
                )

                # s2 accepts
                s2_session.post(
                    f"{NEST_API}/roommate-invitations/{inv_id}/respond",
                    json={"status": "accepted"},
                )

    print("✅ All students, groups, and roommate preferences generated!")

if __name__ == "__main__":
    print("=" * 60)
    print("🎓 HOSTEL ALLOCATION SEEDER")
    print("=" * 60)
    create_admin()
    enable_applications()
    clear_database()
    setup_hostels()
    create_allocation_rules()
    mode = get_allocation_mode()
    generate_students_and_groups(mode)
    print("\n✅ DATABASE SUCCESSFULLY SEEDED. PROCEED TO UI TO RUN ALLOCATION.")
    print("=" * 60)