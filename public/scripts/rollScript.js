// rollScript.js - Sistema de lançamento de dados com restrição de lançamento único por turno

const lightSide = "media/lightSide.png";
const darkSide = "media/darkSide.png";

document.addEventListener("DOMContentLoaded", () => {
    const rollButton = document.getElementById("roll-dice");
    const diceImagesContainer = document.querySelector(".dice-images");
    const diceTotal = document.querySelector(".dice-total");

    // Desabilita botão de lançamento inicialmente
    rollButton.disabled = true;

    rollButton.addEventListener("click", () => {
        if (!window.gameLogic || !window.gameLogic.gameState.gameActive) {
            updateMessage("Inicie um jogo primeiro!");
            return;
        }


        if (window.gameLogic.gameState.diceValue > 0 && !window.gameLogic.gameState.diceUsed) {
            const isRepeatable = window.gameLogic.gameState.diceValue === 1 || 
                                window.gameLogic.gameState.diceValue === 4 || 
                                window.gameLogic.gameState.diceValue === 6;
            const hasNoMoves = window.hasAnyValidMoves && 
                              !window.hasAnyValidMoves(window.gameLogic.gameState.currentPlayer, window.gameLogic.gameState.diceValue);
            
            // Se é repetível E não tem jogadas, permitir relançar
            if (!isRepeatable || !hasNoMoves) {
                updateMessage(`⚠️ Você já rolou os dados (${window.gameLogic.gameState.diceValue} passos)! Use este valor ou pule a vez.`);
                return;
            }
            // Se chegou aqui, pode relançar
            updateMessage(`Relançando... Dado anterior: ${window.gameLogic.gameState.diceValue} (sem jogadas possíveis)`);
        }

        diceImagesContainer.innerHTML = "";
        let lightSides = 0;

        // Animação de lançamento
        rollButton.disabled = true;
        diceImagesContainer.style.opacity = '0.5';

        setTimeout(() => {
            // Gera 4 dados aleatórios
            for (let i = 0; i < 4; i++) {
                const isLight = Math.random() < 0.5;
                const img = document.createElement("img");
                img.src = isLight ? lightSide : darkSide;
                img.style.animation = 'spin 0.5s ease-out';
                diceImagesContainer.appendChild(img);
                if (isLight) lightSides++;
            }

            diceImagesContainer.style.opacity = '1';

            // Calcula passos e jogada bônus baseado em lados claros
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

            // Atualiza exibição de resultado
            let resultText = `Resultado: ${steps} passo${steps !== 1 ? 's' : ''}`;
            if (bonusRoll) {
                resultText += " 🎲 (Jogue novamente!)";
            }
            diceTotal.textContent = resultText;

            // Atualiza estado do jogo
            if (window.gameLogic) {
                window.gameLogic.gameState.diceValue = steps;
                window.gameLogic.gameState.bonusRoll = bonusRoll;
                window.gameLogic.gameState.diceUsed = false; // Marca dado como não utilizado

                // CORREÇÃO PROBLEMA 3: Verificar se precisa relançar (repetível + sem jogadas)
                const isRepeatable = steps === 1 || steps === 4 || steps === 6;
                const hasNoMoves = window.hasAnyValidMoves && 
                                  !window.hasAnyValidMoves(window.gameLogic.gameState.currentPlayer, steps);
                
                if (isRepeatable && hasNoMoves) {
                    // Caso especial: dado repetível mas sem jogadas - DEVE relançar
                    updateMessage(`Paus: ${steps}. Sem jogadas possíveis, relance os dados!`);
                    rollButton.disabled = false;
                    rollButton.textContent = "Relançar Paus";
                    rollButton.title = "Relançar os dados";
                    
                    // Bloquear botão de passar vez
                    const skipButton = document.getElementById('skip-button');
                    if (skipButton) {
                        skipButton.disabled = true;
                    }
                } else {
                    updateMessage(`Você tirou ${steps} passo${steps !== 1 ? 's' : ''}! ${bonusRoll ? 'Pode jogar novamente após mover.' : 'Selecione uma peça para mover.'}`);
                    window.gameLogic.makeCurrentPlayerPiecesSelectable();

                    // Desabilita botão até que valor seja utilizado
                    rollButton.disabled = true;
                    rollButton.textContent = "Jogar Paus";
                    rollButton.title = "Você deve usar o valor dos dados antes de rolar novamente";
                    
                    // Habilitar botão de passar vez
                    const skipButton = document.getElementById('skip-button');
                    if (skipButton) {
                        skipButton.disabled = false;
                    }
                }
            }
        }, 300);
    });
});

// Função para habilitar botão de lançamento (chamada após uso do valor)
function enableRollButton() {
    const rollButton = document.getElementById("roll-dice");
    if (rollButton && window.gameLogic && window.gameLogic.gameState.gameActive) {
        rollButton.disabled = false;
        rollButton.title = "Jogar Dados";
    }
}

// Função para desabilitar botão de lançamento
function disableRollButton(reason) {
    const rollButton = document.getElementById("roll-dice");
    if (rollButton) {
        rollButton.disabled = true;
        rollButton.title = reason || "Aguarde sua vez";
    }
}

// Função auxiliar para atualização de mensagem
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

// Exporta funções globalmente
window.enableRollButton = enableRollButton;
window.disableRollButton = disableRollButton;

// Adiciona animação de rotação
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg) scale(0.5); }
        to { transform: rotate(360deg) scale(1); }
    }
`;
document.head.appendChild(style);