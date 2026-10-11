/* shared/voice-picker.js — Vorlese-Helfer + Lesbarkeits-Einstellung.

   Das Vorlesen ist NICHT mehr die Web Speech API: die Stimme ist vorproduziert
   und wird von shared/audio.js abgespielt. Hier bleiben nur

   - `spokenWord(mw)` und die globalen Helfer `speak(text, rate)` /
     `saySyllable(syl)` — Signatur unverändert, damit die Phasen-Seiten
     unangetastet bleiben. `rate` wird nicht mehr ausgewertet: das Sprechtempo
     steckt in der Aufnahme (siehe scripts/generate-audio.mjs, LENGTH_SCALE).
   - der Umschalter „Große Schrift“ (Lesbarkeits-Modus). */

// „Hof & Huhn“ → „Hof“ (ein sauber sprechbares Anlaut-Wort)
function spokenWord(mw) {
  return String(mw).split("&")[0].trim();
}

// Text vorlesen. Gibt ein Promise zurück (Ende der Wiedergabe).
function speak(text, rate) {
  void rate; // Tempo kommt aus der Audiodatei
  return window.svAudio.speak(text);
}

// Silbe als Laut vorsprechen. Kleinschreibung, damit „ma“/„me“/„mi“
// als Silbe gesprochen werden (nicht buchstabiert).
function saySyllable(syl) {
  return speak(String(syl).toLowerCase());
}

// ===== Lesbarkeits-Modus (größere Schrift, mehr Abstand) =====
const SV_FONT_KEY = "sv_lesen_font";
function applyFont() {
  const f = localStorage.getItem(SV_FONT_KEY) === "lesbar" ? "lesbar" : "normal";
  document.documentElement.setAttribute("data-svfont", f);
}
applyFont();

// Hängt den Schrift-Umschalter in den Vorlese-Bereich (ersetzt den früheren
// Stimmen-/Tempo-Block — beides ist mit der festen Stimme hinfällig).
function injectReadingSettings() {
  const wrap = document.querySelector(".voice-wrap");
  if (!wrap || document.getElementById("svSettings")) return;

  const box = document.createElement("div");
  box.id = "svSettings";
  box.className = "sv-settings";

  const fontBtn = document.createElement("button");
  fontBtn.type = "button";
  fontBtn.id = "svFontToggle";
  fontBtn.className = "sv-font-toggle";
  const syncFont = () => {
    const on = localStorage.getItem(SV_FONT_KEY) === "lesbar";
    fontBtn.textContent = on ? "🔠 Große Schrift: an" : "🔠 Große Schrift: aus";
    fontBtn.setAttribute("aria-pressed", on ? "true" : "false");
  };
  fontBtn.addEventListener("click", () => {
    const on = localStorage.getItem(SV_FONT_KEY) === "lesbar";
    localStorage.setItem(SV_FONT_KEY, on ? "normal" : "lesbar");
    applyFont();
    syncFont();
  });
  syncFont();
  box.appendChild(fontBtn);

  wrap.appendChild(box);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectReadingSettings);
} else {
  injectReadingSettings();
}
