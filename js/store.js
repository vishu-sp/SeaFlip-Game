// Storage module: virtual identity (users, sessions, scores, history) kept in localStorage.
const Store = {
  _get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  _set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  users() { return this._get("sf_users", {}); },
  async hash(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  },
  async register(name, pass) {
    const users = this.users();
    if (name.length < 3 || pass.length < 4) return "Username 3+ chars, password 4+ chars.";
    if (users[name]) return "Username already taken.";
    users[name] = { pass: await this.hash(pass), totalScore: 0, highScore: 0, levelsCompleted: 0, history: [] };
    this._set("sf_users", users);
    this._set("sf_session", name);
    return null;
  },
  async login(name, pass) {
    const u = this.users()[name];
    if (!u || u.pass !== await this.hash(pass)) return "Wrong username or password.";
    this._set("sf_session", name);
    return null;
  },
  logout() { localStorage.removeItem("sf_session"); },
  current() { const n = this._get("sf_session", null); return n && this.users()[n] ? { name: n, ...this.users()[n] } : null; },
  update(fn) {
    const users = this.users(), n = this._get("sf_session", null);
    fn(users[n]); this._set("sf_users", users);
  }
};
