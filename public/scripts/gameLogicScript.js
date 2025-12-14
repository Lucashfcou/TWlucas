// gameLogicScript.js - Lógica completa do jogo Tâb com sistema de lançamento único de dados

// Estado do jogo
let gameState = {
    boardSize: 7,
    currentPlayer: 'red',
    diceValue: 0,
    bonusRoll: false,
    diceUsed: false, // Flag de rastreamento de uso do dado
    pieces: {
        red: [],
        blue: []
    },
    selectedPiece: null,
    possibleMoves: [],
    gameActive: false,
    piecesActivated: {
        red: false,
        blue: false
    }
};

// Mapeamento de posições do tabuleiro (linha 0-3, coluna 0-n)
function getCellIndex(row, col, columns) {
    return row * columns + col;
}

function getRowCol(index, columns) {
    return {
        row: Math.floor(index / columns),
        col: index % columns
    };
}

// Inicializa peças no tabuleiro
function initializePieces(boardSize) {
    gameState.boardSize = boardSize;
    gameState.pieces.red = [];
    gameState.pieces.blue = [];

    const cells = document.querySelectorAll('.cell');

    // Limpa todas as células
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('has-piece', 'selectable', 'possible-move', 'capture-move', 'selected');
    });

    // Posiciona peças vermelhas na linha 0 (superior)
    for (let col = 0; col < boardSize; col++) {
        const cellIndex = getCellIndex(0, col, boardSize);
        gameState.pieces.red.push({
            row: 0,
            col: col,
            active: false,
            cellIndex: cellIndex,
            inEnemyTerritory: false,
            hasCompletedEnemyTerritory: false
        });
        placePieceOnCell(cellIndex, 'red', false, false);
    }

    // Posiciona peças azuis na linha 3 (inferior)
    for (let col = 0; col < boardSize; col++) {
        const cellIndex = getCellIndex(3, col, boardSize);
        gameState.pieces.blue.push({
            row: 3,
            col: col,
            active: false,
            cellIndex: cellIndex,
            inEnemyTerritory: false,
            hasCompletedEnemyTerritory: false
        });
        placePieceOnCell(cellIndex, 'blue', false, false);
    }

    gameState.gameActive = true;
    updateMessage("Jogo iniciado! Jogador Vermelho começa. Role os dados!");
}

// Posiciona peça visual em célula
function placePieceOnCell(cellIndex, color, isActive, hasCompleted) {
    const cells = document.querySelectorAll('.cell');
    const cell = cells[cellIndex];

    if (!cell) return;

    cell.innerHTML = '';
    cell.classList.add('has-piece');

    const piece = document.createElement('div');
    piece.classList.add('piece', `${color}-piece`);

    if (!isActive) {
        piece.classList.add('inactive');
    }

    if (hasCompleted) {
        piece.classList.add('completed');
    }

    cell.appendChild(piece);
}

// Verifica se jogador não possui peças na linha inicial
function hasNoPiecesInInitialRow(playerColor) {
    const initialRow = playerColor === 'red' ? 0 : 3;
    return !gameState.pieces[playerColor].some(piece => piece.row === initialRow);
}

// Verifica se inimigo possui peças na linha inicial
function enemyHasPiecesInInitialRow(playerColor) {
    const enemyColor = playerColor === 'red' ? 'blue' : 'red';
    const enemyInitialRow = enemyColor === 'red' ? 0 : 3;
    return gameState.pieces[enemyColor].some(piece => piece.row === enemyInitialRow);
}

// Verifica se peça está em território inimigo
function isInEnemyTerritory(piece, playerColor) {
    if (playerColor === 'red') {
        return piece.row === 3;
    } else {
        return piece.row === 0;
    }
}

// Verifica se posição está em território inimigo
function isPositionInEnemyTerritory(row, playerColor) {
    if (playerColor === 'red') {
        return row === 3;
    } else {
        return row === 0;
    }
}

// Verifica se peça está no ponto de saída do território inimigo
function isAtEnemyTerritoryExit(piece, playerColor) {
    if (playerColor === 'red' && piece.row === 3 && piece.col === 0) {
        return true;
    }
    if (playerColor === 'blue' && piece.row === 0 && piece.col === 0) {
        return true;
    }
    return false;
}

// Verifica se peça pode mover (não congelada em território inimigo)
function canPieceMove(piece, playerColor) {
    if (isInEnemyTerritory(piece, playerColor)) {
        return hasNoPiecesInInitialRow(playerColor);
    }
    return true;
}

