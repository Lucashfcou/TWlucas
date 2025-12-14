// login.js - LoginManager para autenticação e comunicação com servidor

class LoginManager {
    constructor() {
        this.baseURL = window.location.origin;
        this.username = null;
        this.gameId = null;
        this.playerColor = null;
        this.opponent = null;
        this.pollingInterval = null;
        this.isOnlineMode = false;
        
        // Carregar sessão do localStorage
        this.loadSession();
    }
    
    // Salvar sessão no localStorage
    saveSession() {
        if (this.username) {
            localStorage.setItem('tab_session', JSON.stringify({
                username: this.username,
                gameId: this.gameId,
                playerColor: this.playerColor,
                opponent: this.opponent
            }));
        }
    }
    
    // Carregar sessão do localStorage
    loadSession() {
        const session = localStorage.getItem('tab_session');
        if (session) {
            try {
                const data = JSON.parse(session);
                this.username = data.username;
                this.gameId = data.gameId;
                this.playerColor = data.playerColor;
                this.opponent = data.opponent;
                
                if (this.username) {
                    this.updateUIAfterLogin();
                }
            } catch (error) {
                console.error('Error loading session:', error);
            }
        }
    }
    
    // Limpar sessão
    clearSession() {
        this.username = null;
        this.gameId = null;
        this.playerColor = null;
        this.opponent = null;
        localStorage.removeItem('tab_session');
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    // Registrar/autenticar usuário
    async registerUser(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.username = data.username;
                this.saveSession();
                this.updateUIAfterLogin();
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Obter ranking
    async getRanking() {
        try {
            const response = await fetch(`${this.baseURL}/api/ranking`);
            const data = await response.json();
            
            if (data.success) {
                return { success: true, ranking: data.ranking };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Ranking error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Entrar no jogo online
    async joinGame() {
        if (!this.username) {
            return { success: false, error: 'Not logged in' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.username })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.status === 'matched') {
                    this.gameId = data.gameId;
                    this.playerColor = data.color;
                    this.opponent = data.opponent;
                    this.isOnlineMode = true;
                    this.saveSession();
                    
                    // Iniciar polling
                    this.startPolling();
                }
                
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Join game error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Lançar dados
    async doRoll() {
        if (!this.gameId || !this.username) {
            return { success: false, error: 'No active game' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/roll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: this.gameId,
                    username: this.username
                })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Roll error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Fazer jogada
    async doNotify(pieceIndex) {
        if (!this.gameId || !this.username) {
            return { success: false, error: 'No active game' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: this.gameId,
                    username: this.username,
                    pieceIndex
                })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Notify error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Passar a vez
    async doPass() {
        if (!this.gameId || !this.username) {
            return { success: false, error: 'No active game' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/pass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: this.gameId,
                    username: this.username
                })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Pass error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Sair do jogo
    async leaveGame() {
        if (!this.username) {
            return { success: false, error: 'Not logged in' };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: this.gameId,
                    username: this.username
                })
            });
            
            const data = await response.json();
            
            // Limpar estado local
            this.gameId = null;
            this.playerColor = null;
            this.opponent = null;
            this.isOnlineMode = false;
            this.saveSession();
            
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
            
            return data;
        } catch (error) {
            console.error('Leave game error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Atualizar estado do jogo (polling)
    async updateGame() {
        if (!this.gameId || !this.username) {
            return { success: false, error: 'No active game' };
        }
        
        try {
            const response = await fetch(
                `${this.baseURL}/api/update?gameId=${this.gameId}&username=${this.username}`
            );
            
            const data = await response.json();
            
            if (data.success && typeof window.onGameUpdate === 'function') {
                window.onGameUpdate(data.game);
            }
            
            return data;
        } catch (error) {
            console.error('Update game error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Iniciar polling
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Poll a cada 2 segundos
        this.pollingInterval = setInterval(() => {
            this.updateGame();
        }, 2000);
    }
    
    // Parar polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    // Atualizar UI após login
    updateUIAfterLogin() {
        const accountPanel = document.getElementById('account-panel');
        if (accountPanel) {
            const panelInner = accountPanel.querySelector('.panel-inner');
            if (panelInner) {
                panelInner.innerHTML = `
                    <h3 id="account-panel-title">Bem-vindo, ${this.username}!</h3>
                    <div class="account-info">
                        <button id="play-online-btn" class="btn btn-primary">Jogar Online</button>
                        <button id="view-ranking-btn" class="btn btn-secondary">Ver Classificação</button>
                        <button id="logout-btn" class="btn btn-secondary">Sair</button>
                    </div>
                `;
                
                // Adicionar event listeners
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
    
    // Handler para jogar online
    async handlePlayOnline() {
        const result = await this.joinGame();
        
        if (result.success) {
            if (result.data.status === 'waiting') {
                alert(`Aguardando oponente... Posição na fila: ${result.data.position}`);
                // Continuar tentando até encontrar um match
                const checkInterval = setInterval(async () => {
                    const checkResult = await this.joinGame();
                    if (checkResult.success && checkResult.data.status === 'matched') {
                        clearInterval(checkInterval);
                        alert(`Oponente encontrado: ${this.opponent}! Começando o jogo...`);
                        
                        // Iniciar jogo online
                        if (typeof window.startOnlineGame === 'function') {
                            window.startOnlineGame(this.gameId, this.playerColor, this.opponent);
                        }
                    }
                }, 3000);
            } else if (result.data.status === 'matched') {
                alert(`Oponente encontrado: ${this.opponent}! Começando o jogo...`);
                
                // Iniciar jogo online
                if (typeof window.startOnlineGame === 'function') {
                    window.startOnlineGame(this.gameId, this.playerColor, this.opponent);
                }
            }
        } else {
            alert(`Erro ao entrar no jogo: ${result.error}`);
        }
    }
    
    // Handler para ver ranking
    async handleViewRanking() {
        const result = await this.getRanking();
        
        if (result.success) {
            const rankingList = document.getElementById('class-table-items');
            if (rankingList) {
                rankingList.innerHTML = '';
                
                result.ranking.forEach((player, index) => {
                    const li = document.createElement('li');
                    li.textContent = `${player.username} - ${player.points}pts (${player.wins}V/${player.losses}D)`;
                    
                    if (index === 0) li.id = 'first-place';
                    else if (index === 1) li.id = 'second-place';
                    else if (index === 2) li.id = 'third-place';
                    else li.id = 'remaining-place';
                    
                    rankingList.appendChild(li);
                });
                
                // Abrir painel de classificação
                const classToggle = document.getElementById('class-toggle');
                if (classToggle) {
                    classToggle.click();
                }
            }
        } else {
            alert(`Erro ao carregar ranking: ${result.error}`);
        }
    }
}

// Criar instância global
window.loginManager = new LoginManager();
