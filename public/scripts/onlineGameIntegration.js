// ==================================================
// SEGUNDA ENTREGA API OFICIAL
// onlineGameIntegration.js - Integração do modo online com servidor oficial
// Comunicação EXCLUSIVA via endpoints oficiais
// ==================================================

// Estado do jogo online
let onlineGameState = {
    isOnline: false,
    gameId: null,
    myColor: null,
    boardSize: 7,
    lastUpdate: null
};

// ==================================================
// SEGUNDA ENTREGA API OFICIAL
// Função principal para iniciar jogo online
// ==================================================
window.startOnlineGame = async function(boardSize = 7) {
    if (!window.loginManager || !window.loginManager.nick) {
        alert('Faça login primeiro!');
        return;
    }

    updateMessage('Entrando na fila... Aguarde um oponente.');

    // Desabilitar botão de jogar
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.style.pointerEvents = 'none';
        playBtn.style.opacity = '0.5';
    }

    // ==================================================
    // SEGUNDA ENTREGA API OFICIAL
    // Chamada: POST /join
    // ==================================================
    const result = await window.loginManager.joinGame(boardSize);

    if (!result.success) {
        alert(`Erro ao entrar no jogo: ${result.error}`);
        if (playBtn) {
            playBtn.style.pointerEvents = 'auto';
            playBtn.style.opacity = '1';
        }
        return;
    }

    if (result.status === 'waiting') {
        // Aguardando oponente - continuar tentando
        updateMessage('Aguardando oponente... Tentando novamente em 3 segundos.');

        const checkInterval = setInterval(async () => {
            const checkResult = await window.loginManager.joinGame(boardSize);

            if (checkResult.success && checkResult.status === 'matched') {
                clearInterval(checkInterval);

                onlineGameState.isOnline = true;
                onlineGameState.gameId = checkResult.gameId;
                onlineGameState.boardSize = boardSize;

                // Criar tabuleiro e iniciar
                initOnlineBoard(boardSize);

                updateMessage('Oponente encontrado! Jogo iniciado. Aguardando estado do servidor...');
            }
        }, 3000);

    } else if (result.status === 'matched') {
        // Jogo já iniciado
        onlineGameState.isOnline = true;
        onlineGameState.gameId = result.gameId;
        onlineGameState.boardSize = boardSize;

        // Criar tabuleiro e iniciar
        initOnlineBoard(boardSize);

        updateMessage('Jogo iniciado! Aguardando estado do servidor...');
    }
};

