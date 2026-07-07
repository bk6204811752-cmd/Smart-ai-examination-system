"""
MongoDB Database Connection with Proper Error Handling
Uses Motor for MongoDB Atlas. Fails hard in production if connection fails.
"""

import copy
import logging
from bson import ObjectId
from config import settings

logger = logging.getLogger(__name__)

client = None
db = None
_using_memory = False


# ── In-Memory Database Implementation ────────────────────────────────────────

class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class UpdateResult:
    def __init__(self, matched_count):
        self.matched_count = matched_count

class DeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count


class InMemoryCursor:
    def __init__(self, docs):
        self._docs = docs
        self._sort_key = None
        self._sort_rev = False
        self._limit_n = None
        self._skip_n = 0

    def sort(self, field, direction=1):
        self._sort_key = field
        self._sort_rev = (direction == -1)
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    def skip(self, n):
        self._skip_n = n
        return self

    def _get_docs(self):
        docs = list(self._docs)
        if self._sort_key:
            docs = sorted(docs, key=lambda d: str(d.get(self._sort_key, "")), reverse=self._sort_rev)
        if self._skip_n:
            docs = docs[self._skip_n:]
        if self._limit_n:
            docs = docs[:self._limit_n]
        return docs

    def __aiter__(self):
        self._iter = iter(self._get_docs())
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

    async def to_list(self, length=None):
        docs = self._get_docs()
        return docs[:length] if length is not None else docs


class InMemoryAggregateCursor:
    def __init__(self, docs, pipeline):
        self._result = self._run(list(docs), pipeline)

    def _run(self, docs, pipeline):
        for stage in pipeline:
            if "$group" in stage:
                g = stage["$group"]
                buckets = {}
                lists = {}
                for doc in docs:
                    key = doc.get(g["_id"])
                    if key not in buckets:
                        buckets[key] = {}
                        lists[key] = {}
                    for field, expr in g.items():
                        if field == "_id":
                            continue
                        if isinstance(expr, dict) and "$avg" in expr:
                            fname = expr["$avg"].lstrip("$")
                            lists[key].setdefault(field, []).append(doc.get(fname, 0))
                docs = []
                for key in buckets:
                    row = {"_id": key}
                    for f, vals in lists[key].items():
                        row[f] = sum(vals) / len(vals) if vals else 0
                    docs.append(row)
        return docs

    async def to_list(self, length=None):
        return self._result[:length] if length is not None else self._result


class InMemoryCollection:
    def __init__(self):
        self._docs = []

    def _match(self, doc, query):
        if not query:
            return True
        for key, val in query.items():
            if key == "$or":
                if not any(self._match(doc, q) for q in val):
                    return False
            elif isinstance(val, dict):
                dv = doc.get(key)
                for op, ov in val.items():
                    if op == "$in" and dv not in ov:
                        return False
                    elif op == "$nin" and dv in ov:
                        return False
                    elif op == "$gte" and (dv is None or dv < ov):
                        return False
                    elif op == "$lte" and (dv is None or dv > ov):
                        return False
                    elif op == "$ne" and dv == ov:
                        return False
            else:
                # Support ObjectId comparison
                dv = doc.get(key)
                if isinstance(dv, ObjectId):
                    dv = str(dv)
                if isinstance(val, ObjectId):
                    val = str(val)
                if dv != val:
                    return False
        return True

    def _apply_update(self, doc, update):
        if "$set" in update:
            doc.update(update["$set"])
        if "$inc" in update:
            for k, v in update["$inc"].items():
                # Support nested keys like "statistics.totalExamsTaken"
                parts = k.split(".")
                target = doc
                for part in parts[:-1]:
                    target = target.setdefault(part, {})
                target[parts[-1]] = target.get(parts[-1], 0) + v

    async def find_one(self, query=None, projection=None, sort=None, **kwargs):
        """
        Find one document matching query.
        sort: list of (field, direction) tuples e.g. [('created_at', -1)]
        """
        matched = [copy.deepcopy(d) for d in self._docs if self._match(d, query or {})]
        if sort:
            for field, direction in reversed(sort):
                matched.sort(key=lambda d: str(d.get(field, "")), reverse=(direction == -1))
        if not matched:
            return None
        return matched[0]

    def find(self, query=None):
        matched = [copy.deepcopy(d) for d in self._docs if self._match(d, query or {})]
        return InMemoryCursor(matched)

    async def insert_one(self, doc):
        doc = copy.deepcopy(doc)
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self._docs.append(doc)
        return InsertOneResult(doc["_id"])

    async def insert_many(self, docs):
        for doc in docs:
            await self.insert_one(doc)

    async def update_one(self, query, update):
        for doc in self._docs:
            if self._match(doc, query):
                self._apply_update(doc, update)
                return UpdateResult(1)
        return UpdateResult(0)

    async def update_many(self, query, update):
        count = 0
        for doc in self._docs:
            if self._match(doc, query):
                self._apply_update(doc, update)
                count += 1
        return UpdateResult(count)

    async def delete_one(self, query):
        for i, doc in enumerate(self._docs):
            if self._match(doc, query):
                self._docs.pop(i)
                return DeleteResult(1)
        return DeleteResult(0)

    async def delete_many(self, query):
        before = len(self._docs)
        self._docs = [d for d in self._docs if not self._match(d, query)]
        return DeleteResult(before - len(self._docs))

    async def count_documents(self, query=None):
        return sum(1 for d in self._docs if self._match(d, query or {}))

    def aggregate(self, pipeline):
        return InMemoryAggregateCursor(self._docs, pipeline)

    async def create_index(self, *args, **kwargs):
        pass  # no-op


