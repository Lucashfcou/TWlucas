// onlineGameIntegration.js - Integração do modo online com o jogo

// Estado do jogo online
let onlineGameState = {
    isOnline: false,
    gameId: null,
    myColor: null,
    opponent: null,
    lastUpdate: null
};

// Estado do sistema de salas
let roomCheckInterval = null;

// Configurar event listener para o botão de sala
document.addEventListener('DOMContentLoaded', function() {
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomPasswordInput = document.getElementById('room-password');
    const roomStatus = document.getElementById('room-status');
    
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', async () => {
            const roomPass = roomPasswordInput.value.trim();
            
            if (!roomPass) {
                roomStatus.textContent = "Digite uma senha para a sala!";
                roomStatus.style.color = '#f44336';
                return;
            }
            
            if (!window.loginManager || !window.loginManager.username) {
                roomStatus.textContent = "Você precisa fazer login primeiro!";
                roomStatus.style.color = '#f44336';
                return;
            }
            
            roomStatus.textContent = "Conectando...";
            roomStatus.style.color = '#666';
            
            const result = await window.loginManager.joinRoom(roomPass);
            
            if (result.success) {
                if (result.waiting) {
                    // Jogador 1 - aguardando oponente
                    roomStatus.textContent = "Sala criada! Aguardando oponente...";
                    roomStatus.style.color = '#2196F3';
                    joinRoomBtn.disabled = true;
                    
                    // Iniciar polling para verificar se oponente entrou
                    checkForOpponent(roomPass);
                } 
                else if (result.gameId) {
                    // Jogador 2 - jogo iniciado ou reconectando
                    roomStatus.textContent = "Oponente encontrado! Iniciando jogo...";
                    roomStatus.style.color = '#4CAF50';
                    joinRoomBtn.disabled = true;
                    
                    // Parar verificação se estiver rodando
                    if (roomCheckInterval) {
                        clearInterval(roomCheckInterval);
                        roomCheckInterval = null;
                    }
                    
                    // Iniciar jogo
                    setTimeout(() => {
                        startOnlineGameSimple(result.gameId, result.color, result.opponent);
                    }, 1000);
                }
            } else {
                roomStatus.textContent = result.error || "Erro ao conectar";
                roomStatus.style.color = '#f44336';
            }
        });
    }
});

// Verificar periodicamente se oponente entrou
function checkForOpponent(roomPass) {
    if (roomCheckInterval) {
        clearInterval(roomCheckInterval);
    }
    
    roomCheckInterval = setInterval(async () => {
        const result = await window.loginManager.joinRoom(roomPass);
        
        if (result.success && result.gameId && !result.waiting) {
            clearInterval(roomCheckInterval);
            roomCheckInterval = null;
            
            const roomStatus = document.getElementById('room-status');
            if (roomStatus) {
                roomStatus.textContent = "Oponente encontrado! Iniciando jogo...";
                roomStatus.style.color = '#4CAF50';
            }
            
            // Iniciar jogo
            setTimeout(() => {
                startOnlineGameSimple(result.gameId, result.color, result.opponent);
            }, 1000);
        }
    }, 2000);
}

// Iniciar jogo online simplificado (usa a função existente)
function startOnlineGameSimple(gameId, myColor, opponent) {
    // Esconder o painel de salas
    const onlinePanel = document.getElementById('online-panel');
    if (onlinePanel) {
        onlinePanel.style.display = 'none';
    }
    
    // Usar a função existente
    if (typeof window.startOnlineGame === 'function') {
        window.startOnlineGame(gameId, myColor, opponent);
    }
}

