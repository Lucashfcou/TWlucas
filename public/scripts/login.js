
class LoginManager {
    constructor() {
        // ===================================================
        // CONFIGURAÇÃO: Mude baseURL para alternar entre APIs
        // ===================================================

        // ENTREGA 2: API oficial
        this.baseURL = 'http://twserver.alunos.dcc.fc.up.pt:8008';

        // ENTREGA 3: Seu backend (descomente e ajuste a porta)
        // this.baseURL = 'http://twserver.alunos.dcc.fc.up.pt:8115'; // 81XX onde XX = número do grupo

        // Desenvolvimento local
        // this.baseURL = 'http://localhost:8100';

        this.nick = null;
        this.password = null;
        this.gameId = null;
        this.group = '21'; // ⚠️ IMPORTANTE: Troque pelo número do SEU grupo!
        this.isOnlineMode = false;
        this.eventSource = null; // Para SSE /update
        this.pollingInterval = null; // Para fallback polling

        this.loadSession();
    }

    // ================= Sessão ======================
    saveSession() {
        if (this.nick) {
            localStorage.setItem('tab_session', JSON.stringify({
                nick: this.nick,
                password: this.password,
                gameId: this.gameId,
                group: this.group
            }));
        }
    }

    loadSession() {
        const session = localStorage.getItem('tab_session');
        if (session) {
            try {
                const data = JSON.parse(session);
                this.nick = data.nick;
                this.password = data.password;
                this.gameId = data.gameId;
                this.group = data.group || '15';

                if (this.nick) {
                    console.log('✅ Sessão restaurada:', this.nick);
                    this.updateUIAfterLogin();
                }
            } catch (error) {
                console.error('❌ Erro ao carregar sessão:', error);
            }
        }
    }

    clearSession() {
        this.nick = null;
        this.password = null;
        this.gameId = null;
        localStorage.removeItem('tab_session');
        this.stopUpdateStream();
        this.isOnlineMode = false;
    }

