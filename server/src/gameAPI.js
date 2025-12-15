// server/src/gameAPI.js - Lógica da API CORRIGIDA
// Replica comportamento da API oficial

const dataManager = require('./dataManager');
const rules = require('./rules');

// ===================================================
// ENTRAR NA FILA OU JOGO
// ===================================================
function joinGame(nick, group, boardSize = 7) {
    console.log('🎮 JoinGame:', nick, 'grupo:', group, 'tamanho:', boardSize);

    // Adicionar à fila do grupo
    const result = dataManager.addToQueue(nick, group, boardSize);

    if (!result.success) {
        return { error: result.error };
    }

    // Tentar matchmaking no mesmo grupo
    const match = dataManager.matchPlayers(group);

    if (match) {
        // Match encontrado! Criar jogo
        const game = dataManager.createGame(match.player1, match.player2, boardSize, group);

        console.log('✅ Match:', match.player1, 'vs', match.player2, '| Game:', game.id);

        return {
            game: game.id
            // API oficial retorna só isso quando matched
        };
    } else {
        // Ainda na fila
        console.log('⏳ Aguardando oponente:', nick);

        return {
            // API oficial retorna objeto vazio quando waiting
        };
    }
}

// ===================================================
// LANÇAR OS DADOS
// ===================================================
function doRoll(gameId, nick) {
    const game = dataManager.getGame(gameId);

    if (!game) {
        return { error: 'Game not found' };
    }

    if (game.status !== 'active') {
        return { error: 'Game is not active' };
    }

    // Verificar se é a vez do jogador
    const playerColor = game.players[0] === nick ? 'blue' : 'red';
    if (game.turn !== playerColor) {
        return { error: 'Not your turn' };
    }

    // Verificar se já lançou os dados neste turno
    if (game.dice > 0) {
        // CORREÇÃO PROBLEMA 3: Permitir relançar se:
        // 1. Dado é repetível (1, 4, 6)
        // 2. Não há jogadas possíveis
        const isRepeatable = game.dice === 1 || game.dice === 4 || game.dice === 6;
        const possibleMoves = rules.getAllPossibleMoves(game, playerColor);
        const hasNoMoves = possibleMoves.length === 0;

        if (!isRepeatable || !hasNoMoves) {
            return { error: 'Dice already rolled' };
        }

        console.log('🔄 Relançando dado repetível sem jogadas:', game.dice);
    }

    // Lançar dados
    const rollResult = rules.rollDice();

    console.log('🎲 Roll:', nick, '→', rollResult.value, rollResult.bonusRoll ? '(bônus)' : '');

    // Atualizar jogo
    dataManager.updateGame(gameId, {
        dice: rollResult.value,
        lastRoll: rollResult.faces
    });

    return {}; // API oficial retorna objeto vazio em sucesso
}

// ===================================================
// FAZER JOGADA (CELL INDEX)
// ===================================================
function doNotify(gameId, nick, cellIndex) {
    const game = dataManager.getGame(gameId);

    if (!game) {
        return { error: 'Game not found' };
    }

    if (game.status !== 'active') {
        return { error: 'Game is not active' };
    }

    // Verificar se é a vez do jogador
    const playerColor = game.players[0] === nick ? 'blue' : 'red';
    if (game.turn !== playerColor) {
        return { error: 'Not your turn' };
    }

    if (game.dice === 0) {
        return { error: 'Dice not rolled' };
    }

    console.log('👉 Notify:', nick, 'célula:', cellIndex, 'dado:', game.dice);

    // ===================================================
    // CONVERTER CELL INDEX → ROW, COL
    // ===================================================
    const boardSize = game.size;
    const row = Math.floor(cellIndex / boardSize);
    const col = cellIndex % boardSize;

    console.log('   Posição:', row, col);

    // ===================================================
    // ENCONTRAR PEÇA NA POSIÇÃO
    // ===================================================
    const pieces = game.pieces[playerColor];
    const pieceIndex = pieces.findIndex(p => p.row === row && p.col === col);

    if (pieceIndex === -1) {
        return { error: 'No piece at this position' };
    }

    const piece = pieces[pieceIndex];

    // ===================================================
    // VALIDAR JOGADA
    // ===================================================
    const validation = rules.isValidMove(game, playerColor, pieceIndex, game.dice);

    if (!validation.valid) {
        console.log('❌ Movimento inválido:', validation.reason);
        return { error: validation.reason };
    }

    console.log('✅ Movimento válido:', validation.action);

    // ===================================================
    // EXECUTAR JOGADA
    // ===================================================
    let captured = false;

    if (validation.action === 'activate') {
        // Ativar peça
        piece.active = true;
        const dest = rules.calculateDestination(piece, 1, playerColor, boardSize);

        if (dest) {
            // Verificar captura no destino
            const enemyColor = playerColor === 'blue' ? 'red' : 'blue';
            const captureResult = rules.checkCapture(game, dest.row, dest.col, enemyColor);

            if (captureResult.captured) {
                captured = true;
                console.log('💥 Captura na ativação!');
            }

            piece.row = dest.row;
            piece.col = dest.col;
        }
    } else {
        // Mover peça
        const oldRow = piece.row;
        const enemyRow = playerColor === 'blue' ? 0 : 3;

        piece.row = validation.destination.row;
        piece.col = validation.destination.col;

        // Verificar captura
        const enemyColor = playerColor === 'blue' ? 'red' : 'blue';
        const captureResult = rules.checkCapture(game, piece.row, piece.col, enemyColor);

        if (captureResult.captured) {
            captured = true;
            console.log('💥 Captura!');
        }

        // Atualizar status de território inimigo
        const wasInEnemyTerritory = oldRow === enemyRow;
        const isInEnemyTerritory = piece.row === enemyRow;

        piece.inEnemyTerritory = isInEnemyTerritory;

        if (wasInEnemyTerritory && !isInEnemyTerritory && !piece.hasCompletedEnemyTerritory) {
            piece.hasCompletedEnemyTerritory = true;
            console.log('🏁 Peça completou território inimigo');
        }
    }

    // ===================================================
    // VERIFICAR VITÓRIA
    // ===================================================
    const victoryCheck = rules.checkVictory(game);

    if (victoryCheck.gameOver) {
        game.status = 'finished';
        game.winner = victoryCheck.winner;

        console.log('🏆 Vitória:', victoryCheck.winner);

        // Atualizar estatísticas
        const winner = game.winner === 'blue' ? game.players[0] : game.players[1];
        const loser = game.winner === 'blue' ? game.players[1] : game.players[0];

        dataManager.updateUserStats(winner, true, game.group);
        dataManager.updateUserStats(loser, false, game.group);
    } else {
        // Determinar próximo turno
        const isRepeatable = game.dice === 1 || game.dice === 4 || game.dice === 6;

        if (isRepeatable && !captured) {
            // Bônus: mantém o turno mas reseta o dado
            game.dice = 0;
            console.log('🎁 Bônus! Jogue novamente.');
        } else {
            // Trocar turno
            game.turn = game.turn === 'blue' ? 'red' : 'blue';
            game.dice = 0;
            console.log('🔄 Próximo turno:', game.turn);
        }
    }

    // Salvar jogo atualizado
    dataManager.updateGame(gameId, game);

    return {}; // API oficial retorna objeto vazio em sucesso
}

