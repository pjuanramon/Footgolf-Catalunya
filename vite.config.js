import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';

const GTM_ID = 'GTM-T47P62LQ';

// Helper to get all HTML files in src/pages
const getPagesEntries = () => {
  const pagesDir = resolve(__dirname, 'src/pages');
  const entries = {};

  try {
    const files = readdirSync(pagesDir);
    files.forEach(file => {
      if (file.endsWith('.html')) {
        const name = file.replace('.html', '');
        entries[name] = resolve(pagesDir, file);
      }
    });
  } catch (e) {
    console.error('Pages directory not found', e);
  }

  return entries;
};

// Plugin Vite para inyectar Google Consent Mode v2 + GTM + tracking.js en las 19 páginas HTML
const injectGtmAndConsentPlugin = () => ({
  name: 'inject-gtm-and-consent-v2',
  transformIndexHtml(html) {
    const headSnippet = `
    <!-- Google Consent Mode v2 + Google Tag Manager (${GTM_ID}) -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      (function() {
        var saved = null;
        try { saved = localStorage.getItem('fc_cookie_consent_v2'); } catch(e) {}
        var state = (saved === 'granted') ? 'granted' : 'denied';
        gtag('consent', 'default', {
          'ad_storage': state,
          'ad_user_data': state,
          'ad_personalization': state,
          'analytics_storage': state,
          'wait_for_update': 500
        });
      })();
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${GTM_ID}');
    </script>
    <script src="/js/tracking.js" defer></script>`;

    const bodySnippet = `
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;

    return html
      .replace(/<head>/i, `<head>${headSnippet}`)
      .replace(/<body([^>]*)>/i, `<body$1>${bodySnippet}`);
  }
});

export default defineConfig({
  plugins: [injectGtmAndConsentPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...getPagesEntries()
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
