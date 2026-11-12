# 記憶撲克牌遊戲 - 項目文檔

## 項目概述
這是一個記憶配對撲克牌遊戲，使用純 HTML、CSS 和 JavaScript 開發。

## 文件結構
```
memory-card-game/
├── index.html    # 主頁面
├── style.css     # 樣式文件
├── main.js       # 遊戲邏輯
└── CLAUDE.md     # 本文檔
```

## 已實現的功能

### 1. 基本遊戲功能
- 4x4 卡片網格佈局
- 卡片翻轉效果（3D 翻轉動畫）
- 配對邏輯檢測
- 步數和配對數統計
- 重新開始按鈕

### 2. 視覺特效 ✨
實現位置：`style.css:167-232`、`main.js:170-180`

#### 點擊卡片時的組合特效：
- **波紋擴散效果**：從點擊位置產生涟漪向外擴散（0.6秒動畫）
- **縮放彈跳效果**：卡片先縮小到 0.9 → 放大到 1.05 → 回到 1.0（0.4秒動畫）

#### 配對成功時的特效：
- **綠色發光脈冲**：卡片周圍產生綠色光暈（box-shadow 動畫，0.8秒）
- **背景閃爍效果**：卡片背景短暫變成淡綠色（#d1fae5）

### 3. 音效系統 🔊
實現位置：`main.js:26-94`

使用 Web Audio API 生成音效（無需外部音頻文件）：

#### 鳥叫音效（點擊卡片）
- 類型：正弦波（sine wave）
- 音調：800Hz → 1200Hz → 900Hz（模擬鳥叫的音調變化）
- 持續時間：0.15秒
- 音量：0.3（溫和不刺耳）

#### 爆炸音效（配對成功）
- 組合音效：
  - **低頻轟鳴**：鋸齒波 100Hz → 50Hz（0.5秒）
  - **白噪音**：隨機噪音模擬爆炸的嘶嘶聲
- 音量：0.5（主音）+ 0.3（噪音）

#### 音效初始化
- 自動處理瀏覽器音頻權限限制
- 首次點擊頁面時自動恢復 AudioContext

## 關鍵代碼位置

### CSS 動畫
- 波紋效果：`.ripple` + `@keyframes ripple-animation`
- 彈跳效果：`.click-bounce` + `@keyframes bounce-scale`
- 發光效果：`.match-glow` + `@keyframes glow-pulse`
- 閃爍效果：`.match-flash` + `@keyframes flash-bg`

### JavaScript 函數
- `onCardClick()` - 處理卡片點擊、播放鳥叫音效、觸發視覺特效
- `createRipple()` - 生成波紋效果元素
- `handleMatch()` - 處理配對成功、播放爆炸音效、觸發特效
- `playBirdSound()` - 生成鳥叫音效
- `playExplosionSound()` - 生成爆炸音效

## 技術細節

### 特效實現要點
1. **波紋效果**：動態創建 `<span>` 元素，使用絕對定位和 transform
2. **彈跳動畫**：使用 CSS animation，通過 scale 變換實現
3. **音效生成**：Web Audio API 的 OscillatorNode 和 BufferSource
4. **3D 翻轉**：CSS `transform-style: preserve-3d` + `backface-visibility`

### 瀏覽器兼容性
- 需要支持 Web Audio API（現代瀏覽器均支持）
- CSS 動畫使用標準語法（無需前綴）
- 使用 `window.AudioContext || window.webkitAudioContext` 處理 Safari

## 未來可擴展功能建議
- [ ] 難度選擇（調整卡片數量）
- [ ] 計時器功能
- [ ] 最佳成績記錄（localStorage）
- [ ] 更多音效選項或靜音按鈕
- [ ] 不同主題或卡片圖案
- [ ] 勝利時的粒子爆炸效果

## 開發記錄
- 2026-02-07: 添加視覺特效（波紋、彈跳、發光、閃爍）
- 2026-02-07: 添加音效系統（鳥叫聲、爆炸聲）
