"""
Simple In-Memory Cache
For production, replace with Redis using redis-py or aioredis
"""

import time
import logging
from typing import Any, Optional
from datetime import timedelta

logger = logging.getLogger(__name__)


class SimpleCache:
    """Thread-safe in-memory cache with TTL"""
    
    def __init__(self):
        self._cache: dict[str, tuple[Any, float]] = {}
        self._enabled = True
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self._enabled:
            return None
        
        if key in self._cache:
            value, expiry = self._cache[key]
            if time.time() < expiry:
                logger.debug(f"Cache HIT: {key}")
                return value
            else:
                # Expired
                del self._cache[key]
                logger.debug(f"Cache EXPIRED: {key}")
        
        logger.debug(f"Cache MISS: {key}")
        return None
    
    def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL (seconds)"""
        if not self._enabled:
            return
        
        expiry = time.time() + ttl
        self._cache[key] = (value, expiry)
        logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
    
    def delete(self, key: str):
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            logger.debug(f"Cache DELETE: {key}")
    
    def clear(self):
        """Clear all cache"""
        self._cache.clear()
        logger.info("Cache CLEARED")
    
    def cleanup(self):
        """Remove expired entries"""
        now = time.time()
        expired_keys = [k for k, (_, expiry) in self._cache.items() if now >= expiry]
        for key in expired_keys:
            del self._cache[key]
        
        if expired_keys:
            logger.info(f"Cache cleanup: removed {len(expired_keys)} expired entries")
    
    def disable(self):
        """Disable caching"""
        self._enabled = False
        logger.warning("Cache DISABLED")
    
    def enable(self):
        """Enable caching"""
        self._enabled = True
        logger.info("Cache ENABLED")
    
    def stats(self) -> dict:
        """Get cache statistics"""
        now = time.time()
        active = sum(1 for _, expiry in self._cache.values() if now < expiry)
        expired = len(self._cache) - active
        
        return {
            "total_keys": len(self._cache),
            "active_keys": active,
            "expired_keys": expired,
            "enabled": self._enabled
        }


# Global cache instance
cache = SimpleCache()


def cache_key(*args) -> str:
    """Generate cache key from arguments"""
    return ":".join(str(arg) for arg in args)


# ── Decorator for caching function results ──────────────────────────────────

def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results
    
    Usage:
        @cached(ttl=300, key_prefix="user")
        async def get_user_by_id(user_id: str):
            return await db.users.find_one({"_id": ObjectId(user_id)})
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            key_parts = [key_prefix or func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            key = cache_key(*key_parts)
            
            # Try cache first
            cached_value = cache.get(key)
            if cached_value is not None:
                return cached_value
            
            # Cache miss - call function
            result = await func(*args, **kwargs)
            
            # Store in cache
            if result is not None:
                cache.set(key, result, ttl=ttl)
            
            return result
        
        return wrapper
    return decorator


# ── Production: Replace with Redis ──────────────────────────────────────────
"""
For production deployment, replace SimpleCache with Redis:

1. Install: pip install redis aioredis

2. Update cache.py:

from redis import asyncio as aioredis
import json

class RedisCache:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    
    async def get(self, key: str) -> Optional[Any]:
        value = await self.redis.get(key)
        return json.loads(value) if value else None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        await self.redis.setex(key, ttl, json.dumps(value))
    
    async def delete(self, key: str):
        await self.redis.delete(key)
    
    async def clear(self):
        await self.redis.flushdb()

# Initialize
cache = RedisCache(os.getenv("REDIS_URL", "redis://localhost:6379"))

3. Add to config.py:
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_ENABLED: bool = True
    CACHE_DEFAULT_TTL: int = 300

4. Cache invalidation strategies:
   - User update → delete cache:user:{user_id}
   - Exam update → delete cache:exam:{exam_id}, cache:exams:*
   - Result submit → delete cache:results:{user_id}:*, cache:analytics:*
"""
