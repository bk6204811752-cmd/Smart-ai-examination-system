"""
Pytest Configuration and Fixtures
"""
import pytest
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from httpx import AsyncClient
from app_production import app
from database import get_db
from config import settings


# Test database configuration
TEST_DB_NAME = "pcmt_exam_test"


# NOTE:
# Do not override pytest-asyncio's event loop at session scope.
# Overriding can cause 'RuntimeError: Event loop is closed' with Motor.
# If a custom loop is required, keep it function-scoped.



@pytest.fixture(scope="session")
async def test_db():
    """Create test database connection"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[TEST_DB_NAME]
    yield db
    # Cleanup: Drop test database after all tests
    # Atlas test users may not have dropDatabase permission. In tests we only need isolation,
    # so ignore dropDatabase permission errors.
    try:
        await client.drop_database(TEST_DB_NAME)
    except Exception:
        pass
    client.close()



@pytest.fixture
async def clean_db(test_db):
    """Clean database before each test"""
    # Drop all collections
    for collection_name in await test_db.list_collection_names():
        await test_db.drop_collection(collection_name)
    yield test_db


@pytest.fixture
async def client(test_db):
    """Create test HTTP client"""
    
    # Override database dependency
    async def override_get_db():
        return test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(clean_db):
    """Create test user"""
    from utils.password import hash_password
    
    user = {
        "email": "test@pcmt.edu.in",
        "password": hash_password("testpass123"),
        "full_name": "Test User",
        "role": "student",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "program": "BCA",
        "semester": 1,
    }
    result = await clean_db.users.insert_one(user)
    user["_id"] = result.inserted_id
    return user


@pytest.fixture
async def test_teacher(clean_db):
    """Create test teacher"""
    from utils.password import hash_password
    
    teacher = {
        "email": "teacher.test@pcmt.edu.in",
        "password": hash_password("teacherpass123"),
        "full_name": "Test Teacher",
        "role": "teacher",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
        "department": "Computer Science",
    }
    result = await clean_db.users.insert_one(teacher)
    teacher["_id"] = result.inserted_id
    return teacher


@pytest.fixture
async def test_admin(clean_db):
    """Create test admin"""
    from utils.password import hash_password
    
    admin = {
        "email": "admin.test@pcmt.edu.in",
        "password": hash_password("adminpass123"),
        "full_name": "Test Admin",
        "role": "admin",
        "status": "approved",
        "is_active": True,
        "email_verified": True,
    }
    result = await clean_db.users.insert_one(admin)
    admin["_id"] = result.inserted_id
    return admin


@pytest.fixture
async def auth_token(client, test_user):
    """Get authentication token for test user"""
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@pcmt.edu.in", "password": "testpass123"}
    )
    return response.json()["access_token"]


@pytest.fixture
async def teacher_token(client, test_teacher):
    """Get authentication token for test teacher"""
    response = await client.post(
        "/api/auth/login",
        json={"email": "teacher.test@pcmt.edu.in", "password": "teacherpass123"}
    )
    return response.json()["access_token"]


@pytest.fixture
async def admin_token(client, test_admin):
    """Get authentication token for test admin"""
    response = await client.post(
        "/api/auth/login",
        json={"email": "admin.test@pcmt.edu.in", "password": "adminpass123"}
    )
    return response.json()["access_token"]


@pytest.fixture
async def test_exam(clean_db, test_teacher):
    """Create test exam"""
    exam = {
        "title": "Test Exam",
        "subject": "Computer Science",
        "difficulty": "Medium",
        "duration": 60,
        "total_questions": 5,
        "exam_type": "Regular",
        "status": "active",
        "created_by": test_teacher["_id"],
        "program": "BCA",
        "semester": 1,
        "passing_marks": 60,
        "proctoring_level": "standard",
        "shuffle_questions": True,
        "show_results": True,
        "questions": [
            {
                "question": "What is Python?",
                "options": ["Language", "Snake", "Tool", "Framework"],
                "correct_answer": 0,
                "marks": 2,
                "difficulty": "Easy"
            },
            {
                "question": "What is FastAPI?",
                "options": ["Library", "Framework", "Database", "Server"],
                "correct_answer": 1,
                "marks": 2,
                "difficulty": "Medium"
            }
        ]
    }
    result = await clean_db.exams.insert_one(exam)
    exam["_id"] = result.inserted_id
    return exam