// ===================================================
// PASSAR A VEZ
// ===================================================
function doPass(gameId, nick) {
    const game = dataManager.getGame(gameId);

    if (!game) {
        return { error: 'Game not found' };
    }

    if (game.status !== 'active') {
        return { error: 'Game is not active' };
    }

    // Verificar se é a vez do jogador
    const playerColor = game.players[0] === nick ? 'blue' : 'red';
    if (game.turn !== playerColor) {
        return { error: 'Not your turn' };
    }

    // Verificar se não há jogadas possíveis
    const possibleMoves = rules.getAllPossibleMoves(game, playerColor);

    if (possibleMoves.length > 0) {
        return { error: 'There are possible moves' };
    }

    // CORREÇÃO PROBLEMA 3: Não pode passar se dado é repetível
    const isRepeatable = game.dice === 1 || game.dice === 4 || game.dice === 6;
    if (isRepeatable && game.dice > 0) {
        return { error: 'Must re-roll repeatable dice' };
    }

    console.log('⏭️ Pass:', nick);

    // Passar a vez
    game.turn = game.turn === 'blue' ? 'red' : 'blue';
    game.dice = 0;

    dataManager.updateGame(gameId, game);

    return {}; // API oficial retorna objeto vazio em sucesso
}

// ===================================================
// ATUALIZAR ESTADO DO JOGO (para SSE/Polling)
// ===================================================
function updateGame(gameId, nick) {
    const game = dataManager.getGame(gameId);

    if (!game) {
        return { error: 'Game not found' };
    }

    // Formato compatível com API oficial
    return {
        game: game.id,
        turn: game.turn,
        dice: game.dice,
        pieces: game.pieces,
        players: game.players, // Array: [player1(azul), player2(vermelho)]
        winner: game.winner || null,
        size: game.size
    };
}

// ===================================================
// SAIR/DESISTIR DO JOGO
// ===================================================
function leaveGame(gameId, nick) {
    if (!gameId) {
        // Remover da fila
        dataManager.removeFromQueue(nick);
        console.log('🚪 Removido da fila:', nick);
        return {};
    }

    const game = dataManager.getGame(gameId);

    if (!game) {
        dataManager.removeFromQueue(nick);
        return {};
    }

    if (game.status === 'active') {
        // Desistir do jogo - o outro jogador ganha
        const playerColor = game.players[0] === nick ? 'blue' : 'red';
        const winner = playerColor === 'blue' ? 'red' : 'blue';

        game.status = 'finished';
        game.winner = winner;

        console.log('🏳️ Desistência:', nick, '→ Vencedor:', winner);

        // Atualizar estatísticas
        const winnerNick = winner === 'blue' ? game.players[0] : game.players[1];
        dataManager.updateUserStats(winnerNick, true, game.group);
        dataManager.updateUserStats(nick, false, game.group);

        dataManager.updateGame(gameId, game);
    }

    return {};
}

module.exports = {
    joinGame,
    doRoll,
    doNotify,
    doPass,
    updateGame,
    leaveGame
};