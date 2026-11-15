/* WinTrek offline cache — network-first for the app shell, cache-first for assets */
const CACHE = "wintrek-v2";
const ASSETS = [
  "./", "./index.html", "./style.css", "./engine.js", "./ui.js",
  "./manifest.webmanifest", "./assets/wintrek.pdf",
  ...[
    "alert","base","borg","btncom","btndam","btnlrs","btnnav","btnpha","btnpho","btnshe","btnsrs",
    "checked","course","dam","distance","entl","entr","execute","explbasd","explbrg","explbrgd","explentl",
    "explentr","explfar","explfard","explklg","explklgd","explrom","explromd","fareng","impulse",
    "klingon","lineart","lrblock","memo","numeric","numericg","openent","phasbox","photon",
    "romulan","score","shedil","sheshe","ship","singwide","star0","star1","star2","stpanel",
    "tlockbox","tlockon","unchcked","warp","main.ico","panel.ico","msg.ico","btn.ico","srs.ico",
    "lrs.ico","nav.ico","pho.ico","pha.ico","she.ico","dam.ico","com.ico","icon-64","icon-192","icon-512"
  ].map(n => "./assets/" + n + ".png"),
  ...["back","code1","exec","explo","imp","open","phas","phot","phx","phx2","reda","song"]
    .map(n => "./assets/" + n + ".wav")
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const shell = e.request.mode === "navigate" ||
    /\.(html|js|css|webmanifest|json)$/i.test(url.pathname) ||
    url.pathname.endsWith("/");
  if (shell) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
