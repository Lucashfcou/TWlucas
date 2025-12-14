// skipButtonScript.js - Sistema de pular turno com verificação de movimentos válidos

document.addEventListener('DOMContentLoaded', () => {
    const skipButton = document.getElementById('skip-button');

    if (!skipButton) {
        console.error('Skip button not found');
        return;
    }

    // Handler principal de clique
    skipButton.addEventListener('click', handleSkipTurn);

    // Suporte a teclado
    skipButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSkipTurn();
        }
    });
});

function handleSkipTurn() {
    // Verifica se jogo está ativo
    if (!window.gameLogic || !window.gameLogic.gameState.gameActive) {
        updateMessageSafe("Inicie um jogo primeiro!");
        return;
    }

    const gameState = window.gameLogic.gameState;

    // Verifica se dados foram lançados
    if (gameState.diceValue === 0) {
        updateMessageSafe("Você precisa rolar os dados antes de pular a vez!");
        return;
    }

    // MODIFICADO: verifica cor dinâmica da IA
    if (window. isAIGameActive && window.isAIGameActive() &&
        window.AI_PLAYER && gameState.currentPlayer === window.AI_PLAYER.color) {
        updateMessageSafe("Aguarde a vez da IA!");
        return;
    }

    // Verifica se jogador possui movimentos válidos
    if (hasAnyValidMoves(gameState.currentPlayer, gameState.diceValue)) {
        updateMessageSafe("⚠️ Você ainda tem jogadas possíveis! Você só pode pular a vez se não houver movimentos válidos.");

        // Destaca peças que podem mover
        highlightMovablePieces(gameState.currentPlayer, gameState.diceValue);
        return;
    }

    // Sem movimentos válidos - permite pular
    if (window.clearSelection) {
        clearSelection();
    } else {
        gameState.selectedPiece = null;
        gameState.possibleMoves = [];
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable');
        });
    }

    const currentPlayerName = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
    updateMessageSafe(`Sem jogadas válidas. Jogador ${currentPlayerName} pulou a vez.`);

    // Executa troca de turno
    setTimeout(() => {
        performTurnSwitch();
    }, 800);
}

/**
 * Verifica se jogador atual possui movimentos válidos
 */
function hasAnyValidMoves(playerColor, diceValue) {
    const gameState = window.gameLogic.gameState;
    const pieces = gameState.pieces[playerColor];

    // Referências a funções com fallback seguro
    const getValidMovesFunc = window.getValidMoves || (typeof getValidMoves !== 'undefined' ? getValidMoves : null);
    const canActivateFunc = window.canActivatePiece || (typeof canActivatePiece !== 'undefined' ? canActivatePiece : null);

    if (!getValidMovesFunc) {
        console.error('getValidMoves function not available');
        return true; // Assume que possui movimentos se função não disponível
    }

    // Verifica cada peça
    for (let piece of pieces) {
        // Verifica ativação para peças inativas com dado valor 1
        if (!piece.active && diceValue === 1) {
            if (canActivateFunc && canActivateFunc(piece, playerColor)) {
                return true; // Pode ativar esta peça
            }
        }

        // Verifica movimentos regulares para peças ativas
        if (piece.active) {
            const validMoves = getValidMovesFunc(piece, diceValue, playerColor);
            if (validMoves && validMoves.length > 0) {
                return true; // Possui movimentos válidos
            }
        }
    }

    return false; // Nenhum movimento válido encontrado
}

/**
 * Destaca peças que podem mover para auxiliar jogador
 */
function highlightMovablePieces(playerColor, diceValue) {
    const gameState = window.gameLogic.gameState;
    const pieces = gameState.pieces[playerColor];
    const getCellIndexFunc = window.getCellIndex || (typeof getCellIndex !== 'undefined' ? getCellIndex : null);
    const getValidMovesFunc = window.getValidMoves || (typeof getValidMoves !== 'undefined' ? getValidMoves : null);
    const canActivateFunc = window.canActivatePiece || (typeof canActivatePiece !== 'undefined' ? canActivatePiece : null);

    if (!getCellIndexFunc || !getValidMovesFunc) {
        console.error('Required functions not available for highlighting');
        return;
    }

    // Limpa destaques anteriores
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('selectable', 'has-moves');
    });

    // Destaca peças que podem mover
    pieces.forEach(piece => {
        let canMove = false;

        // Verifica ativação
        if (!piece.active && diceValue === 1 && canActivateFunc) {
            canMove = canActivateFunc(piece, playerColor);
        }

        // Verifica movimentos regulares
        if (piece.active) {
            const validMoves = getValidMovesFunc(piece, diceValue, playerColor);
            canMove = validMoves && validMoves.length > 0;
        }

        // Destaca se pode mover
        if (canMove) {
            const cellIndex = getCellIndexFunc(piece.row, piece.col, gameState.boardSize);
            const cell = cells[cellIndex];
            if (cell) {
                cell.classList.add('selectable', 'has-moves');

                // Adiciona efeito de pulsação
                cell.style.animation = 'pulse-hint 1.5s ease-in-out 3';
            }
        }
    });

    // Adiciona estilo de animação de pulsação se não existir
    if (!document.getElementById('skip-hint-animation')) {
        const style = document.createElement('style');
        style.id = 'skip-hint-animation';
        style.textContent = `
            @keyframes pulse-hint {
                0%, 100% { 
                    box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7);
                }
                50% { 
                    box-shadow: 0 0 0 10px rgba(255, 215, 0, 0);
                }
            }
            .has-moves {
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.8) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Remove animação após conclusão
    setTimeout(() => {
        cells.forEach(cell => {
            cell.style.animation = '';
        });
    }, 4500); // 3 pulsações × 1.5s
}

function performTurnSwitch() {
    const gameState = window.gameLogic.gameState;

    // Troca jogador
    gameState.currentPlayer = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    gameState.diceValue = 0;
    gameState.bonusRoll = false;

    // Limpa seleção
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];

    // Limpa destaques
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable', 'has-moves');
        cell.style.animation = '';
    });

    // Atualiza exibição de dados
    const diceTotal = document.querySelector('.dice-total');
    if (diceTotal) {
        diceTotal.textContent = 'Resultado: —';
    }

    // Atualiza mensagem
    const newPlayer = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';

    // Verifica se novo turno é da AI
    if (window.isAIGameActive && window.isAIGameActive() && gameState.currentPlayer === 'red') {
        updateMessageSafe(`Turno da IA (${newPlayer}). Aguarde...`);
        // Dispara turno da AI
        if (window.AI_PLAYER) {
            setTimeout(() => {
                window.AI_PLAYER.checkAndPlay();
            }, 800);
        }
    } else {
        updateMessageSafe(`Turno do jogador ${newPlayer}. Role os dados!`);
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
        messageElement.textContent = text;
    } else {
        console.warn('Message element not found:', text);
    }
}

// Exporta funções para acesso global
window.handleSkipTurn = handleSkipTurn;
window.hasAnyValidMoves = hasAnyValidMoves;

console.log('Skip button script loaded (with valid moves check)');