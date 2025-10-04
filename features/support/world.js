const path = require('node:path');
const { setWorldConstructor, setDefaultTimeout, After } = require('@cucumber/cucumber');
const { JSDOM } = require('jsdom');

class TicTacToeWorld {
  constructor() {
    this.dom = null;
    this.window = null;
    this.document = null;
    this.lastClickedCell = null;
  }

  async openApp() {
    const filePath = path.join(__dirname, '..', '..', 'web', 'index.html');
    this.dom = await JSDOM.fromFile(filePath, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'https://example.org/',
      pretendToBeVisual: true,
    });

    this.window = this.dom.window;
    this.document = this.window.document;

    await new Promise((resolve) => {
      if (this.document.readyState === 'complete') {
        resolve();
        return;
      }
      this.window.addEventListener('load', () => resolve());
    });

    this.window.localStorage.clear();
    if (this.window.ticTacToeTestHook) {
      this.window.ticTacToeTestHook.clearHistory();
    }
  }

  async ensureAppReady() {
    await this.waitForNextTick();
  }

  async waitForNextTick() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  getCells() {
    return Array.from(this.document.querySelectorAll('[data-cell]'));
  }

  getCellByRowCol(row, col) {
    return this.document.querySelector(
      `[data-cell][data-row="${row}"][data-col="${col}"]`
    );
  }

  async clickCell(row, col) {
    const cell = this.getCellByRowCol(row, col);
    if (!cell) {
      throw new Error(`找不到第 ${row} 列第 ${col} 格`);
    }
    cell.click();
    this.lastClickedCell = { row, col };
    await this.waitForNextTick();
  }

  getStatusText() {
    return this.document.querySelector('[data-status]').textContent.trim();
  }

  getMessageText() {
    return this.document.querySelector('[data-message]').textContent.trim();
  }

  getErrorText() {
    return this.document.querySelector('[data-error]').textContent.trim();
  }

  getResetButton() {
    return this.document.querySelector('[data-reset]');
  }

  getHistoryButton() {
    return this.document.querySelector('[data-history]');
  }

  getModal() {
    return this.document.querySelector('[data-modal]');
  }

  getHistoryItems() {
    return Array.from(this.document.querySelectorAll('[data-history-list] .history-item'));
  }
}

setWorldConstructor(TicTacToeWorld);
setDefaultTimeout(10_000);

After(function () {
  if (this.window) {
    this.window.close();
  }
  this.dom = null;
  this.window = null;
  this.document = null;
  this.lastClickedCell = null;
});