    // ================= Registro/Login ==============
    async registerUser(nick, password) {
        try {
            console.log('📝 Registrando usuário:', nick);

            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nick, password })
            });

            const data = await response.json();

            if (data.error) {
                console.error('❌ Erro no registro:', data.error);
                return { success: false, error: data.error };
            }

            this.nick = nick;
            this.password = password;
            this.saveSession();
            this.updateUIAfterLogin();

            console.log('✅ Usuário registrado:', nick);
            return { success: true, nick };

        } catch (error) {
            console.error('❌ Erro de rede:', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    // ================= Ranking =====================
    async getRanking() {
        try {
            console.log('📊 Carregando ranking do grupo:', this.group);

            const response = await fetch(`${this.baseURL}/ranking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group: this.group })
            });

            const data = await response.json();

            if (data.error) {
                console.error('❌ Erro ao carregar ranking:', data.error);
                return { success: false, error: data.error };
            }

            // Aceita tanto array direto quanto objeto com propriedade ranking
            const ranking = Array.isArray(data) ? data : (data.ranking || []);

            console.log('✅ Ranking carregado:', ranking.length, 'jogadores');
            return { success: true, ranking };

        } catch (error) {
            console.error('❌ Erro de rede no ranking:', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    // =================== Jogo (Entrar/Saída) =======================
    async joinGame(boardSize = 7) {
        if (!this.nick || !this.password) {
            return { success: false, error: 'Não está logado' };
        }

        try {
            console.log('🎮 Entrando na fila, grupo:', this.group, 'tamanho:', boardSize);

            const response = await fetch(`${this.baseURL}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group: this.group,
                    nick: this.nick,
                    password: this.password,
                    size: boardSize
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error('❌ Erro ao entrar:', data.error);
                return { success: false, error: data.error };
            }

            // API pode retornar gameId diretamente (matched) ou não (waiting)
            if (data.game) {
                this.gameId = data.game;
                this.isOnlineMode = true;
                this.saveSession();

                console.log('✅ Jogo encontrado! ID:', data.game);

                // Inicia stream de atualizações
                this.startUpdateStream();

                return {
                    success: true,
                    status: 'matched',
                    gameId: data.game
                };
            } else {
                console.log('⏳ Aguardando oponente...');
                return {
                    success: true,
                    status: 'waiting'
                };
            }

        } catch (error) {
            console.error('❌ Erro de rede ao entrar:', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    async leaveGame() {
        if (!this.nick || !this.password) {
            return { success: false, error: 'Não está logado' };
        }

        try {
            console.log('🚪 Saindo do jogo:', this.gameId);

            const response = await fetch(`${this.baseURL}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nick: this.nick,
                    password: this.password,
                    game: this.gameId || ''
                })
            });

            const data = await response.json();

            // Limpa estado local
            this.gameId = null;
            this.isOnlineMode = false;
            this.saveSession();
            this.stopUpdateStream();

            if (data.error) {
                console.error('❌ Erro ao sair:', data.error);
                return { success: false, error: data.error };
            }

            console.log('✅ Saiu do jogo');
            return { success: true };

        } catch (error) {
            console.error('❌ Erro de rede ao sair:', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    // =================== Ações do Jogo =======================
    async doRoll() {
        if (!this.gameId || !this.nick || !this.password) {
            return { success: false, error: 'Sem jogo ativo' };
        }

        try {
            console.log('🎲 Lançando dados...');

            const response = await fetch(`${this.baseURL}/roll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nick: this.nick,
                    password: this.password,
                    game: this.gameId
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error('❌ Erro ao rolar:', data.error);
                return { success: false, error: data.error };
            }

            console.log('✅ Dados rolados');
            return { success: true };

        } catch (error) {
            console.error('❌ Erro de rede ao rolar:', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    async doNotify(cellIndex) {
        if (!this.gameId || !this.nick || !this.password) {
            return { success: false, error: 'Sem jogo ativo' };
        }

        try {
            console.log('👉 Notificando movimento, célula:', cellIndex);

            const response = await fetch(`${this.baseURL}/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nick: this.nick,
                    password: this.password,
                    game: this.gameId,
                    cell: cellIndex
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error('❌ Erro ao mover:', data.error);
                return { success: false, error: data.error };
            }

            console.log('✅ Movimento enviado');
            return { success: true };

        } catch (error) {
            console.error('❌ Erro de rede ao mover:', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    async doPass() {
        if (!this.gameId || !this.nick || !this.password) {
            return { success: false, error: 'Sem jogo ativo' };
        }

        try {
            console.log('⏭️ Passando a vez...');

            const response = await fetch(`${this.baseURL}/pass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nick: this.nick,
                    password: this.password,
                    game: this.gameId
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error('❌ Erro ao passar:', data.error);
                return { success: false, error: data.error };
            }

            console.log('✅ Vez passada');
            return { success: true };

        } catch (error) {
            console.error('❌ Erro de rede ao passar:', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

    // ========== ATUALIZAÇÃO DO JOGO (SSE + Fallback Polling) ==============
    startUpdateStream() {
        if (!this.gameId || !this.nick || !this.group) {
            console.error('❌ Dados insuficientes para iniciar updates');
            return;
        }

        // Fecha streams anteriores
        this.stopUpdateStream();

        console.log('🔄 Iniciando stream de atualizações...');

        // Tentar SSE primeiro
        try {
            const url = `${this.baseURL}/update?group=${encodeURIComponent(this.group)}&nick=${encodeURIComponent(this.nick)}&game=${encodeURIComponent(this.gameId)}`;

            this.eventSource = new EventSource(url);

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📥 Update SSE recebido:', data);

                    if (typeof window.onGameUpdate === 'function') {
                        window.onGameUpdate(data);
                    }
                } catch (err) {
                    console.error('❌ Erro ao processar update SSE:', err);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('❌ Erro na conexão SSE:', error);

                // Se SSE falhar, tenta polling
                this.eventSource.close();
                this.eventSource = null;

                console.log('⚠️ SSE falhou, alternando para polling...');
                this.startPolling();
            };

            console.log('✅ SSE iniciado');

        } catch (error) {
            console.error('❌ Erro ao iniciar SSE:', error);
            // Fallback para polling
            this.startPolling();
        }
    }

    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        console.log('🔄 Iniciando polling a cada 2 segundos...');

        this.pollingInterval = setInterval(async () => {
            if (!this.gameId || !this.nick) {
                this.stopUpdateStream();
                return;
            }

            try {
                const url = `${this.baseURL}/update?group=${encodeURIComponent(this.group)}&nick=${encodeURIComponent(this.nick)}&game=${encodeURIComponent(this.gameId)}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.error) {
                    console.error('❌ Erro no polling:', data.error);
                    return;
                }

                console.log('📥 Update polling recebido');

                if (typeof window.onGameUpdate === 'function') {
                    window.onGameUpdate(data);
                }

            } catch (error) {
                console.error('❌ Erro no polling:', error);
            }

        }, 2000); // A cada 2 segundos

        console.log('✅ Polling iniciado');
    }

    stopUpdateStream() {
        if (this.eventSource) {
            console.log('🛑 Parando SSE...');
            this.eventSource.close();
            this.eventSource = null;
        }

        if (this.pollingInterval) {
            console.log('🛑 Parando polling...');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // ============== UI ================
    updateUIAfterLogin() {
        const accountPanel = document.getElementById('account-panel');
        if (accountPanel) {
            const panelInner = accountPanel.querySelector('.panel-inner');
            if (panelInner) {
                panelInner.innerHTML = `
                    <h3 id="account-panel-title">Bem-vindo, ${this.nick}!</h3>
                    <div class="account-info">
                        <button id="play-online-btn" class="btn btn-primary">Jogar Online</button>
                        <button id="view-ranking-btn" class="btn btn-secondary">Ver Classificação</button>
                        <button id="logout-btn" class="btn btn-secondary">Sair</button>
                    </div>
                `;

                document.getElementById('play-online-btn')?.addEventListener('click', () => {
                    this.handlePlayOnline();
                });

                document.getElementById('view-ranking-btn')?.addEventListener('click', () => {
                    this.handleViewRanking();
                });

                document.getElementById('logout-btn')?.addEventListener('click', () => {
                    this.clearSession();
                    location.reload();
                });
            }
        }
    }

    async handlePlayOnline() {
        if (window.__accountPanel) {
            window.__accountPanel.close();
        }
        if (typeof window.startOnlineGame === 'function') {
            window.startOnlineGame();
        }
    }

    async handleViewRanking() {
        const result = await this.getRanking();

        if (result.success) {
            const rankingList = document.getElementById('class-table-items');
            if (rankingList) {
                rankingList.innerHTML = '';

                if (result.ranking.length === 0) {
                    rankingList.innerHTML = '<li style="list-style: none; text-align: center;">Nenhum jogador no ranking</li>';
                } else {
                    result.ranking.forEach((player, index) => {
                        const li = document.createElement('li');
                        const position = index + 1;

                        // Formato flexível: aceita victories/games OU wins/losses
                        const victories = player.victories || player.wins || 0;
                        const games = player.games || (player.wins + player.losses) || 0;

                        li.textContent = `${player.nick} - ${victories}V / ${games}J`;

                        if (position === 1) li.id = 'first-place';
                        else if (position === 2) li.id = 'second-place';
                        else if (position === 3) li.id = 'third-place';
                        else li.id = 'remaining-place';

                        rankingList.appendChild(li);
                    });
                }

                const classToggle = document.getElementById('class-toggle');
                if (classToggle) {
                    classToggle.click();
                }
                if (window.__accountPanel) {
                    window.__accountPanel.close();
                }
            }
        } else {
            alert(`Erro ao carregar ranking: ${result.error}`);
        }
    }
}

// Instancia global
window.loginManager = new LoginManager();

console.log('✅ Login Manager carregado - Compatível com Entrega 2 e 3');