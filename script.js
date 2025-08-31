// ===== UI Elements =====
const diceBtn = document.getElementById("diceBtn");
const diceResult = document.getElementById("diceResult");
const statusMsg = document.getElementById("statusMsg");
const tokenSelection = document.getElementById("tokenSelection");
const tokenButtons = document.getElementById("tokenButtons");

// ===== GAME STATE =====
const players = {
  red: { tokens: [0, 0, 0, 0], path: [] },
  green: { tokens: [0, 0, 0, 0], path: [] },
  yellow: { tokens: [0, 0, 0, 0], path: [] },
  blue: { tokens: [0, 0, 0, 0], path: [] }
};

let currentPlayer = "red";
const playerOrder = ["red", "green", "yellow", "blue"];
const safePositions = ["r9", "g9", "y9", "b9"];
let currentDiceValue = 0;
let gameWon = false;

// ===== PATH GENERATION =====
function generatePlayerPaths() {
  // Main board path (clockwise)
  const mainPath = [
    "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12", "r13",
    "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10", "g11", "g12", "g13",
    "y1", "y2", "y3", "y4", "y5", "y6", "y7", "y8", "y9", "y10", "y11", "y12", "y13",
    "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "b11", "b12", "b13"
  ];

  // Starting positions for each color
  const startPositions = { red: 0, green: 13, yellow: 26, blue: 39 };

  // Generate path for each player
  Object.keys(players).forEach(color => {
    const start = startPositions[color];
    const path = [];

    // Add main path (52 positions total)
    for (let i = 0; i < 52; i++) {
      path.push(mainPath[(start + i) % 52]);
    }

    // Add home stretch
    for (let i = 1; i <= 5; i++) {
      path.push(`${color.charAt(0)}h${i}`);
    }

    players[color].path = path;
  });
}

// ===== GAME FUNCTIONS =====
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function getMovableTokens(playerColor, diceValue) {
  const player = players[playerColor];
  const movable = [];

  player.tokens.forEach((pos, idx) => {
    if (pos === 0 && diceValue === 6) {
      movable.push(idx); // Can start with 6
    } else if (pos > 0 && pos + diceValue <= player.path.length) {
      movable.push(idx); // Can move forward
    }
  });

  return movable;
}

function moveToken(playerColor, tokenIndex, diceValue) {
  const player = players[playerColor];
  let pos = player.tokens[tokenIndex];

  if (pos === 0 && diceValue === 6) {
    pos = 1; // Enter board
  } else {
    pos += diceValue;
  }

  if (pos > player.path.length) return false; // Invalid move

  player.tokens[tokenIndex] = pos;

  // Check for captures
  if (pos <= 52) { // Only on main path, not in home stretch
    const cellId = player.path[pos - 1];
    if (!safePositions.includes(cellId)) {
      captureTokens(playerColor, cellId);
    }
  }

  updateTokenDisplay();
  return true;
}

function captureTokens(attacker, cellId) {
  Object.keys(players).forEach(color => {
    if (color === attacker) return;

    const player = players[color];
    player.tokens.forEach((pos, idx) => {
      if (pos > 0 && pos <= 52 && player.path[pos - 1] === cellId) {
        player.tokens[idx] = 0; // Send back to base
      }
    });
  });
}

function checkWin(playerColor) {
  const player = players[playerColor];
  return player.tokens.every(pos => pos === player.path.length);
}

function nextPlayer() {
  const currentIndex = playerOrder.indexOf(currentPlayer);
  currentPlayer = playerOrder[(currentIndex + 1) % 4];
  updateStatus(`Current Player: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`);
}

function updateTokenDisplay() {
  // Clear all path tokens
  document.querySelectorAll('.path-token').forEach(token => token.remove());

  // Place tokens on board
  Object.keys(players).forEach(color => {
    const player = players[color];
    player.tokens.forEach((pos, tokenIdx) => {
      const tokenEl = document.querySelector(`[data-player="${color}"][data-token="${tokenIdx}"]`);

      if (pos === 0) {
        // Token is in base - ensure it's visible there
        tokenEl.style.display = 'block';
      } else {
        // Token is on path
        tokenEl.style.display = 'none';
        const cellId = player.path[pos - 1];
        const cell = document.getElementById(cellId);
        if (cell) {
          const pathToken = document.createElement('div');
          pathToken.className = `path-token ${color}`;
          pathToken.title = `${color} token ${tokenIdx + 1}`;
          cell.appendChild(pathToken);
        }
      }
    });
  });
}

function updateStatus(msg) {
  statusMsg.textContent = msg;
}

function showTokenSelection(movableTokens) {
  tokenButtons.innerHTML = '';
  movableTokens.forEach(tokenIdx => {
    const btn = document.createElement('button');
    btn.className = 'token-btn';
    btn.textContent = `Token ${tokenIdx + 1}`;
    btn.onclick = () => selectToken(tokenIdx);
    tokenButtons.appendChild(btn);
  });
  tokenSelection.style.display = 'block';
  diceBtn.disabled = true;
}

function selectToken(tokenIndex) {
  tokenSelection.style.display = 'none';
  diceBtn.disabled = false;

  const moved = moveToken(currentPlayer, tokenIndex, currentDiceValue);

  if (moved) {
    if (checkWin(currentPlayer)) {
      updateStatus(`${currentPlayer.toUpperCase()} WINS! 🎉`);
      gameWon = true;
      diceBtn.disabled = true;
    } else {
      // Continue turn if rolled 6, otherwise next player
      if (currentDiceValue !== 6) {
        nextPlayer();
      }
    }
  }

  currentDiceValue = 0;
}

// ===== EVENT HANDLERS =====
diceBtn.addEventListener("click", () => {
  if (gameWon) return;

  const roll = rollDice();
  currentDiceValue = roll;
  diceResult.textContent = "🎲 " + roll;

  const movable = getMovableTokens(currentPlayer, roll);

  if (movable.length === 0) {
    updateStatus(`${currentPlayer} cannot move! Passing turn...`);
    setTimeout(() => {
      nextPlayer();
    }, 1500);
  } else if (movable.length === 1) {
    // Auto-move if only one option
    const moved = moveToken(currentPlayer, movable[0], roll);
    if (moved) {
      if (checkWin(currentPlayer)) {
        updateStatus(`${currentPlayer.toUpperCase()} WINS! 🎉`);
        gameWon = true;
        diceBtn.disabled = true;
      } else {
        if (roll !== 6) {
          nextPlayer();
        }
      }
    }
  } else {
    // Multiple options - let player choose
    showTokenSelection(movable);
  }
});

// ===== INITIALIZATION =====
function initGame() {
  generatePlayerPaths();
  updateTokenDisplay();
  updateStatus("Current Player: Red");
}

// Start the game
initGame();