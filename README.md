# bdd-tic-tac-toe

以 BDD 驅動開發的井字遊戲專案，採用 Cucumber/Gherkin 規格驅動自動化驗收測試，並部署於 GitHub Pages。

## 專案結構

```
├── features/              # Gherkin 規格與步驟定義
├── scripts/               # 構建與維運腳本
├── web/                   # 靜態網站原始碼
├── dist/                  # `npm run build` 產出（部署用）
├── package.json
├── cucumber.js
└── README.md
```

## 開發環境需求

- Node.js 18 或更新版本（建議 20 LTS）
- npm 9+

## 安裝依賴

```bash
npm install
```

## 執行 BDD 驗收測試

專案使用 [Cucumber.js](https://github.com/cucumber/cucumber-js) 驅動自動化測試：

```bash
npm test
```

測試會透過 JSDOM 載入 `web/index.html`，模擬玩家操作並驗證所有 Gherkin 規格。

## 建置靜態網站

```bash
npm run build
```

指令會清空 `dist/`，並將 `web/` 內容複製到 `dist/`，作為 GitHub Pages 的部署成品。

## 本地預覽

建置後，可使用任何靜態伺服器（如 `npx serve dist` 或 IDE Live Server）預覽 `dist/index.html`。

## GitHub Actions 與 Pages

- `.github/workflows/pages.yml`：
  - 在 `main` 分支上觸發 CI 流程。
  - 執行 `npm test` 確保所有 BDD 規格通過。
  - 建置 `dist/` 並透過官方 `deploy-pages` Action 發佈到 GitHub Pages。
- 線上網址：https://christorng.github.io/bdd-tic-tac-toe/

## 授權條款

本專案採用 [MIT License](LICENSE)。
