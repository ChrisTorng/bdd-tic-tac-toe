export class GameCore {
  constructor({ storage, nowProvider } = {}) {
    this.storage = storage ?? createMemoryStorage();
    this.nowProvider = nowProvider ?? (() => new Date());
    this.historyKey = 'ticTacToeHistory';
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
  }

  getStatusText() {
    return this.gameActive ? `輪到 ${this.currentPlayer}` : '遊戲結束';
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
    if (!this.gameActive) {
      return { type: 'inactive' };
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
    return { type: 'success' };
  }

  findWinner() {
    const lines = [
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

    for (const line of lines) {
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
    this.currentPlayer = nextPlayer;
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
