class Navbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Determine the base path based on whether we are in index.html (root) or a subfolder page
        const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('/src/pages/');
        const prefix = isRoot ? 'src/pages/' : '';
        const homeLink = isRoot ? 'index.html' : '../../index.html';
        const imagePath = isRoot ? 'public/images/' : '../../public/images/';

        this.innerHTML = `
            <nav class="navbar">
                <a href="${homeLink}" class="nav-brand" style="display: flex; align-items: center; position: relative;">
                    <img src="${imagePath}Logo.png" alt="Footgolf Catalunya" style="height: 100px; width: auto; position: absolute; top: -10px; z-index: 1001; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">
                    <!-- Invisible spacer to maintain layout since logo is absolute -->
                    <div style="height: 60px; width: 100px;"></div>
                </a>
                <button class="menu-toggle" aria-label="Toggle menu">☰</button>
                <div class="nav-links">
                    <a href="${homeLink}">Inicio</a>
                    <a href="${prefix}calendario.html">Calendario 2026</a>
                    <a href="${prefix}clasificaciones.html">Clasificaciones</a>
                    <a href="${prefix}jugadores.html">Jugadores & Licencias</a>
                    <a href="${prefix}institucional.html">Institucional</a>
                    <a href="${prefix}equipos.html">Campeonato Equipos</a>
                    <a href="${prefix}circular.html">Circular Oficial</a>
                    <a href="${prefix}palmares.html">Palmarés</a>
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
