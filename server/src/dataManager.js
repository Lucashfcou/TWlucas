// server/src/dataManager.js - Gestão de dados CORRIGIDA
// Suporte a grupos e formato compatível com API oficial

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const QUEUES_FILE = path.join(DATA_DIR, 'queues.json'); // Por grupo

// ===================================================
// GARANTIR DIRETÓRIO DE DADOS
// ===================================================
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// ===================================================
// CARREGAR DADOS
// ===================================================
function loadData(filePath, defaultValue = {}) {
    ensureDataDir();
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`❌ Erro ao carregar ${filePath}:`, error.message);
    }
    return defaultValue;
}

// ===================================================
// SALVAR DADOS
// ===================================================
function saveData(filePath, data) {
    ensureDataDir();
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(`❌ Erro ao salvar ${filePath}:`, error.message);
        return false;
    }
}

// ===================================================
// HASHING
// ===================================================
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateGameId(player1, player2) {
    const timestamp = Date.now();
    const data = `${player1}-${player2}-${timestamp}`;
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 12);
}

// ===================================================
// USUÁRIOS
// ===================================================
function getUsers() {
    return loadData(USERS_FILE, {});
}

function saveUsers(users) {
    return saveData(USERS_FILE, users);
}

function registerUser(nick, password) {
    const users = getUsers();

    if (users[nick]) {
        // Usuário já existe - verificar password
        if (users[nick].password === hashPassword(password)) {
            console.log('✅ Login:', nick);
            return { success: true, user: users[nick] };
        } else {
            console.log('❌ Senha incorreta:', nick);
            return { success: false, error: 'Invalid credentials' };
        }
    }

    // Criar novo usuário
    const newUser = {
        nick,
        password: hashPassword(password),
        victories: 0,
        games: 0,
        groups: {} // Estatísticas por grupo
    };

    users[nick] = newUser;
    saveUsers(users);

    console.log('✅ Novo usuário:', nick);
    return { success: true, user: newUser };
}

function authenticate(nick, password) {
    const users = getUsers();

    if (!users[nick]) {
        return { success: false, error: 'User not found' };
    }

    if (users[nick].password !== hashPassword(password)) {
        return { success: false, error: 'Invalid password' };
    }

    return { success: true };
}

function updateUserStats(nick, won, group = 'default') {
    const users = getUsers();
    if (!users[nick]) return false;

    // Atualizar estatísticas globais
    users[nick].games++;
    if (won) {
        users[nick].victories++;
    }

    // Atualizar estatísticas por grupo
    if (!users[nick].groups[group]) {
        users[nick].groups[group] = { victories: 0, games: 0 };
    }

    users[nick].groups[group].games++;
    if (won) {
        users[nick].groups[group].victories++;
    }

    saveUsers(users);

    console.log('📊 Stats:', nick, won ? 'vitória' : 'derrota', 'grupo:', group);
    return true;
}

// ===================================================
// RANKINGS (POR GRUPO)
// ===================================================
function getRanking(group = 'default') {
    const users = getUsers();

    // Filtrar usuários do grupo e ordenar por vitórias
    const ranking = Object.values(users)
        .filter(user => user.groups && user.groups[group])
        .map(user => ({
            nick: user.nick,
            victories: user.groups[group].victories,
            games: user.groups[group].games
        }))
        .sort((a, b) => {
            // Ordenar por vitórias, depois por taxa de vitória
            if (b.victories !== a.victories) {
                return b.victories - a.victories;
            }
            const winRateA = a.games > 0 ? a.victories / a.games : 0;
            const winRateB = b.games > 0 ? b.victories / b.games : 0;
            return winRateB - winRateA;
        });

    console.log('📊 Ranking grupo', group + ':', ranking.length, 'jogadores');

    // API oficial retorna array direto
    return ranking;
}

// ===================================================
// JOGOS
// ===================================================
function getGames() {
    return loadData(GAMES_FILE, {});
}

function saveGames(games) {
    return saveData(GAMES_FILE, games);
}

