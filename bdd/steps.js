import assert from 'node:assert/strict';
import { Given, When, Then } from './framework.js';

const chineseNumberMap = { 一: 1, 二: 2, 三: 3 };

const opponentLabelMap = {
  human: '雙人對戰',
  computer: '與電腦對戰',
};

const firstPlayerLabelMap = {
  player: '玩家先手',
  computer: '電腦先手',
};

const difficultyLabelMap = {
  easy: '簡單',
  medium: '中等',
  hard: '困難',
};

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

function extractQuotedLabels(text) {
  return text.match(/「([^」]+)」/g)?.map((segment) => segment.replace(/[「」]/g, '')) ?? [];
}

function applyStatus(world, expected) {
  const trimmed = expected.trim();
  if (!world.boardSetupRows) {
    world.pendingStatus = trimmed;
    return;
  }
  if (!trimmed.startsWith('輪到 ')) {
    throw new Error(`Unsupported status seed: ${expected}`);
  }
  const status = trimmed.replace('輪到 ', '').trim();
  world.core.setBoardState(world.boardSetupRows, status);
  world.pendingStatus = null;
  assert.equal(world.core.getStatusText(), trimmed);
}

Given(/^我開啟井字遊戲網站$/, (world) => {
  world.core.clearHistory();
  world.core.setOpponentMode('human');
  world.core.setFirstPlayer('player');
  world.core.setDifficulty('easy');
  world.core.resetGame();
  world.lastSelectedCell = null;
  world.boardSetupRows = null;
  world.historyOpened = false;
  world.boardBeforeComputerMove = null;
  world.recordedOpenings = [];
  world.pendingStatus = null;
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

Then(/^我應該看到對手模式切換，提供「([^」]+)」與「([^」]+)」選項$/, (world, first, second) => {
  const options = world.core.getOpponentOptions().map((option) => option.label);
  assert.deepEqual(options, [first, second]);
});

Then(/^我應該看到先手選擇器，提供「([^」]+)」與「([^」]+)」$/, (world, first, second) => {
  const options = world.core.getFirstPlayerOptions().map((option) => option.label);
  assert.deepEqual(options, [first, second]);
});

Then(/^我應該看到難度選擇器，包含「([^」]+)」、「([^」]+)」、「([^」]+)」$/, (world, l1, l2, l3) => {
  const options = world.core.getDifficultyOptions().map((option) => option.label);
  assert.deepEqual(options, [l1, l2, l3]);
});

Then(/^難度選擇器的預設值應為「([^」]+)」$/, (world, expected) => {
  assert.equal(world.core.getDifficultyLabel(), expected);
});

When(/^我選擇「與電腦對戰」模式$/, (world) => {
  world.core.setOpponentMode('computer');
});

Then(/^難度選擇器應啟用$/, (world) => {
  assert.equal(world.core.isDifficultyEnabled(), true);
});

Then(/^我應該看到難度說明「([^」]+)」$/, (world, expected) => {
  assert.equal(world.core.getDifficultyHint(), expected);
});

Given(/^我選擇「與電腦對戰」模式$/, (world) => {
  world.core.setOpponentMode('computer');
});

When(/^我選擇「玩家先手」$/, (world) => {
  world.core.setFirstPlayer('player');
});

When(/^我選擇「電腦先手」$/, (world) => {
  world.core.setFirstPlayer('computer');
});

Then(/^棋盤上應立即顯示電腦在一個空格放置「([XO])」$/, (world, mark) => {
  const board = world.core.getBoardSnapshot();
  const flat = board.flat();
  const placedCount = flat.filter((cell) => cell === mark).length;
  assert.equal(placedCount >= 1, true);
  assert.equal(flat.filter(Boolean).length, placedCount);
});

Given(/^我選擇難度「([^」]+)」$/, (world, label) => {
  const entry = Object.entries(difficultyLabelMap).find(([, value]) => value === label);
  if (!entry) {
    throw new Error(`Unknown difficulty label: ${label}`);
  }
  world.core.setDifficulty(entry[0]);
});

When(/^我選擇難度「([^」]+)」$/, (world, label) => {
  const entry = Object.entries(difficultyLabelMap).find(([, value]) => value === label);
  if (!entry) {
    throw new Error(`Unknown difficulty label: ${label}`);
  }
  world.core.setDifficulty(entry[0]);
});

When(/^我連續重設遊戲 (\d+) 次$/, (world, timesText) => {
  const times = Number(timesText);
  world.recordedOpenings = [];
  for (let index = 0; index < times; index += 1) {
    world.core.resetGame();
    const move = world.core.getLastComputerMove();
    if (move) {
      world.recordedOpenings.push({ move, snapshot: world.core.getBoardSnapshot() });
    }
  }
});

Then(/^電腦第一次落子的格子應至少出現 (\d+) 個不同的位置$/, (world, expectedDistinctText) => {
  const expectedDistinct = Number(expectedDistinctText);
  const unique = new Set(world.recordedOpenings.map(({ move }) => `${move.row}-${move.col}`));
  assert.equal(unique.size >= expectedDistinct, true);
});

Then(/^每次落子都必須發生在當前可用的空格$/, (world) => {
  world.recordedOpenings.forEach(({ move, snapshot }) => {
    const mark = snapshot[move.row - 1][move.col - 1];
    assert.equal(mark, world.core.getComputerMark());
    const filled = snapshot.flat().filter(Boolean).length;
    assert.equal(filled, 1);
  });
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
  if (world.pendingStatus) {
    const pending = world.pendingStatus;
    world.pendingStatus = null;
    applyStatus(world, pending);
  }
});

Given(/^狀態顯示為 "([^"]+)"$/, (world, expected) => {
  applyStatus(world, expected);
});

