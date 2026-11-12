// ===== 遊戲設定 =====
const ROWS = 6;
const COLS = 6;
const totalPairs = (ROWS * COLS) / 2; // 36 張 = 18 對（實際排法由 layoutBoard 依螢幕決定）

const boardEl = document.getElementById("board");
const matchesEl = document.getElementById("matches");
const totalPairsEl = document.getElementById("total-pairs");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restart-btn");

let baseCards = [];   // 從 cards.json 讀進來
let deck = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matches = 0;

totalPairsEl.textContent = totalPairs;

// 音效管理器
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// 鳥叫音效
function playBirdSound() {
    const oscillator = audioCtx.createOscillator(); // 音源
    const gainNode = audioCtx.createGain(); // 音量旋鈕

    oscillator.connect(gainNode); //接線
    gainNode.connect(audioCtx.destination); // 接到喇叭

    oscillator.type = 'sine'; // 正弦波

    const now = audioCtx.currentTime;
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.1);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
}

// 爆炸音效
function playExplosionSound() {
    const duration = 0.5;
    const now = audioCtx.currentTime;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, now);
    oscillator.frequency.exponentialRampToValueAtTime(50, now + duration);

    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);

    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = audioCtx.createBufferSource();
    const noiseGain = audioCtx.createGain();

    noiseSource.buffer = buffer;
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.5);

    noiseSource.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    noiseSource.start(now);
}

// ===== 讀取 cards.json =====
async function loadCards() {
    try {
        const res = await fetch("cards.json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        baseCards = await res.json();

        if (baseCards.length < totalPairs) {
            messageEl.textContent = `cards.json 至少需要 ${totalPairs} 筆資料，目前只有 ${baseCards.length} 筆`;
            return false;
        }
        return true;
    } catch (err) {
        console.error(err);
        messageEl.textContent = "讀取 cards.json 失敗，請用本機伺服器（例如 VS Code Live Server）開啟";
        return false;
    }
}

// 洗牌（Fisher-Yates）
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateDeck() {
    // 如果 json 超過 18 筆，每局隨機挑 18 筆
    const picked = shuffle([...baseCards]).slice(0, totalPairs);

    // ★ 每一筆資料產生兩張卡：一張「只有圖片」、一張「只有文字」
    const cards = [];
    picked.forEach((card) => {
        cards.push({ ...card, key: card.Word, type: "picture" });
        cards.push({ ...card, key: card.Word, type: "word" });
    });

    deck = shuffle(cards).map((card, index) => ({ ...card, id: index }));
}

function renderBoard() {
    boardEl.innerHTML = "";
    deck.forEach((card) => {
        const cardEl = document.createElement("div");
        cardEl.classList.add("card");
        cardEl.dataset.key = card.key;
        cardEl.dataset.type = card.type;   // ★ 記錄是圖片卡還是文字卡

        const inner = document.createElement("div");
        inner.classList.add("card-inner");

        const back = document.createElement("div");
        back.classList.add("card-face", "card-back");
        back.textContent = "🂠";

        const front = document.createElement("div");
        front.classList.add("card-face", "card-front");

        if (card.type === "picture") {
            // ★ 圖片卡：只放圖片
            front.classList.add("picture-only");

            const imgEl = document.createElement("img");
            imgEl.src = card.Picture;
            imgEl.alt = card.Word;
            imgEl.draggable = false;
            // 圖片找不到時，顯示提示，避免變成空白卡
            imgEl.onerror = () => {
                imgEl.style.display = "none";
                const missing = document.createElement("div");
                missing.classList.add("word");
                missing.textContent = "（圖片遺失）";
                front.appendChild(missing);
                console.warn("找不到圖片：", card.Picture);
            };
            front.appendChild(imgEl);
        } else {
            // ★ 文字卡：只放單字
            front.classList.add("word-only");

            const wordEl = document.createElement("div");
            wordEl.classList.add("word");
            wordEl.textContent = card.Word;
            front.appendChild(wordEl);
        }

        inner.appendChild(back);
        inner.appendChild(front);
        cardEl.appendChild(inner);

        cardEl.addEventListener("click", (e) => onCardClick(cardEl, e));
        boardEl.appendChild(cardEl);
    });

    layoutBoard();
}

// ===== 依螢幕大小自動排版 =====
// ★ 可調整的參數（只要改這裡，CSS 會自動跟著變）
const CARD_RATIO = 1;       // 卡片 寬÷高：1 = 正方形 1:1；撲克牌比例請改 5 / 7
const GAP_RATIO = 0.20;     // 卡片間距 = 卡片寬度 × 0.20（想更寬就調大）
const BOARD_SCALE = 0.95;   // 棋盤佔可用空間的比例（留一點邊，避免貼邊）

function layoutBoard() {
    const total = deck.length || ROWS * COLS;
    const W = boardEl.clientWidth;
    const H = boardEl.clientHeight;
    if (!W || !H) return;

    let best = { cols: COLS, w: 0 };

    // 試每一種能整除的排法（例如 36 張：4x9、6x6、9x4、12x3），挑卡片最大的
    for (let cols = 3; cols <= 12; cols++) {
        if (total % cols !== 0) continue;
        const rows = total / cols;

        // 寬度限制：cols 張卡 + (cols-1) 個間距 <= W
        const wByWidth = W / (cols + GAP_RATIO * (cols - 1));
        // 高度限制：rows 張卡高 + (rows-1) 個間距 <= H
        const wByHeight = H / (rows / CARD_RATIO + GAP_RATIO * (rows - 1));

        const w = Math.min(wByWidth, wByHeight);
        if (w > best.w) best = { cols, w };
    }

    const cardW = Math.floor(best.w * BOARD_SCALE);

    // 右上角標示跟著實際排法更新（例如 9x4）
    const labelEl = document.getElementById("difficulty-label");
    if (labelEl) labelEl.textContent = `${best.cols}x${total / best.cols}`;

    boardEl.style.setProperty("--card-ratio", CARD_RATIO);   // CSS 的卡片比例跟 JS 計算一致
    boardEl.style.setProperty("--cols", best.cols);
    boardEl.style.setProperty("--card-w", cardW + "px");
    boardEl.style.setProperty("--gap", Math.floor(cardW * GAP_RATIO) + "px");
}

// 視窗大小改變（含進出全螢幕、手機轉向）時重新排版
let resizeTimer = null;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutBoard, 100);
});

