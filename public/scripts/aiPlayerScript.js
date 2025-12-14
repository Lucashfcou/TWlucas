// aiPlayerScript.js - Oponente AI para jogo Tâb com suporte a sistema de lançamento único de dados

/**
 * Módulo AI Player para Tâb - Atualizado para sistema de lançamento único
 * Implementa três níveis de dificuldade:
 * - Easy: Seleção aleatória de movimentos válidos
 * - Medium:  Combinação de movimentos estratégicos (70%) e aleatórios (30%)
 * - Hard: Seleção sempre do movimento ótimo
 */

// Função auxiliar para atualização de mensagens
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

const AI_PLAYER = {
    color: 'red', // Cor padrão da AI (será alterada dinamicamente conforme escolha do jogador)
    difficulty: 'medium', // Dificuldade padrão
    isProcessing: false,
    thinkingDelay: 800, // Delay em ms para simulação de processamento

    /**
     * Handler principal do turno da AI
     */
    async takeTurn() {
        if (this.isProcessing) return;
        if (! window.gameLogic || !window.gameLogic.gameState. gameActive) return;
        if (window.gameLogic.gameState. currentPlayer !== this.color) return;

        this.isProcessing = true;

        try {
            // Executa lançamento de dados se necessário
            if (window.gameLogic.gameState. diceValue === 0) {
                await this.rollDice();
            }

            // Simula tempo de processamento
            await this. simulateThinking();

            // Executa movimento
            await this.makeMove();

        } catch (error) {
            console.error('AI Error:', error);
            this.isProcessing = false;
        }
    },

    /**
     * Lançamento de dados para AI - Atualizado para sistema de lançamento único
     */
    async rollDice() {
        return new Promise((resolve) => {
            updateMessage('IA está jogando os dados...');

            setTimeout(() => {
                const gameState = window.gameLogic. gameState;

                // Verifica se já existe valor de dado não utilizado
                if (gameState.diceValue > 0 && !gameState.diceUsed) {
                    console.log('AI:  Dice already rolled, value not used yet');
                    resolve();
                    return;
                }

                // Simula lançamento de 4 dados
                let lightSides = 0;
                for (let i = 0; i < 4; i++) {
                    if (Math.random() < 0.5) lightSides++;
                }

                // Calcula passos e jogada bônus conforme regras
                let steps = 0;
                let bonusRoll = false;

                switch(lightSides) {
                    case 0:
                        steps = 6;
                        bonusRoll = true;
                        break;
                    case 1:
                        steps = 1;
                        bonusRoll = true;
                        break;
                    case 2:
                        steps = 2;
                        bonusRoll = false;
                        break;
                    case 3:
                        steps = 3;
                        bonusRoll = false;
                        break;
                    case 4:
                        steps = 4;
                        bonusRoll = true;
                        break;
                }

                // Atualiza estado do jogo
                gameState.diceValue = steps;
                gameState.bonusRoll = bonusRoll;
                gameState.diceUsed = false; // Marca valor como não utilizado

                // Atualiza exibição
                const diceTotal = document.querySelector('.dice-total');
                if (diceTotal) {
                    let resultText = `Resultado: ${steps} passo${steps !== 1 ? 's' :  ''}`;
                    if (bonusRoll) {
                        resultText += " 🎲 (Jogue novamente!)";
                    }
                    diceTotal.textContent = resultText;
                }

                console.log(`AI rolled:  ${steps} steps, bonus: ${bonusRoll}`);

                setTimeout(resolve, 500);
            }, 400);
        });
    },

    /**
     * Simula tempo de processamento da AI
     */
    async simulateThinking() {
        return new Promise((resolve) => {
            const messages = [
                'IA está analisando o tabuleiro...',
                'IA está calculando a melhor jogada...',
                'IA está pensando...'
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            updateMessage(randomMessage);
            setTimeout(resolve, this.thinkingDelay);
        });
    },

    /**
     * Executa movimento baseado no nível de dificuldade
     */
    async makeMove() {
        const gameState = window.gameLogic.gameState;
        const diceValue = gameState.diceValue;

        if (diceValue === 0) {
            this.isProcessing = false;
            return;
        }

        // Obtém todos os movimentos possíveis para todas as peças da AI
        const allPossibleMoves = this.getAllPossibleMoves();

        console.log(`AI: Dice value = ${diceValue}, Found ${allPossibleMoves. length} possible moves`);

        if (allPossibleMoves. length > 0) {
            console.log('AI: Available moves:', allPossibleMoves. map(m => ({
                from: `(${m.piece.row},${m.piece. col})`,
                to: `(${m.destination.row},${m.destination.col})`,
                isActivation: m.isActivation,
                pieceActive: m.piece.active
            })));
        }

        if (allPossibleMoves.length === 0) {
            // Sem movimentos válidos - pula turno
            updateMessage('IA não tem jogadas válidas.  Pulando a vez.. .');

            // Marca dado como utilizado antes de pular
            gameState.diceUsed = true;

            setTimeout(() => {
                if (window.gameLogic && window.gameLogic.skipTurn) {
                    window.gameLogic.skipTurn();
                } else if (window.handleSkipTurn) {
                    window.handleSkipTurn();
                } else {
                    console.error('Skip turn function not available');
                }
                this.isProcessing = false;
            }, 1000);
            return;
        }

        // Seleciona movimento conforme dificuldade
        let chosenMove;
        switch (this.difficulty) {
            case 'easy':
                chosenMove = this.chooseRandomMove(allPossibleMoves);
                break;
            case 'medium':
                chosenMove = this.chooseMediumMove(allPossibleMoves);
                break;
            case 'hard':
                chosenMove = this.chooseBestMove(allPossibleMoves);
                break;
            default:
                chosenMove = this.chooseRandomMove(allPossibleMoves);
        }

        console.log('AI:  Chosen move:', {
            from: `(${chosenMove.piece. row},${chosenMove.piece.col})`,
            to: `(${chosenMove.destination.row},${chosenMove. destination.col})`,
            isActivation: chosenMove.isActivation
        });

        // Executa movimento selecionado
        await this. executeMove(chosenMove);
    },

    /**
     * Retorna array de todos os movimentos possíveis para todas as peças da AI
     */
    getAllPossibleMoves() {
        const gameState = window.gameLogic.gameState;
        const pieces = gameState.pieces[this.color];
        const diceValue = gameState.diceValue;
        const allMoves = [];

        pieces.forEach(piece => {
            // Verifica possibilidade de ativação (valor 1 em peça inativa)
            if (!piece.active && diceValue === 1) {
                const tempPiece = { ...piece, active: true };

                let canActivate = false;
                if (window.canActivatePiece) {
                    canActivate = window.canActivatePiece(piece, this.color);
                } else if (typeof canActivatePiece === 'function') {
                    canActivate = canActivatePiece(piece, this.color);
                }

                if (canActivate) {
                    let activationMoves = [];
                    if (window.getValidMoves) {
                        activationMoves = window.getValidMoves(tempPiece, 1, this.color);
                    } else if (typeof getValidMoves === 'function') {
                        activationMoves = getValidMoves(tempPiece, 1, this.color);
                    }

                    activationMoves.forEach(move => {
                        allMoves. push({
                            piece: piece,
                            destination: move,
                            isActivation: true
                        });
                    });
                }
            } else if (piece.active) {
                let validMoves = [];
                if (window.getValidMoves) {
                    validMoves = window.getValidMoves(piece, diceValue, this.color);
                } else if (typeof getValidMoves === 'function') {
                    validMoves = getValidMoves(piece, diceValue, this.color);
                }

                validMoves.forEach(move => {
                    allMoves.push({
                        piece: piece,
                        destination: move,
                        isActivation: false
                    });
                });
            }
        });

        return allMoves;
    },

    /**
     * Modo EASY: Seleção aleatória de movimento
     */
    chooseRandomMove(moves) {
        return moves[Math.floor(Math.random() * moves.length)];
    },

    /**
     * Modo MEDIUM: Combinação de estratégico (70%) e aleatório (30%)
     */
    chooseMediumMove(moves) {
        if (Math.random() < 0.3) {
            return this.chooseRandomMove(moves);
        } else {
            return this.chooseBestMove(moves);
        }
    },

    /**
     * Modo HARD: Seleção do movimento ótimo via heurísticas de avaliação
     */
    chooseBestMove(moves) {
        let bestMove = moves[0];
        let bestScore = -Infinity;

        moves.forEach(move => {
            const score = this.evaluateMove(move);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        });

        return bestMove;
    },

    /**
     * Avalia movimento e retorna pontuação heurística
     */
    evaluateMove(move) {
        let score = 0;
        const { piece, destination, isActivation } = move;
        const gameState = window.gameLogic. gameState;

        // Referências a funções com fallback seguro
        const findPieceAtFunc = window.findPieceAt || (typeof findPieceAt !== 'undefined' ? findPieceAt : null);
        const isInEnemyTerritoryFunc = window.isInEnemyTerritory || (typeof isInEnemyTerritory !== 'undefined' ? isInEnemyTerritory :  null);
        const isPositionInEnemyTerritoryFunc = window.isPositionInEnemyTerritory || (typeof isPositionInEnemyTerritory !== 'undefined' ? isPositionInEnemyTerritory : null);
        const enemyHasPiecesInInitialRowFunc = window.enemyHasPiecesInInitialRow || (typeof enemyHasPiecesInInitialRow !== 'undefined' ? enemyHasPiecesInInitialRow : null);

        if (! findPieceAtFunc) return 0;

        // Determina cor do inimigo dinamicamente
        const enemyColor = this.color === 'red' ? 'blue' : 'red';

        // 1. PRIORIDADE DE CAPTURA
        const enemyPiece = findPieceAtFunc(destination. row, destination.col, enemyColor);
        if (enemyPiece) {
            score += 1000;
            if (isInEnemyTerritoryFunc && isInEnemyTerritoryFunc(enemyPiece, enemyColor)) {
                score += 200;
            }
        }

        // 2. PRIORIDADE DE ATIVAÇÃO
        if (isActivation) {
            score += 500;
        }

        // 3. PROGRESSO PARA FRENTE
        const progressScore = this.calculateProgressScore(piece, destination);
        score += progressScore;

        // 4. ENTRADA EM TERRITÓRIO INIMIGO
        if (isPositionInEnemyTerritoryFunc && isPositionInEnemyTerritoryFunc(destination. row, this.color)) {
            if (enemyHasPiecesInInitialRowFunc && enemyHasPiecesInInitialRowFunc(this.color)) {
                score += 300;
            }
        }

        // 5. SAÍDA DE TERRITÓRIO INIMIGO
        if (isInEnemyTerritoryFunc && isPositionInEnemyTerritoryFunc) {
            const wasInEnemyTerritory = isInEnemyTerritoryFunc(piece, this.color);
            const willBeInEnemyTerritory = isPositionInEnemyTerritoryFunc(destination. row, this.color);
            if (wasInEnemyTerritory && ! willBeInEnemyTerritory) {
                score += 150;
            }
        }

        // 6. PENALIDADE POR EMPILHAMENTO
        const friendlyPiece = findPieceAtFunc(destination.row, destination.col, this.color);
        if (friendlyPiece) {
            score -= 50;
        }

        // 7. PROTEÇÃO DE PEÇAS VULNERÁVEIS
        if (this.isPieceVulnerable(piece)) {
            score += 100;
        }

        // 8. POSICIONAMENTO ESTRATÉGICO
        const threatenedEnemies = this.countThreatenedEnemies(destination);
        score += threatenedEnemies * 50;

        // 9. BÔNUS POR COMPLETAR CAMINHO
        if (piece.hasCompletedEnemyTerritory) {
            score += 80;
        }

        // 10. DISTÂNCIA A PEÇAS INIMIGAS
        const distanceScore = this.calculateDistanceToEnemies(destination);
        score += distanceScore;

        return score;
    },

    /**
     * Calcula pontuação de progresso baseado na direção de movimento
     */
    calculateProgressScore(piece, destination) {
        const rowDiff = destination.row - piece.row;
        const colDiff = Math.abs(destination.col - piece.col);
        let score = 0;

        // Ajusta lógica de progresso baseado na cor da IA
        if (this.color === 'red') {
            // Vermelho: progresso é mover para baixo (aumentar row)
            if (piece.row === 0 && destination.row > 0) score += 100;
            if (destination.row === 1 || destination.row === 2) score += 50;
            if (destination.row === 3) score += 80;
        } else {
            // Azul: progresso é mover para cima (diminuir row)
            if (piece.row === 3 && destination.row < 3) score += 100;
            if (destination.row === 2 || destination.row === 1) score += 50;
            if (destination.row === 0) score += 80;
        }

        score += colDiff * 10;
        return score;
    },

    /**
     * Verifica se peça está vulnerável a captura inimiga
     */
    isPieceVulnerable(piece) {
        // Determina cor do inimigo dinamicamente
        const enemyColor = this.color === 'red' ? 'blue' : 'red';
        const enemyPieces = window.gameLogic.gameState. pieces[enemyColor];
        const getValidMovesFunc = window.getValidMoves || (typeof getValidMoves !== 'undefined' ? getValidMoves : null);

        if (!getValidMovesFunc) return false;

        for (let enemyPiece of enemyPieces) {
            if (! enemyPiece.active) continue;

            for (let diceValue = 1; diceValue <= 6; diceValue++) {
                const enemyMoves = getValidMovesFunc(enemyPiece, diceValue, enemyColor);
                const canCapture = enemyMoves. some(move =>
                    move.row === piece.row && move.col === piece.col
                );
                if (canCapture) return true;
            }
        }
        return false;
    },

    /**
     * Conta número de peças inimigas ameaçadas por posição
     */
    countThreatenedEnemies(position) {
        // Determina cor do inimigo dinamicamente
        const enemyColor = this.color === 'red' ?  'blue' : 'red';
        const enemyPieces = window.gameLogic. gameState.pieces[enemyColor];
        let count = 0;

        enemyPieces.forEach(enemyPiece => {
            const rowDiff = Math.abs(position.row - enemyPiece.row);
            const colDiff = Math.abs(position. col - enemyPiece. col);

            if (rowDiff <= 1 && colDiff <= 2) {
                count++;
            }
        });

        return count;
    },

    /**
     * Calcula pontuação baseada em distância a peças inimigas
     */
    calculateDistanceToEnemies(position) {
        // Determina cor do inimigo dinamicamente
        const enemyColor = this.color === 'red' ? 'blue' : 'red';
        const enemyPieces = window.gameLogic.gameState.pieces[enemyColor];

        if (enemyPieces.length === 0) return 0;

        let minDistance = Infinity;

        enemyPieces.forEach(enemyPiece => {
            const distance = Math.abs(position.row - enemyPiece.row) +
                Math.abs(position. col - enemyPiece. col);
            minDistance = Math.min(minDistance, distance);
        });

        return Math.max(0, 10 - minDistance * 2);
    },

    /**
     * Executa movimento selecionado - Atualizado para sistema de lançamento único
     */
    async executeMove(move) {
        const { piece, destination, isActivation } = move;
        const gameState = window.gameLogic.gameState;

        // Obtém referências a funções com fallback seguro
        const getCellIndexFunc = window.getCellIndex || (typeof getCellIndex !== 'undefined' ? getCellIndex : null);
        const updatePieceDisplayFunc = window.updatePieceDisplay || (typeof updatePieceDisplay !== 'undefined' ? updatePieceDisplay : null);
        const highlightSelectedPieceFunc = window.highlightSelectedPiece || (typeof highlightSelectedPiece !== 'undefined' ? highlightSelectedPiece : null);
        const showPossibleMovesFunc = window.showPossibleMoves || (typeof showPossibleMoves !== 'undefined' ? showPossibleMoves : null);
        const findPieceAtFunc = window. findPieceAt || (typeof findPieceAt !== 'undefined' ? findPieceAt : null);
        const capturePieceFunc = window. capturePiece || (typeof capturePiece !== 'undefined' ? capturePiece : null);
        const movePieceFunc = window.movePiece || (typeof movePiece !== 'undefined' ?  movePiece : null);
        const checkWinConditionFunc = window.checkWinCondition || (typeof checkWinCondition !== 'undefined' ? checkWinCondition :  null);
        const endGameFunc = window.endGame || (typeof endGame !== 'undefined' ? endGame : null);

        // Determina cor do inimigo dinamicamente
        const enemyColor = this.color === 'red' ?  'blue' : 'red';
        const enemyName = enemyColor === 'red' ?  'vermelha' : 'azul';

        // Ativa peça se necessário
        if (isActivation && updatePieceDisplayFunc && getCellIndexFunc) {
            piece.active = true;
            const cellIndex = getCellIndexFunc(piece. row, piece.col, gameState.boardSize);
            updatePieceDisplayFunc(cellIndex, this.color, true, piece. hasCompletedEnemyTerritory);
            updateMessage('IA ativou uma peça!');
            await this.delay(500);
        }

        // Seleciona peça visualmente
        if (getCellIndexFunc && highlightSelectedPieceFunc) {
            const cellIndex = getCellIndexFunc(piece.row, piece.col, gameState.boardSize);
            gameState.selectedPiece = piece;
            highlightSelectedPieceFunc(cellIndex);
            await this.delay(400);
        }

        // Exibe movimentos possíveis
        if (showPossibleMovesFunc) {
            gameState.possibleMoves = [destination];
            showPossibleMovesFunc([destination]);
            await this.delay(600);
        }

        // Verifica captura
        if (findPieceAtFunc && capturePieceFunc) {
            const enemyPiece = findPieceAtFunc(destination.row, destination.col, enemyColor);
            if (enemyPiece) {
                updateMessage(`IA capturou uma peça ${enemyName}! `);
                capturePieceFunc(enemyPiece, enemyColor);
                await this. delay(800);
            }
        }

        // Move a peça
        if (movePieceFunc) {
            movePieceFunc(piece, destination. row, destination.col);
            updateMessage('IA moveu uma peça.');
        }

        // Marca dado como utilizado
        gameState.diceUsed = true;

        await this.delay(500);

        // Verifica condição de vitória
        if (checkWinConditionFunc && checkWinConditionFunc()) {
            if (endGameFunc) {
                endGameFunc(this.color);
            }
            this.isProcessing = false;
            return;
        }

        // Processa jogada bônus ou troca de turno
        if (gameState.bonusRoll) {
            gameState. diceValue = 0;
            gameState.bonusRoll = false;
            gameState.diceUsed = false; // Reseta para permitir novo lançamento
            document.querySelector('.dice-total').textContent = 'Resultado: —';
            updateMessage('IA ganhou uma jogada extra!');

            // Habilita botão de lançamento se disponível
            if (window.enableRollButton) {
                window.enableRollButton();
            }

            await this.delay(1000);
            this.isProcessing = false;

            // Executa novo turno
            setTimeout(() => this.takeTurn(), 500);
        } else {
            // Troca para jogador humano
            const switchTurnFunc = window.switchTurn || (typeof switchTurn !== 'undefined' ? switchTurn : null);
            if (switchTurnFunc) {
                switchTurnFunc();
            }
            this.isProcessing = false;
        }
    },

    /**
     * Função auxiliar:  promise com delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Inicializa AI com configuração de dificuldade
     */
    init(difficulty) {
        this.difficulty = difficulty || 'medium';
        this. isProcessing = false;
        console.log(`AI initialized with difficulty: ${this.difficulty}, color: ${this.color}`);
    },

    /**
     * Verifica se é turno da AI e dispara movimento
     */
    checkAndPlay() {
        if (!window.gameLogic || !window.gameLogic.gameState. gameActive) return;
        if (window.gameLogic.gameState. currentPlayer !== this.color) return;
        if (this.isProcessing) return;

        // Delay antes de iniciar turno da AI
        setTimeout(() => this.takeTurn(), 800);
    }
};

// Exporta AI player
window.AI_PLAYER = AI_PLAYER;

console.log('AI Player loaded successfully (updated for single dice roll system with dynamic color support)');