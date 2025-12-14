// gameAPI.js - Lógica da API do jogo
const dataManager = require('./dataManager');
const rules = require('./rules');

// Entrar na fila ou jogo
function joinGame(username) {
    // Adicionar à fila primeiro
    const result = dataManager.addToQueue(username);
    
    if (!result.success) {
        return {
            success: false,
            error: result.error
        };
    }
    
    // Tentar matchmaking
    const match = dataManager.matchPlayers();
    
    if (match) {
        // Criar novo jogo
        const game = dataManager.createGame(match.player1, match.player2);
        
        // CORREÇÃO: Primeiro jogador (player1) é AZUL, segundo (player2) é VERMELHO
        return {
            success: true,
            gameId: game.id,
            opponent: match.player1 === username ? match.player2 : match.player1,
            color: match.player1 === username ? 'blue' : 'red',
            status: 'matched'
        };
    } else {
        // Ainda aguardando na fila
        return {
            success: true,
            status: 'waiting',
            position: result.position
        };
    }
}

// Lançar os dados
function doRoll(gameId, username) {
    const game = dataManager.getGame(gameId);
    
    if (!game) {
        return { success: false, error: 'Game not found' };
    }
    
    if (game.status !== 'active') {
        return { success: false, error: 'Game is not active' };
    }
    
    // Verificar se é a vez do jogador
    // CORREÇÃO: player1 é AZUL, player2 é VERMELHO
    const playerColor = game.player1 === username ? 'blue' : 'red';
    if (game.currentPlayer !== playerColor) {
        return { success: false, error: 'Not your turn' };
    }
    
    // Verificar se já lançou os dados neste turno
    if (game.diceRolled && !game.diceUsed) {
        // CORREÇÃO PROBLEMA 3: Permitir relançar se dado é repetível (1, 4, 6) E não há jogadas possíveis
        const isRepeatable = game.diceValue === 1 || game.diceValue === 4 || game.diceValue === 6;
        const possibleMoves = rules.getPossibleMoves(game);
        const hasNoMoves = possibleMoves.length === 0;
        
        // Se dado é repetível E não há jogadas, permitir relançar
        if (!isRepeatable || !hasNoMoves) {
            return { success: false, error: 'Dice already rolled' };
        }
        // Se chegou aqui, é repetível e não há jogadas - permitir relançar
    }
    
    // Lançar dados
    const rollResult = rules.rollDice();
    
    // Atualizar jogo
    dataManager.updateGame(gameId, {
        diceValue: rollResult.value,
        diceRolled: true,
        diceUsed: false,
        bonusRoll: rollResult.bonusRoll,
        lastRoll: rollResult.faces
    });
    
    return {
        success: true,
        value: rollResult.value,
        bonusRoll: rollResult.bonusRoll,
        faces: rollResult.faces
    };
}