function resetGame() {
    if (baseCards.length < totalPairs) return;

    matches = 0;
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    matchesEl.textContent = matches;
    messageEl.textContent = "";

    generateDeck();
    renderBoard();
}

function onCardClick(cardEl, event) {
    if (lockBoard) return;
    if (cardEl.classList.contains("flipped")) return;

    playBirdSound();
    createRipple(event, cardEl);

    cardEl.classList.add("click-bounce");
    setTimeout(() => cardEl.classList.remove("click-bounce"), 400);

    cardEl.classList.add("flipped");

    if (!firstCard) {
        firstCard = cardEl;
        return;
    }

    secondCard = cardEl;
    checkMatch();
}

// 波紋效果
function createRipple(e, cardEl) {
    const ripple = document.createElement("span");
    ripple.classList.add("ripple");

    const rect = cardEl.getBoundingClientRect();
    ripple.style.left = (e.clientX - rect.left) + "px";
    ripple.style.top = (e.clientY - rect.top) + "px";

    cardEl.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

function checkMatch() {
    // ★ 同一個單字，而且一張是圖片、一張是文字，才算配對成功
    const sameKey = firstCard.dataset.key === secondCard.dataset.key;
    const diffType = firstCard.dataset.type !== secondCard.dataset.type;
    (sameKey && diffType) ? handleMatch() : handleNotMatch();
}

function handleMatch() {
    playExplosionSound();

    const a = firstCard;
    const b = secondCard;
    a.classList.add("match-glow", "match-flash");
    b.classList.add("match-glow", "match-flash");

    setTimeout(() => {
        a.classList.remove("match-glow", "match-flash");
        b.classList.remove("match-glow", "match-flash");
    }, 800);

    a.classList.add("matched");
    b.classList.add("matched");
    matches++;
    matchesEl.textContent = matches;

    if (matches === totalPairs) {
        messageEl.textContent = "全部完成！👏";
    } else {
        messageEl.textContent = `配對成功：${a.dataset.key}！繼續～`;
    }
    resetSelection();
}

function handleNotMatch() {
    lockBoard = true;
    messageEl.textContent = "不一樣，試試別的位置～";

    setTimeout(() => {
        firstCard.classList.remove("flipped");
        secondCard.classList.remove("flipped");
        resetSelection();
    }, 700);
}

function resetSelection() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
}

restartBtn.addEventListener("click", resetGame);

// ===== 全螢幕切換 =====
const fullscreenBtn = document.getElementById("fullscreen-btn");

fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();   // 進入全螢幕（網址列會隱藏）
    } else {
        document.exitFullscreen();                      // 離開全螢幕
    }
});

// 按 Esc 離開時，按鈕文字也要跟著變
document.addEventListener("fullscreenchange", () => {
    fullscreenBtn.textContent = document.fullscreenElement ? "✕ 離開全螢幕" : "⛶ 全螢幕";
});

// 某些瀏覽器需要使用者互動後才能播放聲音
document.addEventListener("click", () => {
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}, { once: true });

// 先讀 json，再開始遊戲
(async () => {
    if (await loadCards()) resetGame();
})();