// Obtém movimentos válidos para peça conforme regras do Tâb
function getValidMoves(piece, diceValue, playerColor) {
    const moves = [];
    const { row, col } = piece;
    const columns = gameState.boardSize;

    if (!piece.active) return moves;

    if (!canPieceMove(piece, playerColor)) {
        return moves;
    }

    if (playerColor === 'blue') {
        moves.push(...getBlueValidMoves(row, col, diceValue, columns));
    } else {
        moves.push(...getRedValidMoves(row, col, diceValue, columns));
    }

    const validMoves = moves.filter(move => {
        const pieceAtDestination = findPieceAt(move.row, move.col, playerColor);
        return !pieceAtDestination;
    });

    const pieceAlreadyInEnemyTerritory = isInEnemyTerritory(piece, playerColor);

    const finalMoves = validMoves.filter(move => {
        const moveIsToEnemyTerritory = isPositionInEnemyTerritory(move.row, playerColor);

        if (moveIsToEnemyTerritory) {
            if (playerColor === 'red') {
                return false; // ← MUDANÇA: Bloqueia linha 3 para vermelhas
            }
            if (piece.hasCompletedEnemyTerritory) {
                return false;
            }

            if (pieceAlreadyInEnemyTerritory) {
                return true;
            } else {
                return enemyHasPiecesInInitialRow(playerColor);
            }
        }

        return true;
    });

    return finalMoves;
}

// Verifica se peça pode ser ativada
function canActivatePiece(piece, playerColor) {
    const { row, col } = piece;
    const columns = gameState.boardSize;

    const tempPiece = { ...piece, active: true };

    let possibleMoves = [];
    if (playerColor === 'blue') {
        possibleMoves = getBlueValidMoves(row, col, 1, columns);
    } else {
        possibleMoves = getRedValidMoves(row, col, 1, columns);
    }

    const validMoves = possibleMoves.filter(move => {
        const pieceAtDestination = findPieceAt(move.row, move.col, playerColor);
        return !pieceAtDestination;
    });

    const pieceAlreadyInEnemyTerritory = false;

    const finalMoves = validMoves.filter(move => {
        const moveIsToEnemyTerritory = isPositionInEnemyTerritory(move.row, playerColor);

        if (moveIsToEnemyTerritory) {
            if (playerColor === 'red') {
                return false; // ← MUDANÇA:  Bloqueia durante ativação
            }
            if (piece.hasCompletedEnemyTerritory) {
                return false;
            }
            if (pieceAlreadyInEnemyTerritory) {
                return true;
            } else {
                return enemyHasPiecesInInitialRow(playerColor);
            }
        }
        return true;
    });

    return finalMoves.length > 0;
}

// Lógica de movimento de peças azuis
function getBlueValidMoves(row, col, steps, columns) {
    const moves = [];
    const paths = getBlueAllPaths(row, col, steps, columns);

    paths.forEach(path => {
        if (path.length > 0) {
            const endPos = path[path.length - 1];
            if (!moves.some(m => m.row === endPos.row && m.col === endPos.col)) {
                moves.push(endPos);
            }
        }
    });

    return moves;
}

function getBlueAllPaths(row, col, steps, columns, currentPath = []) {
    if (steps === 0) {
        return [currentPath];
    }

    const allPaths = [];

    if (row === 1 && col === columns - 1) {
        const path1 = getBlueAllPaths(0, columns - 1, steps - 1, columns, [...currentPath, { row: 0, col: columns - 1 }]);
        allPaths.push(...path1);

        const path2 = getBlueAllPaths(2, columns - 1, steps - 1, columns, [...currentPath, { row: 2, col: columns - 1 }]);
        allPaths.push(...path2);

        return allPaths;
    }

    const nextPos = getNextBluePosition(row, col, columns);
    if (nextPos) {
        return getBlueAllPaths(nextPos.row, nextPos.col, steps - 1, columns, [...currentPath, nextPos]);
    }

    return [currentPath];
}

function getNextBluePosition(row, col, columns) {
    if (row === 3) {
        if (col < columns - 1) {
            return { row: 3, col: col + 1 };
        } else {
            return { row: 2, col: columns - 1 };
        }
    }

    if (row === 2) {
        if (col > 0) {
            return { row: 2, col: col - 1 };
        } else {
            return { row: 1, col: 0 };
        }
    }

    if (row === 1) {
        if (col < columns - 1) {
            return { row: 1, col: col + 1 };
        } else {
            return null;
        }
    }

    if (row === 0) {
        if (col > 0) {
            return { row: 0, col: col - 1 };
        } else {
            return { row: 1, col: 0 };
        }
    }

    return null;
}

