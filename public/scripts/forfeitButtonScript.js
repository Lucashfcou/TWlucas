// forfeitButtonScript.js - Módulo de processamento de desistência/rendição

document.addEventListener('DOMContentLoaded', () => {
    const forfeitButton = document.getElementById('forfeit-button');

    if (! forfeitButton) {
        console.error('Forfeit button not found');
        return;
    }

    // Handler principal de clique
    forfeitButton.addEventListener('click', handleForfeit);

    // Suporte a teclado
    forfeitButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleForfeit();
        }
    });
});

function handleForfeit() {
    // Verifica se jogo está ativo
    if (!window. gameLogic || !window.gameLogic.gameState.gameActive) {
        updateMessageSafe("Não há jogo ativo para desistir!");
        return;
    }

    const gameState = window.gameLogic. gameState;

    // **NOVA LÓGICA SIMPLIFICADA:  Determina quem é o jogador humano**
    const isAIGame = window.isAIGameActive && window.isAIGameActive();
    let humanColor = null;
    let loser = null;
    let winner = null;

    if (isAIGame && window.AI_PLAYER) {
        // Em jogo contra IA, o humano sempre perde ao desistir
        humanColor = window.AI_PLAYER.color === 'red' ? 'blue' : 'red';
        loser = humanColor;
        winner = window.AI_PLAYER.color;
    } else {
        // Em jogo humano vs humano, o jogador atual perde
        loser = gameState.currentPlayer;
        winner = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    }

    const loserName = loser === 'red' ? 'Vermelho' : 'Azul';
    const winnerName = winner === 'red' ? 'Vermelho' : 'Azul';

    // Confirmação via diálogo nativo
    const confirmMessage = `Tem certeza que deseja desistir?\n\nVocê (${loserName}) perderá o jogo.`;

    if (!confirm(confirmMessage)) {
        updateMessageSafe("Desistência cancelada.  Continue jogando!");
        return;
    }

    updateMessageSafe(`Jogador ${loserName} desistiu!  Jogador ${winnerName} vence por desistência! `);

    // Delay antes de finalizar jogo
    setTimeout(() => {
        endGameByForfeit(winner, loser);
    }, 500);
}

function endGameByForfeit(winner, loser) {
    const gameState = window.gameLogic.gameState;

    // Marca jogo como inativo
    gameState.gameActive = false;

    // Limpa seleções e destaques
    if (window.clearSelection) {
        window.clearSelection();
    } else {
        gameState.selectedPiece = null;
        gameState.possibleMoves = [];
        const cells = document.querySelectorAll('. cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable');
        });
    }

    // Interrompe processamento da AI se ativo
    if (window.AI_PLAYER) {
        window.AI_PLAYER.isProcessing = false;
    }

    const winnerName = winner === 'red' ? 'Vermelho' : 'Azul';
    const loserName = loser === 'red' ? 'Vermelho' : 'Azul';

    if (window.RankingSystem && window.RankingSystem.isUserLoggedIn()) {
        const currentUser = window.RankingSystem.getCurrentUser();
        const isAIGame = window.isAIGameActive && window.isAIGameActive();

        if (window.RankingSystem && window.RankingSystem.isUserLoggedIn()) {
            const currentUser = window.RankingSystem.getCurrentUser();
            const isAIGame = window.isAIGameActive && window.isAIGameActive();

            if (isAIGame && window.AI_PLAYER) {
                // Jogador humano sempre perde ao desistir em jogo contra IA
                const humanColor = window.AI_PLAYER.color === 'red' ? 'blue' : 'red';
                const playerWon = false; // Humano sempre perde ao desistir
                const playerForfeited = true; // Sempre é desistência
                const difficulty = window.getAIDifficulty ? window.getAIDifficulty() : 'medium';

                // Registra derrota com penalidade de desistência
                window.RankingSystem.recordGameResult(currentUser, playerWon, difficulty, playerForfeited);

                console.log(`Ranking updated: User ${currentUser}, Won: false, Forfeit: true, Difficulty: ${difficulty}`);

                // Atualiza painel de conta se estiver aberto
                if (window.__accountPanel) {
                    window.__accountPanel.updateContent();
                }

                // Atualiza rankings se painel estiver aberto
                if (window.__leftBarPanel) {
                    window.__leftBarPanel.updateRankings();
                }
            }
        }
    }

    // Atualiza mensagem com informação de desistência
    updateMessageSafe(`🏳️ Jogo terminado por desistência!\n\nJogador ${loserName} desistiu.\nJogador ${winnerName} VENCEU!  🎉`);

    // Adiciona classe de finalização
    const messageBox = document.querySelector('. message-box');
    if (messageBox) {
        messageBox.classList.add('game-over');
    }

    // Desabilita botões do jogo
    disableGameButtons();

    // Adiciona efeitos visuais de desistência
    addForfeitVisualEffects(winner, loser);

    // Exibe prompt para novo jogo após delay
    setTimeout(() => {
        showPlayAgainPrompt(winnerName, loserName);
    }, 2000);
}