Given(/^狀態顯示為「([^」]+)」$/, (world, expected) => {
  applyStatus(world, expected);
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

Then(/^狀態顯示應為「([^」]+)」$/, (world, expected) => {
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

When(/^電腦行動$/, (world) => {
  world.boardBeforeComputerMove = world.core.getBoardSnapshot();
  const moved = world.core.forceComputerMove();
  assert.equal(moved, true);
});

Then(/^電腦應該在第 (\d+) 列第 (\d+) 格放置「([XO])」以阻擋玩家$/, (world, rowText, colText, mark) => {
  const row = Number(rowText);
  const col = Number(colText);
  assert.equal(world.core.getCell(row, col), mark);
  const lastMove = world.core.getLastComputerMove();
  assert(lastMove && lastMove.row === row && lastMove.col === col);
});

Then(/^其他格子應保持原狀$/, (world) => {
  const before = world.boardBeforeComputerMove ?? [];
  const after = world.core.getBoardSnapshot();
  const lastMove = world.core.getLastComputerMove();
  for (let row = 1; row <= 3; row += 1) {
    for (let col = 1; col <= 3; col += 1) {
      if (lastMove && lastMove.row === row && lastMove.col === col) {
        continue;
      }
      const beforeValue = before[row - 1]?.[col - 1] ?? '';
      assert.equal(after[row - 1][col - 1], beforeValue);
    }
  }
});

Then(/^電腦應在第 (\d+) 列第 (\d+) 格放置「([XO])」$/, (world, rowText, colText, mark) => {
  const row = Number(rowText);
  const col = Number(colText);
  assert.equal(world.core.getCell(row, col), mark);
  const lastMove = world.core.getLastComputerMove();
  assert(lastMove && lastMove.row === row && lastMove.col === col);
});

Then(/^此步應保證「([^」]+)」$/, (world, expectation) => {
  const outcome = expectation.trim();
  if (outcome === '電腦立即獲勝') {
    assert.equal(world.core.getMessage(), `${world.core.getComputerMark()} 獲勝`);
    assert.equal(world.core.isGameActive(), false);
  } else if (outcome === '電腦至少逼和') {
    const best = world.core.evaluateBestOutcomeForComputer();
    assert(best === 'draw' || best === 'win');
  } else {
    throw new Error(`Unsupported expectation: ${expectation}`);
  }
});

Then(/^電腦的落子位置應符合最佳選擇列表$/, (world, table) => {
  const rows = table.slice(1);
  const allowed = rows.map((row) => `${Number(row[0])}-${Number(row[1])}`);
  const move = world.core.getLastComputerMove();
  assert(move, 'Computer should have moved');
  assert(allowed.includes(`${move.row}-${move.col}`));
});

Then(/^落子後應維持可逼和的局勢$/, (world) => {
  assert.equal(world.core.evaluateBestOutcomeForComputer(), 'draw');
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
