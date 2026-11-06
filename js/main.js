// Main module: wires buttons to events and fills the data screens.
let mode = "login";
const setMode = m => { mode = m; $("tabLogin").classList.toggle("active", m === "login"); $("tabRegister").classList.toggle("active", m === "register"); $("authBtn").textContent = m === "login" ? "Login" : "Register"; };
$("tabLogin").onclick = () => setMode("login");
$("tabRegister").onclick = () => setMode("register");

$("authBtn").onclick = async () => {
  const n = $("username").value.trim(), p = $("password").value;
  const err = mode === "login" ? await Store.login(n, p) : await Store.register(n, p);
  $("authMsg").textContent = err || "";
  if (!err) { $("password").value = ""; UI.show("menu"); }
};

document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => UI.show(b.dataset.go));
$("submitAnswer").onclick = submitAnswer;
$("answer").addEventListener("keydown", e => { if (e.key === "Enter") submitAnswer(); });

$("logoutBtn").onclick = () => UI.modal(`<h3>Are you sure you want to log out?</h3>`,
  [{ label: "Yes", primary: true, onClick: () => { Store.logout(); UI.show("login"); } }, { label: "Cancel" }]);

// Refresh data whenever a screen is shown
document.addEventListener("screenchange", e => {
  const me = Store.current(), id = e.detail;
  if (id !== "game") clearInterval(G.timer);
  if (!me) return;
  if (id === "menu") $("welcome").textContent = "Welcome, " + me.name + "!";
  if (id === "levels") {
    $("levelList").innerHTML = "";
    LEVELS.forEach(l => {
      const locked = l.n > me.levelsCompleted + 1, d = document.createElement("div");
      d.className = `level l${l.n}` + (locked ? " locked" : "");
      d.innerHTML = `<b>${"⭐".repeat(l.n)} Level ${l.n} - ${l.name}</b><br>${l.size} × ${l.size} grid · API Time: ${l.time}s${locked ? " 🔒" : ""}`;
      if (!locked) d.onclick = () => startRun(l.n);
      $("levelList").appendChild(d);
    });
  }
  if (id === "profile") $("profileTable").innerHTML = [
    ["Username", me.name], ["Current Level", Math.min(me.levelsCompleted + 1, 3)], ["Total Score", me.totalScore],
    ["Highest Score", me.highScore], ["Levels Completed", me.levelsCompleted + " / 3"]
  ].map(r => `<tr><td>${r[0]}</td><td><b>${r[1]}</b></td></tr>`).join("");
  if (id === "leaderboard") {
    const rows = Object.entries(Store.users()).map(([n, u]) => [n, u.highScore]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    $("lbTable").innerHTML = "<tr><th>Rank</th><th>Player</th><th>Best</th></tr>" +
      rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r[0].replace(/</g, "&lt;")}</td><td>${r[1]}</td></tr>`).join("");
  }
  if (id === "history") $("histTable").innerHTML = "<tr><th>Date</th><th>Level</th><th>Score</th><th>Result</th></tr>" +
    (me.history.slice(0, 10).map(h => `<tr><td>${h.date}</td><td>${h.level}</td><td>${h.score}</td><td class="${h.result === "Win" ? "win" : "lost"}">${h.result}</td></tr>`).join("") || "<tr><td colspan=4>No games yet.</td></tr>");
});

UI.show(Store.current() ? "menu" : "login");

// Logo art + floating bubbles
document.querySelectorAll(".hero").forEach(h => h.innerHTML = ART.fish);
for (let i = 0; i < 22; i++) {
  const b = document.createElement("i"), s = 8 + Math.random() * 38;
  b.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${8 + Math.random() * 14}s;animation-delay:${-Math.random() * 20}s`;
  $("sea").appendChild(b);
}

// Full screen (Android/desktop). iPhone Safari has no Fullscreen API, so we show the Home-Screen trick.
$("fsBtn").onclick = () => {
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else if (req) req.call(el);
  else UI.modal("<h3>Full screen on iPhone</h3><p>Tap the Share button → <b>Add to Home Screen</b>, then open the game from your home screen.</p>", [{ label: "OK", primary: true }]);
};
