// server/index.js - Servidor HTTP para Entrega 3
// Replica EXATAMENTE a API oficial da Entrega 2

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const dataManager = require('./src/dataManager');
const gameAPI = require('./src/gameAPI');

// ⚠️ IMPORTANTE: Ajuste a porta para 81XX onde XX = número do seu grupo
const PORT = 8121; // Local development
// const PORT = 8121; // Produção: 81XX onde XX = número do grupo

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

// ===================================================
// SERVIR ARQUIVOS ESTÁTICOS
// ===================================================
function serveStaticFile(filePath, res) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Arquivo não encontrado - fallback para index.html (SPA)
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

// ===================================================
// PARSE BODY JSON
// ===================================================
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

// ===================================================
// ENVIAR RESPOSTA JSON
// ===================================================
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// ===================================================
// ROUTER DE API
// ===================================================
function handleAPIRequest(req, res, pathname, query) {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin': '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ===================================================
    // POST /register - Registrar/autenticar usuário
    // ===================================================
    if (pathname === '/register' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.nick || !data.password) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }

            console.log('📝 Register:', data.nick);

            const result = dataManager.registerUser(data.nick, data.password);

            if (result.success) {
                sendJSON(res, 200, {
                    nick: result.user.nick,
                    victories: result.user.victories,
                    games: result.user.games
                });
            } else {
                sendJSON(res, 401, { error: result.error });
            }
        });
    }

    // ===================================================
    // POST /ranking - Obter ranking
    // ===================================================
    else if (pathname === '/ranking' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            const group = data && data.group ? data.group : 'default';

            console.log('📊 Ranking solicitado, grupo:', group);

            const ranking = dataManager.getRanking(group);
            sendJSON(res, 200, ranking); // Retorna array direto
        });
    }

    // ===================================================
    // POST /join - Entrar na fila/jogo
    // ===================================================
    else if (pathname === '/join' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.nick || !data.password) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }

            const group = data.group || 'default';
            const size = data.size || 7;

            console.log('🎮 Join:', data.nick, 'grupo:', group, 'tamanho:', size);

            // Verificar credenciais
            const authResult = dataManager.authenticate(data.nick, data.password);
            if (!authResult.success) {
                return sendJSON(res, 401, { error: 'Invalid credentials' });
            }

            const result = gameAPI.joinGame(data.nick, group, size);
            sendJSON(res, 200, result);
        });
    }

    // ===================================================
    // POST /leave - Sair/desistir do jogo
    // ===================================================
    else if (pathname === '/leave' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.nick) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }

            console.log('🚪 Leave:', data.nick, 'jogo:', data.game);

            const result = gameAPI.leaveGame(data.game, data.nick);
            sendJSON(res, 200, result);
        });
    }

    // ===================================================
    // POST /roll - Lançar os dados
    // ===================================================
    else if (pathname === '/roll' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.game || !data.nick) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }

            console.log('🎲 Roll:', data.nick, 'jogo:', data.game);

            const result = gameAPI.doRoll(data.game, data.nick);
            sendJSON(res, 200, result);
        });
    }

    // ===================================================
    // POST /notify - Fazer jogada
    // ===================================================
    else if (pathname === '/notify' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.game || !data.nick || data.cell === undefined) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }

            console.log('👉 Notify:', data.nick, 'célula:', data.cell);

            const result = gameAPI.doNotify(data.game, data.nick, data.cell);
            sendJSON(res, 200, result);
        });
    }

    // ===================================================
    // POST /pass - Passar a vez
    // ===================================================
    else if (pathname === '/pass' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err || !data.game || !data.nick) {
                return sendJSON(res, 400, { error: 'Invalid request' });
            }

            console.log('⏭️ Pass:', data.nick);

            const result = gameAPI.doPass(data.game, data.nick);
            sendJSON(res, 200, result);
        });
    }

    // ===================================================
    // GET /update - SSE (Server-Sent Events)
    // ===================================================
    else if (pathname === '/update' && req.method === 'GET') {
        const { group, nick, game } = query;

        if (!group || !nick || !game) {
            return sendJSON(res, 400, { error: 'Invalid request' });
        }

        console.log('🔄 SSE iniciado:', nick, 'jogo:', game);

        // Configurar SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        // Enviar estado inicial
        const initialState = gameAPI.updateGame(game, nick);
        res.write(`data: ${JSON.stringify(initialState)}\n\n`);

        // Polling a cada 2 segundos
        const interval = setInterval(() => {
            try {
                const gameState = gameAPI.updateGame(game, nick);
                res.write(`data: ${JSON.stringify(gameState)}\n\n`);

                // Se jogo terminou, parar polling
                if (gameState.winner) {
                    clearInterval(interval);
                }
            } catch (error) {
                console.error('❌ Erro no SSE:', error);
                clearInterval(interval);
            }
        }, 2000);

        // Limpar quando conexão fechar
        req.on('close', () => {
            console.log('🛑 SSE fechado:', nick);
            clearInterval(interval);
        });
    }

    // ===================================================
    // Rota não encontrada
    // ===================================================
    else {
        sendJSON(res, 404, { error: 'API endpoint not found' });
    }
}

// ===================================================
// CRIAR SERVIDOR HTTP
// ===================================================
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Rotas de API
    if (pathname.match(/^\/(register|ranking|join|leave|roll|notify|pass|update)$/)) {
        handleAPIRequest(req, res, pathname, query);
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

// ===================================================
// INICIAR SERVIDOR
// ===================================================
server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     🎲 TÂB Server - Entrega 3                 ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  🌐 URL: http://localhost:${PORT}/              ║`);
    console.log(`║  📁 Arquivos: ${PUBLIC_DIR.substring(0, 25).padEnd(25)} ║`);
    console.log(`║  🎮 API: Compatível com API oficial           ║`);
    console.log('╚════════════════════════════════════════════════╝');
});

// ===================================================
// TRATAMENTO DE ERROS
// ===================================================
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} já está em uso!`);
        console.error('💡 Dica: Mude a porta no topo do arquivo ou encerre o processo.');
    } else {
        console.error('❌ Erro no servidor:', error);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n👋 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});
