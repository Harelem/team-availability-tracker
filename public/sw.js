/**
 * Service Worker for Team Availability Tracker PWA
 * 
 * Provides offline functionality, caching strategies, background sync,
 * and push notification handling for enhanced mobile experience.
 */

// CRITICAL MOBILE EMERGENCY: Generate timestamp-based cache versions for immediate invalidation
const CACHE_VERSION = '2025-08-04-11-15-00-emergency'; // UPDATED for mobile cache emergency fix
const CACHE_NAME = `team-tracker-v${CACHE_VERSION}`;
const STATIC_CACHE = `team-tracker-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `team-tracker-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `team-tracker-api-v${CACHE_VERSION}`;

// Resources to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // Core pages
  '/schedule',
  '/teams',
  '/analytics',
  // Offline fallback page
  '/offline.html',
  // Critical CSS and JS will be added by build process
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/teams',
  '/api/schedule',
  '/api/availability',
  '/api/analytics/summary'
];

// Resources that should always be fetched fresh
const NO_CACHE_PATTERNS = [
  '/api/auth/',
  '/api/webhook/',
  '/api/notifications/send'
];

// EMERGENCY MOBILE CACHE EXPIRATION - EXTREMELY AGGRESSIVE for cache busting
const CACHE_EXPIRATION = {
  static: 5 * 60 * 1000,          // 5 minutes (reduced from 1 hour) - EMERGENCY
  dynamic: 2 * 60 * 1000,         // 2 minutes (reduced from 30 minutes) - EMERGENCY  
  api: 1 * 60 * 1000              // 1 minute (reduced from 5 minutes) - EMERGENCY
};

// Force cache invalidation detection for mobile browsers
const FORCE_REFRESH_PARAMS = ['force-refresh', 'cache-bust', 'v', 'timestamp'];

// Mobile browser detection patterns
const MOBILE_PATTERNS = [
  /Android/i,
  /webOS/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Mobile/i
];

/**
 * Detect if this is a mobile browser that needs aggressive cache busting
 */
function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  return MOBILE_PATTERNS.some(pattern => pattern.test(navigator.userAgent));
}

/**
 * Check if request URL contains force refresh parameters
 */
function hasForceRefreshParam(url) {
  const urlObj = new URL(url);
  return FORCE_REFRESH_PARAMS.some(param => urlObj.searchParams.has(param));
}

/**
 * Add cache-busting parameters to URLs for mobile browsers
 */
function addCacheBustParam(url) {
  const urlObj = new URL(url);
  urlObj.searchParams.set('cb', Date.now().toString());
  return urlObj.toString();
}

/**
 * Service Worker Installation - AGGRESSIVE MOBILE CACHE INVALIDATION
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing with aggressive cache invalidation...');
  
  event.waitUntil(
    Promise.all([
      // Clear ALL existing caches first for mobile browsers
      clearAllCaches().then(() => {
        console.log('Service Worker: Cleared all existing caches for fresh start');
      }),
      
      // Cache static assets with cache-busting for mobile
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets with cache-busting');
        const cacheBustedAssets = STATIC_ASSETS.map(url => {
          // Add cache-busting parameter to each asset for mobile browsers
          return addCacheBustParam(url.startsWith('http') ? url : `${self.location.origin}${url}`);
        });
        return cache.addAll(cacheBustedAssets);
      }),
      
      // Force immediate activation - skip waiting
      self.skipWaiting()
    ])
  );
});

/**
 * Service Worker Activation - FORCE CLIENT UPDATES
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating with forced client updates...');
  
  event.waitUntil(
    Promise.all([
      // Clean up ALL old caches aggressively
      cleanupOldCaches(),
      
      // Force claim all clients immediately
      self.clients.claim(),
      
      // Notify all clients to refresh for cache updates
      notifyClientsToRefresh()
    ])
  );
});

/**
 * Notify all clients to refresh due to cache updates
 */
async function notifyClientsToRefresh() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({
      type: 'CACHE_UPDATED',
      payload: {
        version: CACHE_VERSION,
        forceRefresh: true,
        message: 'New version available - refreshing...'
      }
    });
  });
  console.log('Service Worker: Notified', clients.length, 'clients to refresh');
}

