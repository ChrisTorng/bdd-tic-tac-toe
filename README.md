# BDD Tic Tac Toe

以行為驅動開發（BDD）打造的井字遊戲網站，採用中文 Gherkin 規格並以自製的極簡 Cucumber runner 驗證互動流程。網站已設定以 Vercel 佈署，可在 <https://bdd-tic-tac-toe.vercel.app/> 即時體驗。

## 功能總覽

- 🎯 完整遵循 `features/tic_tac_toe.feature` 規格中的互動情境。
- ♻️ 支援 X/O 輪流下子、違規提示、勝利/平手判定與遊戲重設。
- 🧠 記錄最近 5 場對局結果（勝負、步數、完成時間），可於模態窗檢視。
- 🤖 內建人機對戰模式，可選擇玩家或電腦先手，並提供「簡單（隨機）」、「中等（防守優先）」與「困難（最佳策略）」三種難度。
- 🧪 以 Node.js 實作的輕量 BDD runner，自動解析 Gherkin 並執行步驟定義驗證核心邏輯。
- 🚀 透過 GitHub Actions 搭配 Vercel 自動化測試並佈署到 <https://bdd-tic-tac-toe.vercel.app/>。

## 環境需求

- Node.js 18 以上版本
- npm 9 以上版本

## 安裝與開發

```bash
npm install --package-lock-only  # 產生鎖定檔，無需額外套件
```

### 本地預覽

```bash
npm run serve
```

指令會先複製 `public/` 到 `dist/`，再啟動簡易靜態伺服器於 <http://localhost:4173>。

### 行為驅動測試

```bash
npm run test:bdd
```

- 自訂 runner (`scripts/run-bdd.js`) 會解析 Gherkin 規格並執行 `bdd/steps.js` 中的步驟定義。
- 測試直接使用核心邏輯 `GameCore`，驗證勝負判定、違規提示、紀錄維護等行為。

## 專案結構

```
public/                # 靜態網站原始碼
  index.html
  styles.css
  js/
    main.js            # DOM 綁定與事件處理
    game-core.js       # 遊戲狀態與規則
bdd/                   # 輕量 Cucumber runner 與步驟定義
  framework.js
  parseFeature.js
  steps.js
  world.js
features/
  tic_tac_toe.feature  # 中文 Gherkin 規格
scripts/
  build.js             # 將 public/ 複製至 dist/
  serve.js             # 啟動測試/預覽用靜態伺服器
  run-bdd.js           # 執行 BDD 測試
```

## 佈署流程

`.github/workflows/deploy.yml` 會在推送至 `main` 分支時：

1. 安裝依賴並執行 BDD 測試。
2. 產生最新的 `dist/` 靜態檔案。
3. 透過 Vercel CLI 將成果部署至 <https://bdd-tic-tac-toe.vercel.app/>。

使用前請於 GitHub 專案設定下列 Secrets：

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

若需預覽環境，可於 workflow dispatch 時傳入 `preview: true`，部署將改為 Preview。

另有 `.github/workflows/ci.yml` 於 PR 與推送時執行測試，確保規格持續通過。

## 授權

本專案使用 MIT 授權（詳見 [LICENSE](./LICENSE)）。
