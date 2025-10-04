const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const ORDINAL_MAP = {
  第一: 1,
  第二: 2,
  第三: 3,
  一: 1,
  二: 2,
  三: 3,
};

function parseOrdinal(value) {
  if (ORDINAL_MAP[value]) {
    return ORDINAL_MAP[value];
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }
  throw new Error(`無法解析序數: ${value}`);
}

function parseCellExpression(expression) {
  const match = expression.match(/第([一二三\d]+)列第([一二三\d]+)格/);
  if (!match) {
    throw new Error(`無法解析座標: ${expression}`);
  }
  const row = parseOrdinal(match[1]);
  const col = parseOrdinal(match[2]);
  return { row, col };
}

function normalizeCellValue(value) {
  const trimmed = value.trim();
  if (trimmed === '空白') {
    return '';
  }
  return trimmed;
}

Given('我開啟井字遊戲網站', async function () {
  await this.openApp();
});

When('網站載入完成', async function () {
  await this.ensureAppReady();
});

Then('我應該看到標題 {string}', function (title) {
  const heading = this.document.querySelector('h1');
  expect(heading).to.not.be.null;
  expect(heading.textContent.trim()).to.equal(title);
});

Then('我應該看到說明文字 {string} 以提示目前的玩家', function (text) {
  const status = this.document.querySelector('[data-status]');
  expect(status.textContent.trim()).to.equal(text);
});

Then('我應該看到 3x3 的棋盤格', function () {
  expect(this.getCells()).to.have.length(9);
});

Then('每個格子都應該是空白的', function () {
  this.getCells().forEach((cell) => {
    expect(cell.textContent.trim()).to.equal('');
  });
});

Then('棋盤下方應該顯示「重設遊戲」按鈕', function () {
  const button = this.getResetButton();
  expect(button).to.not.be.null;
  expect(button.textContent.trim()).to.equal('重設遊戲');
});

When(/我點擊第([一二三\d]+)列第([一二三\d]+)格/, async function (rowText, colText) {
  const row = parseOrdinal(rowText);
  const col = parseOrdinal(colText);
  await this.clickCell(row, col);
});

Then('該格應該顯示 {string}', function (value) {
  const target = this.lastClickedCell || { row: 1, col: 1 };
  const cell = this.getCellByRowCol(target.row, target.col);
  expect(cell.textContent.trim()).to.equal(value);
});

Then('該格應顯示 {string}', function (value) {
  const target = this.lastClickedCell || { row: 1, col: 1 };
  const cell = this.getCellByRowCol(target.row, target.col);
  expect(cell.textContent.trim()).to.equal(value);
});

Then('狀態顯示應更新為 {string}', function (expected) {
  expect(this.getStatusText()).to.equal(expected);
});

Given('{string} 已經顯示在 {string}', async function (value, expression) {
  const { row, col } = parseCellExpression(expression);
  const cell = this.getCellByRowCol(row, col);
  if (cell.textContent.trim() !== value) {
    await this.clickCell(row, col);
  }
  expect(cell.textContent.trim()).to.equal(value);
});

Given('第一列第一格已經顯示 {string}', async function (value) {
  await this.clickCell(1, 1);
  const cell = this.getCellByRowCol(1, 1);
  expect(cell.textContent.trim()).to.equal(value);
});

When(/我再次點擊第([一二三\d]+)列第([一二三\d]+)格/, async function (rowText, colText) {
  const row = parseOrdinal(rowText);
  const col = parseOrdinal(colText);
  await this.clickCell(row, col);
});

Then('該格內容應保持為 {string}', function (expected) {
  const cell = this.getCellByRowCol(1, 1);
  expect(cell.textContent.trim()).to.equal(expected);
});

Then('我應該看到錯誤提示 {string}', function (message) {
  expect(this.getErrorText()).to.equal(message);
});

Then('狀態顯示仍應為 {string}', function (expected) {
  expect(this.getStatusText()).to.equal(expected);
});