// Fazer jogada (mover peça)
function doNotify(gameId, username, pieceIndex) {
    const game = dataManager.getGame(gameId);
    
    if (!game) {
        return { success: false, error: 'Game not found' };
    }
    
    if (game.status !== 'active') {
        return { success: false, error: 'Game is not active' };
    }
    
    // Verificar se é a vez do jogador
    // CORREÇÃO: player1 é AZUL, player2 é VERMELHO
    const playerColor = game.player1 === username ? 'blue' : 'red';
    if (game.currentPlayer !== playerColor) {
        return { success: false, error: 'Not your turn' };
    }
    
    // Validar jogada
    const validation = rules.isValidMove(game, pieceIndex, game.diceValue);
    
    if (!validation.valid) {
        return { success: false, error: validation.reason };
    }
    
    // Executar jogada
    const pieces = game.pieces[playerColor];
    const piece = pieces[pieceIndex];
    
    let captured = null;
    
    if (validation.action === 'activate') {
        // Ativar peça
        piece.active = true;
        const dest = rules.calculateDestination(piece, 1, playerColor, game.boardSize);
        piece.row = dest.row;
        piece.col = dest.col;
        
        // Verificar captura
        const captureResult = rules.checkCapture(game, dest.row, dest.col);
        if (captureResult.captured) {
            const enemyPieces = game.pieces[captureResult.enemyColor];
            enemyPieces.splice(captureResult.capturedIndex, 1);
            captured = { color: captureResult.enemyColor, position: { row: dest.row, col: dest.col } };
        }
    } else {
        // Mover peça
        const oldRow = piece.row;
        const enemyRow = playerColor === 'red' ? 3 : 0;
        
        piece.row = validation.destination.row;
        piece.col = validation.destination.col;
        
        // Atualizar status de território inimigo
        const wasInEnemyTerritory = oldRow === enemyRow;
        const isInEnemyTerritory = piece.row === enemyRow;
        
        piece.inEnemyTerritory = isInEnemyTerritory;
        
        // Se saiu do território inimigo, marcar como completo
        if (wasInEnemyTerritory && !isInEnemyTerritory && !piece.hasCompletedEnemyTerritory) {
            piece.hasCompletedEnemyTerritory = true;
        }
        
        // Verificar captura
        const captureResult = rules.checkCapture(game, piece.row, piece.col);
        if (captureResult.captured) {
            const enemyPieces = game.pieces[captureResult.enemyColor];
            enemyPieces.splice(captureResult.capturedIndex, 1);
            captured = { color: captureResult.enemyColor, position: { row: piece.row, col: piece.col } };
        }
    }
    
    // Marcar dado como usado
    game.diceUsed = true;
    
    // Verificar vitória
    const victoryCheck = rules.checkVictory(game);
    
    if (victoryCheck.gameOver) {
        game.status = 'finished';
        game.winner = victoryCheck.winner;
        
        // Atualizar estatísticas dos jogadores
        // CORREÇÃO: player1 é AZUL, player2 é VERMELHO
        const winner = game.winner === 'blue' ? game.player1 : game.player2;
        const loser = game.winner === 'blue' ? game.player2 : game.player1;
        
        dataManager.updateUserStats(winner, true);
        dataManager.updateUserStats(loser, false);
    } else {
        // Trocar turno se não houver bônus ou se o dado foi usado
        if (!game.bonusRoll) {
            game.currentPlayer = game.currentPlayer === 'red' ? 'blue' : 'red';
            game.diceRolled = false;
            game.diceUsed = false;
        } else {
            // Tem bônus, mas precisa lançar os dados novamente
            game.diceRolled = false;
            game.diceUsed = false;
        }
    }
    
    // Salvar jogo atualizado
    dataManager.updateGame(gameId, game);
    
    return {
        success: true,
        piece: { index: pieceIndex, ...piece },
        captured,
        gameOver: victoryCheck.gameOver,
        winner: victoryCheck.winner,
        nextTurn: game.currentPlayer,
        bonusRoll: game.bonusRoll && !victoryCheck.gameOver
    };
}

// Passar a vez
function doPass(gameId, username) {
    const game = dataManager.getGame(gameId);
    
    if (!game) {
        return { success: false, error: 'Game not found' };
    }
    
    if (game.status !== 'active') {
        return { success: false, error: 'Game is not active' };
    }
    
    // Verificar se é a vez do jogador
    // CORREÇÃO: player1 é AZUL, player2 é VERMELHO
    const playerColor = game.player1 === username ? 'blue' : 'red';
    if (game.currentPlayer !== playerColor) {
        return { success: false, error: 'Not your turn' };
    }
    
    // Verificar se não há jogadas possíveis
    const possibleMoves = rules.getPossibleMoves(game);
    
    if (possibleMoves.length > 0) {
        return { success: false, error: 'There are possible moves' };
    }
    
    // CORREÇÃO PROBLEMA 3: Não pode passar se dado é repetível (1, 4, 6) - deve relançar
    const isRepeatable = game.diceValue === 1 || game.diceValue === 4 || game.diceValue === 6;
    if (isRepeatable && game.diceRolled) {
        return { success: false, error: 'Must re-roll with repeatable dice (1, 4, 6) when no moves available' };
    }
    
    // Passar a vez
    game.currentPlayer = game.currentPlayer === 'red' ? 'blue' : 'red';
    game.diceRolled = false;
    game.diceUsed = false;
    game.bonusRoll = false;
    // CRÍTICO: Resetar o dado para permitir que o próximo jogador lance
    game.diceValue = null;
    
    dataManager.updateGame(gameId, game);
    
    return {
        success: true,
        nextTurn: game.currentPlayer
    };
}

