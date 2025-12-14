// startingGameScript.js - Sistema de inicialização de jogo com suporte a AI

const playBtn = document.getElementById('playBtn');
const overlay = document.getElementById('overlay');
const dialog = document.getElementById('playDialog');
const playForm = document.getElementById('playForm');
const pcOptions = document.getElementById('pcOptions');
const cancelBtn = document.getElementById('cancelBtn');

function openDialog() {
    overlay.classList.remove('hidden');
    overlay.dataset.hidden = "false";
    playBtn.setAttribute('aria-expanded', 'true');
    document.getElementById('boardSize').focus();
}

function closeDialog() {
    overlay.classList.add('hidden');
    overlay.dataset.hidden = "true";
    playBtn.setAttribute('aria-expanded', 'false');
    playBtn.focus();
}

playBtn.addEventListener('click', openDialog);
playBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDialog();
    }
});

cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeDialog();
});

// Exibe/oculta opções de PC baseado na seleção de oponente
document.querySelectorAll('input[name="opponent"]').forEach(radio => {
    radio. addEventListener('change', (e) => {
        if (e.target.value === 'pc') {
            pcOptions.classList.remove('hidden');
            pcOptions.setAttribute('aria-hidden', 'false');
        } else {
            pcOptions.classList.add('hidden');
            pcOptions.setAttribute('aria-hidden', 'true');
        }
    });
});

function normalizeBoardSize(value) {
    const min = 7;
    const max = 51;
    let n = parseInt(value, 10);
    if (Number.isNaN(n)) n = min;

    if (n < min) n = min;
    if (n > max) n = max;

    if (n % 2 === 0) n = n + 1;

    if (n > max) n = max - (max % 2 === 0 ? 1 : 0);

    return n;
}

playForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const form = new FormData(playForm);
    let boardSize = form.get('boardSize');
    boardSize = normalizeBoardSize(boardSize);

    const settings = {
        boardSize:  boardSize,
        opponent: form.get('opponent'),
        playerColor: form. get('playerColor') || 'blue', // NOVA LINHA:  captura cor escolhida
        ...(form.get('opponent') === 'pc' ?  {
            difficulty: form.get('difficulty')
        } : {}),
        starter: form.get('starter')
    };

    console.log('Game settings chosen:', settings);

    closeDialog();
    // MODIFICADO: passa playerColor como novo parâmetro
    createBoard(settings. boardSize, settings.starter, settings.opponent, settings.difficulty, settings.playerColor);

    document.getElementById('roll-dice').disabled = false;
});

function createBoard(columns, starter, opponent, difficulty, playerColor = 'blue') {
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

    if (window.gameLogic) {
        window.gameLogic.initializePieces(columns);
        window.gameLogic.setupCellClickHandlers();

        const isAIGame = opponent === 'pc';

        // NOVA LÓGICA: Define quem é o jogador humano e quem é a IA
        const humanColor = playerColor; // Cor escolhida pelo jogador
        const aiColor = humanColor === 'red' ? 'blue' : 'red'; // IA pega a cor oposta

        // Define jogador inicial
        let startingPlayer = 'red';
        if (starter === 'pc') {
            startingPlayer = aiColor; // IA começa
        } else if (starter === 'player') {
            startingPlayer = humanColor; // Jogador começa
        } else if (starter === 'random') {
            startingPlayer = Math.random() < 0.5 ? 'red' : 'blue';
        }

        window.gameLogic.gameState. currentPlayer = startingPlayer;

        // MODIFICADO:  Passa informação de cor do jogador humano
        if (isAIGame) {
            if (window.initAIGame) {
                // Define qual cor a IA controla
                if (window.AI_PLAYER) {
                    window.AI_PLAYER.color = aiColor; // IMPORTANTE: IA recebe cor oposta
                }

                window.initAIGame(difficulty || 'medium');

                const humanName = humanColor === 'red' ? 'Vermelho' : 'Azul';
                const aiName = aiColor === 'red' ? 'Vermelho' : 'Azul';
                const starterName = startingPlayer === humanColor ? 'Você' : `IA (${aiName})`;

                updateMessage(`Jogo contra IA iniciado!  Você é ${humanName}. ${starterName} começa.  ${startingPlayer === humanColor ? 'Role os dados!' : 'A IA vai jogar.. .'}`);
            } else {
                console.error('AI integration not loaded');
                updateMessage('Erro ao carregar IA. Jogando como Humano vs Humano.');
            }
        } else {
            if (window.disableAIGame) {
                window.disableAIGame();
            }

            const playerName = startingPlayer === 'red' ?  'Vermelho' : 'Azul';
            updateMessage(`Jogo iniciado! Jogador ${playerName} começa.  Role os dados!`);
        }
    }
}

function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}