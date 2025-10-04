import { GameCore } from './game-core.js';

const statusElement = document.querySelector('[data-testid="status"]');
const messageElement = document.querySelector('[data-testid="message"]');
const cellElements = Array.from(document.querySelectorAll('[data-cell]'));
const resetButton = document.querySelector('#reset-button');
const historyButton = document.querySelector('#history-button');
const historyModal = document.querySelector('#history-modal');
const historyList = document.querySelector('#history-list');
const closeHistoryButton = document.querySelector('#close-history');

const core = new GameCore({ storage: window.localStorage });

function selectorToTuple(selector) {
  const [row, col] = selector.split('-').map((value) => Number(value));
  return [row, col];
}

function renderMessage() {
  const message = core.getMessage();
  messageElement.textContent = message;
  const type = core.getMessageType();
  if (type === 'error') {
    messageElement.style.color = '#d93025';
  } else if (type === 'success') {
    messageElement.style.color = '#1a73e8';
  } else {
    messageElement.style.color = '#444';
  }
}

function renderBoard() {
  const winning = new Set(core.getWinningCells());
  cellElements.forEach((cell) => {
    const [row, col] = selectorToTuple(cell.dataset.cell);
    const value = core.getCell(row, col);
    cell.textContent = value;
    if (winning.has(cell.dataset.cell)) {
      cell.classList.add('win');
    } else {
      cell.classList.remove('win');
    }
    if (core.isGameActive()) {
      cell.classList.remove('disabled');
      cell.disabled = false;
    } else {
      cell.classList.add('disabled');
      cell.disabled = true;
    }
  });
}

function renderStatus() {
  statusElement.textContent = core.getStatusText();
}

function renderHistoryList() {
  historyList.innerHTML = '';
  const history = core.getHistory();
  if (history.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = '尚無對局紀錄';
    historyList.appendChild(emptyItem);
    return;
  }
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  history.forEach((entry) => {
    const item = document.createElement('li');
    const formattedDate = formatter.format(new Date(entry.finishedAt));
    item.textContent = `${entry.outcome} · 完成時間：${formattedDate} · 步數：${entry.moves}`;
    historyList.appendChild(item);
  });
}

function openHistoryModal() {
  renderHistoryList();
  historyModal.classList.remove('hidden');
  closeHistoryButton.focus();
}

function closeHistoryModal() {
  historyModal.classList.add('hidden');
  historyButton.focus();
}

function render() {
  renderStatus();
  renderMessage();
  renderBoard();
}

function handleCellClick(event) {
  const cell = event.currentTarget;
  const [row, col] = selectorToTuple(cell.dataset.cell);
  core.playMove(row, col);
  render();
}

function handleReset() {
  core.resetGame();
  render();
}

function attachListeners() {
  cellElements.forEach((cell) => {
    cell.addEventListener('click', handleCellClick);
  });
  resetButton.addEventListener('click', handleReset);
  historyButton.addEventListener('click', openHistoryModal);
  closeHistoryButton.addEventListener('click', closeHistoryModal);
  historyModal.addEventListener('click', (event) => {
    if (event.target === historyModal) {
      closeHistoryModal();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !historyModal.classList.contains('hidden')) {
      closeHistoryModal();
    }
  });
}

function boot() {
  render();
  attachListeners();
}

boot();

if (typeof window !== 'undefined') {
  window.__test__ = {
    core,
    setBoardState(rows, player) {
      core.setBoardState(rows, player);
      render();
    },
    setDrawState(pattern) {
      core.setDrawState(pattern);
      render();
    },
    resetGame() {
      core.resetGame();
      render();
    },
    clearHistory() {
      core.clearHistory();
      render();
    },
  };
}
