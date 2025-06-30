const CACHE_NAME = 'coffee-drip-timer-cache-v1.2.8';
const urlsToCache = [
  '.', // ルートパスの指定を相対パスに変更
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'audio/start.mp3',
  'audio/pause.mp3',
  'audio/resume.mp3',
  'audio/reset.mp3',
  'audio/countdown.mp3',
  'audio/step_complete.mp3',
  'audio/timer_finish.mp3'
];

// インストール時にキャッシュにファイルを追加する
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// リクエストを横取りして、キャッシュにあればキャッシュから返す
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        // なければネットワークからフェッチする
        return fetch(event.request);
      })
  );
});