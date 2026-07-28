// v2: sửa lỗi deploy mới không hiển thị (phải mở tab ẩn danh mới thấy).
// Nguyên nhân: bản cũ cache-first cả HTML ('/') nên shell cũ trỏ tới chunk
// build cũ vĩnh viễn. Quy tắc mới:
//  - HTML/navigation: LUÔN network-first, chỉ rơi về cache khi offline.
//  - Chỉ cache-first cho asset bất biến (/_next/static có hash) + ảnh/font.
const CACHE_NAME = 'wave-carwash-cache-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/logo-wave.jpg'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Bỏ qua API để không cache dữ liệu động.
  if (url.includes('/api/')) return;

  // HTML/điều hướng: network-first để bản deploy mới hiển thị ngay;
  // chỉ dùng cache khi mất mạng.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((c) => c ?? caches.match('/')),
      ),
    );
    return;
  }

  // Asset bất biến: cache-first (an toàn vì tên file có content hash).
  const isImmutableAsset =
    url.includes('/_next/static/') ||
    /\.(png|jpg|jpeg|svg|gif|ico|woff2)$/.test(url);
  if (!isImmutableAsset) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }),
  );
});
