/**
 * Service Worker for Offline Exam Support
 * Enables exams to work without internet connection
 */

const CACHE_VERSION = 'v1.0.0'
const CACHE_NAME = `ai-exam-cache-${CACHE_VERSION}`

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
]

// API routes to cache
const API_CACHE_PATTERNS = [
  '/api/exams',
  '/api/questions',
  '/api/auth/me'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_VERSION)
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }).then(() => {
      // Force activation
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...', CACHE_VERSION)
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Take control immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Handle API requests with Network First strategy
  if (isAPIRequest(url.pathname)) {
    event.respondWith(networkFirstStrategy(request))
    return
  }
  
  // Handle static assets with Cache First strategy
  event.respondWith(cacheFirstStrategy(request))
})

/**
 * Network First Strategy - for dynamic content
 * Try network, fallback to cache
 */
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    console.log('[Service Worker] Network failed, trying cache:', request.url)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page if available
    return caches.match('/offline.html')
  }
}

/**
 * Cache First Strategy - for static assets
 * Try cache, fallback to network
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    // Return cached version and update in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse)
      }
    }).catch(() => {
      // Network failed, but we have cache
    })
    
    return cachedResponse
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Both cache and network failed
    return caches.match('/offline.html')
  }
}

/**
 * Check if request is an API request
 */
function isAPIRequest(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pathname.startsWith(pattern))
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_EXAM_DATA') {
    cacheExamData(event.data.payload)
  }
})

/**
 * Cache exam data for offline use
 */
async function cacheExamData(data) {
  try {
    const cache = await caches.open(CACHE_NAME)
    
    // Create a Response object from the data
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
    
    await cache.put(`/api/exams/${data.examId}`, response)
    
    console.log('[Service Worker] Cached exam data:', data.examId)
  } catch (error) {
    console.error('[Service Worker] Failed to cache exam data:', error)
  }
}

// Background sync for exam submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-exam-submission') {
    event.waitUntil(syncExamSubmissions())
  }
})

/**
 * Sync pending exam submissions when online
 */
async function syncExamSubmissions() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    
    const submissionRequests = keys.filter(req => 
      req.url.includes('/api/exams/') && req.url.includes('/submit')
    )
    
    for (const request of submissionRequests) {
      try {
        await fetch(request)
        await cache.delete(request)
        console.log('[Service Worker] Synced submission:', request.url)
      } catch (error) {
        console.error('[Service Worker] Failed to sync submission:', error)
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error)
  }
}

console.log('[Service Worker] Loaded', CACHE_VERSION)
