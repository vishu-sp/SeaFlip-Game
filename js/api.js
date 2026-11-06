// API module: the ONLY file that talks to the Fish Game web service (interoperability).
const FishAPI = {
  base: ["https://marcconrad.com/uob/fish/api.php", "http://marcconrad.com/uob/fish/api.php"],
  variants: ["?out=json&base64=yes", "?out=json&base64=no", "?out=csv&base64=yes", "?out=csv&base64=no"],

  // Accepts JSON  {"question": "...", "solution": 4}   or CSV  "question,solution"
  parse(text) {
    let q, s;
    try { const d = JSON.parse(text); q = d.question ?? d.image ?? d.url; s = d.solution ?? d.answer; }
    catch { const i = text.trim().lastIndexOf(","); q = text.trim().slice(0, i); s = text.trim().slice(i + 1); }
    if (q === undefined || s === undefined || isNaN(Number(s))) throw new Error("Unexpected reply: " + text.slice(0, 120));
    q = String(q).trim().replace(/^"|"$/g, "");
    if (!/^(https?:|data:)/.test(q)) {
      if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(q) || q.startsWith("/")) q = new URL(q, "https://marcconrad.com/uob/fish/").href;   // relative link
      else {                                                                                                                                     // raw base64
        const mime = q.startsWith("/9j/") ? "jpeg" : q.startsWith("R0lGOD") ? "gif" : q.startsWith("UklGR") ? "webp" : q.startsWith("PHN2Zy") ? "svg+xml" : "png";
        q = `data:image/${mime};base64,` + q;
      }
    }
    if (q.startsWith("http:") && location.protocol === "https:") q = q.replace("http:", "https:");
    return { image: q, solution: Number(s) };
  },

  // Make sure the picture REALLY loads before the player sees the puzzle.
  loadImage(src, ms = 10000) {
    return new Promise((ok, fail) => {
      const img = new Image(), timer = setTimeout(() => fail(new Error("image timed out")), ms);
      img.onload = () => { clearTimeout(timer); ok(); };
      img.onerror = () => { clearTimeout(timer); fail(new Error("image failed to load: " + src.slice(0, 70))); };
      img.src = src;
    });
  },

  async getPuzzle() {
    const errors = [];
    for (const b of this.base) for (const v of this.variants) {
      if (b.startsWith("http:") && location.protocol === "https:") continue; // browsers block this (mixed content)
      try {
        const res = await fetch(b + v + "&t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const p = this.parse(await res.text());
        await this.loadImage(p.image);                 // if the image is broken, move on to the next variant
        console.log("Fish API OK:", b + v, p.solution);
        return p;
      } catch (e) { errors.push(b + v + " -> " + e.message); }
    }
    console.error("Fish API failed:\n" + errors.join("\n"));
    const err = new Error(errors[0] || "unknown"); err.all = errors; throw err;
  },

  // Backup puzzle (same idea: count the fish) so the game never gets stuck if the service is down.
  offlinePuzzle() {
    const n = 2 + Math.floor(Math.random() * 8), cols = ["#ff8a2b", "#2f9bff", "#ff5c8a", "#ffc928", "#37c978"];
    let f = "";
    for (let i = 0; i < n; i++) {
      const x = 40 + Math.random() * 320, y = 35 + Math.random() * 190, r = Math.random() * 40 - 20, c = cols[i % 5];
      f += `<g transform="translate(${x} ${y}) rotate(${r}) scale(${0.7 + Math.random() * 0.4})"><path d="M26 0 L46 -14 L46 14Z" fill="${c}"/><ellipse cx="0" cy="0" rx="28" ry="17" fill="${c}"/><circle cx="-14" cy="-4" r="4" fill="#fff"/><circle cx="-15" cy="-4" r="2" fill="#111"/></g>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><rect width="400" height="260" fill="#d9f2ff"/><path d="M0 230 Q50 210 100 230 T200 230 T300 230 T400 230V260H0Z" fill="#8fd3ff"/>${f}</svg>`;
    return { image: "data:image/svg+xml;utf8," + encodeURIComponent(svg), solution: n, offline: true };
  }
};
