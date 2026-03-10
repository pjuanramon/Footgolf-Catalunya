class Navbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // More robust path detection for Vercel and local dev
        const path = window.location.pathname;
        const isProd = window.location.hostname !== 'localhost';

        // On Vercel, paths might be /src/pages/page.html or just /page
        const isRoot = path === '/' || path.endsWith('/index.html') || (!path.includes('/pages/'));

        // Base paths for links and images
        const pagesBase = isRoot ? 'src/pages/' : '';
        const imgBase = isRoot ? 'public/images/' : '../../public/images/';
        const homeLink = isRoot ? 'index.html' : '../../index.html';

        this.innerHTML = `
            <nav class="navbar">
                <a href="${homeLink}" class="nav-brand" style="display: flex; align-items: center; position: relative;">
                    <img src="${imgBase}Logo.png" alt="Footgolf Catalunya" style="height: 100px; width: auto; position: absolute; top: -10px; z-index: 1001; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">
                    <!-- Invisible spacer to maintain layout since logo is absolute -->
                    <div style="height: 60px; width: 100px;"></div>
                </a>
                <button class="menu-toggle" aria-label="Toggle menu">☰</button>
                <div class="nav-links">
                    <a href="${homeLink}">Inicio</a>
                    <a href="${pagesBase}calendario.html">Calendario 2026</a>
                    <a href="${pagesBase}clasificaciones.html">Clasificaciones</a>
                    <a href="${pagesBase}jugadores.html">Jugadores & Licencias</a>
                    <a href="${pagesBase}institucional.html">Institucional</a>
                    <a href="${pagesBase}equipos.html">Campeonato Equipos</a>
                    <a href="${pagesBase}circular.html">Circular Oficial</a>
                    <a href="${pagesBase}palmares.html">Palmarés</a>
                </div>
            </nav>
        `;

        const menuToggle = this.querySelector('.menu-toggle');
        const navLinks = this.querySelector('.nav-links');

        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
    }
}

customElements.define('app-navbar', Navbar);