/**
 * Fetch Event Handler - AGGRESSIVE MOBILE CACHE INVALIDATION
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and extension requests
  if (request.method !== 'GET' || url.protocol !== 'https:') {
    return;
  }
  
  // Skip caching for certain patterns
  if (shouldSkipCache(url.pathname)) {
    return;
  }
  
  // Force fresh fetch if force refresh parameter detected
  if (hasForceRefreshParam(request.url)) {
    console.log('Service Worker: Force refresh detected, bypassing cache for:', request.url);
    event.respondWith(fetch(request));
    return;
  }
  
  event.respondWith(handleFetchRequest(request));
});

/**
 * Background Sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'schedule-sync':
      event.waitUntil(syncScheduleUpdates());
      break;
    case 'analytics-sync':
      event.waitUntil(syncAnalyticsData());
      break;
    default:
      console.log('Service Worker: Unknown sync tag:', event.tag);
  }
});

/**
 * Push Notification Handler
 */
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    badge: '/icons/badge-72x72.png',
    icon: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: []
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      options.title = payload.title || 'Team Availability Tracker';
      options.body = payload.body || 'You have a new notification';
      options.data = payload.data || {};
      options.tag = payload.tag || 'general';
      
      // Add action buttons based on notification type
      if (payload.type === 'schedule-reminder') {
        options.actions = [
          {
            action: 'view-schedule',
            title: 'View Schedule',
            icon: '/icons/action-schedule.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/action-dismiss.png'
          }
        ];
      } else if (payload.type === 'team-update') {
        options.actions = [
          {
            action: 'view-team',
            title: 'View Team',
            icon: '/icons/action-team.png'
          }
        ];
      }
      
    } catch (error) {
      console.error('Service Worker: Error parsing push payload:', error);
      options.title = 'Team Availability Tracker';
      options.body = 'You have a new notification';
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  let url = '/';
  
  // Determine URL based on action or notification data
  switch (action) {
    case 'view-schedule':
      url = '/schedule';
      break;
    case 'view-team':
      url = data.teamId ? `/teams/${data.teamId}` : '/teams';
      break;
    case 'view-analytics':
      url = '/analytics';
      break;
    case 'dismiss':
      return; // Just close notification
    default:
      url = data.url || '/';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing tab
        for (const client of clientList) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new tab if no matching tab found
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

/**
 * Message Handler for communication with main thread
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_CLEAR':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'CACHE_UPDATE':
      event.waitUntil(updateCache(payload.urls));
      break;
      
    case 'BACKGROUND_SYNC':
      event.waitUntil(registerBackgroundSync(payload.tag));
      break;
      
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

/**
 * Fetch Request Handler
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request);
  }
  
  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    return handleStaticAsset(request);
  }
  
  // Handle page requests
  return handlePageRequest(request);
}

/**
 * API Request Handler - Network first with cache fallback
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for API request, trying cache');
    
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical API calls
    if (isCriticalApiCall(url.pathname)) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This data is not available offline' 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

/**
 * Static Asset Handler - AGGRESSIVE MOBILE CACHE INVALIDATION
 */
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  const isMobile = isMobileBrowser();
  
  if (cachedResponse) {
    // Check if cache is expired - more aggressive for mobile
    const cacheDate = cachedResponse.headers.get('sw-cached-date');
    const maxAge = isMobile ? CACHE_EXPIRATION.static / 2 : CACHE_EXPIRATION.static; // Half time for mobile
    
    if (cacheDate && Date.now() - parseInt(cacheDate) > maxAge) {
      console.log('Service Worker: Cache expired for mobile browser, fetching fresh:', request.url);
      // Cache expired, fetch fresh immediately for mobile
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(STATIC_CACHE);
          const responseToCache = networkResponse.clone();
          responseToCache.headers.set('sw-cached-date', Date.now().toString());
          cache.put(request, responseToCache);
          return networkResponse;
        }
      } catch (error) {
        console.log('Service Worker: Network failed, using stale cache');
      }
    }
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cached-date', Date.now().toString());
      responseToCache.headers.set('sw-mobile-cached', isMobile.toString());
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

/**
 * Page Request Handler - Network first with cache fallback
 */
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

/**
 * Background Sync Handlers
 */
async function syncScheduleUpdates() {
  console.log('Service Worker: Syncing schedule updates');
  
  try {
    // Get pending schedule updates from IndexedDB
    const pendingUpdates = await getPendingScheduleUpdates();
    
    for (const update of pendingUpdates) {
      try {
        const response = await fetch('/api/schedule/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update.data)
        });
        
        if (response.ok) {
          await removePendingUpdate(update.id);
          console.log('Service Worker: Schedule update synced:', update.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync update:', update.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Schedule sync failed:', error);
  }
}

async function syncAnalyticsData() {
  console.log('Service Worker: Syncing analytics data');
  
  try {
    // Refresh analytics cache
    const cache = await caches.open(API_CACHE);
    const analyticsRequests = [
      '/api/analytics/summary',
      '/api/analytics/teams',
      '/api/analytics/trends'
    ];
    
    for (const url of analyticsRequests) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          cache.put(url, response.clone());
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync analytics:', url, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Analytics sync failed:', error);
  }
}

/**
 * Utility Functions
 */
function shouldSkipCache(pathname) {
  return NO_CACHE_PATTERNS.some(pattern => pathname.includes(pattern));
}

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/.test(pathname);
}

function isCriticalApiCall(pathname) {
  return ['/api/auth/me', '/api/teams', '/api/schedule/current'].some(
    critical => pathname.includes(critical)
  );
}

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  
  return Promise.all(
    cacheNames
      .filter(cacheName => !validCaches.includes(cacheName))
      .map(cacheName => {
        console.log('Service Worker: Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      })
  );
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}

async function updateCache(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  return Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return cache.put(url, response);
        }
      } catch (error) {
        console.error('Service Worker: Failed to update cache for:', url, error);
      }
    })
  );
}

