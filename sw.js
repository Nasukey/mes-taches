/* Service worker : met l'application en cache pour qu'elle s'ouvre sans rÃ©seau.
   Change le numÃ©ro de version ci-dessous quand tu modifies index.html. */
var CACHE = "taches-4-projets-v23";

var FICHIERS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      /* On relit chaque fichier en forÃ§ant le rÃ©seau (cache: "reload").
         Sans Ã§a, le cache du navigateur pourrait resservir l'ancienne page
         et la mise Ã  jour n'aurait aucun effet. */
      return Promise.all(FICHIERS.map(function(u){
        return fetch(new Request(u, { cache: "reload" })).then(function(rep){
          if (rep && (rep.ok || rep.type === "opaque")) return c.put(u, rep);
        }).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
      .catch(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(cles){
      return Promise.all(cles.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* On sert le cache d'abord (instantanÃ©, hors ligne), et on met Ã  jour en
   arriÃ¨re-plan.

   IMPORTANT : uniquement pour les fichiers de l'application elle-mÃªme. Les
   appels de synchronisation (jsonbin, Cloudflareâ€¦) doivent TOUJOURS partir
   sur le rÃ©seau. Avant, ils Ã©taient mis en cache eux aussi : l'application
   pouvait alors relire un vieil Ã©tat, se croire Ã  jour et ne rien recevoir
   de l'autre appareil. C'Ã©tait la cause des Â« parfois ce n'est pas synchro Â». */
self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* tout ce qui n'est pas sur notre propre adresse : on laisse filer */
  if (url.origin !== self.location.origin) return;
  /* et on ne touche pas non plus aux adresses de synchro, mÃªme par prudence */
  if (/jsonbin\.io|workers\.dev|api\./i.test(url.hostname)) return;

  e.respondWith(
    caches.match(req).then(function(enCache){
      var reseau = fetch(req).then(function(rep){
        if (rep && (rep.ok || rep.type === "opaque")) {
          var copie = rep.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copie); }).catch(function(){});
        }
        return rep;
      }).catch(function(){ return enCache; });
      return enCache || reseau;
    })
  );
});
