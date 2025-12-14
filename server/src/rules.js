// rules.js - Regras do jogo TÂB

// Gerar grafo de movimento em zig-zag para uma cor específica
function generateMovementGraph(color, boardSize) {
    const graph = {};
    
    if (color === 'red') {
        // Vermelho: Linha 0 (direita->esquerda) -> Linha 1 (esquerda->direita) -> 
        //           Linha 2 (direita->esquerda) -> opção Linha 3 (território inimigo)
        
        // Linha 0: direita para esquerda (n-1 -> 0)
        for (let col = boardSize - 1; col >= 0; col--) {
            const key = `0,${col}`;
            if (col > 0) {
                graph[key] = [`0,${col - 1}`];
            } else {
                // Col 0 da linha 0 vai para col 0 da linha 1
                graph[key] = ['1,0'];
            }
        }
        
        // Linha 1: esquerda para direita (0 -> n-1)
        for (let col = 0; col < boardSize; col++) {
            const key = `1,${col}`;
            if (col < boardSize - 1) {
                graph[key] = [`1,${col + 1}`];
            } else {
                // Col n-1 da linha 1 vai para col n-1 da linha 2
                graph[key] = [`2,${boardSize - 1}`];
            }
        }
        
        // Linha 2: direita para esquerda (n-1 -> 0)
        for (let col = boardSize - 1; col >= 0; col--) {
            const key = `2,${col}`;
            if (col > 0) {
                graph[key] = [`2,${col - 1}`];
            } else {
                // Ponto de decisão: pode ir para linha 1 ou linha 3 (território inimigo)
                graph[key] = ['1,0', '3,0'];
            }
        }
        
        // Linha 3 (território inimigo): esquerda para direita (0 -> n-1)
        for (let col = 0; col < boardSize; col++) {
            const key = `3,${col}`;
            if (col < boardSize - 1) {
                graph[key] = [`3,${col + 1}`];
            } else {
                // Sai do território inimigo para linha 2
                graph[key] = [`2,${boardSize - 1}`];
            }
        }
        
    } else { // blue
        // Azul: Linha 3 (esquerda->direita) -> Linha 2 (direita->esquerda) -> 
        //       Linha 1 (esquerda->direita) -> opção Linha 0 (território inimigo)
        
        // Linha 3: esquerda para direita (0 -> n-1)
        for (let col = 0; col < boardSize; col++) {
            const key = `3,${col}`;
            if (col < boardSize - 1) {
                graph[key] = [`3,${col + 1}`];
            } else {
                // Col n-1 da linha 3 vai para col n-1 da linha 2
                graph[key] = [`2,${boardSize - 1}`];
            }
        }
        
        // Linha 2: direita para esquerda (n-1 -> 0)
        for (let col = boardSize - 1; col >= 0; col--) {
            const key = `2,${col}`;
            if (col > 0) {
                graph[key] = [`2,${col - 1}`];
            } else {
                // Col 0 da linha 2 vai para col 0 da linha 1
                graph[key] = ['1,0'];
            }
        }
        
        // Linha 1: esquerda para direita (0 -> n-1)
        for (let col = 0; col < boardSize; col++) {
            const key = `1,${col}`;
            if (col < boardSize - 1) {
                graph[key] = [`1,${col + 1}`];
            } else {
                // Ponto de decisão: pode ir para linha 2 ou linha 0 (território inimigo)
                graph[key] = [`2,${boardSize - 1}`, '0,' + (boardSize - 1)];
            }
        }
        
        // Linha 0 (território inimigo): direita para esquerda (n-1 -> 0)
        for (let col = boardSize - 1; col >= 0; col--) {
            const key = `0,${col}`;
            if (col > 0) {
                graph[key] = [`0,${col - 1}`];
            } else {
                // Sai do território inimigo para linha 1
                graph[key] = ['1,0'];
            }
        }
    }
    
    return graph;
}

// Calcular destino de uma peça após N passos
function calculateDestination(piece, steps, color, boardSize) {
    const graph = generateMovementGraph(color, boardSize);
    let current = `${piece.row},${piece.col}`;
    const path = [current];
    
    for (let i = 0; i < steps; i++) {
        const nextMoves = graph[current];
        if (!nextMoves || nextMoves.length === 0) {
            return null; // Não pode mover mais
        }
        
        // Escolher o próximo movimento
        let next = nextMoves[0];
        
        // Se há escolha (ponto de decisão), decidir baseado em território inimigo
        if (nextMoves.length > 1) {
            const enemyRow = color === 'red' ? 3 : 0;
            const territoryOption = nextMoves.find(move => move.startsWith(`${enemyRow},`));
            
            // Se a peça já completou território inimigo, não pode entrar novamente
            if (piece.hasCompletedEnemyTerritory && territoryOption) {
                next = nextMoves.find(move => !move.startsWith(`${enemyRow},`));
            } else {
                next = nextMoves[0]; // Padrão: primeira opção
            }
        }
        
        current = next;
        path.push(current);
    }
    
    const [row, col] = current.split(',').map(Number);
    return { row, col, path };
}