// ==================================================
// SEGUNDA ENTREGA API OFICIAL
// Criar tabuleiro online
// ==================================================
function initOnlineBoard(boardSize) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.classList.remove('hidden');

    board.style.gridTemplateRows = `repeat(4, auto)`;
    board.style.gridTemplateColumns = `repeat(${boardSize}, auto)`;

    // Criar células
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.index = row * boardSize + col;
            board.appendChild(cell);
        }
    }

    // Desabilitar IA se estiver ativa
    if (window.disableAIGame) {
        window.disableAIGame();
    }

    // Configurar handlers online
    setupOnlineHandlers();

    // Fechar dialog se estiver aberto
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// ==================================================
// SEGUNDA ENTREGA API OFICIAL
// Configurar handlers de eventos para modo online
// ==================================================
function setupOnlineHandlers() {
    // Handler para lançar dados
    const rollButton = document.getElementById('roll-dice');
    if (rollButton) {
        const newRollButton = rollButton.cloneNode(true);
        rollButton.parentNode.replaceChild(newRollButton, rollButton);

        newRollButton.addEventListener('click', async function() {
            if (!onlineGameState.isOnline) {
                updateMessage('Não está em jogo online!');
                return;
            }

            newRollButton.disabled = true;
            updateMessage('Lançando dados...');

            // ==================================================
            // SEGUNDA ENTREGA API OFICIAL
            // Chamada: POST /roll
            // ==================================================
            const result = await window.loginManager.doRoll();

            if (result.success) {
                updateMessage('Dados lançados! Aguardando resultado do servidor...');
            } else {
                updateMessage(`Erro: ${result.error}`);
                newRollButton.disabled = false;
            }
        });
    }

    // Handler para passar vez
    const skipButton = document.getElementById('skip-button');
    if (skipButton) {
        const newSkipButton = skipButton.cloneNode(true);
        skipButton.parentNode.replaceChild(newSkipButton, skipButton);

        newSkipButton.addEventListener('click', async function() {
            if (!onlineGameState.isOnline) {
                updateMessage('Não está em jogo online!');
                return;
            }

            if (!confirm('Tem certeza que deseja passar a vez?')) {
                return;
            }

            // ==================================================
            // SEGUNDA ENTREGA API OFICIAL
            // Chamada: POST /pass
            // ==================================================
            const result = await window.loginManager.doPass();

            if (result.success) {
                updateMessage('Vez passada. Aguardando próximo turno...');
            } else {
                updateMessage(`Erro: ${result.error}`);
            }
        });
    }

    // Handler para desistir
    const forfeitButton = document.getElementById('forfeit-button');
    if (forfeitButton) {
        const newForfeitButton = forfeitButton.cloneNode(true);
        forfeitButton.parentNode.replaceChild(newForfeitButton, forfeitButton);

        newForfeitButton.addEventListener('click', async function() {
            if (!onlineGameState.isOnline) {
                updateMessage('Não está em jogo online!');
                return;
            }

            if (!confirm('Tem certeza que deseja desistir?')) {
                return;
            }

            // ==================================================
            // SEGUNDA ENTREGA API OFICIAL
            // Chamada: POST /leave
            // ==================================================
            await window.loginManager.leaveGame();
            updateMessage('Você desistiu do jogo.');

            setTimeout(() => {
                location.reload();
            }, 2000);
        });
    }

    // Handler para cliques nas células
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', async function() {
            if (!onlineGameState.isOnline) return;

            const cellIndex = parseInt(cell.dataset.index);

            // ==================================================
            // SEGUNDA ENTREGA API OFICIAL
            // Chamada: POST /notify com índice da célula
            // ==================================================
            const result = await window.loginManager.doNotify(cellIndex);

            if (result.success) {
                updateMessage('Movimento enviado. Aguardando confirmação...');
            } else {
                updateMessage(`Erro: ${result.error}`);
            }
        });
    });
}

// ==================================================
// SEGUNDA ENTREGA API OFICIAL
// Callback de atualização do servidor (via polling)
// Formato da resposta: ver documentação oficial
// ==================================================
window.onGameUpdate = function(serverState) {
    if (!onlineGameState.isOnline) return;

    console.log('📥 Update do servidor:', serverState);

    // Verificar se retornou erro
    if (serverState.error) {
        console.error('Erro no update:', serverState.error);
        return;
    }

    // Atualizar estado local
    onlineGameState.lastUpdate = Date.now();

    // Extrair informações do estado do servidor
    // NOTA: A estrutura exata depende da resposta da API oficial
    // Adaptar conforme documentação fornecida

    const currentTurn = serverState.turn || serverState.currentPlayer;
    const diceValue = serverState.dice || serverState.diceValue || 0;
    const pieces = serverState.pieces || { red: [], blue: [] };
    const winner = serverState.winner;

    // Determinar minha cor
    if (!onlineGameState.myColor && serverState.players) {
        // Assumir que o primeiro jogador é quem fez join primeiro
        const myNick = window.loginManager.nick;
        if (serverState.players[0] === myNick) {
            onlineGameState.myColor = 'blue'; // Primeiro jogador = azul
        } else {
            onlineGameState.myColor = 'red'; // Segundo jogador = vermelho
        }
    }

    // Atualizar tabuleiro visual
    updateBoardFromServer(pieces);

    // Atualizar mensagem de turno
    const isMyTurn = currentTurn === onlineGameState.myColor ||
                     (serverState.players && serverState.players[0] === window.loginManager.nick && currentTurn === 'blue') ||
                     (serverState.players && serverState.players[1] === window.loginManager.nick && currentTurn === 'red');

    if (winner) {
        // Jogo terminou
        const didIWin = winner === onlineGameState.myColor;

        window.loginManager.stopPolling();

        if (didIWin) {
            updateMessage(`🎉 Você venceu! Parabéns!`);
        } else {
            updateMessage(`😢 Você perdeu! O oponente venceu.`);
        }

        setTimeout(() => {
            if (confirm('Jogo finalizado! Deseja jogar novamente?')) {
                location.reload();
            }
        }, 3000);

        return;
    }

    // Atualizar UI de controles
    const rollButton = document.getElementById('roll-dice');
    if (rollButton) {
        rollButton.disabled = !isMyTurn || diceValue > 0;
    }

    // Mensagem de status
    if (isMyTurn) {
        if (diceValue === 0) {
            updateMessage('Sua vez! Lance os dados.');
        } else {
            updateMessage(`Sua vez! Dados: ${diceValue}. Selecione uma peça para mover.`);
            highlightSelectablePieces();
        }
    } else {
        updateMessage('Turno do oponente. Aguarde...');
    }
};