// Atualizar estado do jogo (polling)
function updateGame(gameId, username) {
    const game = dataManager.getGame(gameId);
    
    if (!game) {
        return { success: false, error: 'Game not found' };
    }
    
    // CORREÇÃO: player1 é AZUL, player2 é VERMELHO
    const playerColor = game.player1 === username ? 'blue' : 'red';
    const isMyTurn = game.currentPlayer === playerColor;
    
    return {
        success: true,
        game: {
            id: game.id,
            boardSize: game.boardSize,
            currentPlayer: game.currentPlayer,
            isMyTurn,
            diceValue: game.diceValue,
            diceRolled: game.diceRolled,
            diceUsed: game.diceUsed,
            pieces: game.pieces,
            status: game.status,
            winner: game.winner,
            lastUpdate: game.lastUpdate,
            playerColor,
            opponent: game.player1 === username ? game.player2 : game.player1
        }
    };
}

// Sair/desistir do jogo
function leaveGame(gameId, username) {
    const game = dataManager.getGame(gameId);
    
    if (!game) {
        // Tentar remover da fila
        dataManager.removeFromQueue(username);
        return { success: true, message: 'Removed from queue' };
    }
    
    if (game.status === 'active') {
        // Desistir do jogo - o outro jogador ganha
        // CORREÇÃO: player1 é AZUL, player2 é VERMELHO
        const playerColor = game.player1 === username ? 'blue' : 'red';
        const winner = playerColor === 'blue' ? 'red' : 'blue';
        
        game.status = 'finished';
        game.winner = winner;
        
        // Atualizar estatísticas
        const winnerUsername = winner === 'blue' ? game.player1 : game.player2;
        dataManager.updateUserStats(winnerUsername, true);
        dataManager.updateUserStats(username, false);
        
        dataManager.updateGame(gameId, game);
        
        return {
            success: true,
            message: 'Game forfeited',
            winner
        };
    }
    
    return { success: true, message: 'Game already finished' };
}

// Criar ou entrar em sala (sistema simplificado)
function roomGame(username, roomPassword) {
    // Verificar se sala existe
    const roomKey = `room_${roomPassword}`;
    let room = dataManager.getRoom(roomKey);
    
    if (!room) {
        // CRIAR SALA - Jogador 1 (Azul)
        const gameId = dataManager.generateGameId(roomPassword + Date.now(), username);
        room = {
            gameId: gameId,
            player1: username,
            player2: null,
            status: 'waiting',
            createdAt: Date.now()
        };
        dataManager.saveRoom(roomKey, room);
        
        return { 
            success: true,
            waiting: true,
            message: "Sala criada. Aguardando oponente...",
            color: 'blue',
            roomKey: roomKey
        };
    } 
    else if (room.status === 'waiting' && room.player1 !== username) {
        // ENTRAR NA SALA - Jogador 2 (Vermelho)
        room.player2 = username;
        room.status = 'playing';
        
        // Criar o jogo
        const newGame = dataManager.createGame(room.player1, room.player2);
        room.gameId = newGame.id;
        dataManager.saveRoom(roomKey, room);
        
        return { 
            success: true,
            gameId: newGame.id,
            color: 'red',
            message: "Jogo iniciado!",
            opponent: room.player1
        };
    }
    else if (room.player1 === username || room.player2 === username) {
        // Reconectar
        const isPlayer1 = room.player1 === username;
        return { 
            success: true,
            gameId: room.gameId,
            color: isPlayer1 ? 'blue' : 'red',
            opponent: isPlayer1 ? room.player2 : room.player1,
            status: room.status,
            waiting: room.status === 'waiting'
        };
    }
    else {
        return { success: false, error: "Sala cheia" };
    }
}

module.exports = {
    joinGame,
    doRoll,
    doNotify,
    doPass,
    updateGame,
    leaveGame,
    roomGame
};
