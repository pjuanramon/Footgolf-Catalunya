class Footer extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Absolute paths for links and images to ensure reliability on Vercel
        const homeLink = '/';
        const imgPath = '/images/Logo.png';
        const pagesPrefix = '/src/pages/';

        this.innerHTML = `
            <footer class="footer">
                <div class="footer-grid">
                    <div>
                        <a href="${homeLink}" title="Footgolf Catalunya y Barcelona - Inicio">
                            <img src="${imgPath}" alt="Footgolf Catalunya - Competición Oficial en Barcelona y Catalunya" style="height: 60px; width: auto; margin-bottom: 1rem;">
                        </a>
                        <p style="margin-bottom: 0.75rem; font-size: 0.9rem;"><strong>Associació Footgolf Catalunya</strong> · La única entidad oficial de competición y práctica seria de <strong>Footgolf en Barcelona y Catalunya</strong>.</p>
                        <p style="margin-bottom: 1rem; font-size: 0.85rem; opacity: 0.85;">📍 Sede Oficial: <strong>Golf La Garriga</strong> (La Garriga, Barcelona · Vallès Oriental) · 📞 <a href="https://wa.me/34660310877" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline;">660 31 08 77</a></p>
                        <div class="social-links">
                            <a href="https://www.facebook.com/footgolfcatalunya" target="_blank" rel="noopener" class="social-icon" aria-label="Facebook Footgolf Catalunya">📘</a>
                            <a href="https://www.instagram.com/footgolf_catalunya/" target="_blank" rel="noopener" class="social-icon" aria-label="Instagram Footgolf Catalunya">📸</a>
                        </div>
                    </div>
                    <div>
                        <h3 class="footer-title">Competición Oficial</h3>
                        <ul class="footer-links">
                            <li><a href="${pagesPrefix}unete-2027.html">Ven a Probar en Barcelona</a></li>
                            <li><a href="${pagesPrefix}temporada-2027.html">Temporada 2027</a></li>
                            <li><a href="${pagesPrefix}calendario.html">Calendario Oficial</a></li>
                            <li><a href="${pagesPrefix}clasificaciones.html">Clasificaciones & Ranking</a></li>
                            <li><a href="${pagesPrefix}copa.html">Copa Catalana Match Play</a></li>
                            <li><a href="${pagesPrefix}equipos.html">Campeonato por Equipos</a></li>
                            <li><a href="${pagesPrefix}palmares.html">Palmarés Histórico</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="footer-title">Institucional & Guías</h3>
                        <ul class="footer-links">
                            <li><a href="${pagesPrefix}institucional.html">Sobre Footgolf Catalunya</a></li>
                            <li><a href="${pagesPrefix}reglas.html">Reglas Oficiales del Footgolf</a></li>
                            <li><a href="${pagesPrefix}jugadores.html">Jugadores & Licencias</a></li>
                            <li><a href="${pagesPrefix}licencias.html">Sacar Licencia Oficial</a></li>
                            <li><a href="${pagesPrefix}circular.html">Circular Oficial</a></li>
                            <li><a href="mailto:juanra@footgolfcatalunya.com">Contacto Oficial</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 class="footer-title">Legal</h3>
                        <ul class="footer-links">
                            <li><a href="${pagesPrefix}aviso-legal.html">Aviso Legal</a></li>
                            <li><a href="${pagesPrefix}terminos-condiciones.html">Términos y Condiciones</a></li>
                            <li><a href="${pagesPrefix}politica-privacidad.html">Política de Privacidad</a></li>
                            <li><a href="${pagesPrefix}politica-cookies.html">Política de Cookies</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; 2026 Footgolf Catalunya · Competición Oficial de Footgolf en Barcelona y Catalunya. Todos los derechos reservados. CIF: G26600098 | Associació Footgolf Catalunya</p>
                </div>
            </footer>
        `;
    }
}

customElements.define('app-footer', Footer);
