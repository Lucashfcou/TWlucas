// aiIntegrationScript.js - Integração do jogador AI com lógica de jogo existente

/**
 * Módulo de integração entre AI player e game logic.
 * Dependências: gameLogicScript.js e aiPlayerScript.js devem ser carregados previamente.
 */

(function() {
    'use strict';

    let isAIGame = false;
    let aiDifficulty = 'medium';

    // Armazena referências às funções originais para wrapping
    const originalSwitchTurn = window.switchTurn;
    const originalEndGame = window. endGame;

    /**
     * Extensão de switchTurn para disparar AI após troca de turno
     */
    window.switchTurn = function() {
        // Executa função original
        if (originalSwitchTurn) {
            originalSwitchTurn();
        }

        // Dispara AI se for jogo AI e turno da AI
        if (isAIGame && window.AI_PLAYER) {
            window.AI_PLAYER.checkAndPlay();
        }
    };

    /**
     * Extensão de endGame para processamento específico de jogos AI
     */
    window.endGame = function(winner) {
        // Executa função original
        if (originalEndGame) {
            originalEndGame(winner);
        }

        // Lógica adicional de finalização para jogo AI
        if (isAIGame && window. AI_PLAYER) {
            window.AI_PLAYER.isProcessing = false;
        }
    };

    /**
     * Inicializa jogo contra AI com dificuldade especificada
     */
    window. initAIGame = function(difficulty) {
        isAIGame = true;
        aiDifficulty = difficulty;

        if (window.AI_PLAYER) {
            window.AI_PLAYER.init(difficulty);
            console.log('AI game initialized with difficulty:', difficulty, 'AI color:', window.AI_PLAYER. color);

            // Dispara AI se for o primeiro jogador (verifica cor dinâmica da IA)
            if (window. gameLogic && window.gameLogic.gameState.currentPlayer === window.AI_PLAYER.color) {
                setTimeout(() => {
                    window.AI_PLAYER.checkAndPlay();
                }, 1500); // Delay para visualização inicial do tabuleiro
            }
        } else {
            console.error('AI_PLAYER not loaded');
        }
    };

    /**
     * Desativa modo AI para jogo humano vs humano
     */
    window.disableAIGame = function() {
        isAIGame = false;
        if (window.AI_PLAYER) {
            window.AI_PLAYER.isProcessing = false;
        }
        console. log('AI game disabled - Human vs Human mode');
    };

    /**
     * Verifica se jogo atual é contra AI
     */
    window.isAIGameActive = function() {
        return isAIGame;
    };

    /**
     * Retorna dificuldade atual da AI
     */
    window. getAIDifficulty = function() {
        return aiDifficulty;
    };

    // Event listeners para integração AI em eventos de jogo
    document. addEventListener('DOMContentLoaded', () => {
        const rollButton = document.getElementById('roll-dice');

        if (rollButton) {
            rollButton.addEventListener('click', () => {
                // Verifica se próximo turno é da AI após jogada humana (usa cor dinâmica)
                setTimeout(() => {
                    if (isAIGame && window.gameLogic &&
                        window.gameLogic.gameState.currentPlayer === window.AI_PLAYER. color &&
                        window.AI_PLAYER) {
                        // Troca de turno natural dispara AI via switchTurn wrapper
                    }
                }, 100);
            });
        }

        // Listener para botão de pular turno em jogos AI
        const skipButton = document.getElementById('skip-button');
        if (skipButton) {
            const originalSkipHandler = skipButton.onclick;

            skipButton.addEventListener('click', () => {
                setTimeout(() => {
                    if (isAIGame && window.AI_PLAYER) {
                        window.AI_PLAYER.checkAndPlay();
                    }
                }, 500);
            });
        }
    });

    console.log('AI Integration loaded successfully');
})();