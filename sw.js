/* Service worker : met l'application en cache pour qu'elle s'ouvre sans rÃƒÆ’Ã‚Â©seau.
   Change le numÃƒÆ’Ã‚Â©ro de version ci-dessous quand tu modifies index.html. */
var CACHE = "taches-4-projets-v25";

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
      /* On relit chaque fichier en forÃƒÆ’Ã‚Â§ant le rÃƒÆ’Ã‚Â©seau (cache: "reload").
         Sans ÃƒÆ’Ã‚Â§a, le cache du navigateur pourrait resservir l'ancienne page
         et la mise ÃƒÆ’Ã‚Â  jour n'aurait aucun effet. */
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

/* On sert le cache d'abord (instantanÃƒÆ’Ã‚Â©, hors ligne), et on met ÃƒÆ’Ã‚Â  jour en
   arriÃƒÆ’Ã‚Â¨re-plan.

   IMPORTANT : uniquement pour les fichiers de l'application elle-mÃƒÆ’Ã‚Âªme. Les
   appels de synchronisation (jsonbin, CloudflareÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦) doivent TOUJOURS partir
   sur le rÃƒÆ’Ã‚Â©seau. Avant, ils ÃƒÆ’Ã‚Â©taient mis en cache eux aussi : l'application
   pouvait alors relire un vieil ÃƒÆ’Ã‚Â©tat, se croire ÃƒÆ’Ã‚Â  jour et ne rien recevoir
   de l'autre appareil. C'ÃƒÆ’Ã‚Â©tait la cause des Ãƒâ€šÃ‚Â« parfois ce n'est pas synchro Ãƒâ€šÃ‚Â». */
self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* tout ce qui n'est pas sur notre propre adresse : on laisse filer */
  if (url.origin !== self.location.origin) return;
  /* et on ne touche pas non plus aux adresses de synchro, mÃƒÆ’Ã‚Âªme par prudence */
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