Given('棋盤目前局勢為', async function (dataTable) {
  const rows = dataTable.hashes();
  const values = [];
  rows.forEach((row) => {
    values.push(normalizeCellValue(row['行1']));
    values.push(normalizeCellValue(row['行2']));
    values.push(normalizeCellValue(row['行3']));
  });
  this.window.ticTacToeTestHook.setBoardState(values);
  await this.waitForNextTick();
});

Given('狀態顯示為 {string}', async function (expected) {
  const match = expected.match(/輪到\s([XO])/);
  if (match) {
    this.window.ticTacToeTestHook.setCurrentPlayer(match[1]);
    await this.waitForNextTick();
  }
  expect(this.getStatusText()).to.equal(expected);
});

When('我在第 {int} 列第 {int} 格下子', async function (row, col) {
  await this.clickCell(row, col);
});

Then('我應該看到訊息 {string}', function (expected) {
  expect(this.getMessageText()).to.equal(expected);
});

Then('勝利線上的格子應該被高亮顯示', function () {
  const highlighted = this.getCells().filter((cell) => cell.classList.contains('win'));
  expect(highlighted.length).to.be.at.least(3);
  highlighted.forEach((cell) => {
    expect(['X', 'O']).to.include(cell.textContent.trim());
  });
});

Then('狀態顯示應該改為 {string}', function (expected) {
  expect(this.getStatusText()).to.equal(expected);
});

Then('狀態顯示應改為 {string}', function (expected) {
  expect(this.getStatusText()).to.equal(expected);
});

Then('棋盤上其他空格應停止回應點擊', async function () {
  const cells = this.getCells();
  cells.forEach((cell) => {
    expect(cell.disabled).to.be.true;
  });
});

Given('棋盤所有格子都已填滿且沒有勝利線', async function () {
  const sequence = [
    [1, 1],
    [1, 2],
    [1, 3],
    [2, 1],
    [2, 3],
    [2, 2],
    [3, 1],
    [3, 3],
    [3, 2],
  ];
  for (const [row, col] of sequence) {
    await this.clickCell(row, col);
  }
});

Then('不應再允許點擊任何格子', function () {
  this.getCells().forEach((cell) => {
    expect(cell.disabled).to.be.true;
  });
});

Given('棋盤上已有至少一個格子顯示 {string}', async function (value) {
  if (this.getCellByRowCol(1, 1).textContent.trim() !== value) {
    await this.clickCell(1, 1);
  }
});

When('我點擊「重設遊戲」按鈕', async function () {
  this.getResetButton().click();
  await this.waitForNextTick();
});

Then('所有格子應該清空', function () {
  this.getCells().forEach((cell) => {
    expect(cell.textContent.trim()).to.equal('');
  });
});

Then('狀態顯示應恢復為 {string}', function (expected) {
  expect(this.getStatusText()).to.equal(expected);
});

Then('勝負訊息應該被清除', function () {
  expect(this.getMessageText()).to.equal('');
});

Given('遊戲已經完成', async function () {
  const sequence = [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
    [1, 3],
  ];
  for (const [row, col] of sequence) {
    await this.clickCell(row, col);
  }
  expect(this.getMessageText()).to.match(/[XO] 獲勝|平手/);
});

When('我點擊「查看紀錄」按鈕', async function () {
  this.getHistoryButton().click();
  await this.waitForNextTick();
});

Then('我應該看到一個模態窗顯示最近 5 場對局的結果', function () {
  const modal = this.getModal();
  expect(modal.dataset.visible).to.equal('true');
  const items = this.getHistoryItems();
  expect(items.length).to.be.greaterThan(0);
  expect(items.length).to.be.at.most(5);
});

Then('每場紀錄應包含勝方或平手、完成時間與步數', function () {
  const items = this.getHistoryItems();
  items.forEach((item) => {
    const title = item.querySelector('.history-item__title').textContent.trim();
    const meta = item.querySelector('.history-item__meta').textContent.trim();
    expect(title).to.match(/(X|O) 獲勝|平手/);
    expect(meta).to.include('步數');
    expect(meta).to.include('完成時間');
  });
});

Then('模態窗應提供「關閉」按鈕以返回棋盤', function () {
  const button = this.document.querySelector('[data-close-history]');
  expect(button).to.not.be.null;
  expect(button.textContent.trim()).to.equal('關閉');
});
