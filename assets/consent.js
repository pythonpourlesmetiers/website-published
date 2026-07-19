/**
 * Bandeau de consentement cookies + Google Analytics 4 (Consent Mode v2)
 * ------------------------------------------------------------------
 * À inclure sur CHAQUE page du site, juste après la balise <meta viewport>,
 * précédé de la variable window.GA_MEASUREMENT_ID :
 *
 *   <script>window.GA_MEASUREMENT_ID = 'G-DTYTEVQHKY';</script>
 *   <script src="/assets/consent.js" defer></script>
 *
 * Ce fichier :
 *  - refuse tout traçage par défaut (Consent Mode v2), avant même que GA4 soit chargé
 *  - affiche une bannière (Accepter / Refuser) tant qu'aucun choix n'a été fait,
 *    ou si le choix précédent date de plus de 6 mois (règle CNIL)
 *  - ne charge le script Google Analytics QUE si l'utilisateur clique sur "Accepter"
 *  - expose window.openCookiePrefs() pour permettre de changer d'avis à tout moment
 *    (relié à un lien "Gérer les cookies" dans le footer)
 */
(function () {
  "use strict";

  var GA_ID = window.GA_MEASUREMENT_ID;
  var STORAGE_KEY = "ppm_cookie_consent";
  var CONSENT_DURATION_DAYS = 180; // 6 mois : durée de validité max recommandée par la CNIL

  // ── 1. Consent Mode v2 : tout refusé par défaut, avant le chargement de gtag.js ──
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500
  });

  // ── 2. Lecture / écriture du choix stocké localement (pas de cookie tiers) ──
  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      var ageDays = (Date.now() - data.date) / 86400000;
      if (ageDays > CONSENT_DURATION_DAYS) return null; // expiré -> on redemande
      return data.choice; // "accepted" | "refused"
    } catch (e) {
      return null;
    }
  }

  function saveConsent(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice: choice, date: Date.now() }));
    } catch (e) {}
  }

  // ── 3. Chargement de GA4, uniquement si consentement donné ──
  function loadGA() {
    if (!GA_ID || document.getElementById("ga4-script")) return;
    gtag("consent", "update", { analytics_storage: "granted" });
    var s = document.createElement("script");
    s.id = "ga4-script";
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
  }

  // ── 4. Bannière (styles injectés une seule fois, dans le thème du site) ──
  var styleInjected = false;
  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var css =
      "#cookie-banner{position:fixed;left:0;right:0;bottom:0;z-index:9999;" +
      "background:#131720;color:#e2e8f0;padding:1.25rem 1.5rem;" +
      "box-shadow:0 -4px 24px rgba(0,0,0,.35);font-family:'Open Sans',sans-serif;" +
      "font-size:.9rem;line-height:1.6;display:flex;flex-wrap:wrap;gap:1rem;" +
      "align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.08);}" +
      "#cookie-banner p{margin:0;max-width:640px;color:#94a3b8;}" +
      "#cookie-banner a{color:#FFD43B;text-decoration:underline;}" +
      "#cookie-banner .cookie-actions{display:flex;gap:.75rem;flex-wrap:wrap;flex-shrink:0;}" +
      "#cookie-banner button{font-family:'Montserrat',sans-serif;font-weight:700;font-size:.85rem;" +
      "padding:.65rem 1.4rem;border-radius:6px;cursor:pointer;border:1.5px solid transparent;}" +
      "#cookie-accept{background:#FFD43B;color:#1E2229;}" +
      "#cookie-accept:hover{filter:brightness(1.06);}" +
      "#cookie-refuse{background:transparent;color:#e2e8f0;border-color:rgba(255,255,255,.3);}" +
      "#cookie-refuse:hover{border-color:rgba(255,255,255,.6);}" +
      "@media (max-width:640px){#cookie-banner{flex-direction:column;align-items:stretch;text-align:center;}}";
    var styleTag = document.createElement("style");
    styleTag.textContent = css;
    document.head.appendChild(styleTag);
  }

  function showBanner() {
    injectStyles();
    if (document.getElementById("cookie-banner")) return;
    var banner = document.createElement("div");
    banner.id = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Préférences cookies");
    banner.innerHTML =
      "<p>Ce site utilise Google Analytics pour mesurer l\u2019audience (statistiques de visite). " +
      "Ces données ne sont collectées qu\u2019avec votre accord. " +
      "Voir la <a href=\"/politique-confidentialite/\">politique de confidentialité</a>.</p>" +
      '<div class="cookie-actions">' +
      '<button id="cookie-refuse" type="button">Refuser</button>' +
      '<button id="cookie-accept" type="button">Accepter</button>' +
      "</div>";
    document.body.appendChild(banner);

    document.getElementById("cookie-accept").addEventListener("click", function () {
      saveConsent("accepted");
      loadGA();
      hideBanner();
    });
    document.getElementById("cookie-refuse").addEventListener("click", function () {
      saveConsent("refused");
      hideBanner();
    });
  }

  function hideBanner() {
    var b = document.getElementById("cookie-banner");
    if (b) b.remove();
  }

  // ── 5. Permet de rouvrir la bannière à tout moment (lien "Gérer les cookies") ──
  window.openCookiePrefs = function (e) {
    if (e) e.preventDefault();
    showBanner();
  };

  // ── 6. Initialisation au chargement de chaque page ──
  document.addEventListener("DOMContentLoaded", function () {
    var consent = readConsent();
    if (consent === "accepted") {
      loadGA();
    } else if (consent === "refused") {
      // choix respecté, on ne fait rien
    } else {
      showBanner();
    }
  });
})();
