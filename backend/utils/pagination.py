"""
Pagination Utilities
"""

from typing import TypeVar, Generic, List, Optional
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId

T = TypeVar('T')


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = 1
    page_size: int = 20
    sort_by: Optional[str] = None
    sort_order: int = -1  # -1 = descending, 1 = ascending
    
    @property
    def skip(self) -> int:
        """Calculate skip value"""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """Get limit value"""
        return self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response"""
    data: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
    
    class Config:
        arbitrary_types_allowed = True


async def paginate(
    collection: AsyncIOMotorCollection,
    query: dict,
    params: PaginationParams,
    serializer=None
) -> dict:
    """
    Paginate MongoDB collection
    
    Args:
        collection: MongoDB collection
        query: MongoDB query filter
        params: Pagination parameters
        serializer: Optional function to serialize documents
    
    Returns:
        PaginatedResponse dict
    """
    # Get total count
    total = await collection.count_documents(query)
    
    # Build cursor
    cursor = collection.find(query)
    
    # Apply sorting
    if params.sort_by:
        cursor = cursor.sort(params.sort_by, params.sort_order)
    
    # Apply pagination
    cursor = cursor.skip(params.skip).limit(params.limit)
    
    # Fetch documents
    docs = await cursor.to_list(length=params.limit)
    
    # Serialize if serializer provided
    if serializer:
        docs = [serializer(doc) for doc in docs]
    else:
        # Default serialization (convert ObjectId to string)
        for doc in docs:
            if "_id" in doc and isinstance(doc["_id"], ObjectId):
                doc["_id"] = str(doc["_id"])
    
    # Calculate pagination metadata
    total_pages = (total + params.page_size - 1) // params.page_size
    has_next = params.page < total_pages
    has_prev = params.page > 1
    
    return {
        "data": docs,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_prev": has_prev
    }


# ── Example Usage ────────────────────────────────────────────────────────────
"""
# In route handler:

from utils.pagination import paginate, PaginationParams

@router.get("/api/exams")
async def get_exams(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: Optional[str] = Query(None),
    sort_order: int = Query(-1),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Pagination params
    params = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by=sort_by or "created_at",
        sort_order=sort_order
    )
    
    # Build query
    query = {"status": "active"}
    if current_user["role"] == "student":
        query["program"] = current_user.get("program")
    
    # Paginate
    result = await paginate(
        collection=db.exams,
        query=query,
        params=params,
        serializer=serialize_exam  # Optional custom serializer
    )
    
    return result
"""
