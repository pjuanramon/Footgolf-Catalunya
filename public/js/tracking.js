/**
 * Footgolf Catalunya — Consent Mode v2 + DataLayer Conversion Tracking
 * Contenedor GTM: GTM-T47P62LQ
 */
(function () {
  const CONSENT_KEY = 'fc_cookie_consent_v2';
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  function applyConsentUpdate(choice) {
    const isGranted = choice === 'granted';
    const state = isGranted ? 'granted' : 'denied';
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch (_) {}

    gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state
    });

    window.dataLayer.push({
      event: isGranted ? 'consent_granted_marketing' : 'consent_denied_marketing',
      consent_status: state
    });
  }

  function removeBanner() {
    const existing = document.getElementById('fc-cookie-banner');
    if (existing) existing.remove();
  }

  function renderCookieBanner() {
    if (document.getElementById('fc-cookie-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'fc-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferencias de cookies');
    banner.style.cssText = [
      'position:fixed',
      'left:16px',
      'right:16px',
      'bottom:16px',
      'max-width:780px',
      'margin:0 auto',
      'z-index:9999',
      'background:rgba(15,23,42,0.97)',
      'color:#f8fafc',
      'border:1px solid rgba(74,222,128,0.35)',
      'border-radius:16px',
      'padding:14px 18px',
      'box-shadow:0 18px 42px rgba(0,0,0,0.55)',
      'backdrop-filter:blur(8px)',
      'font-family:Outfit,system-ui,-apple-system,sans-serif',
      'display:flex',
      'flex-wrap:wrap',
      'align-items:center',
      'justify-content:space-between',
      'gap:14px'
    ].join(';');

    banner.innerHTML = `
      <div style="flex:1 1 360px; font-size:0.86rem; line-height:1.45; color:#e2e8f0;">
        <strong style="color:#ffffff;">🍪 Privacidad y Cookies en Footgolf Catalunya</strong><br/>
        Usamos cookies técnicas necesarias y, si nos das tu permiso, analíticas (Google Analytics) y publicitarias (Meta) para medir y mejorar nuestras jornadas en Barcelona.
        <a href="/src/pages/politica-cookies.html" style="color:#4ade80; text-decoration:underline; margin-left:4px;">Ver Política de Cookies</a>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button id="fc-cookie-reject" type="button" style="background:transparent; color:#cbd5e1; border:1px solid rgba(203,213,225,0.35); border-radius:999px; padding:8px 14px; font-family:inherit; font-size:0.82rem; font-weight:600; cursor:pointer;">
          Solo necesarias
        </button>
        <button id="fc-cookie-accept" type="button" style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%); color:#ffffff; border:none; border-radius:999px; padding:8px 18px; font-family:inherit; font-size:0.84rem; font-weight:800; cursor:pointer; box-shadow:0 6px 16px rgba(22,163,74,0.38);">
          Aceptar todas
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('fc-cookie-accept').addEventListener('click', function () {
      applyConsentUpdate('granted');
      removeBanner();
    });

    document.getElementById('fc-cookie-reject').addEventListener('click', function () {
      applyConsentUpdate('denied');
      removeBanner();
    });
  }

  // Exponer función global para reabrir desde el Footer o Política de Cookies
  window.openFcCookieBanner = function () {
    renderCookieBanner();
  };

  function setupInteractionTracking() {
    // 1. Clics a WhatsApp, enlaces a Licencias y botones de Inscripción
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a');
      if (link) {
        const href = (link.getAttribute('href') || '').toLowerCase();

        if (href.includes('wa.me/') || href.includes('whatsapp.com')) {
          const locationTag = link.closest('footer')
            ? 'footer'
            : link.classList.contains('wa-btn-primary')
              ? 'hero_primary'
              : 'content_inline';

          window.dataLayer.push({
            event: 'click_whatsapp',
            cta_location: locationTag,
            cta_text: (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
            link_url: link.href,
            page_path: window.location.pathname
          });
        } else if (href.includes('licencias.html') || href === '/licencias') {
          window.dataLayer.push({
            event: 'click_cta_licencia',
            cta_text: (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
            page_path: window.location.pathname
          });
        }
      }

      const btn = e.target.closest('button');
      if (btn) {
        const onclickAttr = btn.getAttribute('onclick') || '';
        if (onclickAttr.includes('inscribirse(')) {
          window.dataLayer.push({
            event: 'begin_inscripcion_etapa',
            cta_text: (btn.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
            page_path: window.location.pathname
          });
        }
      }
    }, true);

    // 2. Reproducción de vídeos HTML5 (ej. reel_reto_50m.mp4 en /barcelona)
    const trackedVideos = new WeakSet();
    document.querySelectorAll('video').forEach(function (vid) {
      vid.addEventListener('play', function () {
        if (trackedVideos.has(vid)) return;
        trackedVideos.add(vid);
        const srcEl = vid.querySelector('source');
        window.dataLayer.push({
          event: 'video_play_landing',
          video_src: (srcEl && srcEl.getAttribute('src')) || vid.currentSrc || 'html5_video',
          page_path: window.location.pathname
        });
      });
    });

    // 3. Envío del formulario de Licencia Oficial (#licencia-form)
    const licenciaForm = document.getElementById('licencia-form');
    if (licenciaForm) {
      licenciaForm.addEventListener('submit', function () {
        window.dataLayer.push({
          event: 'form_submit_licencia',
          page_path: window.location.pathname
        });
      });
    }

    // 4. Hitos limpios de profundidad de scroll (50% y 90%)
    const firedScrolls = {};
    window.addEventListener('scroll', function () {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 120) return;
      const pct = Math.round((window.scrollY / docHeight) * 100);
      [50, 90].forEach(function (threshold) {
        if (pct >= threshold && !firedScrolls[threshold]) {
          firedScrolls[threshold] = true;
          window.dataLayer.push({
            event: 'scroll_milestone',
            scroll_percent: threshold,
            page_path: window.location.pathname
          });
        }
      });
    }, { passive: true });
  }

  function init() {
    let savedChoice = null;
    try {
      savedChoice = localStorage.getItem(CONSENT_KEY);
    } catch (_) {}

    if (!savedChoice) {
      renderCookieBanner();
    }
    setupInteractionTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
