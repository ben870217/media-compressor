# ADR-0025：採用 Tailwind CSS 與專案自有語意化 UI 元件

## 狀態

已接受

## 背景

現有介面的 Apple 設計 token、主題規則與 RWD 樣式分散在 `App.jsx` 的 inline style 和 CSS 檔案。專案需要降低版面、間距與 breakpoint 的維護成本，同時保留既有視覺設計、深淺色模式與離線能力。

## 決策

- 導入 Tailwind CSS，使用建置時產生並隨應用程式散布的本機 CSS，不使用 CDN。
- 將既有 `--apple-*` CSS custom properties 作為設計 token 的唯一來源，並在 Tailwind 主題中對應為語意化色彩、字體、間距與斷點。
- 建立專案自有的語意化 UI 元件與 class 組合，例如按鈕、欄位、卡片與頁面版面，集中可重用的狀態與 RWD 規則。
- 不導入 Bootstrap、DaisyUI 或其他主導整體視覺外觀的元件庫。

## 後果

- 樣式維護集中於 token、可重用元件與一致的 responsive utilities；元件不再各自發明間距或 breakpoint。
- Tailwind class 的使用需要 code review 確保仍採用語意化元件，避免 JSX 出現大量重複且難讀的 utility 字串。
- 遷移時需保留既有 735px、580px、480px 的 RWD 行為，並以視覺回歸測試驗證桌面、平板與手機版。
- 所有 CSS 與字型仍在本機 bundle，符合 offline 與 air-gapped 環境要求。