/**
 * Desabilita todos os botões de controle do jogo
 */
function disableGameButtons() {
    // Desabilita botão de lançamento
    const rollButton = document.getElementById('roll-dice');
    if (rollButton) {
        rollButton.disabled = true;
    }

    // Desabilita botão de pular
    const skipButton = document.getElementById('skip-button');
    if (skipButton) {
        skipButton.style.opacity = '0.5';
        skipButton.style.pointerEvents = 'none';
        skipButton.setAttribute('aria-disabled', 'true');
    }

    // Desabilita botão de desistência
    const forfeitButton = document.getElementById('forfeit-button');
    if (forfeitButton) {
        forfeitButton.style.opacity = '0.5';
        forfeitButton.style. pointerEvents = 'none';
        forfeitButton.setAttribute('aria-disabled', 'true');
    }
}

/**
 * Reabilita todos os botões de controle do jogo
 * Chamada ao iniciar um novo jogo
 */
function enableGameButtons() {
    // Habilita botão de lançamento
    const rollButton = document. getElementById('roll-dice');
    if (rollButton) {
        rollButton.disabled = false;
    }

    // Habilita botão de pular
    const skipButton = document.getElementById('skip-button');
    if (skipButton) {
        skipButton.style.opacity = '1';
        skipButton.style.pointerEvents = 'auto';
        skipButton.removeAttribute('aria-disabled');
    }

    // Habilita botão de desistência
    const forfeitButton = document.getElementById('forfeit-button');
    if (forfeitButton) {
        forfeitButton.style.opacity = '1';
        forfeitButton.style.pointerEvents = 'auto';
        forfeitButton.removeAttribute('aria-disabled');
    }

    // Remove classe de game-over da message-box
    const messageBox = document.querySelector('.message-box');
    if (messageBox) {
        messageBox.classList.remove('game-over');
    }

    // Limpa efeitos visuais de desistência
    clearForfeitVisualEffects();

    console.log('Game buttons re-enabled for new game');
}

function addForfeitVisualEffects(winner, loser) {
    // Atenua peças do perdedor
    const cells = document.querySelectorAll('. cell');
    cells.forEach(cell => {
        const piece = cell.querySelector(`.${loser}-piece`);
        if (piece) {
            piece.style.opacity = '0.3';
            piece.style.filter = 'grayscale(100%)';
        }
    });

    // Destaca peças do vencedor
    cells.forEach(cell => {
        const piece = cell.querySelector(`.${winner}-piece`);
        if (piece) {
            piece.style.animation = 'pulse 1s ease-in-out infinite';
        }
    });

    // Adiciona animação pulse se não existir
    if (!document.getElementById('forfeit-animation-style')) {
        const style = document.createElement('style');
        style.id = 'forfeit-animation-style';
        style. textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Remove efeitos visuais de desistência
 */
function clearForfeitVisualEffects() {
    const cells = document. querySelectorAll('.cell');
    cells.forEach(cell => {
        const pieces = cell.querySelectorAll('. piece');
        pieces.forEach(piece => {
            piece.style. opacity = '';
            piece.style.filter = '';
            piece.style.animation = '';
        });
    });
}

function showPlayAgainPrompt(winnerName, loserName) {
    const message = document.querySelector('.message p');
    if (message) {
        message.innerHTML = `
            🏳️ <strong>Jogo terminado por desistência!</strong><br><br>
            Jogador ${loserName} desistiu.<br>
            Jogador <strong>${winnerName}</strong> VENCEU! 🎉<br><br>
            <small>Clique em "Jogar" para iniciar um novo jogo. </small>
        `;
    }
}

function updateMessageSafe(text) {
    // Tenta usar updateMessage global se disponível
    if (window.updateMessage && typeof window.updateMessage === 'function') {
        window.updateMessage(text);
        return;
    }

    // Fallback para manipulação direta do DOM
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        // Substitui \n por <br> para exibição HTML
        messageElement.innerHTML = text.replace(/\n/g, '<br>');
    } else {
        console.warn('Message element not found:', text);
    }
}

// Exporta funções para acesso global
window.handleForfeit = handleForfeit;
window.endGameByForfeit = endGameByForfeit;
window.enableGameButtons = enableGameButtons;
window. disableGameButtons = disableGameButtons;

console.log('Forfeit button script loaded');