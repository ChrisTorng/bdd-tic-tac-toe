import { GameCore } from '../public/js/game-core.js';

export function createWorld() {
  let timestamp = Date.now();
  const nowProvider = () => {
    const current = new Date(timestamp);
    timestamp += 1000;
    return current;
  };

  return {
    core: new GameCore({ nowProvider }),
    lastSelectedCell: null,
    boardSetupRows: null,
    historyOpened: false,
    computerOpeningMoves: [],
    lastComputerMove: null,
    pendingStatusText: null,
  };
}