// Callback para atualizações do servidor
window.onGameUpdate = function(serverGame) {
    if (!onlineGameState.isOnline) return;
    
    // Atualizar peças no tabuleiro baseado no estado do servidor
    if (window.gameState && serverGame) {
        // Sincronizar estado do jogo
        window.gameState.currentPlayer = serverGame.currentPlayer;
        window.gameState.diceValue = serverGame.diceValue;
        window.gameState.diceRolled = serverGame.diceRolled;
        window.gameState.diceUsed = serverGame.diceUsed;
        window.gameState.pieces = serverGame.pieces;
        
        // Atualizar visualização do tabuleiro
        updateBoardFromServerState(serverGame);
        
        // Verificar fim de jogo
        if (serverGame.status === 'finished') {
            const winnerColor = serverGame.winner;
            const didIWin = winnerColor === onlineGameState.myColor;
            
            window.loginManager.stopPolling();
            
            if (didIWin) {
                updateMessage(`🎉 Você venceu! Parabéns!`);
            } else {
                updateMessage(`😢 ${serverGame.opponent} venceu!`);
            }
            
            // Limpar jogo após alguns segundos
            setTimeout(() => {
                if (confirm('Jogo finalizado! Deseja jogar novamente?')) {
                    location.reload();
                } else {
                    window.loginManager.clearSession();
                }
            }, 3000);
            
            return;
        }
        
        // Atualizar mensagem de turno
        const isMyTurn = serverGame.isMyTurn;
        const currentPlayerName = serverGame.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
        
        // CORREÇÃO PROBLEMA 3: Verificar se pode relançar (repetível + sem jogadas)
        const isRepeatable = serverGame.diceValue === 1 || serverGame.diceValue === 4 || serverGame.diceValue === 6;
        const canReroll = isRepeatable && serverGame.diceRolled && !serverGame.diceUsed && window.hasAnyValidMoves && !window.hasAnyValidMoves(serverGame.currentPlayer, serverGame.diceValue);
        
        if (isMyTurn) {
            if (!serverGame.diceRolled) {
                updateMessage(`Sua vez! (${currentPlayerName}) - Lance os dados!`);
            } else if (!serverGame.diceUsed) {
                if (canReroll) {
                    updateMessage(`Paus: ${serverGame.diceValue}. Sem jogadas possíveis, relance os dados!`);
                } else {
                    updateMessage(`Sua vez! Valor do dado: ${serverGame.diceValue}. Escolha uma peça para mover.`);
                }
            }
        } else {
            updateMessage(`Turno de ${serverGame.opponent} (${currentPlayerName})... Aguarde.`);
        }
        
        // Habilitar/desabilitar controles baseado no turno
        const rollButton = document.getElementById('roll-dice');
        const passButton = document.getElementById('skip-button');
        if (rollButton) {
            // Permitir rolar se: é minha vez E (não rolou OU pode relançar)
            rollButton.disabled = !isMyTurn || (serverGame.diceRolled && !canReroll);
            if (canReroll) {
                rollButton.textContent = "Relançar Paus";
            } else {
                rollButton.textContent = "Jogar Paus";
            }
        }
        if (passButton && isMyTurn) {
            // Bloquear passar se pode relançar
            passButton.disabled = canReroll;
        }
    }
};

