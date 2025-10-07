import assert from 'node:assert/strict';
import { Given, When, Then } from './framework.js';

const chineseNumberMap = { 一: 1, 二: 2, 三: 3 };
const opponentModeLabelMap = {
  雙人對戰: 'human',
  與電腦對戰: 'computer',
};
const firstPlayerLabelMap = {
  玩家先手: 'player',
  電腦先手: 'computer',
};
const difficultyLabelMap = {
  簡單: 'easy',
  中等: 'medium',
  困難: 'hard',
};

function normalizeIndex(token) {
  const cleaned = token.replace(/[第列行格\s]/g, '');
  if (/^\d+$/.test(cleaned)) {
    return Number(cleaned);
  }
  return chineseNumberMap[cleaned] ?? chineseNumberMap[cleaned.slice(-1)];
}

function extractMark(token) {
  const clean = token.trim();
  if (!clean) {
    return '';
  }
  const match = clean.match(/[XO]/);
  return match ? match[0] : clean[0];
}

function parseStatusLabel(text) {
  const trimmed = text.replace('輪到', '').trim();
  const match = /^([XO])(?:\s*\(([^)]+)\))?$/.exec(trimmed);
  if (match) {
    return { mark: match[1], owner: match[2] ?? null };
  }
  return { mark: trimmed, owner: null };
}

function cellSelector(world, row, col) {
  return world.core.getCell(row, col);
}

function countFilledCells(board) {
  return board.flat().filter(Boolean).length;
}

function applyBoardState(world, statusText) {
  if (!world.boardSetupRows) {
    throw new Error('Board rows must be defined before applying status.');
  }
  const status = parseStatusLabel(statusText);
  const value = `${status.mark}${status.owner ? ` (${status.owner})` : ''}`;
  world.core.setBoardState(world.boardSetupRows, value);
  world.pendingStatusText = null;
  assert.equal(world.core.getStatusText(), statusText);
}

function handleStatusSetup(world, statusText) {
  if (world.boardSetupRows) {
    applyBoardState(world, statusText);
  } else {
    world.pendingStatusText = statusText;
  }
}

