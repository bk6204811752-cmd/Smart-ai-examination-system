"""
Database Seeder
Seeds demo accounts and sample exam data on first startup
"""

import os
from datetime import datetime, timedelta
import random
from utils.password import hash_password
from bson import ObjectId


def _is_production() -> bool:
    vercel_env = os.getenv("VERCEL_ENV", "").lower()
    render_env = os.getenv("RENDER", "").lower()
    env = os.getenv("ENVIRONMENT", "development").lower()
    return vercel_env == "production" or render_env == "true" or env in ["production", "prod"]


DEMO_USERS = [
    {
        "_id": ObjectId("66a000000000000000000001"),
        "email": "admin@pcmt.edu.in",
        "password": "admin123",
        "full_name": "Admin User",
        "role": "admin",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "department": "Administration",
        "created_at": "2025-01-01T00:00:00",
    },
    {
        "_id": ObjectId("66a000000000000000000002"),
        "email": "teacher@pcmt.edu.in",
        "password": "teacher123",
        "full_name": "Prof. Rajesh Kumar",
        "role": "teacher",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "department": "Computer Science",
        "created_at": "2025-01-01T00:00:00",
    },
    {
        "_id": ObjectId("66a000000000000000000003"),
        "email": "student@pcmt.edu.in",
        "password": "student123",
        "full_name": "Priya Sharma",
        "role": "student",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "program": "BCA",
        "semester": 4,
        "cgpa": 8.5,
        "created_at": "2025-01-01T00:00:00",
    },
]


