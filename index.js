(function () {
    // Element references
    const boardElem = document.getElementById("board");
    const cells = Array.from(document.querySelectorAll(".cell"));
    const statusElem = document.getElementById("status");
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    const restartBtn = document.getElementById("restartBtn");
    const toggleThemeBtn = document.getElementById("toggleTheme");
    const toggleAIModeBtn = document.getElementById("toggleAIMode");
    const scoreboardElem = document.getElementById("scoreboard");
  
    // Global game state variables
    let currentPlayer = "X";
    let gameActive = true;
    let gameState = Array(9).fill("");
    let moveHistory = []; // history for undo/redo
    let historyPointer = -1; // pointer in history
  
    // Game mode: 'pvp' or 'pvai'
    let gameMode = "pvp"; // default is player vs player
  
    // Scoreboard (persisted in localStorage)
    let scoreboard = {
      playerXWins: 0,
      playerOWins: 0,
      draws: 0,
      playerXName: "Player X",
      playerOName: "Player O",
    };
    const storedScore = localStorage.getItem("ticTacToeScoreboard");
    if (storedScore) {
      scoreboard = JSON.parse(storedScore);
    }
    updateScoreboardUI();
  
    // Initialize game: reset board, state, history
    function initGame() {
      gameState = Array(9).fill("");
      currentPlayer = "X";
      gameActive = true;
      moveHistory = [];
      historyPointer = -1;
      saveMoveHistory(); // save initial state
      updateStatus(`${scoreboard.playerXName}'s turn (X)`);
      updateBoardUI();
    }
  
    // Save current state to history (for undo/redo)
    function saveMoveHistory() {
      if (historyPointer < moveHistory.length - 1) {
        moveHistory = moveHistory.slice(0, historyPointer + 1);
      }
      moveHistory.push({
        gameState: gameState.slice(),
        currentPlayer: currentPlayer,
      });
      historyPointer++;
      updateUndoRedoButtons();
    }
  
    function updateUndoRedoButtons() {
      undoBtn.disabled = historyPointer <= 0;
      redoBtn.disabled = historyPointer >= moveHistory.length - 1;
    }
  
    function updateScoreboardUI() {
      let playerODisplay = gameMode === "pvai" ? "AI" : scoreboard.playerOName;
      scoreboardElem.innerHTML = `
        <p>${scoreboard.playerXName}: ${scoreboard.playerXWins} Wins</p>
        <p>${playerODisplay}: ${scoreboard.playerOWins} Wins</p>
        <p>Draws: ${scoreboard.draws}</p>
      `;
    }
  
    function updateBoardUI() {
      cells.forEach((cell, index) => {
        cell.textContent = gameState[index];
        cell.classList.remove("winning-cell");
      });
      const winCombo = checkWinCombo();
      if (winCombo) {
        winCombo.forEach((index) =>
          cells[index].classList.add("winning-cell")
        );
      }
    }
  
    function updateStatus(message) {
      statusElem.textContent = message;
    }
  
    // Winning combinations
    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
  
    function checkWinCombo() {
      for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (
          gameState[a] &&
          gameState[a] === gameState[b] &&
          gameState[a] === gameState[c]
        ) {
          return combo;
        }
      }
      return null;
    }
    function checkWin() {
      return checkWinCombo() !== null;
    }
    function checkDraw() {
      return gameState.every((cell) => cell !== "");
    }
  
    function handleCellClick(e) {
      const index = parseInt(e.target.getAttribute("data-index"));
      if (!gameActive || gameState[index] !== "") return;
      makeMove(index, currentPlayer);
    }
  
    function makeMove(index, player) {
      gameState[index] = player;
      updateBoardUI();
      if (checkWin()) {
        gameActive = false;
        const winCombo = checkWinCombo();
        highlightWinningCombo(winCombo);
        if (player === "X") {
          scoreboard.playerXWins++;
        } else {
          scoreboard.playerOWins++;
        }
        saveScoreboard();
        updateScoreboardUI();
        updateStatus(
          `${
            player === "X"
              ? scoreboard.playerXName
              : gameMode === "pvai"
              ? "AI"
              : scoreboard.playerOName
          } wins!`
        );
        return;
      }
      if (checkDraw()) {
        gameActive = false;
        scoreboard.draws++;
        saveScoreboard();
        updateScoreboardUI();
        updateStatus(`It's a draw!`);
        return;
      }
      // Switch turn and save history
      currentPlayer = player === "X" ? "O" : "X";
      saveMoveHistory();
      updateStatus(
        `${
          currentPlayer === "X"
            ? scoreboard.playerXName
            : gameMode === "pvai"
            ? "AI"
            : scoreboard.playerOName
        }'s turn (${currentPlayer})`
      );
      // If in AI mode and it's AI's turn, trigger AI move
      if (gameMode === "pvai" && currentPlayer === "O" && gameActive) {
        setTimeout(aiMove, 500);
      }
    }
  
    function highlightWinningCombo(combo) {
      if (combo) {
        combo.forEach((index) => cells[index].classList.add("winning-cell"));
      }
    }
  
    // AI move using minimax with alpha-beta pruning
    function aiMove() {
      if (!gameActive) return;
      let index = minimaxAlphaBeta(gameState, "O", -Infinity, Infinity).index;
      makeMove(index, "O");
    }
  
    function minimaxAlphaBeta(state, player, alpha, beta) {
      const opponent = player === "O" ? "X" : "O";
      if (isTerminal(state)) {
        return { score: evaluate(state) };
      }
      let bestMove = null;
      let available = state
        .map((cell, idx) => (cell === "" ? idx : null))
        .filter((idx) => idx !== null);
      if (player === "O") {
        // maximizer
        let maxEval = -Infinity;
        for (let i of available) {
          let newState = state.slice();
          newState[i] = player;
          let evalResult = minimaxAlphaBeta(newState, opponent, alpha, beta).score;
          if (evalResult > maxEval) {
            maxEval = evalResult;
            bestMove = i;
          }
          alpha = Math.max(alpha, evalResult);
          if (beta <= alpha) break;
        }
        return { index: bestMove, score: maxEval };
      } else {
        // minimizer
        let minEval = Infinity;
        for (let i of available) {
          let newState = state.slice();
          newState[i] = player;
          let evalResult = minimaxAlphaBeta(newState, opponent, alpha, beta).score;
          if (evalResult < minEval) {
            minEval = evalResult;
            bestMove = i;
          }
          beta = Math.min(beta, evalResult);
          if (beta <= alpha) break;
        }
        return { index: bestMove, score: minEval };
      }
    }
  
    function isTerminal(state) {
      for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (state[a] && state[a] === state[b] && state[a] === state[c]) {
          return true;
        }
      }
      return state.every((cell) => cell !== "");
    }
  
    function evaluate(state) {
      for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (state[a] && state[a] === state[b] && state[a] === state[c]) {
          return state[a] === "O" ? 10 : -10;
        }
      }
      return 0;
    }
  
    function saveScoreboard() {
      localStorage.setItem("ticTacToeScoreboard", JSON.stringify(scoreboard));
    }
  
    // Enable keyboard navigation for cells
    cells.forEach((cell) => {
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") cell.click();
      });
    });
  
    // Event listeners
    cells.forEach((cell) => cell.addEventListener("click", handleCellClick));
    undoBtn.addEventListener("click", undoMove);
    redoBtn.addEventListener("click", redoMove);
    restartBtn.addEventListener("click", initGame);
  
    // Toggle Dark/Light Theme
    toggleThemeBtn.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark-theme");
      if (document.documentElement.classList.contains("dark-theme")) {
        toggleThemeBtn.textContent = "☀️";
      } else {
        toggleThemeBtn.textContent = "🌙";
      }
    });
  
    // Toggle AI Mode
    toggleAIModeBtn.addEventListener("click", () => {
      if (gameMode === "pvp") {
        gameMode = "pvai";
        scoreboard.playerOName = "AI";
        toggleAIModeBtn.style.transform = "scale(1.2)";
      } else {
        gameMode = "pvp";
        scoreboard.playerOName = "Player O";
        toggleAIModeBtn.style.transform = "scale(1)";
      }
      updateScoreboardUI();
      initGame();
    });
  
    // Undo move
    function undoMove() {
      if (historyPointer > 0) {
        historyPointer--;
        const state = moveHistory[historyPointer];
        gameState = state.gameState.slice();
        currentPlayer = state.currentPlayer;
        gameActive = true;
        updateBoardUI();
        updateStatus(
          `${
            currentPlayer === "X"
              ? scoreboard.playerXName
              : gameMode === "pvai"
              ? "AI"
              : scoreboard.playerOName
          }'s turn (${currentPlayer})`
        );
        updateUndoRedoButtons();
      }
    }
    // Redo move
    function redoMove() {
      if (historyPointer < moveHistory.length - 1) {
        historyPointer++;
        const state = moveHistory[historyPointer];
        gameState = state.gameState.slice();
        currentPlayer = state.currentPlayer;
        gameActive = true;
        updateBoardUI();
        updateStatus(
          `${
            currentPlayer === "X"
              ? scoreboard.playerXName
              : gameMode === "pvai"
              ? "AI"
              : scoreboard.playerOName
          }'s turn (${currentPlayer})`
        );
        updateUndoRedoButtons();
      }
    }
  
    // Start the game
    initGame();
  })();
  