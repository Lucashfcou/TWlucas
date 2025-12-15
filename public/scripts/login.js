
class LoginManager {
    constructor() {
        this.baseURL = 'http://twserver.alunos.dcc.fc.up.pt:8008';

        this.nick = null;
        this.password = null;
        this.gameId = null;
        this.group = '15';
        this.isOnlineMode = false;
        this.eventSource = null; // Para SSE /update

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
                    this.updateUIAfterLogin();
                }
            } catch (error) {
                console.error('Error loading session:', error);
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
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nick, password })
            });

            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            this.nick = nick;
            this.password = password;
            this.saveSession();
            this.updateUIAfterLogin();

            return { success: true, nick };

        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // ================= Ranking =====================
    async getRanking() {
        try {
            const response = await fetch(`${this.baseURL}/ranking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group: this.group })
            });

            const data = await response.json();

            if (data.error) {
                return { success: false, error: data.error };
            }

            const ranking = Array.isArray(data) ? data : (data.ranking || []);

            return { success: true, ranking };

        } catch (error) {
            console.error('Ranking error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // =================== Jogo (Entrar/Saída) =======================
    async joinGame(boardSize = 7) {
        if (!this.nick || !this.password) {
            return { success: false, error: 'Not logged in' };
        }

        try {
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
                return { success: false, error: data.error };
            }

            if (data.game) {
                this.gameId = data.game;
                this.isOnlineMode = true;
                this.saveSession();

                // Inicia SSE para atualizações de estado do jogo
                this.startUpdateStream();

                return {
                    success: true,
                    status: 'matched',
                    gameId: data.game
                };
            } else {
                return {
                    success: true,
                    status: 'waiting'
                };
            }

        } catch (error) {
            console.error('Join game error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async leaveGame() {
        if (!this.nick || !this.password) {
            return { success: false, error: 'Not logged in' };
        }

        try {
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
                return { success: false, error: data.error };
            }

            return { success: true };

        } catch (error) {
            console.error('Leave game error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // =================== Ações do Jogo =======================
    async doRoll() {
        if (!this.gameId || !this.nick || !this.password) {
            return { success: false, error: 'No active game' };
        }

        try {
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
                return { success: false, error: data.error };
            }

            return { success: true };

        } catch (error) {
            console.error('Roll error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async doNotify(cellIndex) {
        if (!this.gameId || !this.nick || !this.password) {
            return { success: false, error: 'No active game' };
        }

        try {
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
                return { success: false, error: data.error };
            }

            return { success: true };

        } catch (error) {
            console.error('Notify error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async doPass() {
        if (!this.gameId || !this.nick || !this.password) {
            return { success: false, error: 'No active game' };
        }

        try {
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
                return { success: false, error: data.error };
            }

            return { success: true };

        } catch (error) {
            console.error('Pass error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // ========== ATUALIZAÇÃO DO JOGO (SSE: Server-Sent Events) ==============
    startUpdateStream() {
        if (!this.gameId || !this.nick || !this.group) {
            console.error("update: dados insuficientes para iniciar SSE");
            return;
        }

        // Fecha SSE antigo se já existir
        if (this.eventSource) {
            this.eventSource.close();
        }

        const url = `${this.baseURL}/update?group=${encodeURIComponent(this.group)}&nick=${encodeURIComponent(this.nick)}&game=${encodeURIComponent(this.gameId)}`;
        this.eventSource = new EventSource(url);

        this.eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (typeof window.onGameUpdate === 'function') {
                    window.onGameUpdate(data);
                }
            } catch (err) {
                console.error("Erro ao interpretar dados do update SSE:", err);
            }
        };

        this.eventSource.onerror = function(error) {
            console.error("Erro na conexão de update SSE:", error);
        };
    }

    stopUpdateStream() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
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
                        li.textContent = `${player.nick} - ${player.victories || 0}V / ${player.games || 0}J`;

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

console.log('✅ SEGUNDA ENTREGA - Login Manager (AJUSTADO para SSE update) carregado!');