async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      const responseToCache = response.clone();
      responseToCache.headers.set('sw-cached-date', Date.now().toString());
      cache.put(request, responseToCache);
    }
  } catch (error) {
    console.error('Service Worker: Background cache update failed:', error);
  }
}

async function registerBackgroundSync(tag) {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      await self.registration.sync.register(tag);
      console.log('Service Worker: Background sync registered:', tag);
    } catch (error) {
      console.error('Service Worker: Background sync registration failed:', error);
    }
  }
}

// IndexedDB Database Configuration
const DB_NAME = 'team-tracker-offline';
const DB_VERSION = 1;
const STORES = {
  PENDING_UPDATES: 'pendingUpdates',
  CACHED_RESPONSES: 'cachedResponses',
  USER_PREFERENCES: 'userPreferences',
  TEAM_DATA: 'teamData',
  SCHEDULE_DATA: 'scheduleData',
  ANALYTICS_DATA: 'analyticsData'
};

// IndexedDB Helper Functions
async function initializeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create pending updates store
      if (!db.objectStoreNames.contains(STORES.PENDING_UPDATES)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_UPDATES, { keyPath: 'id' });
        pendingStore.createIndex('type', 'type', { unique: false });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create cached responses store
      if (!db.objectStoreNames.contains(STORES.CACHED_RESPONSES)) {
        const cacheStore = db.createObjectStore(STORES.CACHED_RESPONSES, { keyPath: 'url' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        cacheStore.createIndex('expiry', 'expiry', { unique: false });
      }

      // Create other stores
      [STORES.USER_PREFERENCES, STORES.TEAM_DATA, STORES.SCHEDULE_DATA, STORES.ANALYTICS_DATA].forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      });
    };
  });
}

async function performDBTransaction(storeName, mode, operation) {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getPendingScheduleUpdates() {
  try {
    return await performDBTransaction(
      STORES.PENDING_UPDATES,
      'readonly',
      (store) => store.index('type').getAll('schedule')
    );
  } catch (error) {
    console.error('Error getting pending updates:', error);
    return [];
  }
}

async function removePendingUpdate(id) {
  try {
    await performDBTransaction(
      STORES.PENDING_UPDATES,
      'readwrite',
      (store) => store.delete(id)
    );
    console.log('Service Worker: Removed pending update:', id);
  } catch (error) {
    console.error('Error removing pending update:', error);
  }
}

async function addPendingUpdate(type, data, endpoint, method = 'POST') {
  const id = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const update = {
    id,
    type,
    data,
    endpoint,
    method,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3
  };

  try {
    await performDBTransaction(
      STORES.PENDING_UPDATES,
      'readwrite',
      (store) => store.add(update)
    );
    return id;
  } catch (error) {
    console.error('Error adding pending update:', error);
    return null;
  }
}

async function cacheOfflineData(key, data, storeName = STORES.CACHED_RESPONSES) {
  const cachedItem = {
    key,
    data,
    timestamp: Date.now(),
    expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };

  try {
    await performDBTransaction(
      storeName,
      'readwrite',
      (store) => store.put(cachedItem)
    );
  } catch (error) {
    console.error('Error caching offline data:', error);
  }
}

async function getOfflineData(key, storeName = STORES.CACHED_RESPONSES) {
  try {
    const cached = await performDBTransaction(
      storeName,
      'readonly',
      (store) => store.get(key)
    );

    if (!cached || Date.now() > cached.expiry) {
      return null;
    }

    return cached.data;
  } catch (error) {
    console.error('Error getting offline data:', error);
    return null;
  }
}