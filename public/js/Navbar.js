class Navbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Universal path detection: works for root and subpages on Vercel
        const path = window.location.pathname;

        // Root detection: '/' or '/index.html' or not containing '/pages/'
        const isRoot = path === '/' || path.endsWith('/index.html') || (!path.includes('/pages/'));

        // Consistent prefixes for links
        const homeLink = isRoot ? 'index.html' : '../../index.html';
        const pagesPrefix = isRoot ? 'src/pages/' : '';
        const imgPrefix = isRoot ? 'public/images/' : '../../public/images/';

        this.innerHTML = `
            <nav class="navbar">
                <a href="${homeLink}" class="nav-brand" style="display: flex; align-items: center; position: relative;">
                    <img src="${imgPrefix}Logo.png" alt="Footgolf Catalunya" style="height: 100px; width: auto; position: absolute; top: -10px; z-index: 1001; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">
                    <div style="height: 60px; width: 100px;"></div>
                </a>
                <button class="menu-toggle" aria-label="Toggle menu">☰</button>
                <div class="nav-links">
                    <a href="${homeLink}">Inicio</a>
                    <a href="${pagesPrefix}calendario.html">Calendario 2026</a>
                    <a href="${pagesPrefix}clasificaciones.html">Clasificaciones</a>
                    <a href="${pagesPrefix}jugadores.html">Jugadores & Licencias</a>
                    <a href="${pagesPrefix}institucional.html">Institucional</a>
                    <a href="${pagesPrefix}equipos.html">Campeonato Equipos</a>
                    <a href="${pagesPrefix}circular.html">Circular Oficial</a>
                    <a href="${pagesPrefix}palmares.html">Palmarés</a>
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
