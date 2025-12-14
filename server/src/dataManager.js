// dataManager.js - Gestão de dados persistentes em JSON
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const RANKINGS_FILE = path.join(DATA_DIR, 'rankings.json');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');

// Garante que o diretório de dados existe
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// Carrega dados de um arquivo JSON
function loadData(filePath, defaultValue = {}) {
    ensureDataDir();
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
    }
    return defaultValue;
}

// Salva dados em um arquivo JSON
function saveData(filePath, data) {
    ensureDataDir();
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(`Error saving ${filePath}:`, error.message);
        return false;
    }
}

// Hash SHA-256 para passwords
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Hash MD5 para IDs de jogo
function generateGameId(player1, player2) {
    const timestamp = Date.now();
    const data = `${player1}-${player2}-${timestamp}`;
    return crypto.createHash('md5').update(data).digest('hex');
}

// === USUÁRIOS ===

function getUsers() {
    return loadData(USERS_FILE, {});
}

function saveUsers(users) {
    return saveData(USERS_FILE, users);
}

function registerUser(username, password) {
    const users = getUsers();
    
    if (users[username]) {
        // Usuário já existe - verificar password
        if (users[username].password === hashPassword(password)) {
            return { success: true, user: users[username] };
        } else {
            return { success: false, error: 'Invalid credentials' };
        }
    }
    
    // Criar novo usuário
    const newUser = {
        username,
        password: hashPassword(password),
        wins: 0,
        losses: 0,
        points: 0,
        createdAt: Date.now()
    };
    
    users[username] = newUser;
    saveUsers(users);
    
    return { success: true, user: newUser };
}

function updateUserStats(username, won) {
    const users = getUsers();
    if (!users[username]) return false;
    
    if (won) {
        users[username].wins++;
        users[username].points += 100;
    } else {
        users[username].losses++;
        users[username].points = Math.max(0, users[username].points - 50);
    }
    
    saveUsers(users);
    return true;
}

// === RANKINGS ===

function getRanking() {
    const users = getUsers();
    const ranking = Object.values(users)
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map((user, index) => ({
            rank: index + 1,
            username: user.username,
            points: user.points,
            wins: user.wins,
            losses: user.losses
        }));
    
    return ranking;
}

// === JOGOS ===

function getGames() {
    return loadData(GAMES_FILE, {});
}

function saveGames(games) {
    return saveData(GAMES_FILE, games);
}

function createGame(player1, player2, boardSize = 7) {
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
        player1,
        player2,
        boardSize,
        currentPlayer: 'red',
        diceValue: 0,
        diceRolled: false,
        diceUsed: false,
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

// === FILA DE ESPERA ===

function getQueue() {
    return loadData(QUEUE_FILE, []);
}

function saveQueue(queue) {
    return saveData(QUEUE_FILE, queue);
}

function addToQueue(username) {
    const queue = getQueue();
    
    // Verificar se já está na fila
    if (queue.find(item => item.username === username)) {
        return { success: false, error: 'Already in queue' };
    }
    
    queue.push({
        username,
        joinedAt: Date.now()
    });
    
    saveQueue(queue);
    return { success: true, position: queue.length };
}

function removeFromQueue(username) {
    let queue = getQueue();
    queue = queue.filter(item => item.username !== username);
    saveQueue(queue);
    return true;
}

function matchPlayers() {
    const queue = getQueue();
    
    if (queue.length >= 2) {
        const player1 = queue.shift();
        const player2 = queue.shift();
        saveQueue(queue);
        
        return {
            player1: player1.username,
            player2: player2.username
        };
    }
    
    return null;
}

module.exports = {
    hashPassword,
    generateGameId,
    registerUser,
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
