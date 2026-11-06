// Game module: all rules (cards, scoring, levels, timer). Knows nothing about login screens.
const LEVELS = [
  { n: 1, name: "Easy",   size: 3, time: 60 },
  { n: 2, name: "Medium", size: 4, time: 45 },
  { n: 3, name: "Hard",   size: 5, time: 30 }
];
const G = { level: null, score: 0, flipped: [], matches: 0, pairs: 0, lock: false, timer: null, left: 0, puzzle: null };

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

function startRun(levelNo) { G.score = 0; startLevel(levelNo); }

function startLevel(levelNo) {
  G.level = LEVELS[levelNo - 1];
  const total = G.level.size ** 2;
  G.pairs = total >> 1;                       // 3x3 and 5x5 have an odd count, so one free "wave" card is added
  G.matches = 0; G.flipped = []; G.lock = false;
  const deck = shuffle([...SYMBOLS].slice(0, G.pairs).flatMap(s => [s, s]));
  shuffle(deck);
  if (total % 2) deck.splice(total >> 1, 0, "wave"); // free bonus card in the middle
  $("grid").style.gridTemplateColumns = `repeat(${G.level.size},1fr)`;
  $("grid").innerHTML = "";
  deck.forEach(sym => {
    const c = document.createElement("button");
    c.dataset.sym = sym;
    c.innerHTML = `<div class="inner"><div class="face front"><span>?</span></div><div class="face back">${ART[sym]}</div></div>`;
    if (sym === "wave") { c.className = "card bonus up"; c.disabled = true; }
    else { c.className = "card"; c.onclick = () => flip(c); }
    $("grid").appendChild(c);
  });
  $("cardPhase").hidden = false; $("apiPhase").hidden = true;
  $("hudTimer").textContent = ""; hud(); UI.show("game");
}

function hud() {
  $("hudLevel").textContent = `Level ${G.level.n} - ${G.level.name}`;
  $("hudScore").textContent = `Score: ${G.score}`;
  $("hudMatches").textContent = `Matches: ${G.matches}/${G.pairs}`;
}

function flip(card) {
  if (G.lock || card.classList.contains("up") || card.classList.contains("done")) return;
  card.classList.add("up"); G.flipped.push(card);
  if (G.flipped.length < 2) return;
  G.lock = true;
  const [a, b] = G.flipped;
  if (a.dataset.sym === b.dataset.sym) {
    G.score += 10; G.matches++;
    [a, b].forEach(c => c.classList.add("done"));
    G.flipped = []; G.lock = false; hud();
    if (G.matches === G.pairs) cardsComplete();
    else UI.modal(`<div class="big">✅</div><h3>Match Found!</h3><p>+10 Points</p>`, [{ label: "Continue" }]);
  } else {
    G.score -= 2; hud();
    setTimeout(() => {
      [a, b].forEach(c => c.classList.remove("up"));
      G.flipped = []; G.lock = false;
    }, 800);
  }
}

function cardsComplete() {
  UI.modal(`<div class="big">🦀</div><h3>Card Puzzle Completed!</h3><p>Great job! Now it's time for the Fish API challenge.</p>`,
    [{ label: "Continue", primary: true, onClick: () => startApiPuzzle() }]);
}

async function startApiPuzzle(useOffline) {
  clearInterval(G.timer);
  $("cardPhase").hidden = true; $("apiPhase").hidden = false;
  $("fishImg").removeAttribute("src"); $("answer").value = ""; G.puzzle = null;
  $("hudTimer").textContent = ""; $("timeBar").style.width = "100%";
  $("apiMsg").textContent = "Loading puzzle…"; $("apiMsg").className = "msg info";
  try {
    G.puzzle = useOffline === true ? FishAPI.offlinePuzzle() : await FishAPI.getPuzzle();
  } catch (e) {
    $("apiMsg").className = "msg"; $("apiMsg").textContent = "Fish API error: " + e.message;
    UI.modal(`<h3>Could not load the Fish puzzle</h3><p style="font-size:13px;word-break:break-all">${e.message.replace(/</g, "&lt;")}</p><p>Press F12 → Console to see every attempt.</p>`,
      [{ label: "Try again", primary: true, onClick: () => startApiPuzzle() }, { label: "Play backup puzzle", onClick: () => startApiPuzzle(true) }, { label: "Main Menu", onClick: () => UI.show("menu") }]);
    return;
  }
  // The picture is already loaded and checked, so show it and start the countdown at once.
  $("fishImg").src = G.puzzle.image;
  $("apiMsg").textContent = G.puzzle.offline ? "(backup puzzle)" : "";
  $("answer").focus();
  startTimer(G.level.time);
}

function startTimer(seconds) {
  clearInterval(G.timer);
  G.left = seconds; G.total = seconds; showTime();
  G.timer = setInterval(() => {
    G.left--; showTime();
    if (G.left <= 0) { clearInterval(G.timer); gameOver(); }   // time exceeded -> GAME OVER
  }, 1000);
}

function showTime() {
  $("hudTimer").textContent = `⏱ ${Math.max(G.left, 0)}s`;
  $("timeBar").style.width = (Math.max(G.left, 0) / G.total * 100) + "%";
  $("timeBar").classList.toggle("low", G.left <= 10);
}

function submitAnswer() {
  const v = $("answer").value;
  if (v === "" || !G.puzzle || G.left <= 0) return;
  if (Number(v) === G.puzzle.solution) {
    clearInterval(G.timer);
    levelComplete();
  } else {
    $("apiMsg").textContent = "Not quite, try again!"; $("answer").value = "";
  }
}

function levelComplete() {
  const n = G.level.n;
  Store.update(u => { u.levelsCompleted = Math.max(u.levelsCompleted, n); });
  if (n === LEVELS.length) return win();
  UI.modal(`<div class="big">🐠🎉</div><h3>Correct!</h3><p>You completed the level! Next level unlocked.</p>`,
    [{ label: "Next Level", primary: true, onClick: () => startLevel(n + 1) }]);
}

function record(result) {
  Store.update(u => {
    u.totalScore += Math.max(G.score, 0);
    u.highScore = Math.max(u.highScore, G.score);
    u.history.unshift({ date: new Date().toISOString().slice(0, 10), level: G.level.n, score: G.score, result });
  });
}

function win() {
  record("Win");
  UI.modal(`<div class="big">🏆</div><h2>Congratulations! You Win!</h2><p>Final Score: <b>${G.score}</b></p>`,
    [{ label: "Play Again", primary: true, onClick: () => startRun(1) }, { label: "View Score", onClick: () => UI.show("leaderboard") }, { label: "Main Menu", onClick: () => UI.show("menu") }]);
}

function gameOver() {
  G.puzzle = null; $("apiPhase").hidden = true;
  record("Lost");
  G.score = 0;                                // proposal: score resets after Game Over
  UI.modal(`<div class="big">⏰</div><h3>Time's Up!</h3><p>You lost the game. Your score has been reset.</p>`,
    [{ label: "Restart Game", primary: true, onClick: () => startRun(1) }, { label: "Back to Login", onClick: () => { Store.logout(); UI.show("login"); } }]);
}
