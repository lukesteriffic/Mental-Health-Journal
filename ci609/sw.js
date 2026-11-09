// Service Worker for the Mind App - Offline Functionality
const CACHE_NAME = 'mind-app-v1.0';
const OFFLINE_URL = 'https://ola16.brighton.domains/ci609/offline.html';

// Files to cache for offline use
const PRECACHE_FILES = [
  'https://ola16.brighton.domains/',
  'https://ola16.brighton.domains/ci609/index.html',
  'https://ola16.brighton.domains/ci609/index.css',
  'https://ola16.brighton.domains/ci609/auth.js',
  'https://ola16.brighton.domains/ci609/app.js',
  'https://ola16.brighton.domains/ci609/weather.js',
  'https://ola16.brighton.domains/ci609/encryption.js',
  'https://ola16.brighton.domains/ci609/manifest.json',
  'https://ola16.brighton.domains/ci609/icons/icon-72x72.png',
  'https://ola16.brighton.domains/ci609/icons/icon-192x192.png',
  'https://ola16.brighton.domains/ci609/icons/icon-512x512.png'
];

// External resources to cache for encryption
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/core.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/sha256.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/aes.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/pbkdf2.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/enc-base64.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/enc-utf8.min.js'
];

// Install event - caches files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and core files');
        return cache.addAll(PRECACHE_FILES);
      })
      .then(() => {
        console.log('[Service Worker] Caching external resources');
        return caches.open(CACHE_NAME).then(cache => {
          return Promise.all(
            EXTERNAL_RESOURCES.map(url => {
              return fetch(url)
                .then(response => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                  return Promise.resolve();
                })
                .catch(error => {
                  console.log(`[Service Worker] Failed to cache ${url}:`, error);
                  return Promise.resolve();
                });
            })
          );
        });
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serves from cache or network
self.addEventListener('fetch', (event) => {
  // Skips non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Special handling for the OpenWeatherMap API
  if (event.request.url.includes('api.openweathermap.org')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful weather responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If the network fails, tries to serve cached weather data instead
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log('[Service Worker] Serving cached weather data');
                return cachedResponse;
              }
              // Return default weather if no cache
              return new Response(JSON.stringify({
                weather: [{
                  id: 800,
                  main: 'Clear',
                  description: 'clear sky',
                  icon: '01d'
                }],
                main: {
                  temp: 15,
                  feels_like: 15,
                  pressure: 1013,
                  humidity: 65
                },
                wind: {
                  speed: 3.5,
                  deg: 180
                },
                clouds: {
                  all: 20
                },
                sys: {
                  sunrise: Date.now() / 1000 - 3600,
                  sunset: Date.now() / 1000 + 3600
                },
                name: 'Offline Location'
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // For all other requests
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to cache it
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, shows offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL) || 
                new Response('Offline - Please check your internet connection', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({ 'Content-Type': 'text/html' })
                });
            }
            
            // For other requests, return a generic error
            return new Response('Network error', {
              status: 408,
              statusText: 'Network Request Failed'
            });
          });
      })
  );
});

// Background sync for offline entries
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-weather') {
    event.waitUntil(syncWeatherData());
  }
});

// Sync weather data in background
function syncWeatherData() {
  return caches.open(CACHE_NAME).then(cache => {
    return fetch('https://api.openweathermap.org/data/2.5/weather?lat=51.5074&lon=-0.1278&units=metric&appid=3440a262e1956a181d2033c6ec27acd5')
      .then(response => {
        if (response.ok) {
          return cache.put('https://api.openweathermap.org/data/2.5/weather', response);
        }
      })
      .catch(error => {
        console.log('[Service Worker] Background sync failed:', error);
      });
  });
}

