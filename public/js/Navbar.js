class Navbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Absolute paths for links and images to ensure reliability on Vercel
        const homeLink = '/index.html';
        const imgPath = '/images/Logo.png';

        this.innerHTML = `
            <nav class="navbar">
                <a href="${homeLink}" class="nav-brand" style="display: flex; align-items: center; position: relative;">
                    <img src="${imgPath}" alt="Footgolf Catalunya" style="height: 100px; width: auto; position: absolute; top: -10px; z-index: 1001; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">
                    <div style="height: 60px; width: 100px;"></div>
                </a>
                <button class="menu-toggle" aria-label="Toggle menu">☰</button>
                <div class="nav-links">
                    <a href="${homeLink}">Inicio</a>
                    <a href="/src/pages/calendario.html">Calendario 2026</a>
                    <a href="/src/pages/clasificaciones.html">Clasificaciones</a>
                    <a href="/src/pages/jugadores.html">Jugadores & Licencias</a>
                    <a href="/src/pages/institucional.html">Institucional</a>
                    <a href="/src/pages/equipos.html">Campeonato Equipos</a>
                    <a href="/src/pages/circular.html">Circular Oficial</a>
                    <a href="/src/pages/palmares.html">Palmarés</a>
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