// Atualizar tabuleiro baseado no estado do servidor
function updateBoardFromServerState(serverGame) {
    const cells = document.querySelectorAll('.cell');
    const boardSize = serverGame.boardSize;
    
    // Limpar todas as células
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('has-piece', 'selectable', 'possible-move', 'capture-move', 'selected');
    });
    
    // Colocar peças vermelhas
    serverGame.pieces.red.forEach((piece, index) => {
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
    
    // Colocar peças azuis
    serverGame.pieces.blue.forEach((piece, index) => {
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
    
    // Reconfigurar click handlers para modo online
    if (onlineGameState.isOnline) {
        setupOnlineClickHandlers();
    }
}

// Configurar handlers de clique para modo online
function setupOnlineClickHandlers() {
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach((cell, cellIndex) => {
        const piece = cell.querySelector('.piece');
        
        if (piece) {
            piece.onclick = async function() {
                const color = piece.dataset.color;
                const pieceIndex = parseInt(piece.dataset.index);
                
                // Apenas permitir cliques nas minhas peças
                if (color !== onlineGameState.myColor) {
                    return;
                }
                
                // Verificar se é minha vez
                if (window.gameState.currentPlayer !== onlineGameState.myColor) {
                    updateMessage('Não é a sua vez!');
                    return;
                }
                
                // Verificar se o dado foi lançado
                if (!window.gameState.diceRolled || window.gameState.diceUsed) {
                    updateMessage('Você precisa lançar os dados primeiro!');
                    return;
                }
                
                // Enviar jogada para o servidor
                const result = await window.loginManager.doNotify(pieceIndex);
                
                if (result.success) {
                    // Atualização será recebida via polling
                    if (result.captured) {
                        updateMessage(`Capturou uma peça ${result.captured.color}!`);
                    }
                    
                    if (result.gameOver) {
                        // Fim de jogo será tratado no onGameUpdate
                    } else if (result.bonusRoll) {
                        updateMessage('Bônus! Lance os dados novamente!');
                    }
                } else {
                    updateMessage(`Erro: ${result.error}`);
                }
            };
        }
    });
}

// Iniciar jogo online
window.startOnlineGame = function(gameId, playerColor, opponent) {
    onlineGameState.isOnline = true;
    onlineGameState.gameId = gameId;
    onlineGameState.myColor = playerColor;
    onlineGameState.opponent = opponent;
    
    // Ocultar o dialog se estiver aberto
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    
    // Desabilitar IA se estiver ativa
    if (window.disableAIGame) {
        window.disableAIGame();
    }
    
    // Obter estado inicial do jogo
    window.loginManager.updateGame().then(result => {
        if (result.success) {
            const serverGame = result.game;
            
            // Criar tabuleiro
            createOnlineBoard(serverGame.boardSize);
            
            // Atualizar estado inicial
            window.onGameUpdate(serverGame);
            
            updateMessage(`Jogo online iniciado! Você é ${playerColor === 'red' ? 'Vermelho' : 'Azul'}. Oponente: ${opponent}`);
        }
    });
    
    // Interceptar o botão de dados para modo online
    const rollButton = document.getElementById('roll-dice');
    if (rollButton) {
        // Remover listeners anteriores (criar novo elemento)
        const newRollButton = rollButton.cloneNode(true);
        rollButton.parentNode.replaceChild(newRollButton, rollButton);
        
        newRollButton.addEventListener('click', async function() {
            if (window.gameState.currentPlayer !== onlineGameState.myColor) {
                updateMessage('Não é a sua vez!');
                return;
            }
            
            // CORREÇÃO PROBLEMA 3: Remover bloqueio para permitir relançar quando apropriado
            // O servidor validará se pode relançar (repetível + sem jogadas)
            
            const result = await window.loginManager.doRoll();
            
            if (result.success) {
                // Atualizar visualmente os dados
                displayDiceResult(result.value, result.faces);
                
                window.gameState.diceValue = result.value;
                window.gameState.diceRolled = true;
                window.gameState.diceUsed = false;
                window.gameState.bonusRoll = result.bonusRoll;
                
                updateMessage(`Você lançou os dados! Resultado: ${result.value}. ${result.bonusRoll ? 'Você terá uma jogada extra!' : ''}`);
            } else {
                updateMessage(`Erro ao lançar dados: ${result.error}`);
            }
        });
    }
    
    // Interceptar botão de desistir
    const forfeitButton = document.getElementById('forfeit-button');
    if (forfeitButton) {
        const newForfeitButton = forfeitButton.cloneNode(true);
        forfeitButton.parentNode.replaceChild(newForfeitButton, forfeitButton);
        
        newForfeitButton.addEventListener('click', async function() {
            if (confirm('Tem certeza que deseja desistir?')) {
                await window.loginManager.leaveGame();
                updateMessage('Você desistiu do jogo.');
                setTimeout(() => {
                    location.reload();
                }, 2000);
            }
        });
    }
    
    // Interceptar botão de passar vez para modo online
    const skipButton = document.getElementById('skip-button');
    if (skipButton) {
        const newSkipButton = skipButton.cloneNode(true);
        skipButton.parentNode.replaceChild(newSkipButton, skipButton);
        
        newSkipButton.addEventListener('click', async function() {
            if (window.gameState.currentPlayer !== onlineGameState.myColor) {
                updateMessage('Não é a sua vez!');
                return;
            }
            
            if (!window.gameState.diceRolled) {
                updateMessage('Você precisa lançar os dados primeiro!');
                return;
            }
            
            const result = await window.loginManager.doPass();
            
            if (result.success) {
                updateMessage('Você passou a vez.');
            } else {
                updateMessage(`Erro: ${result.error}`);
            }
        });
    }
};

// Criar tabuleiro online
function createOnlineBoard(columns) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.classList.remove('hidden');
    
    board.style.gridTemplateRows = `repeat(4, auto)`;
    board.style.gridTemplateColumns = `repeat(${columns}, auto)`;
    
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < columns; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            board.appendChild(cell);
        }
    }
    
    // Inicializar gameState básico
    if (!window.gameState) {
        window.gameState = {};
    }
    
    window.gameState.boardSize = columns;
    window.gameState.currentPlayer = 'red';
    window.gameState.diceValue = 0;
    window.gameState.diceRolled = false;
    window.gameState.diceUsed = false;
    window.gameState.pieces = { red: [], blue: [] };
}

// Exibir resultado dos dados
function displayDiceResult(value, faces) {
    const diceImagesDiv = document.querySelector('.dice-images');
    const diceTotalDiv = document.querySelector('.dice-total');
    
    if (diceImagesDiv && faces) {
        diceImagesDiv.innerHTML = '';
        faces.forEach(face => {
            const img = document.createElement('img');
            img.src = face === 1 ? 'media/lightSide.png' : 'media/darkSide.png';
            img.alt = face === 1 ? 'Face clara' : 'Face escura';
            img.className = 'dice-face';
            diceImagesDiv.appendChild(img);
        });
    }
    
    if (diceTotalDiv) {
        diceTotalDiv.textContent = `Resultado: ${value}`;
    }
}

function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}
