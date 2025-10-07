const WINNING_LINES = [
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

const DEFAULT_CONFIG = {
  opponentMode: 'human',
  firstPlayer: 'player',
  difficulty: 'easy',
};

const OPPONENT_OPTIONS = [
  { value: 'human', label: '雙人對戰' },
  { value: 'computer', label: '與電腦對戰' },
];

const FIRST_PLAYER_OPTIONS = [
  { value: 'player', label: '玩家先手' },
  { value: 'computer', label: '電腦先手' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '簡單' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困難' },
];

const DIFFICULTY_HINT = '簡單：隨機落子、中等：優先防守、困難：最佳策略';

function getOppositeMark(mark) {
  return mark === 'X' ? 'O' : 'X';
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function getAvailableMovesFrom(board) {
  const moves = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      if (!board[row][col]) {
        moves.push({ row: row + 1, col: col + 1 });
      }
    }
  }
  return moves;
}

function findWinnerOnBoard(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const v1 = board[a[0] - 1][a[1] - 1];
    if (!v1) {
      continue;
    }
    const v2 = board[b[0] - 1][b[1] - 1];
    const v3 = board[c[0] - 1][c[1] - 1];
    if (v1 === v2 && v1 === v3) {
      return { player: v1, line: line.map(([r, c]) => `${r}-${c}`) };
    }
  }
  return null;
}

function boardIsFull(board) {
  return board.every((row) => row.every((cell) => cell));
}

function optionLabel(options, value) {
  const match = options.find((option) => option.value === value);
  return match ? match.label : value;
}

export class GameCore {
  constructor({ storage, nowProvider } = {}) {
    this.storage = storage ?? createMemoryStorage();
    this.nowProvider = nowProvider ?? (() => new Date());
    this.historyKey = 'ticTacToeHistory';
    this.config = { ...DEFAULT_CONFIG };
    this.playerMark = 'X';
    this.computerMark = 'O';
    this.lastComputerMove = null;
    this.previousOpeningMove = null;
    this.performingComputerMove = false;
    this.resetGame();
  }

  resetGame({ suppressAuto } = {}) {
    this.board = Array.from({ length: 3 }, () => Array(3).fill(''));
    this.moveCount = 0;
    this.gameActive = true;
    this.message = '';
    this.messageType = 'info';
    this.winningCells = [];
    this.currentPlayer = 'X';
    this.determineMarks();
    this.lastComputerMove = null;
    if (!suppressAuto) {
      this.performComputerTurnIfNeeded();
    }
  }

  determineMarks() {
    if (this.config.opponentMode === 'computer') {
      if (this.config.firstPlayer === 'player') {
        this.playerMark = 'X';
        this.computerMark = 'O';
      } else {
        this.playerMark = 'O';
        this.computerMark = 'X';
      }
    } else {
      this.playerMark = 'X';
      this.computerMark = 'O';
    }
  }

  getOpponentMode() {
    return this.config.opponentMode;
  }

  getFirstPlayer() {
    return this.config.firstPlayer;
  }

  getDifficulty() {
    return this.config.difficulty;
  }

  getDifficultyLabel(value) {
    return optionLabel(DIFFICULTY_OPTIONS, value ?? this.config.difficulty);
  }

  getOpponentOptions() {
    return OPPONENT_OPTIONS.map((option) => ({ ...option }));
  }

  getFirstPlayerOptions() {
    return FIRST_PLAYER_OPTIONS.map((option) => ({ ...option }));
  }

  getDifficultyOptions() {
    return DIFFICULTY_OPTIONS.map((option) => ({ ...option }));
  }

  getDifficultyHint() {
    return DIFFICULTY_HINT;
  }

  isDifficultyEnabled() {
    return this.config.opponentMode === 'computer';
  }

  isPlayerTurn() {
    if (!this.gameActive) {
      return false;
    }
    if (this.config.opponentMode !== 'computer') {
      return true;
    }
    return this.getRoleForMark(this.currentPlayer) === 'player';
  }

  isComputerTurn() {
    return (
      this.gameActive &&
      this.config.opponentMode === 'computer' &&
      this.getRoleForMark(this.currentPlayer) === 'computer'
    );
  }

  setOpponentMode(mode) {
    if (!OPPONENT_OPTIONS.some((option) => option.value === mode)) {
      throw new Error(`Unsupported opponent mode: ${mode}`);
    }
    this.config.opponentMode = mode;
    if (mode === 'human') {
      this.config.firstPlayer = 'player';
    }
    this.determineMarks();
    this.resetGame();
  }