// Verificar se há peças inativas na linha inicial
function hasInactivePiecesInHomeLine(pieces, color) {
    const homeLine = color === 'red' ? 0 : 3;
    return pieces.some(p => p.row === homeLine && !p.active);
}

// Verificar se uma peça está congelada
function isPieceFrozen(piece, pieces, color) {
    const enemyRow = color === 'red' ? 3 : 0;
    
    // Peça está em território inimigo?
    if (piece.row === enemyRow) {
        // Verifica se há peças inativas na linha inicial
        return hasInactivePiecesInHomeLine(pieces, color);
    }
    
    return false;
}

// Verificar se uma jogada é válida
function isValidMove(game, pieceIndex, diceValue) {
    const color = game.currentPlayer;
    const pieces = game.pieces[color];
    const piece = pieces[pieceIndex];
    
    if (!piece) return { valid: false, reason: 'Invalid piece' };
    
    // Verificar se o dado foi lançado e não usado
    if (!game.diceRolled || game.diceUsed) {
        return { valid: false, reason: 'No dice value available' };
    }
    
    // Verificar se diceValue bate com o valor do dado
    if (diceValue !== game.diceValue) {
        return { valid: false, reason: 'Invalid dice value' };
    }
    
    // Peça inativa - precisa de valor 1 para ativar
    if (!piece.active) {
        if (diceValue !== 1) {
            return { valid: false, reason: 'Inactive piece requires 1 to activate' };
        }
        return { valid: true, action: 'activate' };
    }
    
    // Verificar se a peça está congelada
    if (isPieceFrozen(piece, pieces, color)) {
        return { valid: false, reason: 'Piece is frozen' };
    }
    
    // Calcular destino
    const destination = calculateDestination(piece, diceValue, color, game.boardSize);
    if (!destination) {
        return { valid: false, reason: 'Cannot move that many steps' };
    }
    
    // Verificar se já tem uma peça da mesma cor no destino
    const collision = pieces.some(p => 
        p !== piece && p.row === destination.row && p.col === destination.col
    );
    
    if (collision) {
        return { valid: false, reason: 'Cannot stack own pieces' };
    }
    
    return { valid: true, action: 'move', destination };
}

// Obter todas as jogadas possíveis
function getPossibleMoves(game) {
    const color = game.currentPlayer;
    const pieces = game.pieces[color];
    const diceValue = game.diceValue;
    const possibleMoves = [];
    
    if (!game.diceRolled || game.diceUsed) {
        return possibleMoves;
    }
    
    for (let i = 0; i < pieces.length; i++) {
        const validation = isValidMove(game, i, diceValue);
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

// Verificar captura
function checkCapture(game, row, col) {
    const color = game.currentPlayer;
    const enemyColor = color === 'red' ? 'blue' : 'red';
    const enemyPieces = game.pieces[enemyColor];
    
    const capturedIndex = enemyPieces.findIndex(p => p.row === row && p.col === col);
    
    if (capturedIndex !== -1) {
        return { captured: true, enemyColor, capturedIndex };
    }
    
    return { captured: false };
}

// Verificar vitória
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

// Lançar dados com probabilidades do TÂB
function rollDice() {
    const faces = [];
    
    // Simular 4 varetas (0 = face escura/arqueada, 1 = face clara/plana)
    for (let i = 0; i < 4; i++) {
        faces.push(Math.random() < 0.5 ? 0 : 1);
    }
    
    const planesCount = faces.filter(f => f === 1).length;
    
    // Mapear para valores do TÂB
    let value, bonusRoll;
    
    switch (planesCount) {
        case 0: // 0 planas = 6 passos + repetir
            value = 6;
            bonusRoll = true;
            break;
        case 1: // 1 plana = 1 passo + repetir (Tâb)
            value = 1;
            bonusRoll = true;
            break;
        case 2: // 2 planas = 2 passos
            value = 2;
            bonusRoll = false;
            break;
        case 3: // 3 planas = 3 passos
            value = 3;
            bonusRoll = false;
            break;
        case 4: // 4 planas = 4 passos + repetir
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
    getPossibleMoves,
    checkCapture,
    checkVictory,
    rollDice,
    isPieceFrozen,
    hasInactivePiecesInHomeLine
};
