# 🧪 COMPREHENSIVE TESTING GUIDE

**PCMT Smart AI Exam System - v2.0.0**

---

## Table of Contents

1. [Backend Testing](#backend-testing)
2. [Frontend Testing](#frontend-testing)
3. [Integration Testing](#integration-testing)
4. [Test Coverage](#test-coverage)
5. [Continuous Integration](#continuous-integration)
6. [Writing New Tests](#writing-new-tests)

---

## Backend Testing

### Setup

```bash
cd backend
pip install -r requirements.txt
```

### Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v

# Run specific test
pytest tests/test_auth.py::TestAuth::test_login_success -v

# Run with coverage
pytest tests/ -v --cov=. --cov-report=html

# Run tests in parallel (faster)
pytest tests/ -v -n auto

# View coverage report
# Open backend/htmlcov/index.html in browser
```

### Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── test_auth.py             # Authentication tests
├── test_exams.py            # Exam endpoint tests
└── test_security.py         # Security tests
```

### Available Fixtures

```python
# In conftest.py

@pytest.fixture
async def client(test_db):
    """HTTP test client"""
    
@pytest.fixture
async def test_user(clean_db):
    """Create test student"""
    
@pytest.fixture
async def test_teacher(clean_db):
    """Create test teacher"""
    
@pytest.fixture
async def test_admin(clean_db):
    """Create test admin"""
    
@pytest.fixture
async def auth_token(client, test_user):
    """Get student auth token"""
    
@pytest.fixture
async def teacher_token(client, test_teacher):
    """Get teacher auth token"""
    
@pytest.fixture
async def admin_token(client, test_admin):
    """Get admin auth token"""
    
@pytest.fixture
async def test_exam(clean_db, test_teacher):
    """Create test exam"""
```

### Example Test

```python
import pytest
from httpx import AsyncClient

class TestAuth:
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user):
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "test@pcmt.edu.in",
                "password": "testpass123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@pcmt.edu.in"
```

---

## Frontend Testing

### Setup

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm run test

# Run with UI (interactive)
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- tests/lib/api.test.ts

# Watch mode (re-run on changes)
npm run test -- --watch
```

### Test Structure

```
src/tests/
├── setup.ts                 # Test setup & mocks
├── lib/
│   └── api.test.ts         # API client tests
├── store/
│   └── authStore.test.ts   # State management tests
└── utils/
    └── validation.test.ts  # Validation tests
```

### Example Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../store/globalStore'

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })

  it('should initialize with default state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set user and token on login', () => {
    const mockUser = {
      _id: '123',
      email: 'test@pcmt.edu.in',
      full_name: 'Test User',
      role: 'student',
    }
    const mockToken = 'test_token_123'

    useAuthStore.getState().setUser(mockUser)
    useAuthStore.setState({ token: mockToken, isAuthenticated: true })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.token).toBe(mockToken)
    expect(state.isAuthenticated).toBe(true)
  })
})
```

---

## Integration Testing

### Full Stack Testing

```bash
# Terminal 1: Start backend
cd backend
python app_production.py

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Run integration tests
npm run test:integration  # (when implemented)
```

### API Testing (Manual)

```bash
# Using curl
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@pcmt.edu.in","password":"student123"}'

# Using httpx (Python)
import httpx
response = httpx.post(
    "http://localhost:8000/api/auth/login",
    json={"email": "student@pcmt.edu.in", "password": "student123"}
)
print(response.json())
```

---

## Test Coverage

### Backend Coverage

```bash
cd backend
pytest tests/ -v --cov=. --cov-report=html --cov-report=term

# View HTML report
open htmlcov/index.html  # macOS
start htmlcov/index.html # Windows
```

### Frontend Coverage

```bash
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

### Coverage Goals

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| Backend Routes | 40% | 70% | 🟡 In Progress |
| Backend Utils | 60% | 80% | 🟡 In Progress |
| Frontend Components | 0% | 60% | 🔴 Not Started |
| Frontend Utils | 30% | 70% | 🟡 In Progress |
| **Overall** | **40%** | **70%** | 🟡 **In Progress** |

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Running Locally

```bash
# Simulate CI pipeline
npm run deploy:check

# This runs:
# 1. npm run format:check (Prettier)
# 2. npm run lint (ESLint)
# 3. npm run type-check (TypeScript)
# 4. npm run test (Vitest)
# 5. cd backend && pytest tests/
```

---

## Writing New Tests

### Backend Test Template

```python
# backend/tests/test_new_feature.py

import pytest
from httpx import AsyncClient
from bson import ObjectId


class TestNewFeature:
    """Test new feature"""
    
    @pytest.mark.asyncio
    async def test_feature_success(self, client: AsyncClient, auth_token):
        """Test successful case"""
        response = await client.post(
            "/api/new-endpoint",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"data": "test"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    @pytest.mark.asyncio
    async def test_feature_unauthorized(self, client: AsyncClient):
        """Test unauthorized access"""
        response = await client.post(
            "/api/new-endpoint",
            json={"data": "test"}
        )
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_feature_validation(self, client: AsyncClient, auth_token):
        """Test input validation"""
        response = await client.post(
            "/api/new-endpoint",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"invalid": "data"}
        )
        assert response.status_code == 422
```

### Frontend Test Template

```typescript
// src/tests/components/NewComponent.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NewComponent from '../../components/NewComponent'

describe('NewComponent', () => {
  it('should render correctly', () => {
    render(<NewComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<NewComponent onClick={handleClick} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should display error state', () => {
    render(<NewComponent error="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
```

### Test Best Practices

1. **AAA Pattern**
   ```python
   async def test_example(self, client):
       # Arrange
       data = {"email": "test@example.com"}
       
       # Act
       response = await client.post("/api/endpoint", json=data)
       
       # Assert
       assert response.status_code == 200
   ```

2. **Clear Test Names**
   ```python
   # Good ✅
   def test_login_with_invalid_password_returns_401(self):
   
   # Bad ❌
   def test_login(self):
   ```

3. **One Assertion Per Test** (when possible)
   ```python
   # Good ✅
   def test_returns_correct_status_code(self):
       assert response.status_code == 200
   
   def test_returns_correct_data(self):
       assert response.json()["email"] == "test@example.com"
   
   # Acceptable for related assertions
   def test_returns_complete_user_object(self):
       data = response.json()
       assert data["email"] == "test@example.com"
       assert data["full_name"] == "Test User"
       assert "password" not in data
   ```

4. **Use Fixtures**
   ```python
   # Instead of duplicating setup
   @pytest.fixture
   async def exam_with_questions(db, test_teacher):
       exam = {...}
       result = await db.exams.insert_one(exam)
       exam["_id"] = result.inserted_id
       return exam
   
   # Use in tests
   async def test_exam(self, exam_with_questions):
       assert exam_with_questions["total_questions"] == 5
   ```

---

## Troubleshooting

### Common Issues

#### Backend Tests Fail with "Database Connection Error"

**Solution:**
```bash
# Check MongoDB is running
mongosh --eval "db.version()"

# Or use MongoDB Atlas connection
export MONGODB_URI="mongodb+srv://..."
pytest tests/ -v
```

#### Frontend Tests Fail with "Cannot find module"

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or check path aliases in vitest.config.ts
```

#### Tests Pass Locally but Fail in CI

**Solution:**
- Check environment variables
- Verify Node/Python versions match
- Check timezone differences (use UTC in tests)

---

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

**Last Updated:** July 7, 2026  
**Version:** 2.0.0