  setFirstPlayer(role) {
    if (!FIRST_PLAYER_OPTIONS.some((option) => option.value === role)) {
      throw new Error(`Unsupported first player: ${role}`);
    }
    this.config.firstPlayer = role;
    this.determineMarks();
    this.resetGame();
  }

  setDifficulty(level) {
    if (!DIFFICULTY_OPTIONS.some((option) => option.value === level)) {
      throw new Error(`Unsupported difficulty: ${level}`);
    }
    this.config.difficulty = level;
    if (this.isComputerTurn()) {
      this.performComputerTurnIfNeeded();
    }
  }

  getPlayerMark() {
    return this.playerMark;
  }

  getComputerMark() {
    return this.computerMark;
  }

  getStatusText() {
    if (!this.gameActive) {
      return '遊戲結束';
    }
    if (this.config.opponentMode === 'computer') {
      const role = this.getRoleForMark(this.currentPlayer);
      const label = role === 'player' ? '玩家' : '電腦';
      return `輪到 ${this.currentPlayer} (${label})`;
    }
    return `輪到 ${this.currentPlayer}`;
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

  playMove(row, col, options = {}) {
    if (!this.gameActive) {
      return { type: 'inactive' };
    }

    if (this.config.opponentMode === 'computer' && !options.allowComputer) {
      const role = this.getRoleForMark(this.currentPlayer);
      if (role === 'computer') {
        return { type: 'blocked' };
      }
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

    const winner = findWinnerOnBoard(this.board);
    if (winner) {
      this.winningCells = winner.line;
      this.message = `${winner.player} 獲勝`;
      this.messageType = 'success';
      this.gameActive = false;
      this.persistHistory(this.message, winner.player);
      return { type: 'win', player: winner.player, winningCells: [...winner.line] };
    }

    if (boardIsFull(this.board)) {
      this.winningCells = [];
      this.message = '平手';
      this.messageType = 'info';
      this.gameActive = false;
      this.persistHistory(this.message, null);
      return { type: 'draw' };
    }

    this.currentPlayer = getOppositeMark(this.currentPlayer);
    const response = { type: 'success' };

    this.performComputerTurnIfNeeded();

    return response;
  }

  performComputerTurnIfNeeded() {
    if (this.performingComputerMove) {
      return;
    }
    if (!this.isComputerTurn()) {
      return;
    }
    const move = this.chooseComputerMove();
    if (!move) {
      return;
    }
    this.performingComputerMove = true;
    this.lastComputerMove = { ...move };
    try {
      const isOpening = this.moveCount === 0;
      this.playMove(move.row, move.col, { allowComputer: true });
      if (isOpening) {
        this.previousOpeningMove = { ...move };
      }
    } finally {
      this.performingComputerMove = false;
    }
  }

  chooseComputerMove() {
    const board = this.getBoardSnapshot();
    const currentMark = this.currentPlayer;
    if (this.config.difficulty === 'easy') {
      return this.chooseRandomMove(board);
    }
    if (this.config.difficulty === 'medium') {
      return this.chooseDefensiveMove(board, currentMark);
    }
    return this.chooseOptimalMove(board, currentMark);
  }

  chooseRandomMove(board) {
    const moves = getAvailableMovesFrom(board);
    if (moves.length === 0) {
      return null;
    }
    let index = Math.floor(Math.random() * moves.length);
    if (this.moveCount === 0 && this.previousOpeningMove) {
      const previousKey = `${this.previousOpeningMove.row}-${this.previousOpeningMove.col}`;
      let attempts = 0;
      while (
        attempts < moves.length &&
        `${moves[index].row}-${moves[index].col}` === previousKey
      ) {
        index = (index + 1) % moves.length;
        attempts += 1;
      }
    }
    return moves[index];
  }

  chooseDefensiveMove(board, currentMark) {
    const moves = getAvailableMovesFrom(board);
    if (moves.length === 0) {
      return null;
    }
    // Try winning move first.
    for (const move of moves) {
      const clone = cloneBoard(board);
      clone[move.row - 1][move.col - 1] = currentMark;
      if (findWinnerOnBoard(clone)) {
        return move;
      }
    }
    const opponentMark = getOppositeMark(currentMark);
    for (const move of moves) {
      const clone = cloneBoard(board);
      clone[move.row - 1][move.col - 1] = opponentMark;
      if (findWinnerOnBoard(clone)) {
        return move;
      }
    }
    const center = moves.find((move) => move.row === 2 && move.col === 2);
    if (center) {
      return center;
    }
    return moves[0];
  }

  chooseOptimalMove(board, computerMark) {
    const result = this.minimax(board, computerMark, computerMark);
    return result.move ?? this.chooseRandomMove(board);
  }

  minimax(board, currentMark, computerMark) {
    const winner = findWinnerOnBoard(board);
    if (winner) {
      if (winner.player === computerMark) {
        return { score: 1 };
      }
      if (winner.player === getOppositeMark(computerMark)) {
        return { score: -1 };
      }
    }

    const moves = getAvailableMovesFrom(board);
    if (moves.length === 0) {
      return { score: 0 };
    }

    const isComputerTurn = currentMark === computerMark;
    let bestScore = isComputerTurn ? -Infinity : Infinity;
    let bestMoves = [];

    for (const move of moves) {
      board[move.row - 1][move.col - 1] = currentMark;
      const { score } = this.minimax(board, getOppositeMark(currentMark), computerMark);
      board[move.row - 1][move.col - 1] = '';

      if (isComputerTurn) {
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      } else if (score < bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    const selectedMove = bestMoves[0] ?? null;
    return { score: bestScore, move: selectedMove };
  }

  forceComputerMove() {
    const before = this.moveCount;
    this.performComputerTurnIfNeeded();
    return this.moveCount > before;
  }

  getLastComputerMove() {
    return this.lastComputerMove ? { ...this.lastComputerMove } : null;
  }

  getRoleForMark(mark) {
    if (this.config.opponentMode !== 'computer') {
      return 'player';
    }
    return mark === this.playerMark ? 'player' : 'computer';
  }

  findWinner() {
    return findWinnerOnBoard(this.board);
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

  resolveStatusInfo(status) {
    if (typeof status === 'object' && status) {
      return {
        mark: status.mark ?? 'X',
        opponentMode: status.opponentMode ?? 'human',
        playerMark: status.playerMark ?? 'X',
        computerMark: status.computerMark ?? 'O',
        firstPlayer: status.firstPlayer ?? 'player',
      };
    }

    if (typeof status === 'string') {
      const trimmed = status.trim();
      const match = trimmed.match(/^([XO])(?:\s*\((玩家|電腦)\))?$/);
      if (match) {
        const [, mark, role] = match;
        if (!role) {
          return {
            mark,
            opponentMode: 'human',
            playerMark: 'X',
            computerMark: 'O',
            firstPlayer: 'player',
          };
        }
        if (role === '玩家') {
          return {
            mark,
            opponentMode: 'computer',
            playerMark: mark,
            computerMark: getOppositeMark(mark),
            firstPlayer: mark === 'X' ? 'player' : 'computer',
          };
        }
        return {
          mark,
          opponentMode: 'computer',
          playerMark: getOppositeMark(mark),
          computerMark: mark,
          firstPlayer: mark === 'X' ? 'computer' : 'player',
        };
      }
      if (trimmed === 'X' || trimmed === 'O') {
        return {
          mark: trimmed,
          opponentMode: 'human',
          playerMark: 'X',
          computerMark: 'O',
          firstPlayer: 'player',
        };
      }
    }

    return {
      mark: 'X',
      opponentMode: 'human',
      playerMark: 'X',
      computerMark: 'O',
      firstPlayer: 'player',
    };
  }

  setBoardState(rows, status) {
    this.board = rows.map((row) => row.map((cell) => (cell === '空白' ? '' : cell)));
    this.moveCount = this.board.flat().filter(Boolean).length;
    const info = this.resolveStatusInfo(status);
    this.currentPlayer = info.mark;
    this.config.opponentMode = info.opponentMode;
    this.config.firstPlayer = info.firstPlayer;
    this.playerMark = info.playerMark;
    this.computerMark = info.computerMark;
    this.gameActive = true;
    this.message = '';
    this.messageType = 'info';
    this.winningCells = [];
    this.lastComputerMove = null;
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
    this.lastComputerMove = null;
    this.persistHistory(this.message, null);
  }

  evaluateBestOutcomeForComputer() {
    if (this.config.opponentMode !== 'computer') {
      return null;
    }
    const board = this.getBoardSnapshot();
    const winner = findWinnerOnBoard(board);
    if (winner) {
      if (winner.player === this.computerMark) {
        return 'win';
      }
      if (winner.player === this.playerMark) {
        return 'loss';
      }
    }
    if (boardIsFull(board)) {
      return 'draw';
    }
    const { score } = this.minimax(board, this.currentPlayer, this.computerMark);
    if (score > 0) {
      return 'win';
    }
    if (score < 0) {
      return 'loss';
    }
    return 'draw';
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
