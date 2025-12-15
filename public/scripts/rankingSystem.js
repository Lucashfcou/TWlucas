
(function() {
    'use strict';


    /**
     * Carrega rankings do servidor oficial
     */
    async function loadRankingsFromServer() {
        if (!window.loginManager) {
            console.warn('LoginManager not available');
            return [];
        }


        const result = await window.loginManager.getRanking();

        if (result.success) {
            return result.ranking;
        } else {
            console.error('Error loading rankings:', result.error);
            return [];
        }
    }

    /**
     * Atualiza exibição de rankings
     */
    async function updateRankingsDisplay() {
        const rankingsList = document.getElementById('class-table-items');
        if (!rankingsList) return;

        rankingsList.innerHTML = '<li style="list-style: none; text-align: center; color: #666;">Carregando rankings...</li>';

        const rankings = await loadRankingsFromServer();

        if (rankings.length === 0) {
            rankingsList.innerHTML = `
                <li style="list-style: none; text-align: center; color: var(--c3-color); opacity: 0.7;">
                    Nenhum jogador registrado ainda. <br>
                    <small>Faça login e jogue para aparecer no ranking!</small>
                </li>
            `;
            return;
        }

        rankingsList.innerHTML = rankings.map((player, index) => {
            const position = index + 1;
            let itemClass = 'remaining-place';

            if (position === 1) itemClass = 'first-place';
            else if (position === 2) itemClass = 'second-place';
            else if (position === 3) itemClass = 'third-place';

            const currentUser = window.loginManager ? window.loginManager.nick : null;
            const isCurrentUser = currentUser && player.nick === currentUser;
            const highlightClass = isCurrentUser ? ' current-user' : '';

            // Formato: nick - vitórias/jogos
            const victories = player.victories || 0;
            const games = player.games || 0;
            const winRate = games > 0 ? ((victories / games) * 100).toFixed(1) : '0.0';

            return `
                <li id="${itemClass}" class="${itemClass}${highlightClass}">
                    <strong>${player.nick}</strong> - ${victories}V / ${games}J
                    <br>
                    <small style="opacity: 0.8; font-size: 85%;">
                        ${winRate}% vitórias
                    </small>
                </li>
            `;
        }).join('');
    }

    /**
     * Obtém top rankings (compatibilidade)
     */
    async function getTopRankings(limit = 10) {
        const rankings = await loadRankingsFromServer();
        return rankings.slice(0, limit);
    }

    /**
     * Obtém posição do jogador no ranking
     */
    async function getPlayerRank(nick) {
        const rankings = await loadRankingsFromServer();
        const index = rankings.findIndex(p => p.nick === nick);
        return index !== -1 ? index + 1 : null;
    }

    /**
     * Obtém perfil do jogador
     */
    async function getPlayerProfile(nick) {
        const rankings = await loadRankingsFromServer();
        const player = rankings.find(p => p.nick === nick);

        if (player) {
            const games = player.games || 0;
            const victories = player.victories || 0;
            const winRate = games > 0 ? ((victories / games) * 100).toFixed(1) : '0.0';

            return {
                nick: player.nick,
                wins: victories,
                losses: games - victories,
                points: player.points || 0,
                gamesPlayed: games,
                winRate: winRate
            };
        }

        return null;
    }

    /**
     * Verifica se usuário está logado
     */
    function isUserLoggedIn() {
        return window.loginManager && window.loginManager.nick !== null;
    }

    /**
     * Obtém usuário atual
     */
    function getCurrentUser() {
        return window.loginManager ? window.loginManager.nick : null;
    }


    // Exporta API pública
    window.RankingSystem = {
        loadRankingsFromServer,
        updateRankingsDisplay,
        getTopRankings,
        getPlayerRank,
        getPlayerProfile,
        isUserLoggedIn,
        getCurrentUser
    };

    console.log('✅ SEGUNDA ENTREGA - Ranking System carregado (API Oficial)');
})();