class InMemoryDB:
    def __init__(self):
        self._cols = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        if name not in self._cols:
            self._cols[name] = InMemoryCollection()
        return self._cols[name]

    def __getitem__(self, name):
        return self.__getattr__(name)


# ── Real MongoDB via Motor ────────────────────────────────────────────────────

async def _try_motor():
    from motor.motor_asyncio import AsyncIOMotorClient
    try:
        c = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
        d = c[settings.DATABASE_NAME]
        # Trigger actual connection (will raise if MongoDB is unreachable)
        await d.list_collection_names()
        return c, d
    except Exception as e:
        # Re-raise with a cleaner message
        raise ConnectionError(f"MongoDB connection failed: {type(e).__name__}: {str(e)}") from e


# ── Public API ────────────────────────────────────────────────────────────────

async def connect_db():
    global client, db, _using_memory
    try:
        client, db = await _try_motor()
        await create_indexes()
        logger.info(f"✅ Connected to MongoDB Atlas: {settings.DATABASE_NAME}")
        print(f"[OK] Connected to MongoDB Atlas: {settings.DATABASE_NAME}")
    except Exception as e:
        error_msg = f"MongoDB connection failed: {str(e)}"

        # If in-memory DB is explicitly allowed, always use it as fallback
        # regardless of environment (supports demo deployments on Vercel with broken Atlas)
        if settings.ALLOW_IN_MEMORY_DB:
            print(f"[WARN] {error_msg}")
            print(f"[INFO] Falling back to in-memory database (data resets on restart)")
            logger.warning(f"Falling back to in-memory database. Reason: {str(e)}")
            db = InMemoryDB()
            _using_memory = True
            return

        # FAIL HARD in production when in-memory DB is NOT allowed
        if settings.is_production:
            raise RuntimeError(
                f"Database connection failed in production. "
                f"Set ALLOW_IN_MEMORY_DB=true for demo mode, or fix MONGODB_URI. "
                f"Error: {str(e)}"
            ) from e

        raise RuntimeError(
            f"Database connection failed. "
            f"Set ALLOW_IN_MEMORY_DB=true in .env or fix the database connection. "
            f"Error: {str(e)}"
        ) from e


async def disconnect_db():
    global client
    if client:
        client.close()
    print("[*] Database disconnected")


async def create_indexes():
    """Create comprehensive database indexes for performance"""
    if _using_memory:
        logger.warning("Using in-memory database - indexes are no-op")
        return
    
    try:
        from utils.database_indexes import create_all_indexes
        await create_all_indexes(db)
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        if settings.is_production:
            raise


def get_db():
    return db


def is_using_memory():
    return _using_memory
