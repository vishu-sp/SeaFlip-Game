// UI helpers: switching screens and showing pop-ups.
const $ = id => document.getElementById(id);
const UI = {
  show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(id).classList.add("active");
    document.dispatchEvent(new CustomEvent("screenchange", { detail: id })); // event-driven
  },
  modal(html, buttons) { // buttons: [{label, primary, onClick}]
    $("modalBox").innerHTML = html;
    buttons.forEach(b => {
      const el = document.createElement("button");
      el.textContent = b.label; if (b.primary) el.className = "primary";
      el.onclick = () => { $("modal").hidden = true; b.onClick && b.onClick(); };
      $("modalBox").appendChild(el);
    });
    $("modal").hidden = false;
  }
};
