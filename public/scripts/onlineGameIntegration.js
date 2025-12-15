// Estado do jogo online
let onlineGameState = {
    isOnline: false,
    gameId: null,
    myColor: null,
    boardSize: 7,
    lastUpdate: null
};

// ===================================================
// INICIAR JOGO ONLINE
// ===================================================
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
            console.log('🔄 Tentando matchmaking novamente...');
            const checkResult = await window.loginManager.joinGame(boardSize);

            if (checkResult.success && checkResult.status === 'matched') {
                clearInterval(checkInterval);

                onlineGameState.isOnline = true;
                onlineGameState.gameId = checkResult.gameId;
                onlineGameState.boardSize = boardSize;

                // Criar tabuleiro e iniciar
                initOnlineBoard(boardSize);

                updateMessage('Oponente encontrado! Jogo iniciado. Aguardando estado do servidor...');

                console.log('✅ Match encontrado! Game ID:', checkResult.gameId);
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

        console.log('✅ Jogo iniciado imediatamente! Game ID:', result.gameId);
    }
};

// ===================================================
// INICIALIZAR TABULEIRO ONLINE
// ===================================================
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

    console.log('✅ Tabuleiro online criado:', boardSize + 'x4');
}

// ===================================================
// CONFIGURAR HANDLERS DE EVENTOS
// ===================================================
function setupOnlineHandlers() {
    console.log('🎮 Configurando handlers de jogo online...');

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

            console.log('👉 Clique na célula:', cellIndex);

            const result = await window.loginManager.doNotify(cellIndex);

            if (result.success) {
                updateMessage('Movimento enviado. Aguardando confirmação...');
            } else {
                updateMessage(`Erro: ${result.error}`);
            }
        });
    });

    console.log('✅ Handlers configurados');
}

// ===================================================
// RECEBER UPDATES DO SERVIDOR (Callback global)
// ===================================================
window.onGameUpdate = function(serverState) {
    if (!onlineGameState.isOnline) return;

    console.log('📥 Update do servidor:', serverState);

    // Verificar se retornou erro
    if (serverState.error) {
        console.error('❌ Erro no update:', serverState.error);
        return;
    }

    // Atualizar timestamp
    onlineGameState.lastUpdate = Date.now();

    // ===================================================
    // EXTRAIR INFORMAÇÕES DO ESTADO
    // ===================================================

    // Formato API oficial vs backend próprio
    const currentTurn = serverState.turn || serverState.currentPlayer;
    const diceValue = serverState.dice !== undefined ? serverState.dice : (serverState.diceValue || 0);
    const pieces = serverState.pieces || { red: [], blue: [] };
    const winner = serverState.winner;
    const players = serverState.players || [];

    // ===================================================
    // DETERMINAR MINHA COR (CORRIGIDO!)
    // ===================================================
    if (!onlineGameState.myColor) {
        const myNick = window.loginManager.nick;

        if (players && players.length >= 2) {
            // API oficial retorna array: [player1, player2]
            // player1 (índice 0) = AZUL (primeiro a entrar)
            // player2 (índice 1) = VERMELHO (segundo a entrar)

            if (players[0] === myNick) {
                onlineGameState.myColor = 'blue';
                console.log('🎨 Você é AZUL (primeiro jogador)');
            } else if (players[1] === myNick) {
                onlineGameState.myColor = 'red';
                console.log('🎨 Você é VERMELHO (segundo jogador)');
            } else {
                console.warn('⚠️ Nick não encontrado nos players, assumindo azul');
                onlineGameState.myColor = 'blue';
            }
        } else {
            // Fallback se players não vier no formato esperado
            console.warn('⚠️ Players array não disponível, assumindo azul');
            onlineGameState.myColor = 'blue';
        }
    }

    // ===================================================
    // ATUALIZAR TABULEIRO VISUAL
    // ===================================================
    updateBoardFromServer(pieces);

    // ===================================================
    // DETERMINAR SE É MINHA VEZ
    // ===================================================
    const isMyTurn = currentTurn === onlineGameState.myColor;

    // ===================================================
    // VERIFICAR FIM DE JOGO
    // ===================================================
    if (winner) {
        const didIWin = winner === onlineGameState.myColor;

        // Parar polling/SSE
        if (window.loginManager) {
            window.loginManager.stopUpdateStream();
        }

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

    // ===================================================
    // ATUALIZAR UI DE CONTROLES
    // ===================================================
    const rollButton = document.getElementById('roll-dice');
    if (rollButton) {
        // Habilita dados apenas se:
        // 1. É minha vez
        // 2. Dados ainda não foram lançados (diceValue === 0)
        rollButton.disabled = !isMyTurn || diceValue > 0;
    }

    // ===================================================
    // MENSAGEM DE STATUS
    // ===================================================
    if (isMyTurn) {
        if (diceValue === 0) {
            updateMessage('🎲 Sua vez! Lance os dados.');
        } else {
            updateMessage(`🎯 Sua vez! Dados: ${diceValue}. Selecione uma peça para mover.`);
            highlightSelectablePieces();
        }
    } else {
        const opponentColor = onlineGameState.myColor === 'red' ? 'Azul' : 'Vermelho';
        updateMessage(`⏳ Turno do oponente (${opponentColor}). Aguarde...`);
    }
};

// ===================================================
// ATUALIZAR VISUALIZAÇÃO DO TABULEIRO
// ===================================================
function updateBoardFromServer(pieces) {
    const cells = document.querySelectorAll('.cell');
    const boardSize = onlineGameState.boardSize;

    // Limpar todas as células
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('has-piece', 'selectable', 'possible-move', 'capture-move', 'selected');
    });

    // ===================================================
    // COLOCAR PEÇAS VERMELHAS
    // ===================================================
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

    // ===================================================
    // COLOCAR PEÇAS AZUIS
    // ===================================================
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

// ===================================================
// DESTACAR PEÇAS SELECIONÁVEIS
// ===================================================
function highlightSelectablePieces() {
    const cells = document.querySelectorAll('.cell');

    cells.forEach(cell => {
        cell.classList.remove('selectable');

        // Destacar apenas peças da minha cor
        const piece = cell.querySelector(`.${onlineGameState.myColor}-piece`);
        if (piece) {
            cell.classList.add('selectable');
        }
    });
}

// ===================================================
// FUNÇÃO AUXILIAR: ATUALIZAR MENSAGENS
// ===================================================
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
    console.log('💬', text);
}

console.log('✅ Online Game Integration carregado - Compatível com Entrega 2 e 3');