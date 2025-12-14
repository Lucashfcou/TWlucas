/* account-panel.js
 *
 * Módulo de controle do painel de conta com autenticação local.
 * Funcionalidades:
 * - Login/Logout de usuários
 * - Exibição de estatísticas do jogador
 * - Integração com sistema de rankings
 */

(function () {
    'use strict';

    const BTN_ID = 'account-btn';
    const PANEL_ID = 'account-panel';
    const FOCUSABLE_SELECTOR = 'a[href], button: not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const PORTAL_ZINDEX = 99999;
    const GAP = 8;

    const btn = document.getElementById(BTN_ID);
    const panel = document.getElementById(PANEL_ID);
    if (!btn || !panel) return;

    try { if (! btn.getAttribute('type')) btn.setAttribute('type', 'button'); } catch (e) {}

    let isOpen = ! panel.hasAttribute('hidden');
    let isPortalled = false;
    const placeholder = document.createComment('account-panel-placeholder');
    let onDocClick = null;
    let onDocKey = null;

    function getFocusableElements() {
        return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(el => ! el.hasAttribute('disabled') && el.offsetParent !== null);
    }

    function portalize() {
        if (isPortalled) return;
        const parent = panel.parentNode;
        if (! parent) return;
        parent.insertBefore(placeholder, panel);
        document.body.appendChild(panel);
        isPortalled = true;

        panel.style.position = 'fixed';
        panel.style.zIndex = String(PORTAL_ZINDEX);
        panel.style.willChange = 'top, left';
        panel.style.minWidth = panel.style.minWidth || panel.offsetWidth + 'px';
    }

    function restoreFromPortal() {
        if (!isPortalled) return;
        placeholder.parentNode.insertBefore(panel, placeholder);
        placeholder.parentNode.removeChild(placeholder);
        isPortalled = false;

        panel.style.position = '';
        panel.style.left = '';
        panel.style. top = '';
        panel.style.zIndex = '';
        panel.style.willChange = '';
    }

    function positionPanelRelativeToButton() {
        const rect = btn. getBoundingClientRect();

        const prevVisibility = panel.style.visibility;
        panel.style.visibility = 'hidden';
        panel.removeAttribute('hidden');

        const pW = panel.offsetWidth;
        const pH = panel.offsetHeight;

        let left = rect.right - pW;
        if (left < GAP) left = GAP;

        let top = rect.bottom + GAP;
        if (top + pH > window.innerHeight - GAP) {
            top = rect.top - pH - GAP;
            if (top < GAP) top = GAP;
        }

        panel.style.left = Math.round(left) + 'px';
        panel.style.top = Math.round(top) + 'px';
        panel.style.visibility = prevVisibility || '';
    }

    function updatePanelContent() {
        // Priorizar login online se disponível
        const loginManager = window.loginManager;
        const isLoggedInOnline = loginManager && loginManager.username;
        const isLoggedInLocal = window.RankingSystem && window.RankingSystem.isUserLoggedIn();
        const panelInner = panel.querySelector('.panel-inner');

        if (! panelInner) return;

        if (isLoggedInOnline) {
            // Usuário logado online - mostrar opções online
            panelInner.innerHTML = `
                <h3>Olá, ${loginManager.username}!</h3>
                <div class="account-info">
                    <button type="button" class="btn btn-primary" id="play-online-btn">Jogar Online</button>
                    <button type="button" class="btn btn-secondary" id="view-ranking-btn">Ver Classificação</button>
                    <button type="button" class="btn btn-secondary" id="logout-btn">Sair</button>
                </div>
            `;

            // Adiciona listeners
            const playOnlineBtn = panelInner.querySelector('#play-online-btn');
            if (playOnlineBtn) {
                playOnlineBtn.addEventListener('click', () => {
                    closePanel();
                    loginManager.handlePlayOnline();
                });
            }

            const viewRankingBtn = panelInner.querySelector('#view-ranking-btn');
            if (viewRankingBtn) {
                viewRankingBtn.addEventListener('click', () => {
                    closePanel();
                    loginManager.handleViewRanking();
                });
            }

            const logoutBtn = panelInner.querySelector('#logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    loginManager.clearSession();
                    location.reload();
                });
            }
        } else if (isLoggedInLocal) {
            const username = window.RankingSystem.getCurrentUser();
            const profile = window.RankingSystem. getPlayerProfile(username);
            const rank = window.RankingSystem.getPlayerRank(username);

            panelInner.innerHTML = `
                <h3>Olá, ${username}!</h3>
                <div class="user-stats">
                    <div class="stat-item">
                        <span class="stat-label">Posição:</span>
                        <span class="stat-value">#${rank || '-'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Pontos:</span>
                        <span class="stat-value">${profile.points}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Vitórias:</span>
                        <span class="stat-value">${profile.wins}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Derrotas:</span>
                        <span class="stat-value">${profile.losses}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Taxa de Vitória:</span>
                        <span class="stat-value">${profile.winRate}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Jogos: </span>
                        <span class="stat-value">${profile. gamesPlayed}</span>
                    </div>
                </div>
                <div class="panel-row">
                    <button type="button" class="btn btn-secondary" id="logout-btn">Sair</button>
                </div>
            `;

            // Adiciona listener de logout
            const logoutBtn = panelInner.querySelector('#logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
        } else {
            panelInner.innerHTML = `
                <h3 id="account-panel-title">Entrar</h3>
                <form id="login-form" novalidate>
                    <label for="username">Usuário</label>
                    <input id="username" name="username" type="text" autocomplete="username" required />

                    <label for="password">Senha</label>
                    <input id="password" name="password" type="password" autocomplete="current-password" required />

                    <div class="panel-row">
                        <button type="submit" class="btn btn-primary" id="login-submit">Entrar</button>
                    </div>

                    <div class="panel-create">
                        <small style="color: var(--c7-color); text-align: center; display: block; margin-top: 8px;">
                            Será criada uma conta se não existir
                        </small>
                    </div>
                </form>
            `;

            // Adiciona listener de login
            const loginForm = panelInner.querySelector('#login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
            }
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e. target);
        const username = formData.get('username');
        const password = formData.get('password');

        if (!username || username.trim().length < 3) {
            alert('O nome de usuário deve ter pelo menos 3 caracteres! ');
            return;
        }

        // Tentar login online primeiro
        if (window.loginManager && password) {
            const result = await window.loginManager.registerUser(username.trim(), password);
            if (result.success) {
                updatePanelContent();
                alert(`Bem-vindo, ${username.trim()}!`);
            } else {
                alert(`Erro ao fazer login: ${result.error}`);
            }
        } else if (window.RankingSystem) {
            // Fallback para sistema local
            window.RankingSystem.setCurrentUser(username. trim());
            updatePanelContent();
            alert(`Bem-vindo, ${username. trim()}!`);
        }
    }

    function handleLogout() {
        if (confirm('Deseja realmente sair?')) {
            if (window.RankingSystem) {
                window.RankingSystem.clearCurrentUser();
                updatePanelContent();
                closePanel();
            }
        }
    }

    function openPanel() {
        if (isOpen) return;
        portalize();
        updatePanelContent(); // Atualiza conteúdo antes de abrir
        panel.removeAttribute('hidden');
        panel.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
        isOpen = true;

        positionPanelRelativeToButton();

        const prefer = panel.querySelector('#username');
        const firstFocusable = prefer || getFocusableElements()[0] || panel;
        try { firstFocusable.focus(); } catch (e) {}

        onDocClick = function (ev) {
            if (! panel.contains(ev.target) && ! btn.contains(ev.target)) closePanel();
        };
        document.addEventListener('click', onDocClick, { capture: true });

        onDocKey = function (ev) {
            if (ev.key === 'Escape' || ev.key === 'Esc') {
                ev.preventDefault();
                closePanel();
                try { btn.focus(); } catch (e) {}
                return;
            }

            if (ev.key === 'Tab') {
                const focusables = getFocusableElements();
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const active = document.activeElement;
                if (ev.shiftKey && active === first) {
                    ev.preventDefault();
                    last. focus();
                } else if (! ev.shiftKey && active === last) {
                    ev. preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', onDocKey, true);

        window.addEventListener('resize', handleWindowChange, { passive: true });
        window.addEventListener('scroll', handleWindowChange, { passive:  true });
    }

    function closePanel() {
        if (!isOpen) return;
        panel.setAttribute('hidden', '');
        panel.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        isOpen = false;

        if (onDocClick) {
            document.removeEventListener('click', onDocClick, { capture: true });
            onDocClick = null;
        }
        if (onDocKey) {
            document.removeEventListener('keydown', onDocKey, true);
            onDocKey = null;
        }
        window.removeEventListener('resize', handleWindowChange);
        window.removeEventListener('scroll', handleWindowChange);

        restoreFromPortal();
    }

    function togglePanel() {
        if (isOpen) closePanel();
        else openPanel();
    }

    function handleWindowChange() {
        if (!isOpen) return;
        try {
            positionPanelRelativeToButton();
        } catch (e) {
            closePanel();
        }
    }

    btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        togglePanel();
    });

    document.addEventListener('focusin', function (ev) {
        if (! isOpen) return;
        const t = ev.target;
        if (! panel.contains(t) && !btn.contains(t)) {
            setTimeout(function () {
                const active = document.activeElement;
                if (! panel.contains(active) && !btn.contains(active)) closePanel();
            }, 0);
        }
    }, true);

    if (! btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (!panel.hasAttribute('aria-hidden')) panel.setAttribute('aria-hidden', panel.hasAttribute('hidden') ? 'true' : 'false');

    window.__accountPanel = {
        open: openPanel,
        close: closePanel,
        toggle: togglePanel,
        isOpen: () => isOpen,
        updateContent: updatePanelContent
    };
})();