// Lógica de movimento de peças vermelhas
function getRedValidMoves(row, col, steps, columns) {
    const moves = [];
    const paths = getRedAllPaths(row, col, steps, columns);

    paths.forEach(path => {
        if (path.length > 0) {
            const endPos = path[path.length - 1];
            if (!moves.some(m => m.row === endPos.row && m.col === endPos.col)) {
                moves.push(endPos);
            }
        }
    });

    return moves;
}

function getRedAllPaths(row, col, steps, columns, currentPath = []) {
    if (steps === 0) {
        return [currentPath];
    }

    const allPaths = [];

    if (row === 2 && col === 0) {
        const path1 = getRedAllPaths(1, 0, steps - 1, columns, [...currentPath, { row: 1, col: 0 }]);
        allPaths.push(...path1);
        return allPaths;
    }

    const nextPos = getNextRedPosition(row, col, columns);
    if (nextPos) {
        return getRedAllPaths(nextPos.row, nextPos.col, steps - 1, columns, [...currentPath, nextPos]);
    }

    return [currentPath];
}

function getNextRedPosition(row, col, columns) {
    if (row === 0) {
        if (col > 0) {
            return { row: 0, col: col - 1 };
        } else {
            return { row: 1, col: 0 };
        }
    }

    if (row === 1) {
        if (col < columns - 1) {
            return { row: 1, col: col + 1 };
        } else {
            return { row: 2, col: columns - 1 };
        }
    }

    if (row === 2) {
        if (col > 0) {
            return { row: 2, col: col - 1 };
        } else {
            return null;
        }
    }
    return null;
}

// Processa seleção de peça
function handlePieceClick(cellIndex) {
    if (!gameState.gameActive || gameState.diceValue === 0) {
        updateMessage("Role os dados primeiro!");
        return;
    }

    const { row, col } = getRowCol(cellIndex, gameState.boardSize);
    const piece = findPieceAt(row, col, gameState.currentPlayer);

    if (!piece) return;

    if (gameState.selectedPiece === piece) {
        clearSelection();
        makeCurrentPlayerPiecesSelectable();
        updateMessage("Peça desmarcada. Escolha outra peça ou pule a vez.");
        return;
    }

    if (!piece.active) {
        if (gameState.diceValue === 1) {
            if (!canActivatePiece(piece, gameState.currentPlayer)) {
                updateMessage("Esta peça não pode ser ativada - está bloqueada e não tem movimentos válidos!");
                return;
            }

            piece.active = true;
            updatePieceDisplay(cellIndex, gameState.currentPlayer, true, piece.hasCompletedEnemyTerritory);

            const validMoves = getValidMoves(piece, 1, gameState.currentPlayer);

            if (validMoves.length === 1) {
                const move = validMoves[0];
                const enemyColor = gameState.currentPlayer === 'red' ? 'blue' : 'red';
                const enemyPiece = findPieceAt(move.row, move.col, enemyColor);

                if (enemyPiece) {
                    capturePiece(enemyPiece, enemyColor);
                }

                movePiece(piece, move.row, move.col);

                if (checkWinCondition()) {
                    endGame(gameState.currentPlayer);
                    return;
                }

                // Marca dado como utilizado
                gameState.diceUsed = true;
                updateMessage("Peça ativada e movida 1 casa! Você pode jogar novamente.");
                gameState.diceValue = 0;
                gameState.bonusRoll = false;
                document.querySelector('.dice-total').textContent = 'Resultado: —';

                // Habilita botão de lançamento para jogada bônus
                if (window.enableRollButton) {
                    window.enableRollButton();
                }
            } else {
                gameState.selectedPiece = piece;
                highlightSelectedPiece(cellIndex);
                gameState.possibleMoves = validMoves;
                showPossibleMoves(validMoves);

                const cells = document.querySelectorAll('.cell');
                cells[cellIndex].classList.add('selectable');
                updateMessage("Peça ativada! Escolha para onde movê-la (1 casa).");
            }
        } else {
            updateMessage(`Esta peça está bloqueada! Você precisa tirar 1 nos dados para ativar (você tirou ${gameState.diceValue}).`);
        }
        return;
    }

    if (!canPieceMove(piece, gameState.currentPlayer)) {
        updateMessage("Esta peça está em território inimigo e não pode se mover até que todas as suas peças saiam da linha inicial!");
        return;
    }

    gameState.selectedPiece = piece;
    highlightSelectedPiece(cellIndex);

    const validMoves = getValidMoves(piece, gameState.diceValue, gameState.currentPlayer);
    gameState.possibleMoves = validMoves;

    if (validMoves.length === 0) {
        updateMessage("Sem movimentos válidos para esta peça! Escolha outra ou pule a vez.");
        clearSelection();
        makeCurrentPlayerPiecesSelectable();
        return;
    }

    showPossibleMoves(validMoves);
    const cells = document.querySelectorAll('.cell');
    cells[cellIndex].classList.add('selectable');
    updateMessage(`Peça selecionada! Clique nela novamente para desmarcar ou escolha onde mover.`);
}

