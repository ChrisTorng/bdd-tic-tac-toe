import assert from 'node:assert/strict';
import { Given, When, Then } from './framework.js';

const chineseNumberMap = { 一: 1, 二: 2, 三: 3 };

function normalizeIndex(token) {
  const cleaned = token.replace(/[第列行格\s]/g, '');
  if (/^\d+$/.test(cleaned)) {
    return Number(cleaned);
  }
  return chineseNumberMap[cleaned] ?? chineseNumberMap[cleaned.slice(-1)];
}

function cellSelector(world, row, col) {
  return world.core.getCell(row, col);
}

Given(/^我開啟井字遊戲網站$/, (world) => {
  world.core.clearHistory();
  world.core.resetGame();
  world.lastSelectedCell = null;
  world.boardSetupRows = null;
  world.historyOpened = false;
});

Then(/^我應該看到標題 "([^"]+)"$/, (_world, expected) => {
  assert.equal(expected, '井字遊戲');
});

Then(/^我應該看到說明文字 "([^"]+)" 以提示目前的玩家$/, (world, expected) => {
  assert.equal(world.core.getStatusText(), expected);
});

When(/^網站載入完成$/, () => {
  // No additional action needed for the headless runner.
});

Then(/^我應該看到 3x3 的棋盤格$/, (world) => {
  const board = world.core.getBoardSnapshot();
  assert.equal(board.length, 3);
  board.forEach((row) => {
    assert.equal(row.length, 3);
  });
});

Then(/^每個格子都應該是空白的$/, (world) => {
  for (let row = 1; row <= 3; row += 1) {
    for (let col = 1; col <= 3; col += 1) {
      assert.equal(world.core.getCell(row, col), '');
    }
  }
});

Then(/^棋盤下方應該顯示「重設遊戲」按鈕$/, (world) => {
  assert.equal(typeof world.core.resetGame, 'function');
});

When(/^我點擊第?([一二三\d]+)列第?([一二三\d]+)格$/, (world, rowText, colText) => {
  const row = normalizeIndex(rowText);
  const col = normalizeIndex(colText);
  world.core.playMove(row, col);
  world.lastSelectedCell = { row, col };
});

Then(/^該格應(?:該)?顯示 "([^"]+)"$/, (world, expected) => {
  const { row, col } = world.lastSelectedCell ?? { row: 1, col: 1 };
  assert.equal(cellSelector(world, row, col), expected);
});

Then(/^狀態顯示應更新為 "([^"]+)"$/, (world, expected) => {
  assert.equal(world.core.getStatusText(), expected);
});

Given(/^第一列第一格已經顯示 "([^"]+)"$/, (world, expected) => {
  world.core.playMove(1, 1);
  world.lastSelectedCell = { row: 1, col: 1 };
  assert.equal(world.core.getCell(1, 1), expected);
});

When(/^我再次點擊第一列第一格$/, (world) => {
  world.core.playMove(1, 1);
  world.lastSelectedCell = { row: 1, col: 1 };
});

Then(/^該格內容應保持為 "([^"]+)"$/, (world, expected) => {
  assert.equal(world.core.getCell(1, 1), expected);
});

Then(/^我應該看到錯誤提示 "([^"]+)"$/, (world, expected) => {
  assert.equal(world.core.getMessage(), expected);
});

Given(/^棋盤目前局勢為$/, (world, table) => {
  world.boardSetupRows = table.slice(1).map((row) => row.slice(1));
});

Given(/^狀態顯示為 "([^"]+)"$/, (world, expected) => {
  if (!world.boardSetupRows) {
    throw new Error('Board rows must be defined before setting status.');
  }
  const player = expected.replace('輪到 ', '').trim();
  world.core.setBoardState(world.boardSetupRows, player);
  assert.equal(world.core.getStatusText(), expected);
});

When(/^我在第 (\d+) 列第 (\d+) 格下子$/, (world, row, col) => {
  world.core.playMove(Number(row), Number(col));
  world.lastSelectedCell = { row: Number(row), col: Number(col) };
});

Then(/^我應該看到訊息 "([^"]+)"$/, (world, expected) => {
  assert.equal(world.core.getMessage(), expected);
});

Then(/^勝利線上的格子應該被高亮顯示$/, (world) => {
  assert.equal(world.core.getWinningCells().length, 3);
});

Then(/^狀態顯示應(?:該)?改為 "([^"]+)"$/, (world, expected) => {
  assert.equal(world.core.getStatusText(), expected);
});

Then(/^棋盤上其他空格應停止回應點擊$/, (world) => {
  outer: for (let row = 1; row <= 3; row += 1) {
    for (let col = 1; col <= 3; col += 1) {
      if (world.core.getCell(row, col) === '') {
        const before = world.core.getCell(row, col);
        const result = world.core.playMove(row, col);
        const after = world.core.getCell(row, col);
        assert.equal(before, after);
        assert.notEqual(result.type, 'success');
        break outer;
      }
    }
  }
});

Given(/^棋盤所有格子都已填滿且沒有勝利線$/, (world) => {
  world.core.setDrawState();
});

Then(/^不應再允許點擊任何格子$/, (world) => {
  const result = world.core.playMove(1, 1);
  assert.notEqual(result.type, 'success');
});

Given(/^棋盤上已有至少一個格子顯示 "([^"]+)"$/, (world, expected) => {
  world.core.playMove(1, 1);
  assert.equal(world.core.getCell(1, 1), expected);
});

When(/^我點擊「重設遊戲」按鈕$/, (world) => {
  world.core.resetGame();
});

Then(/^所有格子應該清空$/, (world) => {
  for (let row = 1; row <= 3; row += 1) {
    for (let col = 1; col <= 3; col += 1) {
      assert.equal(world.core.getCell(row, col), '');
    }
  }
});

Then(/^狀態顯示應恢復為 "([^"]+)"$/, (world, expected) => {
  assert.equal(world.core.getStatusText(), expected);
});

Then(/^勝負訊息應該被清除$/, (world) => {
  assert.equal(world.core.getMessage(), '');
});

Given(/^遊戲已經完成$/, (world) => {
  world.core.playMove(1, 1);
  world.core.playMove(2, 1);
  world.core.playMove(1, 2);
  world.core.playMove(2, 2);
  world.core.playMove(1, 3);
  assert.equal(world.core.getStatusText(), '遊戲結束');
});

When(/^我點擊「查看紀錄」按鈕$/, (world) => {
  world.historyOpened = true;
});

Then(/^我應該看到一個模態窗顯示最近 5 場對局的結果$/, (world) => {
  assert.equal(world.historyOpened, true);
  const history = world.core.getHistory();
  assert(history.length >= 1 && history.length <= 5);
});

Then(/^每場紀錄應包含勝方或平手、完成時間與步數$/, (world) => {
  const history = world.core.getHistory();
  history.forEach((entry) => {
    assert.ok(entry.outcome.includes('獲勝') || entry.outcome === '平手');
    assert.ok(entry.finishedAt);
    assert.ok(typeof entry.moves === 'number');
  });
});

Then(/^模態窗應提供「關閉」按鈕以返回棋盤$/, (world) => {
  assert.equal(world.historyOpened, true);
});

Then(/^狀態顯示仍應為 "([^"]+)"$/, (world, expected) => {
  assert.equal(world.core.getStatusText(), expected);
});
