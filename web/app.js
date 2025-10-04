(function () {
  const cells = Array.from(document.querySelectorAll('[data-cell]'));
  const statusElement = document.querySelector('[data-status]');
  const messageElement = document.querySelector('[data-message]');
  const errorElement = document.querySelector('[data-error]');
  const resetButton = document.querySelector('[data-reset]');
  const historyButton = document.querySelector('[data-history]');
  const modalElement = document.querySelector('[data-modal]');
  const modalCloseButton = document.querySelector('[data-close-history]');
  const historyListElement = document.querySelector('[data-history-list]');
  const historyEmptyElement = document.querySelector('[data-history-empty]');

  const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const HISTORY_KEY = 'tic-tac-toe-history';

  const state = {
    board: Array(9).fill(''),
    currentPlayer: 'X',
    isOver: false,
    moveCount: 0,
    winningLine: [],
  };

  function formatDate(isoString) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }

  function loadHistory() {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch (error) {
      console.warn('Failed to load history from localStorage', error);
      return [];
    }
  }

  function saveHistory(entries) {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn('Failed to save history', error);
    }
  }

  function resetBoardVisuals() {
    cells.forEach((cell) => {
      cell.textContent = '';
      cell.classList.remove('win');
      cell.disabled = false;
    });
  }

  function clearMessages() {
    messageElement.textContent = '';
    errorElement.textContent = '';
  }

  function updateStatus() {
    if (state.isOver) {
      statusElement.textContent = '遊戲結束';
    } else {
      statusElement.textContent = `輪到 ${state.currentPlayer}`;
    }
  }

  function highlightWinningLine(indices) {
    cells.forEach((cell, index) => {
      if (indices.includes(index)) {
        cell.classList.add('win');
      }
    });
  }

  function disableBoard() {
    cells.forEach((cell) => {
      cell.disabled = true;
    });
  }

  function recordHistoryEntry(resultText) {
    const history = loadHistory();
    const entry = {
      result: resultText,
      moves: state.moveCount,
      finishedAt: new Date().toISOString(),
    };
    history.unshift(entry);
    if (history.length > 5) {
      history.length = 5;
    }
    saveHistory(history);
  }

  function renderHistoryList() {
    const history = loadHistory();
    historyListElement.innerHTML = '';
    if (history.length === 0) {
      historyEmptyElement.hidden = false;
      return;
    }
    historyEmptyElement.hidden = true;
    history.forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'history-item';
      const title = document.createElement('p');
      title.className = 'history-item__title';
      title.textContent = entry.result;
      const meta = document.createElement('p');
      meta.className = 'history-item__meta';
      meta.textContent = `步數：${entry.moves} · 完成時間：${formatDate(entry.finishedAt)}`;
      item.appendChild(title);
      item.appendChild(meta);
      historyListElement.appendChild(item);
    });
  }

  function openHistoryModal() {
    renderHistoryList();
    modalElement.dataset.visible = 'true';
    modalElement.setAttribute('aria-hidden', 'false');
  }

  function closeHistoryModal() {
    modalElement.dataset.visible = 'false';
    modalElement.setAttribute('aria-hidden', 'true');
  }

  function showError(message) {
    errorElement.textContent = message;
  }

  function clearError() {
    errorElement.textContent = '';
  }

  function setCellValue(index, value) {
    state.board[index] = value;
    cells[index].textContent = value;
  }

  function resetGame() {
    state.board = Array(9).fill('');
    state.currentPlayer = 'X';
    state.isOver = false;
    state.moveCount = 0;
    state.winningLine = [];
    resetBoardVisuals();
    clearMessages();
    clearError();
    updateStatus();
  }

  function checkWinner() {
    for (const line of winningLines) {
      const [a, b, c] = line;
      if (
        state.board[a] &&
        state.board[a] === state.board[b] &&
        state.board[a] === state.board[c]
      ) {
        return { winner: state.board[a], line };
      }
    }
    return null;
  }

  function checkDraw() {
    return state.board.every((value) => value !== '');
  }

  function finishGameWithWinner(winner, line) {
    state.isOver = true;
    state.winningLine = line;
    messageElement.textContent = `${winner} 獲勝`;
    highlightWinningLine(line);
    updateStatus();
    disableBoard();
    recordHistoryEntry(`${winner} 獲勝`);
  }

  function finishGameWithDraw() {
    state.isOver = true;
    messageElement.textContent = '平手';
    updateStatus();
    disableBoard();
    recordHistoryEntry('平手');
  }

  function handleCellClick(event) {
    const cell = event.currentTarget;
    const index = Number(cell.dataset.index);
    if (state.isOver) {
      return;
    }
    if (state.board[index]) {
      showError('此格已被佔用');
      return;
    }
    clearError();
    setCellValue(index, state.currentPlayer);
    state.moveCount += 1;

    const result = checkWinner();
    if (result) {
      finishGameWithWinner(result.winner, result.line);
      return;
    }

    if (checkDraw()) {
      finishGameWithDraw();
      return;
    }

    state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
    updateStatus();
  }

  function attachEventListeners() {
    cells.forEach((cell) => {
      cell.addEventListener('click', handleCellClick);
    });

    resetButton.addEventListener('click', () => {
      resetGame();
    });

    historyButton.addEventListener('click', () => {
      openHistoryModal();
    });

    modalCloseButton.addEventListener('click', () => {
      closeHistoryModal();
    });

    modalElement.addEventListener('click', (event) => {
      if (event.target === modalElement) {
        closeHistoryModal();
      }
    });
  }

  function init() {
    updateStatus();
    attachEventListeners();
    closeHistoryModal();
  }

  init();

  window.ticTacToeTestHook = {
    setBoardState(values) {
      resetGame();
      values.forEach((value, index) => {
        if (value === 'X' || value === 'O') {
          setCellValue(index, value);
          state.moveCount += 1;
        }
      });
      updateStatus();
    },
    setCurrentPlayer(player) {
      if (player === 'X' || player === 'O') {
        state.currentPlayer = player;
        state.isOver = false;
        updateStatus();
      }
    },
    forceGameOver(resultText) {
      state.isOver = true;
      messageElement.textContent = resultText;
      updateStatus();
    },
    clearHistory() {
      saveHistory([]);
    },
    getHistory() {
      return loadHistory();
    },
    isBoardInteractive() {
      return cells.some((cell) => !cell.disabled);
    },
  };
})();