function createGame(player1, player2, boardSize, group) {
    const gameId = generateGameId(player1, player2);
    const games = getGames();

    // Inicializar peças
    const redPieces = [];
    const bluePieces = [];

    for (let col = 0; col < boardSize; col++) {
        redPieces.push({
            row: 0,
            col: col,
            active: false,
            inEnemyTerritory: false,
            hasCompletedEnemyTerritory: false
        });

        bluePieces.push({
            row: 3,
            col: col,
            active: false,
            inEnemyTerritory: false,
            hasCompletedEnemyTerritory: false
        });
    }

    games[gameId] = {
        id: gameId,
        players: [player1, player2], // player1 = AZUL, player2 = VERMELHO
        group,
        size: boardSize,
        turn: 'blue', // Azul (player1) começa
        dice: 0,
        pieces: {
            red: redPieces,
            blue: bluePieces
        },
        status: 'active',
        winner: null,
        createdAt: Date.now(),
        lastUpdate: Date.now()
    };

    saveGames(games);

    console.log('🎮 Jogo criado:', gameId, '|', player1, '(azul) vs', player2, '(vermelho)');

    return games[gameId];
}

function getGame(gameId) {
    const games = getGames();
    return games[gameId] || null;
}

function updateGame(gameId, updates) {
    const games = getGames();
    if (!games[gameId]) return null;

    games[gameId] = {
        ...games[gameId],
        ...updates,
        lastUpdate: Date.now()
    };

    saveGames(games);
    return games[gameId];
}

function deleteGame(gameId) {
    const games = getGames();
    if (games[gameId]) {
        delete games[gameId];
        saveGames(games);
        return true;
    }
    return false;
}

// ===================================================
// FILAS DE ESPERA (POR GRUPO)
// ===================================================
function getQueues() {
    return loadData(QUEUES_FILE, {});
}

function saveQueues(queues) {
    return saveData(QUEUES_FILE, queues);
}

function addToQueue(nick, group, boardSize) {
    const queues = getQueues();

    if (!queues[group]) {
        queues[group] = [];
    }

    // Verificar se já está na fila
    if (queues[group].find(item => item.nick === nick)) {
        console.log('⚠️ Já na fila:', nick, 'grupo:', group);
        return { success: false, error: 'Already in queue' };
    }

    queues[group].push({
        nick,
        boardSize,
        joinedAt: Date.now()
    });

    saveQueues(queues);

    console.log('➕ Fila:', nick, 'grupo:', group, '| Tamanho fila:', queues[group].length);

    return { success: true, position: queues[group].length };
}

function removeFromQueue(nick) {
    const queues = getQueues();
    let removed = false;

    // Remover de todas as filas
    for (const group in queues) {
        const before = queues[group].length;
        queues[group] = queues[group].filter(item => item.nick !== nick);
        if (queues[group].length < before) {
            removed = true;
            console.log('➖ Removido da fila:', nick, 'grupo:', group);
        }
    }

    saveQueues(queues);
    return removed;
}

function matchPlayers(group) {
    const queues = getQueues();

    if (!queues[group] || queues[group].length < 2) {
        return null;
    }

    // Tentar fazer match com mesmo tamanho de tabuleiro
    const queue = queues[group];

    for (let i = 0; i < queue.length - 1; i++) {
        for (let j = i + 1; j < queue.length; j++) {
            if (queue[i].boardSize === queue[j].boardSize) {
                const player1 = queue[i];
                const player2 = queue[j];

                // Remover da fila
                queue.splice(j, 1); // Remove j primeiro (índice maior)
                queue.splice(i, 1);

                saveQueues(queues);

                console.log('🤝 Match:', player1.nick, 'vs', player2.nick, '| Tamanho:', player1.boardSize);

                return {
                    player1: player1.nick,
                    player2: player2.nick,
                    boardSize: player1.boardSize
                };
            }
        }
    }

    // Se não houver match com mesmo tamanho, pegar os 2 primeiros
    if (queue.length >= 2) {
        const player1 = queue.shift();
        const player2 = queue.shift();

        saveQueues(queues);

        console.log('🤝 Match forçado:', player1.nick, 'vs', player2.nick);

        return {
            player1: player1.nick,
            player2: player2.nick,
            boardSize: player1.boardSize // Usa tamanho do primeiro
        };
    }

    return null;
}

module.exports = {
    hashPassword,
    generateGameId,
    registerUser,
    authenticate,
    updateUserStats,
    getRanking,
    createGame,
    getGame,
    updateGame,
    deleteGame,
    addToQueue,
    removeFromQueue,
    matchPlayers,
    getUsers
};