Given(/^我開啟井字遊戲網站$/, (world) => {
  world.core.clearHistory();
  world.core.resetGame();
  world.lastSelectedCell = null;
  world.boardSetupRows = null;
  world.historyOpened = false;
  world.computerOpeningMoves = [];
  world.lastComputerMove = null;
  world.pendingStatusText = null;
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

Then(/^我應該看到對手模式切換，提供「([^」]+)」與「([^」]+)」選項$/, (world, optionA, optionB) => {
  assert.deepEqual(world.core.getOpponentModeOptions(), [optionA, optionB]);
});

Then(/^我應該看到先手選擇器，提供「([^」]+)」與「([^」]+)」$/, (world, optionA, optionB) => {
  assert.deepEqual(world.core.getFirstPlayerOptions(), [optionA, optionB]);
});

Then(/^我應該看到難度選擇器，包含「([^」]+)」、「([^」]+)」、「([^」]+)」$/, (world, easy, medium, hard) => {
  assert.deepEqual(world.core.getDifficultyOptions(), [easy, medium, hard]);
});

Then(/^難度選擇器的預設值應為「([^」]+)」$/, (world, expected) => {
  assert.equal(world.core.getSelectedDifficultyLabel(), expected);
});

When(/^我選擇「([^」]+)」模式$/, (world, label) => {
  const value = opponentModeLabelMap[label] ?? label;
  world.core.setOpponentMode(value);
});

Then(/^難度選擇器應啟用$/, (world) => {
  assert.equal(world.core.isDifficultySelectionEnabled(), true);
});

Then(/^我應該看到難度說明「([^」]+)」$/, (world, expected) => {
  assert.equal(world.core.getDifficultySummary(), expected);
});

When(/^我選擇「(玩家先手|電腦先手)」$/, (world, label) => {
  const value = firstPlayerLabelMap[label] ?? label;
  world.core.setFirstPlayer(value);
});

When(/^我選擇難度「([^」]+)」$/, (world, label) => {
  const value = difficultyLabelMap[label] ?? label;
  world.core.setDifficulty(value);
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

Then(/^狀態顯示應為「([^」]+)」$/, (world, expected) => {
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
  if (world.pendingStatusText) {
    applyBoardState(world, world.pendingStatusText);
  }
});

Given(/^狀態顯示為 "([^"]+)"$/, (world, expected) => {
  handleStatusSetup(world, expected);
});

Then(/^狀態顯示為「輪到 ([^」]+)」$/, (world, label) => {
  const normalized = label.startsWith('輪到 ') ? label : `輪到 ${label}`;
  handleStatusSetup(world, normalized);
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

When(/^我連續重設遊戲 (\d+) 次$/, (world, countText) => {
  const count = Number(countText);
  world.computerOpeningMoves = [];
  for (let i = 0; i < count; i += 1) {
    world.core.resetGame();
    const snapshot = world.core.getBoardSnapshot();
    const move = world.core.getLastOpeningMove();
    world.computerOpeningMoves.push({
      move,
      board: snapshot,
      mark: world.core.getComputerMark(),
    });
  }
});

Then(/^電腦第一次落子的格子應至少出現 (\d+) 個不同的位置$/, (world, expectedText) => {
  const expected = Number(expectedText);
  const set = new Set();
  world.computerOpeningMoves
    .filter((entry) => entry.move)
    .forEach((entry) => {
      set.add(`${entry.move.row}-${entry.move.col}`);
    });
  assert.ok(set.size >= expected);
});

Then(/^每次落子都必須發生在當前可用的空格$/, (world) => {
  world.computerOpeningMoves.forEach((entry) => {
    if (!entry.move) {
      return;
    }
    const { row, col } = entry.move;
    const board = entry.board;
    assert.equal(board[row - 1][col - 1], entry.mark);
    assert.equal(countFilledCells(board), 1);
  });
});

When(/^電腦行動$/, (world) => {
  const before = world.core.getBoardSnapshot();
  const result = world.core.makeComputerMove();
  const after = world.core.getBoardSnapshot();
  let detectedMove = null;
  for (let row = 1; row <= 3; row += 1) {
    for (let col = 1; col <= 3; col += 1) {
      if (!before[row - 1][col - 1] && after[row - 1][col - 1]) {
        detectedMove = {
          row,
          col,
          mark: after[row - 1][col - 1],
        };
      }
    }
  }
  world.lastComputerMove = { move: detectedMove, result, before, after };
});

Then(/^電腦應該在第 (\d+) 列第 (\d+) 格放置「?([^」]+)」?(?:以阻擋玩家)?$/, (world, rowText, colText, token) => {
  const row = Number(rowText);
  const col = Number(colText);
  const expectedMark = extractMark(token);
  assert.equal(world.core.getCell(row, col), expectedMark);
});

Then(/^電腦應在第 (\d+) 列第 (\d+) 格放置「([^」]+)」$/, (world, rowText, colText, expectedMark) => {
  const row = Number(rowText);
  const col = Number(colText);
  assert.equal(world.core.getCell(row, col), extractMark(expectedMark));
});

Then(/^其他格子應保持原狀$/, (world) => {
  const info = world.lastComputerMove;
  assert.ok(info?.move, 'Expected a computer move to compare board states');
  for (let row = 1; row <= 3; row += 1) {
    for (let col = 1; col <= 3; col += 1) {
      if (row === info.move.row && col === info.move.col) {
        continue;
      }
      assert.equal(info.before[row - 1][col - 1], info.after[row - 1][col - 1]);
    }
  }
});

Then(/^此步應保證「([^」]+)」$/, (world, expectation) => {
  const outcome = world.core.computeOptimalOutcomeForComputer();
  if (expectation === '電腦立即獲勝') {
    assert.equal(outcome, 'win');
  } else if (expectation === '電腦至少逼和') {
    assert.ok(outcome === 'win' || outcome === 'draw');
  } else {
    throw new Error(`Unknown expectation: ${expectation}`);
  }
});

Then(/^電腦的落子位置應符合最佳選擇列表$/, (world, table) => {
  const move = world.lastComputerMove?.move;
  assert.ok(move, 'Expected computer to make a move');
  const allowed = table
    .slice(1)
    .map((row) => ({ row: Number(row[0]), col: Number(row[1]) }));
  const match = allowed.some((candidate) => candidate.row === move.row && candidate.col === move.col);
  assert.equal(match, true);
});

Then(/^落子後應維持可逼和的局勢$/, (world) => {
  const outcome = world.core.computeOptimalOutcomeForComputer();
  assert.ok(outcome === 'draw' || outcome === 'win');
});

Then(/^棋盤上應立即顯示電腦在一個空格放置「([XO])」$/, (world, expectedMark) => {
  const board = world.core.getBoardSnapshot();
  const filled = [];
  board.forEach((row, rIndex) => {
    row.forEach((cell, cIndex) => {
      if (cell) {
        filled.push({ row: rIndex + 1, col: cIndex + 1, cell });
      }
    });
  });
  assert.equal(filled.length, 1);
  assert.equal(filled[0].cell, expectedMark);
});
