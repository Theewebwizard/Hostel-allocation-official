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
            "allocation_decisions",
            "allocation_runs", 
            "group_memberships",
            "groups",
            "rooms",
            "hostels",
            "students"
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
    print("\n📋 Creating Allocation Rules...")
    hostels = session.get(f"{NEST_API}/admin/hostels").json()
    hm = {h['name']: h['id'] for h in hostels}
    rules = [
        {"hostelId": hm.get('BH1'), "wing": "A", "year": 1, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH1'), "wing": "B", "year": 1, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH1'), "wing": "E", "year": 4, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH2'), "wing": "C", "year": 1, "isAllowed": True, "priority": 15},
        {"hostelId": hm.get('BH2'), "wing": "C", "year": 2, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH2'), "wing": "C", "year": 3, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH2'), "wing": "C", "year": 4, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH2'), "wing": "D", "year": 4, "isAllowed": True, "priority": 15},
        {"hostelId": hm.get('BH2'), "wing": "D", "year": 1, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH2'), "wing": "D", "year": 2, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH2'), "wing": "D", "year": 3, "isAllowed": False, "priority": 15},
        {"hostelId": hm.get('BH3'), "year": 3, "isAllowed": True, "priority": 10},
        {"hostelId": hm.get('BH3'), "year": 1, "isAllowed": False, "priority": 10},
        {"hostelId": hm.get('BH3'), "year": 2, "isAllowed": False, "priority": 10},
        {"hostelId": hm.get('BH3'), "year": 4, "isAllowed": False, "priority": 10},
        {"hostelId": hm.get('BH4'), "year": 2, "isAllowed": True, "priority": 10},
        {"hostelId": hm.get('BH4'), "year": 1, "isAllowed": False, "priority": 10},
        {"hostelId": hm.get('BH4'), "year": 3, "isAllowed": False, "priority": 10},
        {"hostelId": hm.get('BH4'), "year": 4, "isAllowed": False, "priority": 10},
    ]
    for r in rules: session.post(f"{NEST_API}/admin/rules", json=r)
    print("✅ Allocation rules configured.")

def generate_students_and_groups():
    print("\n🎓 Generating Students & Groups (Exactly 240)...")
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
                    
                    info = {'email': email, 'rollNumber': roll, 'group_id': f"{cfg['gender']}_{cfg['year']}_c{c_idx}_{g_idx}_{uid}"}
                    grp_students.append(info)
                else:
                    # 👈 CRITICAL FIX: Print the exact error if NestJS rejects it!
                    print(f"   ❌ Failed to register {email}: Status {res.status_code} | Error: {res.text}")

            if grp_students:
                groups_data.append({'group_id': info['group_id'], 'students': grp_students, 'size': size})

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
        ms.headers.update({"Authorization": f"Bearer {student_tokens[p['email']]['token']}"})
        ms.patch(f"{NEST_API}/groups/me/invitations/{p['gid']}", json={"status": "accepted"})
    
    print("✅ All students and groups generated!")

if __name__ == "__main__":
    print("=" * 60)
    print("🎓 HOSTEL ALLOCATION SEEDER")
    print("=" * 60)
    create_admin()
    clear_database()
    setup_hostels()
    create_allocation_rules()
    generate_students_and_groups()
    print("\n✅ DATABASE SUCCESSFULLY SEEDED. PROCEED TO UI TO RUN ALLOCATION.")
    print("=" * 60)