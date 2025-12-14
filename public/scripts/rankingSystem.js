// rankingSystem.js - Sistema de classificações e rankings locais

/**
 * Sistema de gerenciamento de rankings e estatísticas de jogadores
 * Utiliza localStorage para persistência de dados locais
 * Estrutura de dados:
 * - username: nome do jogador
 * - wins: total de vitórias
 * - losses: total de derrotas
 * - points: pontuação total calculada
 * - gamesPlayed: total de jogos
 * - winRate: taxa de vitória (%)
 * - lastPlayed: timestamp da última partida
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'tab_game_rankings';
    const CURRENT_USER_KEY = 'tab_current_user';

    /**
     * Sistema de pontuação:
     * - Vitória: +100 pontos
     * - Vitória contra IA difícil: +150 pontos
     * - Vitória contra IA médio: +100 pontos
     * - Vitória contra IA fácil: +75 pontos
     * - Derrota: -10 pontos (mínimo 0)
     * - Desistência: -25 pontos (mínimo 0)
     */
    const POINTS = {
        WIN_HARD: 150,
        WIN_MEDIUM:  100,
        WIN_EASY: 75,
        LOSS:  -10,
        FORFEIT: -25
    };

    /**
     * Carrega dados de rankings do localStorage
     */
    function loadRankings() {
        try {
            const data = localStorage. getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading rankings:', error);
            return [];
        }
    }

    /**
     * Salva dados de rankings no localStorage
     */
    function saveRankings(rankings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings));
            return true;
        } catch (error) {
            console.error('Error saving rankings:', error);
            return false;
        }
    }

    /**
     * Obtém ou cria perfil de jogador
     */
    function getPlayerProfile(username) {
        const rankings = loadRankings();
        let player = rankings.find(p => p.username === username);

        if (!player) {
            player = {
                username: username,
                wins: 0,
                losses: 0,
                points: 0,
                gamesPlayed: 0,
                winRate: 0,
                lastPlayed: Date.now(),
                createdAt: Date. now()
            };
            rankings.push(player);
            saveRankings(rankings);
        }

        return player;
    }

    /**
     * Registra resultado de partida
     */
    function recordGameResult(username, isWin, difficulty = 'medium', isForfeit = false) {
        const rankings = loadRankings();
        let player = rankings.find(p => p.username === username);

        if (!player) {
            player = getPlayerProfile(username);
        }

        // Atualiza estatísticas
        player.gamesPlayed++;
        player. lastPlayed = Date.now();

        if (isWin) {
            player.wins++;
            // Calcula pontos baseado na dificuldade
            switch(difficulty. toLowerCase()) {
                case 'hard':
                    player.points += POINTS.WIN_HARD;
                    break;
                case 'medium':
                    player.points += POINTS.WIN_MEDIUM;
                    break;
                case 'easy':
                    player.points += POINTS.WIN_EASY;
                    break;
                default:
                    player.points += POINTS.WIN_MEDIUM;
            }
        } else {
            player.losses++;
            // Penalidade por derrota
            if (isForfeit) {
                player.points = Math.max(0, player. points + POINTS.FORFEIT);
            } else {
                player.points = Math.max(0, player. points + POINTS.LOSS);
            }
        }

        // Calcula taxa de vitória
        player.winRate = player.gamesPlayed > 0
            ? ((player.wins / player.gamesPlayed) * 100).toFixed(1)
            : 0;

        // Atualiza no array
        const index = rankings.findIndex(p => p.username === username);
        if (index !== -1) {
            rankings[index] = player;
        }

        saveRankings(rankings);
        return player;
    }

    /**
     * Obtém rankings ordenados por pontuação
     */
    function getTopRankings(limit = 10) {
        const rankings = loadRankings();
        return rankings
            .sort((a, b) => b.points - a.points)
            .slice(0, limit);
    }

    /**
     * Obtém posição do jogador no ranking
     */
    function getPlayerRank(username) {
        const rankings = loadRankings();
        const sorted = rankings.sort((a, b) => b.points - a.points);
        const index = sorted.findIndex(p => p.username === username);
        return index !== -1 ? index + 1 : null;
    }

    /**
     * Define usuário atual
     */
    function setCurrentUser(username) {
        if (username && username. trim()) {
            localStorage.setItem(CURRENT_USER_KEY, username. trim());
            return true;
        }
        return false;
    }

    /**
     * Obtém usuário atual
     */
    function getCurrentUser() {
        return localStorage.getItem(CURRENT_USER_KEY) || null;
    }

    /**
     * Remove usuário atual (logout)
     */
    function clearCurrentUser() {
        localStorage. removeItem(CURRENT_USER_KEY);
    }

    /**
     * Verifica se usuário está logado
     */
    function isUserLoggedIn() {
        return getCurrentUser() !== null;
    }

    /**
     * Reseta todos os rankings (use com cuidado!)
     */
    function resetAllRankings() {
        if (confirm('Tem certeza que deseja resetar TODOS os rankings?  Esta ação não pode ser desfeita! ')) {
            localStorage.removeItem(STORAGE_KEY);
            console.log('Rankings resetados');
            return true;
        }
        return false;
    }

    // Exporta API pública
    window.RankingSystem = {
        loadRankings,
        saveRankings,
        getPlayerProfile,
        recordGameResult,
        getTopRankings,
        getPlayerRank,
        setCurrentUser,
        getCurrentUser,
        clearCurrentUser,
        isUserLoggedIn,
        resetAllRankings
    };

    console.log('Ranking System loaded successfully');
})();