class Footer extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('/src/pages/');
        const prefix = isRoot ? 'src/pages/' : '';
        const homeLink = isRoot ? 'index.html' : '../../index.html';
        const imagePath = isRoot ? 'public/images/' : '../../public/images/';

        this.innerHTML = `
            <footer class="footer">
                <div class="footer-grid">
                    <div>
                        <img src="${imagePath}Logo.png" alt="Footgolf Catalunya" style="height: 60px; width: auto; margin-bottom: 1rem;">
                        <p style="margin-bottom: 1rem; font-size: 0.9rem;">Fomentando el deporte, la competición y los valores del footgolf en nuestra región y más allá.</p>
                        <div class="social-links">
                            <a href="#" class="social-icon" aria-label="Facebook">📘</a>
                            <a href="#" class="social-icon" aria-label="Instagram">📸</a>
                            <a href="#" class="social-icon" aria-label="Twitter">🐦</a>
                            <a href="#" class="social-icon" aria-label="YouTube">▶️</a>
                        </div>
                    </div>
                    <div>
                        <h3 class="footer-title">Competición</h3>
                        <ul class="footer-links">
                            <li><a href="${prefix}calendario.html">Calendario 2026</a></li>
                            <li><a href="${prefix}clasificaciones.html">Clasificaciones</a></li>
                            <li><a href="${prefix}equipos.html">Campeonato por Equipos</a></li>
                            <li><a href="${prefix}palmares.html">Palmarés</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="footer-title">Institucional</h3>
                        <ul class="footer-links">
                            <li><a href="${prefix}institucional.html">Sobre nosotros</a></li>
                            <li><a href="${prefix}jugadores.html">Licencias</a></li>
                            <li><a href="${prefix}circular.html">Circular Oficial</a></li>
                            <li><a href="#">Contacto</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; 2026 Footgolf Catalunya. Todos los derechos reservados.</p>
                </div>
            </footer>
        `;
    }
}

customElements.define('app-footer', Footer);
