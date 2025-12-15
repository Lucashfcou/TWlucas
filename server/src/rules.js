// server/src/rules.js - Regras do jogo TÂB CORRIGIDAS

// ===================================================
// GERAR GRAFO DE MOVIMENTO
// ===================================================
function generateMovementGraph(color, boardSize) {
    const graph = {};

    if (color === 'red') {
        // VERMELHO: Linha 0 → 1 → 2 (→ 3 bloqueado) → volta 1

        // Linha 0: direita → esquerda
        for (let col = boardSize - 1; col >= 0; col--) {
            const key = `0,${col}`;
            if (col > 0) {
                graph[key] = [`0,${col - 1}`];
            } else {
                graph[key] = ['1,0'];
            }
        }

        // Linha 1: esquerda → direita
        for (let col = 0; col < boardSize; col++) {
            const key = `1,${col}`;
            if (col < boardSize - 1) {
                graph[key] = [`1,${col + 1}`];
            } else {
                graph[key] = [`2,${boardSize - 1}`];
            }
        }

        // Linha 2: direita → esquerda
        for (let col = boardSize - 1; col >= 0; col--) {
            const key = `2,${col}`;
            if (col > 0) {
                graph[key] = [`2,${col - 1}`];
            } else {
                // IMPORTANTE: Vermelho NÃO entra na linha 3
                graph[key] = ['1,0'];
            }
        }

        // Linha 3: Vermelhas não acessam (bloqueado)

    } else { // blue
        // AZUL: Linha 3 → 2 → 1 → 0 (território inimigo) → volta 1

        // Linha 3: esquerda → direita
        for (let col = 0; col < boardSize; col++) {
            const key = `3,${col}`;
            if (col < boardSize - 1) {
                graph[key] = [`3,${col + 1}`];
            } else {
                graph[key] = [`2,${boardSize - 1}`];
            }
        }

        // Linha 2: direita → esquerda
        for (let col = boardSize - 1; col >= 0; col--) {
            const key = `2,${col}`;
            if (col > 0) {
                graph[key] = [`2,${col - 1}`];
            } else {
                graph[key] = ['1,0'];
            }
        }

        // Linha 1: esquerda → direita
        for (let col = 0; col < boardSize; col++) {
            const key = `1,${col}`;
            if (col < boardSize - 1) {
                graph[key] = [`1,${col + 1}`];
            } else {
                // Ponto de decisão: pode ir para linha 2 ou linha 0 (território inimigo)
                graph[key] = [`2,${boardSize - 1}`, `0,${boardSize - 1}`];
            }
        }

        // Linha 0 (território inimigo): direita → esquerda
        for (let col = boardSize - 1; col >= 0; col--) {
            const key = `0,${col}`;
            if (col > 0) {
                graph[key] = [`0,${col - 1}`];
            } else {
                graph[key] = ['1,0'];
            }
        }
    }

    return graph;
}

// ===================================================
// CALCULAR DESTINO APÓS N PASSOS
// ===================================================
function calculateDestination(piece, steps, color, boardSize) {
    const graph = generateMovementGraph(color, boardSize);
    let current = `${piece.row},${piece.col}`;
    const path = [current];

    for (let i = 0; i < steps; i++) {
        const nextMoves = graph[current];
        if (!nextMoves || nextMoves.length === 0) {
            return null; // Não pode mover mais
        }

        let next = nextMoves[0];

        // Se há escolha (ponto de decisão)
        if (nextMoves.length > 1) {
            const enemyRow = color === 'red' ? 3 : 0;
            const territoryOption = nextMoves.find(move => move.startsWith(`${enemyRow},`));

            // Se já completou território inimigo, não pode entrar novamente
            if (piece.hasCompletedEnemyTerritory && territoryOption) {
                next = nextMoves.find(move => !move.startsWith(`${enemyRow},`));
            }
        }

        current = next;
        path.push(current);
    }

    const [row, col] = current.split(',').map(Number);
    return { row, col, path };
}

// ===================================================
// VERIFICAR SE HÁ PEÇAS INATIVAS NA LINHA INICIAL
// ===================================================
function hasInactivePiecesInHomeLine(pieces, color) {
    const homeLine = color === 'red' ? 0 : 3;
    return pieces.some(p => p.row === homeLine && !p.active);
}

