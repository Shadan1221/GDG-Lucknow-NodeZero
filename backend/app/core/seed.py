from sqlalchemy.orm import Session
from app.core.database import Base, engine
from app.models.models import User, Department
from app.core.security import get_password_hash

def seed_db(db: Session):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Check if departments already exist
    if db.query(Department).first() is not None:
        print("Database already seeded.")
        return
        
    print("Seeding database...")
    
    # 1. Create Departments
    departments_data = [
        {"name": "Water Supply & Sewage", "code": "WATER", "description": "Drinking water supply, pipeline issues, leakage, and sewage problems."},
        {"name": "Roads & Civil Infrastructure", "code": "ROADS", "description": "Potholes, road construction, street lights, and broken pavements."},
        {"name": "Waste Management & Sanitation", "code": "SAN", "description": "Garbage disposal, drain cleaning, public toilets, and sanitation."},
        {"name": "Electricity & Power Distribution", "code": "ELEC", "description": "Power cuts, transformer failures, hanging wires, and billing discrepancies."},
        {"name": "Anti-Corruption & Grievances", "code": "CORR", "description": "Bribe complaints, fraud, government official misconduct, and red-tape."},
        {"name": "Encroachment & Land Disputes", "code": "ENC", "description": "Illegal construction, shop extensions on footpaths, public property encroachment."}
    ]
    
    departments = {}
    for dept_info in departments_data:
        dept = Department(
            name=dept_info["name"],
            code=dept_info["code"],
            description=dept_info["description"]
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        departments[dept_info["code"]] = dept
        
    # 2. Create Officer Users mapped to Departments
    officers_data = [
        {"username": "officer_water", "email": "water@lucknow.gov.in", "role": "officer", "dept_code": "WATER"},
        {"username": "officer_roads", "email": "roads@lucknow.gov.in", "role": "officer", "dept_code": "ROADS"},
        {"username": "officer_san", "email": "sanitation@lucknow.gov.in", "role": "officer", "dept_code": "SAN"},
        {"username": "officer_elec", "email": "power@lucknow.gov.in", "role": "officer", "dept_code": "ELEC"},
        {"username": "officer_corr", "email": "anticorruption@lucknow.gov.in", "role": "officer", "dept_code": "CORR"},
        {"username": "officer_enc", "email": "encroachment@lucknow.gov.in", "role": "officer", "dept_code": "ENC"}
    ]
    
    for off_info in officers_data:
        officer = User(
            username=off_info["username"],
            email=off_info["email"],
            hashed_password=get_password_hash("password123"),
            role=off_info["role"],
            department_id=departments[off_info["dept_code"]].id
        )
        db.add(officer)
        
    # 3. Create General Users (Admin, Supervisor, Citizen)
    admin_user = User(
        username="admin",
        email="admin@lucknow.gov.in",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin_user)
    
    supervisor_user = User(
        username="commissioner_lucknow",
        email="commissioner@lucknow.gov.in",
        hashed_password=get_password_hash("password123"),
        role="supervisor"
    )
    db.add(supervisor_user)
    
    citizen_user = User(
        username="qambar",
        email="qambar@test.com",
        hashed_password=get_password_hash("password123"),
        role="citizen"
    )
    db.add(citizen_user)
    
    db.commit()
    print("Database seeding completed.")
