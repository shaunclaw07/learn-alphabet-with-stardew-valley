// ===== AUDIO (Web Speech API — offline, kostenlos) =====
// Ermöglicht selbstständiges Lernen: das Kind HÖRT den Laut/das Wort.
let voices = [];
let chosenVoice = null;
const VOICE_KEY = "sv_lesen_voice";
const RATE_KEY = "sv_lesen_rate";
const FONT_KEY = "sv_lesen_font";
function readUserRate() {
  const v = parseFloat(localStorage.getItem(RATE_KEY));
  return isNaN(v) ? 1 : Math.min(1.5, Math.max(0.6, v));
}
let userRate = readUserRate();
function svRateFor(base) {
  return Math.min(2, Math.max(0.3, (base || 0.85) * userRate));
}
window.svUserRate = () => userRate;
function applyFont() {
  const f = localStorage.getItem(FONT_KEY) === "lesbar" ? "lesbar" : "normal";
  document.documentElement.setAttribute("data-svfont", f);
}
applyFont();
function isGermanVoice(v) {
  return /^de([-_]|$)/i.test(v.lang) || /deutsch|german/i.test(v.name);
}
function updateVoiceStatus() {
  const st = document.getElementById("voiceStatus");
  if (!st) return;
  if (!chosenVoice) {
    st.textContent = "";
    return;
  }
  const ok = isGermanVoice(chosenVoice);
  st.textContent =
    (ok ? "✅ Aktiv: " : "❌ Aktiv (nicht Deutsch!): ") +
    chosenVoice.name +
    " · " +
    chosenVoice.lang;
  st.style.color = ok ? "#3d6b22" : "#b23b1e";
  st.style.fontWeight = "800";
}
function buildVoicePicker(german) {
  const sel = document.getElementById("voicePick");
  const hint = document.getElementById("voiceHint");
  if (!sel) return;
  // Alle Stimmen zeigen (deutsche zuerst) — so ist sichtbar, ob es
  // überhaupt eine deutsche gibt.
  const list = [...german, ...voices.filter((v) => !isGermanVoice(v))];
  sel.replaceChildren();
  list.forEach((v) => {
    const o = document.createElement("option");
    o.value = v.name;
    o.textContent = (isGermanVoice(v) ? "🇩🇪 " : "🌐 ") + v.name;
    if (chosenVoice && v.name === chosenVoice.name) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = () => {
    chosenVoice = voices.find((v) => v.name === sel.value) || chosenVoice;
    if (chosenVoice) localStorage.setItem(VOICE_KEY, chosenVoice.name);
    updateVoiceStatus();
    speak("Hallo, ich lese dir vor!"); // Hörprobe
  };
  if (hint) hint.style.display = german.length ? "none" : "block";
  updateVoiceStatus();
}
// Zeigt Klartext, wenn das Gerät gar keine Stimme liefert (typisch:
// Amazon-Kids-Modus gibt die Web Speech API nicht frei, oder es ist
// keine TTS-Engine installiert).
function showNoVoices() {
  const sel = document.getElementById("voicePick");
  const st = document.getElementById("voiceStatus");
  if (sel) {
    sel.replaceChildren();
    const o = document.createElement("option");
    o.textContent = "— keine Vorlese-Stimme verfügbar —";
    sel.appendChild(o);
    sel.disabled = true;
  }
  if (st) {
    st.innerHTML =
      "🔇 <strong>Kein Vorlesen verfügbar.</strong> Bitte die App " +
      "<strong>außerhalb des Kids-Modus</strong> öffnen und unter " +
      "Einstellungen → Bedienungshilfen → Text-to-Speech eine deutsche " +
      "Stimme installieren.";
    st.style.color = "#b23b1e";
    st.style.fontWeight = "800";
  }
}
function refreshVoices() {
  if (!("speechSynthesis" in window)) return;
  voices = speechSynthesis.getVoices() || [];
  if (!voices.length) return;
  const sel = document.getElementById("voicePick");
  if (sel) sel.disabled = false;
  const german = voices.filter(isGermanVoice);
  const saved = localStorage.getItem(VOICE_KEY);
  // Deutsche Stimme hat IMMER Vorrang. Nur wenn eine gespeicherte Wahl
  // selbst deutsch ist (oder es gar keine deutsche gibt), wird sie geehrt.
  chosenVoice =
    german.find((v) => v.name === saved) ||
    german[0] ||
    voices.find((v) => v.name === saved) ||
    chosenVoice ||
    voices[0] ||
    null;
  buildVoicePicker(german);
}
// Fire OS & Co. feuern "voiceschanged" oft unzuverlässig — daher die
// Stimmen mehrfach nachladen; bleibt die Liste dauerhaft leer, einen
// Klartext-Hinweis zeigen statt still ein leeres Dropdown zu lassen.
if ("speechSynthesis" in window) {
  let voiceTries = 0;
  const pollVoices = () => {
    refreshVoices();
    if (voices.length) return;
    if (++voiceTries >= 12) {
      showNoVoices();
      return;
    }
    setTimeout(pollVoices, 250);
  };
  pollVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
} else {
  showNoVoices();
}
function speak(text, rate) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = (chosenVoice && chosenVoice.lang) || "de-DE";
  if (chosenVoice) u.voice = chosenVoice;
  u.rate = svRateFor(rate);
  u.pitch = 1.05;
  speechSynthesis.speak(u);
}
// "Hof & Huhn" -> "Hof" (ein sauber sprechbares Anlaut-Wort)
function spokenWord(mw) {
  return String(mw).split("&")[0].trim();
}
// Silbe als Laut sprechen. Kleinschreibung, damit eine deutsche Stimme
// "ma"/"me"/"mi" als Silbe liest (Großbuchstaben werden buchstabiert).
function saySyllable(syl) {
  speak(String(syl).toLowerCase(), 0.7);
}
