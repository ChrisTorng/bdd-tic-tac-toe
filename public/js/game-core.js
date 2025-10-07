const LINES = [
  [
    [1, 1],
    [1, 2],
    [1, 3],
  ],
  [
    [2, 1],
    [2, 2],
    [2, 3],
  ],
  [
    [3, 1],
    [3, 2],
    [3, 3],
  ],
  [
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  [
    [1, 2],
    [2, 2],
    [3, 2],
  ],
  [
    [1, 3],
    [2, 3],
    [3, 3],
  ],
  [
    [1, 1],
    [2, 2],
    [3, 3],
  ],
  [
    [1, 3],
    [2, 2],
    [3, 1],
  ],
];

function createDifficultySummary(options) {
  return options.map((option) => `${option.label}：${option.description}`).join('、');
}

export class GameCore {
  constructor({ storage, nowProvider, random } = {}) {
    this.storage = storage ?? createMemoryStorage();
    this.nowProvider = nowProvider ?? (() => new Date());
    this.random = typeof random === 'function' ? random : Math.random;
    this.historyKey = 'ticTacToeHistory';
    this.opponentModes = [
      { value: 'human', label: '雙人對戰' },
      { value: 'computer', label: '與電腦對戰' },
    ];
    this.firstPlayerOptions = [
      { value: 'player', label: '玩家先手' },
      { value: 'computer', label: '電腦先手' },
    ];
    this.difficultyOptions = [
      { value: 'easy', label: '簡單', description: '隨機落子' },
      { value: 'medium', label: '中等', description: '優先防守' },
      { value: 'hard', label: '困難', description: '最佳策略' },
    ];
    this.opponentMode = 'human';
    this.firstPlayer = 'player';
    this.difficulty = 'easy';
    this.humanMark = 'X';
    this.computerMark = 'O';
    this.lastOpeningMove = null;
    this.previousOpeningMove = null;
    this.resetGame();
  }

  resetGame() {
    this.board = Array.from({ length: 3 }, () => Array(3).fill(''));
    this.currentPlayer = 'X';
    this.gameActive = true;
    this.moveCount = 0;
    this.message = '';
    this.messageType = 'info';
    this.winningCells = [];
    this.lastOpeningMove = null;
    this.updateMarks();
    this.currentPlayer = 'X';

    if (this.opponentMode === 'computer' && this.isComputerTurn()) {
      this.makeComputerMove();
    }
  }

  getStatusText() {
    if (!this.gameActive) {
      return '遊戲結束';
    }
    if (this.opponentMode !== 'computer') {
      return `輪到 ${this.currentPlayer}`;
    }

    const owner = this.currentPlayer === this.computerMark ? '電腦' : '玩家';
    return `輪到 ${this.currentPlayer} (${owner})`;
  }

  getMessage() {
    return this.message;
  }

  getMessageType() {
    return this.messageType;
  }

  getWinningCells() {
    return [...this.winningCells];
  }

  getBoardSnapshot() {
    return this.board.map((row) => row.slice());
  }

  getCell(row, col) {
    return this.board[row - 1][col - 1];
  }

  isGameActive() {
    return this.gameActive;
  }

  playMove(row, col) {
    return this.performMove(row, col, { byComputer: false });
  }

  performMove(row, col, { byComputer }) {
    if (!this.gameActive) {
      return { type: 'inactive' };
    }

    if (this.opponentMode === 'computer' && !byComputer && this.isComputerTurn()) {
      this.message = '請等待電腦落子';
      this.messageType = 'error';
      return { type: 'computer-turn' };
    }

    if (this.board[row - 1][col - 1]) {
      this.message = '此格已被佔用';
      this.messageType = 'error';
      return { type: 'invalid', message: this.message };
    }

    this.board[row - 1][col - 1] = this.currentPlayer;
    this.moveCount += 1;
    this.message = '';
    this.messageType = 'info';
    if (byComputer && this.moveCount === 1) {
      this.lastOpeningMove = { row, col };
      this.previousOpeningMove = { row, col };
    }

    const winner = this.findWinner();
    if (winner) {
      this.winningCells = winner.line;
      this.message = `${winner.player} 獲勝`;
      this.messageType = 'success';
      this.gameActive = false;
      this.persistHistory(this.message, winner.player);
      return { type: 'win', player: winner.player, winningCells: [...winner.line] };
    }

    if (this.moveCount === 9) {
      this.winningCells = [];
      this.message = '平手';
      this.messageType = 'info';
      this.gameActive = false;
      this.persistHistory(this.message, null);
      return { type: 'draw' };
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    if (!byComputer && this.opponentMode === 'computer' && this.isComputerTurn()) {
      this.makeComputerMove();
    }
    return { type: 'success' };
  }

  findWinner() {
    for (const line of LINES) {
      const [a, b, c] = line;
      const values = [this.getCell(...a), this.getCell(...b), this.getCell(...c)];
      if (values[0] && values.every((value) => value === values[0])) {
        return { player: values[0], line: line.map(([r, c]) => `${r}-${c}`) };
      }
    }
    return null;
  }

  getHistory() {
    try {
      const raw = this.storage.getItem(this.historyKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Unable to read history from storage', error);
      return [];
    }
  }

  persistHistory(outcome, winner) {
    const history = this.getHistory();
    const entry = {
      outcome,
      winner,
      moves: this.moveCount,
      finishedAt: this.nowProvider().toISOString(),
    };
    history.unshift(entry);
    const trimmed = history.slice(0, 5);
    try {
      this.storage.setItem(this.historyKey, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Unable to save history', error);
    }
  }

  clearHistory() {
    try {
      this.storage.removeItem(this.historyKey);
    } catch (error) {
      console.error('Unable to clear history', error);
    }
  }

  setBoardState(rows, nextPlayer) {
    this.board = rows.map((row) => row.map((cell) => (cell === '空白' ? '' : cell)));
    this.moveCount = this.board.flat().filter(Boolean).length;
    const labelMatch = /([XO])\s*\(([^)]+)\)/.exec(nextPlayer);
    if (labelMatch) {
      const [, mark, owner] = labelMatch;
      this.currentPlayer = mark;
      if (this.opponentMode === 'computer') {
        if (owner === '電腦') {
          this.computerMark = mark;
          this.humanMark = mark === 'X' ? 'O' : 'X';
          this.firstPlayer = this.computerMark === 'X' ? 'computer' : 'player';
        } else if (owner === '玩家') {
          this.humanMark = mark;
          this.computerMark = mark === 'X' ? 'O' : 'X';
          this.firstPlayer = this.computerMark === 'X' ? 'computer' : 'player';
        }
      }
    } else {
      this.currentPlayer = nextPlayer;
    }
    this.gameActive = true;
    this.message = '';
    this.messageType = 'info';
    this.winningCells = [];
  }

  setDrawState(pattern) {
    const layout = pattern ?? [
      ['X', 'O', 'X'],
      ['X', 'O', 'O'],
      ['O', 'X', 'X'],
    ];
    this.board = layout.map((row) => row.slice());
    this.moveCount = 9;
    this.gameActive = false;
    this.currentPlayer = 'X';
    this.message = '平手';
    this.messageType = 'info';
    this.winningCells = [];
    this.persistHistory(this.message, null);
  }

  getOpponentModeOptions() {
    return this.opponentModes.map((option) => option.label);
  }

  getFirstPlayerOptions() {
    return this.firstPlayerOptions.map((option) => option.label);
  }

  getDifficultyOptions() {
    return this.difficultyOptions.map((option) => option.label);
  }

  getSelectedDifficultyLabel() {
    const current = this.difficultyOptions.find((option) => option.value === this.difficulty);
    return current?.label ?? '簡單';
  }

  getDifficultySummary() {
    return createDifficultySummary(this.difficultyOptions);
  }

  getOpponentMode() {
    return this.opponentMode;
  }

  getFirstPlayer() {
    return this.firstPlayer;
  }

  getDifficulty() {
    return this.difficulty;
  }

  isDifficultySelectionEnabled() {
    return this.opponentMode === 'computer';
  }

  getComputerMark() {
    return this.computerMark;
  }

  getHumanMark() {
    return this.humanMark;
  }

  setOpponentMode(input) {
    const normalized = this.normalizeModeInput(input);
    if (!normalized) {
      return;
    }
    if (this.opponentMode !== normalized) {
      this.opponentMode = normalized;
      if (this.opponentMode !== 'computer') {
        this.firstPlayer = 'player';
        this.humanMark = 'X';
        this.computerMark = 'O';
      }
      this.resetGame();
    }
  }

  setFirstPlayer(input) {
    const normalized = this.normalizeFirstPlayerInput(input);
    if (!normalized) {
      return;
    }
    if (this.firstPlayer !== normalized) {
      this.firstPlayer = normalized;
      this.resetGame();
    }
  }

  setDifficulty(input) {
    const normalized = this.normalizeDifficultyInput(input);
    if (!normalized) {
      return;
    }
    this.difficulty = normalized;
  }

  makeComputerMove() {
    if (this.opponentMode !== 'computer' || !this.isComputerTurn()) {
      return null;
    }
    const move = this.chooseComputerMove();
    if (!move) {
      return null;
    }
    return this.performMove(move.row, move.col, { byComputer: true });
  }

  getLastOpeningMove() {
    return this.lastOpeningMove ? { ...this.lastOpeningMove } : null;
  }

  computeOptimalOutcomeForComputer() {
    if (this.opponentMode !== 'computer') {
      return 'unknown';
    }
    const winner = this.findWinnerOnBoard(this.board);
    if (winner === this.computerMark) {
      return 'win';
    }
    if (winner === this.humanMark) {
      return 'loss';
    }
    if (this.getAvailableMoves(this.board).length === 0) {
      return 'draw';
    }
    const score = this.minimax(this.board, this.currentPlayer === this.computerMark, 0);
    if (score > 0) {
      return 'win';
    }
    if (score < 0) {
      return 'loss';
    }
    return 'draw';
  }

  // Helpers

  normalizeModeInput(input) {
    if (input === 'human' || input === 'computer') {
      return input;
    }
    return this.opponentModes.find((option) => option.label === input)?.value ?? null;
  }

  normalizeFirstPlayerInput(input) {
    if (input === 'player' || input === 'computer') {
      return input;
    }
    return this.firstPlayerOptions.find((option) => option.label === input)?.value ?? null;
  }

  normalizeDifficultyInput(input) {
    if (['easy', 'medium', 'hard'].includes(input)) {
      return input;
    }
    return this.difficultyOptions.find((option) => option.label === input)?.value ?? null;
  }

  updateMarks() {
    if (this.opponentMode !== 'computer') {
      this.humanMark = 'X';
      this.computerMark = 'O';
      return;
    }

    if (this.firstPlayer === 'player') {
      this.humanMark = 'X';
      this.computerMark = 'O';
    } else {
      this.humanMark = 'O';
      this.computerMark = 'X';
    }
  }

  isComputerTurn() {
    return this.opponentMode === 'computer' && this.currentPlayer === this.computerMark && this.gameActive;
  }

  chooseComputerMove() {
    if (this.difficulty === 'hard') {
      return this.chooseHardMove();
    }
    if (this.difficulty === 'medium') {
      return this.chooseMediumMove();
    }
    return this.chooseEasyMove();
  }

  chooseEasyMove() {
    let available = this.getAvailableMoves(this.board);
    if (this.moveCount === 0 && this.previousOpeningMove) {
      const filtered = available.filter((move) => !this.isSameMove(move, this.previousOpeningMove));
      if (filtered.length > 0) {
        available = filtered;
      }
    }
    const index = Math.floor(this.random() * available.length);
    const chosen = available[index];
    return chosen;
  }

  chooseMediumMove() {
    const board = this.board;
    const winningMove = this.findImmediateWinningMove(board, this.computerMark);
    if (winningMove) {
      return winningMove;
    }
    const blockMove = this.findImmediateWinningMove(board, this.humanMark);
    if (blockMove) {
      return blockMove;
    }
    const center = this.getAvailableMoves(board).find((move) => move.row === 2 && move.col === 2);
    if (center) {
      return center;
    }
    const corners = this.getAvailableMoves(board).filter((move) =>
      (move.row === 1 || move.row === 3) && (move.col === 1 || move.col === 3),
    );
    if (corners.length > 0) {
      return corners[Math.floor(this.random() * corners.length)];
    }
    const available = this.getAvailableMoves(board);
    return available[Math.floor(this.random() * available.length)];
  }

  chooseHardMove() {
    let bestScore = -Infinity;
    let chosenMove = null;
    for (const move of this.getAvailableMoves(this.board)) {
      this.board[move.row - 1][move.col - 1] = this.computerMark;
      const score = this.minimax(this.board, false, 0);
      this.board[move.row - 1][move.col - 1] = '';
      if (score > bestScore) {
        bestScore = score;
        chosenMove = move;
      }
    }
    return chosenMove;
  }

  minimax(board, isComputerTurn, depth) {
    const winner = this.findWinnerOnBoard(board);
    if (winner === this.computerMark) {
      return 10 - depth;
    }
    if (winner === this.humanMark) {
      return depth - 10;
    }

    const available = this.getAvailableMoves(board);
    if (available.length === 0) {
      return 0;
    }

    if (isComputerTurn) {
      let best = -Infinity;
      for (const move of available) {
        board[move.row - 1][move.col - 1] = this.computerMark;
        best = Math.max(best, this.minimax(board, false, depth + 1));
        board[move.row - 1][move.col - 1] = '';
      }
      return best;
    }

    let best = Infinity;
    for (const move of available) {
      board[move.row - 1][move.col - 1] = this.humanMark;
      best = Math.min(best, this.minimax(board, true, depth + 1));
      board[move.row - 1][move.col - 1] = '';
    }
    return best;
  }

  findWinnerOnBoard(board) {
    for (const line of LINES) {
      const [a, b, c] = line;
      const values = [board[a[0] - 1][a[1] - 1], board[b[0] - 1][b[1] - 1], board[c[0] - 1][c[1] - 1]];
      if (values[0] && values.every((value) => value === values[0])) {
        return values[0];
      }
    }
    return null;
  }

  getAvailableMoves(board) {
    const moves = [];
    for (let row = 1; row <= 3; row += 1) {
      for (let col = 1; col <= 3; col += 1) {
        if (!board[row - 1][col - 1]) {
          moves.push({ row, col });
        }
      }
    }
    return moves;
  }

  findImmediateWinningMove(board, mark) {
    for (const move of this.getAvailableMoves(board)) {
      board[move.row - 1][move.col - 1] = mark;
      const winner = this.findWinnerOnBoard(board);
      board[move.row - 1][move.col - 1] = '';
      if (winner === mark) {
        return move;
      }
    }
    return null;
  }

  isSameMove(a, b) {
    return a.row === b.row && a.col === b.col;
  }
}

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}
