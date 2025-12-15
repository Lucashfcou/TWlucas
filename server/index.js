// index.js - Servidor HTTP nativo para o jogo TÂB
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const dataManager = require('./src/dataManager');
const gameAPI = require('./src/gameAPI');

const PORT = 8100;
const PUBLIC_DIR = path.join(__dirname, '../public');

// Tipos MIME
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};



// Servir arquivos estáticos
function serveStaticFile(filePath, res) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Arquivo não encontrado - tentar servir index.html (SPA fallback)
                const indexPath = path.join(PUBLIC_DIR, 'index.html');
                fs.readFile(indexPath, (err, data) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(data);
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
}

// Parse JSON do body da requisição
function parseBody(req, callback) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const data = body ? JSON.parse(body) : {};
            callback(null, data);
        } catch (error) {
            callback(error, null);
        }
    });
}

// Enviar resposta JSON
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// Router de API
function handleAPIRequest(req, res, pathname) {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // POST /api/register - Registrar/autenticar usuário
    if (pathname === '/api/register' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.username || !data.password) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }
            
            const result = dataManager.registerUser(data.username, data.password);
            
            if (result.success) {
                sendJSON(res, 200, {
                    success: true,
                    username: result.user.username,
                    points: result.user.points,
                    wins: result.user.wins,
                    losses: result.user.losses
                });
            } else {
                sendJSON(res, 401, { error: result.error });
            }
        });
    }
    
    // GET /api/ranking - Obter ranking
    else if (pathname === '/api/ranking' && req.method === 'GET') {
        const ranking = dataManager.getRanking();
        sendJSON(res, 200, { success: true, ranking });
    }
    
    // POST /api/join - Entrar na fila/jogo
    else if (pathname === '/api/join' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.username) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }
            
            const result = gameAPI.joinGame(data.username);
            sendJSON(res, 200, result);
        });
    }
    
    // POST /api/leave - Sair/desistir do jogo
    else if (pathname === '/api/leave' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.username) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }
            
            const result = gameAPI.leaveGame(data.gameId, data.username);
            sendJSON(res, 200, result);
        });
    }
    
    // POST /api/roll - Lançar os dados
    else if (pathname === '/api/roll' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.gameId || !data.username) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }
            
            const result = gameAPI.doRoll(data.gameId, data.username);
            sendJSON(res, 200, result);
        });
    }
    
    // POST /api/notify - Fazer jogada
    else if (pathname === '/api/notify' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.gameId || !data.username || data.pieceIndex === undefined) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }
            
            const result = gameAPI.doNotify(data.gameId, data.username, data.pieceIndex);
            sendJSON(res, 200, result);
        });
    }
    
    // POST /api/pass - Passar a vez
    else if (pathname === '/api/pass' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.gameId || !data.username) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }
            
            const result = gameAPI.doPass(data.gameId, data.username);
            sendJSON(res, 200, result);
        });
    }
    
    // GET /api/update - Polling estado do jogo
    else if (pathname.startsWith('/api/update') && req.method === 'GET') {
        const parsedUrl = url.parse(req.url, true);
        const { gameId, username } = parsedUrl.query;
        
        if (!gameId || !username) {
            return sendJSON(res, 400, { error: 'Invalid request' });
        }
        
        const result = gameAPI.updateGame(gameId, username);
        sendJSON(res, 200, result);
    }
    
    // POST /api/room - Criar ou entrar em sala (sistema simplificado)
    else if (pathname === '/api/room' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.username || !data.roomPassword) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }
            
            const result = gameAPI.roomGame(data.username, data.roomPassword);
            sendJSON(res, 200, result);
        });
    }
    
    // Rota não encontrada
    else {
        sendJSON(res, 404, { error: 'API endpoint not found' });
    }
}

// Criar servidor HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    
   if (
       pathname.startsWith('/api/') ||
       pathname === '/update' ||
       pathname === '/register' ||
       pathname === '/ranking'
   ) {
       handleAPIRequest(req, res, pathname);
   }

    // Arquivos estáticos
    else {
        let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
        
        // Prevenir path traversal
        if (!filePath.startsWith(PUBLIC_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('403 Forbidden');
            return;
        }
        
        serveStaticFile(filePath, res);
    }
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🎲 TÂB Server running at http://localhost:${PORT}/`);
    console.log(`📁 Serving static files from: ${PUBLIC_DIR}`);
    console.log(`🎮 API endpoints available at: http://localhost:${PORT}/api/`);
});

// Tratamento de erros
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    } else {
        console.error('❌ Server error:', error);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
