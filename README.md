# TWlucas - TÂB Online Game

TÂB é um jogo de tabuleiro tradicional do norte da África e Península Arábica, agora com suporte para jogo online multiplayer!

## 🎮 Características

- **Jogo Local**: Jogue contra um amigo ou contra a IA no mesmo dispositivo
- **Jogo Online**: Jogue contra outros jogadores pela internet
- **Sistema de Ranking**: Acompanhe sua pontuação e posição no ranking
- **Servidor HTTP Nativo**: Implementado usando apenas módulos nativos do Node.js
- **Interface Responsiva**: Jogue em qualquer dispositivo

## 🚀 Instalação

### Requisitos

- Node.js >= 14.0.0
- Nenhuma dependência externa necessária!

### Como Executar

1. Clone o repositório:
```bash
git clone https://github.com/Lucashfcou/TWlucas.git
cd TWlucas
```

2. Inicie o servidor:
```bash
npm start
```

Ou em modo de desenvolvimento:
```bash
npm run dev
```

3. Abra seu navegador em: `http://localhost:8138`

## 📖 Como Jogar

### Modo Local

1. Clique no botão "Jogar"
2. Configure o tamanho do tabuleiro e escolha jogar contra outro humano ou contra a IA
3. Escolha sua cor (Vermelho ou Azul)
4. Defina quem começa
5. Clique em "Confirmar" para iniciar

### Modo Online

1. Clique no ícone de login no canto superior direito
2. Digite seu usuário e senha (uma conta será criada automaticamente se não existir)
3. Clique em "Jogar Online"
4. Aguarde um oponente ser encontrado
5. O jogo começará automaticamente quando um match for feito!

## 🎲 Regras do TÂB

- **Tabuleiro**: 4 linhas x N colunas (padrão: 7 colunas, configurável de 5 a 15)
- **Peças**: Cada jogador tem N peças (uma por coluna)
- **Movimento**: Peças se movem em padrão zig-zag pelas linhas
- **Ativação**: Peças começam inativas e precisam de um lançamento de 1 para ativar
- **Dados**: 4 varetas com dois lados cada
  - 0 faces claras = 6 passos + jogada extra
  - 1 face clara (Tâb) = 1 passo + jogada extra
  - 2 faces claras = 2 passos
  - 3 faces claras = 3 passos
  - 4 faces claras = 4 passos + jogada extra
- **Captura**: Ao cair em uma casa ocupada pelo oponente, a peça dele é capturada
- **Vitória**: Capture todas as peças do oponente

Para regras completas, veja o painel de regras no jogo.

## 🏗️ Estrutura do Projeto

```
TWlucas/
├── server/                 # Backend
│   ├── index.js           # Servidor HTTP principal
│   └── src/
│       ├── dataManager.js # Gestão de dados e persistência
│       ├── gameAPI.js     # Lógica da API do jogo
│       └── rules.js       # Regras e validação do jogo
├── public/                # Frontend
│   ├── index.html        # Página principal
│   ├── style.css         # Estilos
│   ├── scripts/          # Scripts do cliente
│   │   ├── login.js                  # Sistema de login
│   │   ├── onlineGameIntegration.js  # Integração online
│   │   ├── gameLogicScript.js        # Lógica do jogo local
│   │   └── ...                       # Outros scripts
│   └── media/            # Imagens e assets
├── data/                 # Dados persistentes (criado automaticamente)
└── package.json          # Configuração do projeto
```

## 🌐 API Endpoints

O servidor expõe os seguintes endpoints REST:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/register` | Registrar/autenticar usuário |
| GET | `/api/ranking` | Obter ranking top 10 |
| POST | `/api/join` | Entrar na fila/jogo |
| POST | `/api/leave` | Sair/desistir do jogo |
| POST | `/api/roll` | Lançar os paus |
| POST | `/api/notify` | Fazer jogada (mover peça) |
| POST | `/api/pass` | Passar a vez |
| GET | `/api/update` | Polling estado do jogo |

## 🔒 Segurança

- Senhas são armazenadas com hash SHA-256
- IDs de jogo são gerados com hash MD5
- CORS habilitado para desenvolvimento
- Validação de entrada em todos os endpoints

## 🤝 Créditos

Baseado no projeto [TWtab](https://github.com/mtsguerra/TWtab) por mtsguerra.

## 📝 Licença

MIT