SAMPLE_EXAMS = [
    {
        "title": "Python Programming Fundamentals",
        "subject": "Computer Science",
        "difficulty": "Medium",
        "duration": 60,
        "exam_type": "Regular",
        "program": "BCA",
        "passing_marks": 60,
        "proctoring_level": "standard",
        "instructions": "Read all questions carefully. Each question carries 1 mark.",
        "status": "active",
        "questions": [
            {"question": "Which of the following is a mutable data type in Python?", "options": ["Tuple", "String", "List", "Integer"], "correct_answer": 2, "explanation": "Lists are mutable in Python, meaning they can be changed after creation.", "marks": 1},
            {"question": "What is the output of print(type([]))?", "options": ["<class 'tuple'>", "<class 'list'>", "<class 'dict'>", "<class 'set'>"], "correct_answer": 1, "explanation": "[] creates a list object, so type([]) returns <class 'list'>.", "marks": 1},
            {"question": "Which keyword is used to define a function in Python?", "options": ["function", "def", "define", "func"], "correct_answer": 1, "explanation": "The 'def' keyword is used to define functions in Python.", "marks": 1},
            {"question": "What does len('Hello') return?", "options": ["4", "5", "6", "Error"], "correct_answer": 1, "explanation": "'Hello' has 5 characters, so len() returns 5.", "marks": 1},
            {"question": "Which of the following is NOT a Python data type?", "options": ["int", "float", "char", "str"], "correct_answer": 2, "explanation": "Python does not have a 'char' data type. Individual characters are strings.", "marks": 1},
            {"question": "What is the result of 5 // 2 in Python?", "options": ["2.5", "2", "3", "1"], "correct_answer": 1, "explanation": "// is the floor division operator, which returns the integer quotient.", "marks": 1},
            {"question": "Which method is used to add an element at the end of a list?", "options": ["add()", "append()", "insert()", "extend()"], "correct_answer": 1, "explanation": "The append() method adds a single element to the end of a list.", "marks": 1},
            {"question": "What does the 'self' parameter in a class method refer to?", "options": ["The class itself", "The parent class", "The current instance", "A static method"], "correct_answer": 2, "explanation": "'self' refers to the current instance of the class.", "marks": 1},
            {"question": "Which of the following is used for exception handling in Python?", "options": ["try-catch", "try-except", "try-error", "handle-except"], "correct_answer": 1, "explanation": "Python uses try-except blocks for exception handling.", "marks": 1},
            {"question": "What is a lambda function in Python?", "options": ["A named function", "An anonymous function", "A class method", "A built-in function"], "correct_answer": 1, "explanation": "Lambda functions are anonymous, single-expression functions.", "marks": 1},
        ]
    },
    {
        "title": "Database Management Systems",
        "subject": "Database",
        "difficulty": "Hard",
        "duration": 90,
        "exam_type": "Regular",
        "program": "BCA",
        "passing_marks": 60,
        "proctoring_level": "strict",
        "instructions": "All questions are compulsory. Marks are indicated against each question.",
        "status": "active",
        "questions": [
            {"question": "Which SQL command is used to retrieve data from a database?", "options": ["UPDATE", "INSERT", "SELECT", "DELETE"], "correct_answer": 2, "explanation": "SELECT is used to query and retrieve data from tables.", "marks": 1},
            {"question": "What does ACID stand for in database transactions?", "options": ["Atomicity, Consistency, Isolation, Durability", "Accuracy, Consistency, Integration, Durability", "Atomicity, Correctness, Isolation, Data", "None of the above"], "correct_answer": 0, "explanation": "ACID ensures reliable database transactions.", "marks": 1},
            {"question": "Which key uniquely identifies each row in a table?", "options": ["Foreign Key", "Unique Key", "Primary Key", "Candidate Key"], "correct_answer": 2, "explanation": "Primary Key uniquely identifies each record in a table.", "marks": 1},
            {"question": "What is normalization in databases?", "options": ["Increasing redundancy", "Organizing data to reduce redundancy", "Deleting old data", "Encrypting data"], "correct_answer": 1, "explanation": "Normalization organizes data to reduce redundancy and improve integrity.", "marks": 1},
            {"question": "Which JOIN returns all records from both tables?", "options": ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"], "correct_answer": 3, "explanation": "FULL OUTER JOIN returns all records from both tables, with NULLs for non-matches.", "marks": 1},
            {"question": "What does DDL stand for?", "options": ["Data Definition Language", "Data Deletion Logic", "Database Design Language", "Data Distribution Layer"], "correct_answer": 0, "explanation": "DDL (Data Definition Language) includes CREATE, ALTER, DROP commands.", "marks": 1},
            {"question": "Which normal form deals with multi-valued dependencies?", "options": ["1NF", "2NF", "3NF", "4NF"], "correct_answer": 3, "explanation": "4NF deals with multi-valued dependencies.", "marks": 1},
            {"question": "What is a foreign key?", "options": ["A key from another country", "A key that references primary key of another table", "A key that is unique", "A key that auto-increments"], "correct_answer": 1, "explanation": "Foreign key establishes referential integrity between tables.", "marks": 1},
            {"question": "Which command removes all rows from a table without logging?", "options": ["DELETE", "DROP", "TRUNCATE", "REMOVE"], "correct_answer": 2, "explanation": "TRUNCATE removes all rows quickly without logging individual row deletions.", "marks": 1},
            {"question": "What is an index in a database?", "options": ["A list of tables", "A data structure to speed up queries", "A primary key", "A foreign key constraint"], "correct_answer": 1, "explanation": "Indexes improve query performance by allowing faster data retrieval.", "marks": 1},
        ]
    },
    {
        "title": "Business Management Principles",
        "subject": "Management",
        "difficulty": "Easy",
        "duration": 45,
        "exam_type": "Regular",
        "program": "BBA",
        "passing_marks": 60,
        "proctoring_level": "basic",
        "instructions": "Choose the most appropriate answer for each question.",
        "status": "active",
        "questions": [
            {"question": "What is the primary goal of management?", "options": ["Maximizing profits only", "Achieving organizational goals efficiently", "Reducing employee count", "Increasing production costs"], "correct_answer": 1, "explanation": "Management aims to achieve organizational goals through efficient use of resources.", "marks": 1},
            {"question": "Which of the following is a function of management?", "options": ["Planning", "Competing", "Selling", "Manufacturing"], "correct_answer": 0, "explanation": "Planning is one of the four key functions: Planning, Organizing, Leading, Controlling.", "marks": 1},
            {"question": "What does SWOT stand for in business analysis?", "options": ["Strengths, Weaknesses, Opportunities, Threats", "Systems, Work, Output, Technology", "Strategy, Workflow, Operations, Tactics", "None of the above"], "correct_answer": 0, "explanation": "SWOT analysis helps evaluate internal and external factors affecting a business.", "marks": 1},
            {"question": "Who is considered the father of scientific management?", "options": ["Henry Fayol", "Frederick Taylor", "Peter Drucker", "Max Weber"], "correct_answer": 1, "explanation": "Frederick Taylor is known as the father of scientific management.", "marks": 1},
            {"question": "What is organizational behavior?", "options": ["Study of animal behavior", "Study of how people behave in organizations", "Company financial reports", "Legal structure of a company"], "correct_answer": 1, "explanation": "OB studies individual and group behavior within organizational settings.", "marks": 1},
        ]
    },
    {
        "title": "Data Structures and Algorithms",
        "subject": "Computer Science",
        "difficulty": "Hard",
        "duration": 90,
        "exam_type": "Mid-term",
        "program": "B.Tech",
        "passing_marks": 60,
        "proctoring_level": "strict",
        "instructions": "Attempt all questions. Diagrams and explanations may be required.",
        "status": "active",
        "questions": [
            {"question": "What is the time complexity of binary search?", "options": ["O(n)", "O(log n)", "O(n)", "O(1)"], "correct_answer": 1, "explanation": "Binary search divides the search space in half each step, giving O(log n).", "marks": 1},
            {"question": "Which data structure uses LIFO principle?", "options": ["Queue", "Stack", "Tree", "Graph"], "correct_answer": 1, "explanation": "Stack follows Last In First Out (LIFO) principle.", "marks": 1},
            {"question": "What is a Binary Search Tree (BST)?", "options": ["A tree with 2 nodes", "A tree where left < root < right", "A tree with equal nodes", "A balanced tree always"], "correct_answer": 1, "explanation": "In BST, left subtree has values less than root and right subtree has greater values.", "marks": 1},
            {"question": "Which sorting algorithm has the best average case time complexity?", "options": ["Bubble Sort", "Insertion Sort", "Quick Sort", "Selection Sort"], "correct_answer": 2, "explanation": "Quick Sort has O(n log n) average case complexity.", "marks": 1},
            {"question": "What is the space complexity of merge sort?", "options": ["O(1)", "O(log n)", "O(n)", "O(n)"], "correct_answer": 2, "explanation": "Merge sort requires O(n) extra space for the temporary array.", "marks": 1},
            {"question": "Which traversal visits root first, then left, then right?", "options": ["Inorder", "Postorder", "Preorder", "Level order"], "correct_answer": 2, "explanation": "Preorder traversal: Root  Left  Right", "marks": 1},
            {"question": "What is dynamic programming?", "options": ["Random programming", "Breaking problems into overlapping subproblems", "Object-oriented design", "Functional programming"], "correct_answer": 1, "explanation": "DP solves complex problems by breaking them into simpler overlapping subproblems.", "marks": 1},
            {"question": "Dijkstra's algorithm is used for?", "options": ["Sorting", "Finding shortest path", "Tree traversal", "Hashing"], "correct_answer": 1, "explanation": "Dijkstra's algorithm finds the shortest path in a weighted graph.", "marks": 1},
            {"question": "What is a hash collision?", "options": ["Two keys mapping to same hash value", "A broken hash function", "Two tables merging", "An array overflow"], "correct_answer": 0, "explanation": "Hash collision occurs when two different keys produce the same hash value.", "marks": 1},
            {"question": "What is the height of a balanced binary tree with n nodes?", "options": ["O(n)", "O(log n)", "O(n)", "O(1)"], "correct_answer": 1, "explanation": "A balanced binary tree has height O(log n).", "marks": 1},
        ]
    },
    {
        "title": "Marketing Management",
        "subject": "Marketing",
        "difficulty": "Medium",
        "duration": 60,
        "exam_type": "Regular",
        "program": "MBA",
        "passing_marks": 60,
        "proctoring_level": "standard",
        "instructions": "All questions are compulsory.",
        "status": "active",
        "questions": [
            {"question": "What are the 4 Ps of marketing?", "options": ["Product, Price, Place, Promotion", "People, Process, Price, Place", "Product, Profit, Place, People", "None of the above"], "correct_answer": 0, "explanation": "The 4 Ps framework is the foundation of the marketing mix.", "marks": 1},
            {"question": "What is market segmentation?", "options": ["Dividing the market into distinct groups", "Selling to everyone", "Reducing product variety", "Cutting marketing budget"], "correct_answer": 0, "explanation": "Market segmentation helps target specific customer groups effectively.", "marks": 1},
            {"question": "Which pricing strategy sets initial high prices?", "options": ["Penetration pricing", "Skimming pricing", "Cost-plus pricing", "Value pricing"], "correct_answer": 1, "explanation": "Price skimming sets high initial prices to capture maximum revenue from early adopters.", "marks": 1},
            {"question": "What is brand equity?", "options": ["Brand logo design", "Market share only", "Value premium a brand commands", "Advertising budget"], "correct_answer": 2, "explanation": "Brand equity is the value derived from consumer perception of a brand.", "marks": 1},
            {"question": "What does CRM stand for in marketing?", "options": ["Customer Relationship Management", "Company Revenue Model", "Creative Resource Management", "Consumer Research Method"], "correct_answer": 0, "explanation": "CRM systems help manage company interactions and relationships with customers.", "marks": 1},
        ]
    },
]


async def seed_database(db):
    """Seed the database with demo users and sample data"""
    print(" Checking if seeding is required...")

    # Check if admin already exists
    existing_admin = await db.users.find_one({"email": "admin@pcmt.edu.in"})
    if existing_admin:
        print(" Database already seeded - skipping")
        return

    print(" Seeding database with demo accounts and sample data...")

    # Seed users
    user_ids = {}
    for user_data in DEMO_USERS:
        doc = {**user_data}
        doc["password"] = hash_password(doc["password"])
        doc.setdefault("preferences", {
            "theme": "light",
            "fontSize": "medium",
            "language": "en",
            "notifications": {
                "email": True, "push": True, "sms": False,
                "examReminders": True, "resultNotifications": True, "systemUpdates": True
            },
            "accessibility": {
                "highContrast": False, "largeText": False,
                "colorBlindMode": "none", "screenReader": False, "keyboardOnly": False
            }
        })
        doc.setdefault("statistics", {
            "totalExamsTaken": 0,
            "averageScore": 0,
            "studyHours": 0,
            "rank": 0,
            "achievements": []
        })
        result = await db.users.insert_one(doc)
        user_ids[doc["email"]] = result.inserted_id
        print(f"   Created user: {doc['email']}")

    # Seed exams
    teacher_id = user_ids.get("teacher@pcmt.edu.in")
    exam_ids = []
    for idx, exam_data in enumerate(SAMPLE_EXAMS):
        doc = {**exam_data}
        doc["_id"] = ObjectId(f"66e00000000000000000000{idx+1}")
        doc["created_by"] = teacher_id
        doc["created_at"] = datetime.utcnow().isoformat()
        doc["submissions_count"] = 0
        doc["total_questions"] = len(doc["questions"])
        result = await db.exams.insert_one(doc)
        exam_ids.append(doc["_id"])
        print(f"   Created exam: {doc['title']}")

    # Seed sample results for the student
    student_id = user_ids.get("student@pcmt.edu.in")
    if student_id and exam_ids:
        for i, exam_oid in enumerate(exam_ids[:3]):
            exam = SAMPLE_EXAMS[i]
            questions = exam["questions"]
            num_correct = random.randint(6, 10)
            answers = {}
            for j, q in enumerate(questions):
                if j < num_correct:
                    answers[str(j)] = q["correct_answer"]
                else:
                    wrong = (q["correct_answer"] + 1) % len(q["options"])
                    answers[str(j)] = wrong

            score = num_correct
            total = len(questions)
            percentage = round(score / total * 100, 2)
            past_date = datetime.utcnow() - timedelta(days=random.randint(5, 30))

            submission = {
                "_id": ObjectId(f"66b00000000000000000000{i+1}"),
                "exam_id": str(exam_oid),
                "exam_title": exam["title"],
                "student_id": str(student_id),
                "student_name": "Priya Sharma",
                "answers": answers,
                "score": score,
                "total": total,
                "percentage": percentage,
                "time_taken": random.randint(1800, 3000),
                "date": past_date.isoformat(),
                "proctoring_violations": random.randint(0, 2),
                "passed": percentage >= 60,
            }
            await db.submissions.insert_one(submission)
            print(f"   Created result: {exam['title']} - {percentage}%")

    print(" Database seeding complete!")


# ── Always-On Demo Account Seeder ─────────────────────────────────────────────
# These 3 accounts are ALWAYS created on startup (regardless of SEED_DEMO_DATA)
# so the Quick Demo buttons on the login page always work.

CORE_DEMO_ACCOUNTS = [
    {
        "email": "admin@pcmt.edu.in",
        "password": "Admin@123",        # Passes strength validator
        "full_name": "Admin User",
        "role": "admin",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "department": "Administration",
    },
    {
        "email": "teacher@pcmt.edu.in",
        "password": "Teacher@123",      # Passes strength validator
        "full_name": "Prof. Rajesh Kumar",
        "role": "teacher",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "department": "Computer Science",
    },
    {
        "email": "student@pcmt.edu.in",
        "password": "Student@123",      # Passes strength validator
        "full_name": "Priya Sharma",
        "role": "student",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "program": "BCA",
        "semester": 4,
        "cgpa": 8.5,
    },
]


async def ensure_demo_accounts(db):
    """
    Always ensure the 3 demo accounts exist in the database on startup.
    Creates them if missing. Updates status/password if they exist but are broken.
    Called every startup — safe to call multiple times.
    """
    from utils.password import hash_password

    created = 0
    fixed = 0
    for acc in CORE_DEMO_ACCOUNTS:
        existing = await db.users.find_one({"email": acc["email"]})
        if not existing:
            # Create fresh demo account
            doc = {
                **acc,
                "password": hash_password(acc["password"]),
                "avatar": None,
                "cgpa": acc.get("cgpa"),
                "created_at": datetime.utcnow().isoformat(),
                "last_login": None,
                "preferences": {
                    "theme": "light", "fontSize": "medium", "language": "en",
                    "notifications": {
                        "email": True, "push": True, "sms": False,
                        "examReminders": True, "resultNotifications": True, "systemUpdates": True
                    },
                    "accessibility": {
                        "highContrast": False, "largeText": False,
                        "colorBlindMode": "none", "screenReader": False, "keyboardOnly": False
                    }
                },
                "statistics": {
                    "totalExamsTaken": 0, "averageScore": 0,
                    "studyHours": 0, "rank": 0, "achievements": []
                }
            }
            await db.users.insert_one(doc)
            created += 1
            if not _is_production():
                print(f"   [DEMO] Created: {acc['email']} (password: {acc['password']})")
            else:
                print(f"   [DEMO] Created: {acc['email']}")
        else:
            # Fix broken accounts (unverified, pending, suspended)
            if existing.get("status") not in ("approved",) or not existing.get("email_verified") or not existing.get("is_active"):
                await db.users.update_one(
                    {"email": acc["email"]},
                    {"$set": {
                        "status": "approved",
                        "is_active": True,
                        "email_verified": True,
                        "password": hash_password(acc["password"]),
                    }}
                )
                fixed += 1
                print(f"   [DEMO] Fixed: {acc['email']} (status restored to approved)")

    if created > 0 or fixed > 0:
        print(f" [DEMO] Demo accounts ready: {created} created, {fixed} fixed")
        if not _is_production():
            print(f"   admin@pcmt.edu.in   / Admin@123")
            print(f"   teacher@pcmt.edu.in / Teacher@123")
            print(f"   student@pcmt.edu.in / Student@123")
    else:
        print(" [DEMO] Demo accounts already exist and are healthy.")