// Processa movimento para célula
function handleMoveClick(cellIndex) {
    if (!gameState.selectedPiece) return;

    const { row, col } = getRowCol(cellIndex, gameState.boardSize);
    const moveValid = gameState.possibleMoves.some(m => m.row === row && m.col === col);

    if (!moveValid) {
        updateMessage("Movimento inválido!");
        return;
    }

    const enemyColor = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    const enemyPiece = findPieceAt(row, col, enemyColor);

    if (enemyPiece) {
        capturePiece(enemyPiece, enemyColor);
    }

    movePiece(gameState.selectedPiece, row, col);

    // Marca dado como utilizado
    gameState.diceUsed = true;

    if (checkWinCondition()) {
        endGame(gameState.currentPlayer);
        return;
    }

    if (gameState.bonusRoll) {
        gameState.diceValue = 0;
        gameState.bonusRoll = false;
        gameState.diceUsed = false; // Reseta para permitir novo lançamento
        document.querySelector('.dice-total').textContent = 'Resultado: —';
        updateMessage("Movimento realizado! Você pode jogar novamente. Role os dados!");

        // Habilita botão de lançamento para jogada bônus
        if (window.enableRollButton) {
            window.enableRollButton();
        }
    } else {
        switchTurn();
    }
}

// Move peça para nova posição
function movePiece(piece, newRow, newCol) {
    const oldCellIndex = getCellIndex(piece.row, piece.col, gameState.boardSize);
    const newCellIndex = getCellIndex(newRow, newCol, gameState.boardSize);

    const wasInEnemyTerritory = isInEnemyTerritory(piece, gameState.currentPlayer);
    const willBeInEnemyTerritory = isPositionInEnemyTerritory(newRow, gameState.currentPlayer);

    if (wasInEnemyTerritory && !willBeInEnemyTerritory) {
        piece.hasCompletedEnemyTerritory = true;
    }

    const cells = document.querySelectorAll('.cell');
    cells[oldCellIndex].innerHTML = '';
    cells[oldCellIndex].classList.remove('has-piece');

    piece.row = newRow;
    piece.col = newCol;
    piece.cellIndex = newCellIndex;
    piece.inEnemyTerritory = isInEnemyTerritory(piece, gameState.currentPlayer);

    placePieceOnCell(newCellIndex, gameState.currentPlayer, true, piece.hasCompletedEnemyTerritory);

    clearSelection();
}

// Captura peça inimiga
function capturePiece(piece, color) {
    const index = gameState.pieces[color].indexOf(piece);
    if (index > -1) {
        gameState.pieces[color].splice(index, 1);
        updateMessage(`Peça ${color === 'red' ? 'vermelha' : 'azul'} capturada!`);
    }
}

// Localiza peça em posição
function findPieceAt(row, col, color) {
    return gameState.pieces[color].find(p => p.row === row && p.col === col);
}

// Destaca peça selecionada
function highlightSelectedPiece(cellIndex) {
    clearHighlights();
    const cells = document.querySelectorAll('.cell');
    cells[cellIndex].classList.add('selected');
}

// Exibe movimentos possíveis
function showPossibleMoves(moves) {
    const cells = document.querySelectorAll('.cell');

    moves.forEach(move => {
        const cellIndex = getCellIndex(move.row, move.col, gameState.boardSize);
        const enemyColor = gameState.currentPlayer === 'red' ? 'blue' : 'red';
        const hasEnemy = findPieceAt(move.row, move.col, enemyColor);

        if (hasEnemy) {
            cells[cellIndex].classList.add('capture-move');
        } else {
            cells[cellIndex].classList.add('possible-move');
        }
    });
}

// Remove todos os destaques
function clearHighlights() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable');
    });
}

// Limpa seleção
function clearSelection() {
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    clearHighlights();
}

// Atualiza exibição de peça
function updatePieceDisplay(cellIndex, color, isActive, hasCompleted) {
    const cells = document.querySelectorAll('.cell');
    const cell = cells[cellIndex];

    cell.innerHTML = '';

    const piece = document.createElement('div');
    piece.classList.add('piece', `${color}-piece`);

    if (!isActive) {
        piece.classList.add('inactive');
    }

    if (hasCompleted) {
        piece.classList.add('completed');
    }

    cell.appendChild(piece);
}

