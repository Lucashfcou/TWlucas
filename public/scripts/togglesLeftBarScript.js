// togglesLeftBarScript.js - Sistema de controle do painel lateral para Regras e Classificação

(function () {
    const leftBar = document.getElementById('left-bar');
    const rulesToggle = document.getElementById('rules-toggle');
    const classToggle = document.getElementById('class-toggle');
    const rulesContent = document.getElementById('rules-content');
    const classContent = document.getElementById('class-content');

    // Fecha todos os painéis
    function closeAll() {
        [rulesContent, classContent].forEach(content => content.setAttribute('hidden', ''));
        [rulesToggle, classToggle]. forEach(btn => btn.setAttribute('aria-expanded', 'false'));
        leftBar.classList.add('collapsed');
        leftBar.setAttribute('aria-hidden', 'true');
    }

    // Abre painel especificado (rules ou class)
    function openPanel(type) {
        leftBar.classList.remove('collapsed');
        leftBar.setAttribute('aria-hidden', 'false');

        // Oculta ambos antes de abrir o selecionado
        rulesContent.setAttribute('hidden', '');
        classContent.setAttribute('hidden', '');

        if (type === 'rules') {
            rulesContent.removeAttribute('hidden');
            rulesToggle.setAttribute('aria-expanded', 'true');
            classToggle.setAttribute('aria-expanded', 'false');
            const focusTarget = rulesContent.querySelector('h2, h3, a, input');
            if (focusTarget) focusTarget.focus();
        } else if (type === 'class') {
            classContent.removeAttribute('hidden');
            classToggle. setAttribute('aria-expanded', 'true');
            rulesToggle.setAttribute('aria-expanded', 'false');

            // Atualiza rankings ao abrir
            updateRankingsDisplay();

            const focusTarget = classContent.querySelector('h2, h3, a, input');
            if (focusTarget) focusTarget.focus();
        }
    }

    // Alterna estado do painel (abre/fecha)
    function togglePanel(type) {
        const isRules = type === 'rules';
        const toggleBtn = isRules ? rulesToggle : classToggle;
        const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';

        if (expanded) closeAll();
        else openPanel(type);
    }

    // Atualiza exibição de rankings
    function updateRankingsDisplay() {
        if (!window.RankingSystem) {
            console.warn('Ranking System not loaded');
            return;
        }

        const rankingsList = document.getElementById('class-table-items');
        if (!rankingsList) return;

        const topPlayers = window.RankingSystem.getTopRankings(10);
        const currentUser = window.RankingSystem. getCurrentUser();

        if (topPlayers.length === 0) {
            rankingsList.innerHTML = `
                <li style="list-style: none; text-align: center; color: var(--c3-color); opacity: 0.7;">
                    Nenhum jogador registrado ainda. <br>
                    <small>Faça login e jogue para aparecer no ranking!</small>
                </li>
            `;
            return;
        }

        rankingsList.innerHTML = topPlayers.map((player, index) => {
            const position = index + 1;
            let itemClass = 'remaining-place';

            if (position === 1) itemClass = 'first-place';
            else if (position === 2) itemClass = 'second-place';
            else if (position === 3) itemClass = 'third-place';

            const isCurrentUser = currentUser && player.username === currentUser;
            const highlightClass = isCurrentUser ? ' current-user' : '';

            return `
                <li id="${itemClass}" class="${itemClass}${highlightClass}">
                    <strong>${player.username}</strong> - ${player.points}pts
                    <br>
                    <small style="opacity: 0.8; font-size: 85%;">
                        ${player.wins}V / ${player.losses}D | ${player.winRate}% vitórias
                    </small>
                </li>
            `;
        }).join('');
    }

    // Registra eventos dos botões
    rulesToggle.addEventListener('click', () => togglePanel('rules'));
    classToggle.addEventListener('click', () => togglePanel('class'));

    // Exporta funções públicas
    window.__leftBarPanel = {
        closeAll,
        openPanel,
        togglePanel,
        updateRankings: updateRankingsDisplay
    };

})();