// ==================================================
// SEGUNDA ENTREGA API OFICIAL
// Atualizar visualização do tabuleiro baseado no estado do servidor
// ==================================================
function updateBoardFromServer(pieces) {
    const cells = document.querySelectorAll('.cell');
    const boardSize = onlineGameState.boardSize;

    // Limpar todas as células
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('has-piece', 'selectable', 'possible-move', 'capture-move', 'selected');
    });

    // Colocar peças vermelhas
    if (pieces.red && Array.isArray(pieces.red)) {
        pieces.red.forEach((piece, index) => {
            const cellIndex = piece.row * boardSize + piece.col;
            const cell = cells[cellIndex];

            if (cell) {
                cell.classList.add('has-piece');
                const pieceDiv = document.createElement('div');
                pieceDiv.classList.add('piece', 'red-piece');
                pieceDiv.dataset.color = 'red';
                pieceDiv.dataset.index = index;

                if (!piece.active) {
                    pieceDiv.classList.add('inactive');
                }

                if (piece.hasCompletedEnemyTerritory) {
                    pieceDiv.classList.add('completed');
                }

                cell.appendChild(pieceDiv);
            }
        });
    }

    // Colocar peças azuis
    if (pieces.blue && Array.isArray(pieces.blue)) {
        pieces.blue.forEach((piece, index) => {
            const cellIndex = piece.row * boardSize + piece.col;
            const cell = cells[cellIndex];

            if (cell) {
                cell.classList.add('has-piece');
                const pieceDiv = document.createElement('div');
                pieceDiv.classList.add('piece', 'blue-piece');
                pieceDiv.dataset.color = 'blue';
                pieceDiv.dataset.index = index;

                if (!piece.active) {
                    pieceDiv.classList.add('inactive');
                }

                if (piece.hasCompletedEnemyTerritory) {
                    pieceDiv.classList.add('completed');
                }

                cell.appendChild(pieceDiv);
            }
        });
    }
}

// ==================================================
// SEGUNDA ENTREGA API OFICIAL
// Destacar peças selecionáveis (minhas peças no meu turno)
// ==================================================
function highlightSelectablePieces() {
    const cells = document.querySelectorAll('.cell');

    cells.forEach(cell => {
        cell.classList.remove('selectable');

        const piece = cell.querySelector(`.${onlineGameState.myColor}-piece`);
        if (piece) {
            cell.classList.add('selectable');
        }
    });
}

// Função auxiliar para atualizar mensagens
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

console.log('✅ SEGUNDA ENTREGA - Online Game Integration carregado (API Oficial)');