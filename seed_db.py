# seed_db.py
import asyncio
import os
import sys
from bson import ObjectId

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from database import connect_db, get_db, disconnect_db
from utils.seeder import seed_database
from utils.password import hash_password

async def main():
    print("[*] Connecting to MongoDB database...")
    await connect_db()
    db = get_db()
    
    print("[*] Cleaning up old demo/seed data to prevent duplicate key conflicts...")
    
    # 1. Delete default users
    emails = ["admin@pcmt.edu.in", "teacher@pcmt.edu.in", "student@pcmt.edu.in"]
    result_users = await db.users.delete_many({"email": {"$in": emails}})
    print(f"    Deleted {result_users.deleted_count} demo users.")
    
    # 2. Delete sample exams
    exams = ["Python Programming Fundamentals", "Database Management Systems", "Marketing Management"]
    result_exams = await db.exams.delete_many({"title": {"$in": exams}})
    print(f"    Deleted {result_exams.deleted_count} sample exams.")
    
    # 3. Delete sample submissions (hardcoded IDs in seeder)
    submission_ids = [
        ObjectId("66b000000000000000000001"),
        ObjectId("66b000000000000000000002"),
        ObjectId("66b000000000000000000003")
    ]
    result_subs = await db.submissions.delete_many({"_id": {"$in": submission_ids}})
    print(f"    Deleted {result_subs.deleted_count} sample submissions.")
    
    print("[*] Seeding database with sample exams and results...")
    # Call seed_database which will populate the users, exams, and student submissions
    await seed_database(db)
    
    print("[*] Updating passwords to match frontend Quick Login buttons...")
    # Update to strong passwords
    await db.users.update_one({"email": "admin@pcmt.edu.in"}, {"$set": {"password": hash_password("Admin@123")}})
    await db.users.update_one({"email": "teacher@pcmt.edu.in"}, {"$set": {"password": hash_password("Teacher@123")}})
    await db.users.update_one({"email": "student@pcmt.edu.in"}, {"$set": {"password": hash_password("Student@123")}})
    print("    Updated user passwords to Admin@123, Teacher@123, Student@123.")
    
    print("[OK] Database seeding finished successfully!")
    await disconnect_db()

if __name__ == "__main__":
    asyncio.run(main())