// Troca turno para outro jogador
function switchTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    gameState.diceValue = 0;
    gameState.bonusRoll = false;
    gameState.diceUsed = false; // Reseta flag de uso
    clearSelection();

    document.querySelector('.dice-total').textContent = 'Resultado: —';
    updateMessage(`Turno do jogador ${gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul'}. Role os dados!`);

    // Habilita botão de lançamento para novo turno
    if (window.enableRollButton) {
        window.enableRollButton();
    }
}

// Função de pular turno
function skipTurn() {
    if (!gameState.gameActive) {
        updateMessage("Inicie um jogo primeiro!");
        return;
    }

    if (gameState.diceValue === 0) {
        updateMessage("Você precisa rolar os dados antes de pular a vez!");
        return;
    }

    // Marca dado como utilizado ao pular
    gameState.diceUsed = true;

    clearSelection();
    const currentPlayerName = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
    updateMessage(`Jogador ${currentPlayerName} pulou a vez.`);

    setTimeout(() => {
        switchTurn();
    }, 1000);
}

// Verifica condição de vitória
function checkWinCondition() {
    const enemyColor = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    return gameState.pieces[enemyColor].length === 0;
}

// Finaliza jogo
function endGame(winner) {
    gameState.gameActive = false;
    clearHighlights();

    const winnerName = winner === 'red' ? 'Vermelho' : 'Azul';
    updateMessage(`🎉 Jogador ${winnerName} venceu! Parabéns!`);

    const messageBox = document.querySelector('.message-box');
    messageBox.classList.add('game-over');

    document.getElementById('roll-dice').disabled = true;

    if (window.RankingSystem && window.RankingSystem.isUserLoggedIn()) {
        const currentUser = window.RankingSystem.getCurrentUser();
        const isAIGame = window.isAIGameActive && window.isAIGameActive();

        if (isAIGame && window.AI_PLAYER) {
            const playerWon = winner !== window.AI_PLAYER.color;
            const difficulty = window.getAIDifficulty ?  window.getAIDifficulty() : 'medium';

            window.RankingSystem.recordGameResult(currentUser, playerWon, difficulty, false);

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

// Atualiza mensagem
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

// Torna peças selecionáveis para jogador atual
function makeCurrentPlayerPiecesSelectable() {
    if (!gameState.gameActive || gameState.diceValue === 0) return;

    clearHighlights();

    gameState.pieces[gameState.currentPlayer].forEach(piece => {
        const cellIndex = getCellIndex(piece.row, piece.col, gameState.boardSize);
        const cells = document.querySelectorAll('.cell');
        cells[cellIndex].classList.add('selectable');
    });
}

// Configura handlers de clique em células
function setupCellClickHandlers() {
    const cells = document.querySelectorAll('.cell');

    cells.forEach((cell, index) => {
        cell.addEventListener('click', () => {
            const { row, col } = getRowCol(index, gameState.boardSize);
            const currentPlayerPiece = findPieceAt(row, col, gameState.currentPlayer);

            if (currentPlayerPiece && gameState.diceValue > 0) {
                handlePieceClick(index);
            } else if (cell.classList.contains('possible-move') || cell.classList.contains('capture-move')) {
                handleMoveClick(index);
            }
        });
    });
}

// Exporta funções globalmente
window.clearSelection = clearSelection;
window.clearHighlights = clearHighlights;
window.switchTurn = switchTurn;
window.getCellIndex = getCellIndex;
window.getRowCol = getRowCol;
window.findPieceAt = findPieceAt;
window.movePiece = movePiece;
window.capturePiece = capturePiece;
window.checkWinCondition = checkWinCondition;
window.endGame = endGame;
window.updatePieceDisplay = updatePieceDisplay;
window.highlightSelectedPiece = highlightSelectedPiece;
window.showPossibleMoves = showPossibleMoves;
window.canActivatePiece = canActivatePiece;
window.isInEnemyTerritory = isInEnemyTerritory;
window.isPositionInEnemyTerritory = isPositionInEnemyTerritory;
window.enemyHasPiecesInInitialRow = enemyHasPiecesInInitialRow;
window.hasNoPiecesInInitialRow = hasNoPiecesInInitialRow;
window.getValidMoves = getValidMoves;

window.gameLogic = {
    initializePieces,
    makeCurrentPlayerPiecesSelectable,
    setupCellClickHandlers,
    skipTurn,
    gameState
};

console.log('Game logic functions exported globally');