// ===================================================
// VERIFICAR SE PEÇA ESTÁ CONGELADA
// ===================================================
function isPieceFrozen(piece, pieces, color) {
    const enemyRow = color === 'red' ? 3 : 0;

    if (piece.row === enemyRow) {
        return hasInactivePiecesInHomeLine(pieces, color);
    }

    return false;
}

// ===================================================
// VERIFICAR SE JOGADA É VÁLIDA
// ===================================================
function isValidMove(game, playerColor, pieceIndex, diceValue) {
    const pieces = game.pieces[playerColor];
    const piece = pieces[pieceIndex];

    if (!piece) {
        return { valid: false, reason: 'Invalid piece' };
    }

    // Peça inativa - precisa de 1 para ativar
    if (!piece.active) {
        if (diceValue !== 1) {
            return { valid: false, reason: 'Inactive piece requires 1 to activate' };
        }
        return { valid: true, action: 'activate' };
    }

    // Verificar se está congelada
    if (isPieceFrozen(piece, pieces, playerColor)) {
        return { valid: false, reason: 'Piece is frozen in enemy territory' };
    }

    // Calcular destino
    const destination = calculateDestination(piece, diceValue, playerColor, game.size);
    if (!destination) {
        return { valid: false, reason: 'Cannot move that many steps' };
    }

    // Verificar colisão com peça aliada
    const collision = pieces.some(p =>
        p !== piece && p.row === destination.row && p.col === destination.col
    );

    if (collision) {
        return { valid: false, reason: 'Cannot stack own pieces' };
    }

    return { valid: true, action: 'move', destination };
}

// ===================================================
// OBTER TODOS OS MOVIMENTOS POSSÍVEIS (HELPER)
// ===================================================
function getAllPossibleMoves(game, playerColor) {
    const pieces = game.pieces[playerColor];
    const diceValue = game.dice;
    const possibleMoves = [];

    if (diceValue === 0) {
        return possibleMoves;
    }

    for (let i = 0; i < pieces.length; i++) {
        const validation = isValidMove(game, playerColor, i, diceValue);
        if (validation.valid) {
            possibleMoves.push({
                pieceIndex: i,
                action: validation.action,
                destination: validation.destination
            });
        }
    }

    return possibleMoves;
}

// ===================================================
// VERIFICAR CAPTURA
// ===================================================
function checkCapture(game, row, col, enemyColor) {
    const enemyPieces = game.pieces[enemyColor];

    const capturedIndex = enemyPieces.findIndex(p => p.row === row && p.col === col);

    if (capturedIndex !== -1) {
        // Remover peça capturada
        enemyPieces.splice(capturedIndex, 1);
        return { captured: true, capturedIndex };
    }

    return { captured: false };
}

// ===================================================
// VERIFICAR VITÓRIA
// ===================================================
function checkVictory(game) {
    const redCount = game.pieces.red.length;
    const blueCount = game.pieces.blue.length;

    if (redCount === 0) {
        return { gameOver: true, winner: 'blue' };
    }

    if (blueCount === 0) {
        return { gameOver: true, winner: 'red' };
    }

    return { gameOver: false, winner: null };
}

// ===================================================
// LANÇAR DADOS (4 VARETAS)
// ===================================================
function rollDice() {
    const faces = [];

    // Simular 4 varetas (0 = escura, 1 = clara)
    for (let i = 0; i < 4; i++) {
        faces.push(Math.random() < 0.5 ? 0 : 1);
    }

    const planesCount = faces.filter(f => f === 1).length;

    let value, bonusRoll;

    switch (planesCount) {
        case 0:
            value = 6;
            bonusRoll = true;
            break;
        case 1:
            value = 1;
            bonusRoll = true;
            break;
        case 2:
            value = 2;
            bonusRoll = false;
            break;
        case 3:
            value = 3;
            bonusRoll = false;
            break;
        case 4:
            value = 4;
            bonusRoll = true;
            break;
        default:
            value = 0;
            bonusRoll = false;
    }

    return { value, bonusRoll, faces };
}

module.exports = {
    generateMovementGraph,
    calculateDestination,
    isValidMove,
    getAllPossibleMoves,
    checkCapture,
    checkVictory,
    rollDice,
    isPieceFrozen,
    hasInactivePiecesInHomeLine
};