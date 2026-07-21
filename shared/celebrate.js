/* ===================================================================
   celebrate.js — Belohnungs-Feedback für alle Phasen (Quick Wins)
   -------------------------------------------------------------------
   Selbst-enthalten: injiziert eigenes CSS, einen Ton-Aus-Button und
   einen Toast. Die Phasen rufen nur die globalen Funktionen auf:

     svCorrect()      → bei richtiger Antwort: Ding + Konfetti + Lob
     svFinish(text)   → beim Abschluss: Fanfare + großes Konfetti
     svStreakReset()  → nach falschem Versuch: Serie zurücksetzen
     svRandomPraise() → gibt einen zufälligen Lob-Text zurück

   Alles offline, ohne Assets. Respektiert prefers-reduced-motion
   (kein Konfetti) und den Ton-Aus-Schalter (localStorage-Key
   sv_lesen_muted, phasenübergreifend wie die Stimme).
   =================================================================== */
(() => {
  if (window.__svCelebrateReady) return; // nur einmal initialisieren
  window.__svCelebrateReady = true;

  const MUTE_KEY = "sv_lesen_muted";
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PRAISE = [
    "Super! 🌟",
    "Klasse gelesen! 🎉",
    "Wie ein echter Farmer! 🚜",
    "Stark! 💪",
    "Genau richtig! ✅",
    "Toll gemacht! 🐔",
    "Weiter so! 🌻",
    "Perfekt! ⭐",
    "Du kannst das! 🥕",
    "Prima! 🌾",
  ];

  let streak = 0;

  // ─── Tages-Streak („X Tage in Folge geübt") ────────────────────────
  // Wird beim ersten richtigen Ergebnis des Tages hochgezählt. Die
  // Startseite liest sv_lesen_daily nur aus. Format: {last, count}.
  const DAILY_KEY = "sv_lesen_daily";
  function todayStr() {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }
  function bumpDaily() {
    try {
      const today = todayStr();
      const data = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}");
      if (data.last === today) return; // heute schon gezählt
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr =
        y.getFullYear() +
        "-" +
        String(y.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(y.getDate()).padStart(2, "0");
      const count = data.last === yStr ? (data.count || 0) + 1 : 1;
      localStorage.setItem(DAILY_KEY, JSON.stringify({ last: today, count }));
    } catch (_) {}
  }

  // ─── Ton-Aus-Status ────────────────────────────────────────────────
  function isMuted() {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }
  function setMuted(v) {
    try {
      localStorage.setItem(MUTE_KEY, v ? "1" : "0");
    } catch (_) {}
  }

  // ─── CSS einmalig injizieren ───────────────────────────────────────
  function injectStyle() {
    const css = `
      .sv-fx-layer {
        position: fixed; inset: 0; overflow: hidden;
        pointer-events: none; z-index: 9998;
      }
      .sv-confetti-piece {
        position: absolute; top: -24px;
        font-size: 22px; line-height: 1;
        will-change: transform, opacity;
        animation: sv-fall linear forwards;
      }
      @keyframes sv-fall {
        0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
        100% { transform: translateY(105vh) rotate(540deg); opacity: 0; }
      }
      .sv-toast {
        position: fixed; left: 50%; bottom: calc(20px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%) translateY(20px);
        z-index: 9999; pointer-events: none;
        background: linear-gradient(180deg, #7ec850, #5da03c);
        color: #fff; border: 3px solid #3d6b22; border-radius: 14px;
        padding: 10px 18px; max-width: 90vw;
        font-family: "Nunito", system-ui, sans-serif; font-weight: 800;
        font-size: 1.05rem; text-align: center;
        box-shadow: 0 6px 16px rgba(0,0,0,.25);
        opacity: 0; transition: opacity .25s ease, transform .25s ease;
      }
      .sv-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      #sv-mute {
        position: fixed; right: calc(12px + env(safe-area-inset-right, 0px));
        bottom: calc(12px + env(safe-area-inset-bottom, 0px));
        z-index: 9997; width: 44px; height: 44px; min-width: 44px;
        border-radius: 50%; border: 3px solid #3d6b22;
        background: #fffaf0; color: #4a3728; font-size: 20px;
        cursor: pointer; touch-action: manipulation;
        box-shadow: 0 3px 8px rgba(0,0,0,.2);
        display: flex; align-items: center; justify-content: center;
      }
      #sv-mute:active { transform: scale(0.92); }
      #sv-mute:focus-visible { outline: 3px solid #ff6b35; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        .sv-toast { transition: none; }
      }
    `;
    const style = document.createElement("style");
    style.id = "sv-celebrate-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── Ton-Aus-Button ────────────────────────────────────────────────
  function injectMuteButton() {
    const btn = document.createElement("button");
    btn.id = "sv-mute";
    btn.type = "button";
    const sync = () => {
      const m = isMuted();
      btn.textContent = m ? "🔇" : "🔔";
      btn.setAttribute(
        "aria-label",
        m ? "Belohnungs-Ton einschalten" : "Belohnungs-Ton ausschalten"
      );
    };
    btn.addEventListener("click", () => {
      setMuted(!isMuted());
      sync();
    });
    sync();
    document.body.appendChild(btn);
  }

  // ─── Ton (WebAudio, ohne Assets) ───────────────────────────────────
  let audioCtx = null;
  function ctx() {
    if (isMuted()) return null;
    try {
      if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch (_) {
      return null;
    }
  }
  function tone(freq, start, dur, gain) {
    const ac = ctx();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = ac.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  // Fröhlicher kleiner Akkord (Dur-Dreiklang aufwärts)
  function dingCorrect() {
    tone(660, 0, 0.14, 0.18); // E5
    tone(880, 0.09, 0.16, 0.18); // A5
  }
  // Kleine Fanfare beim Abschluss
  function dingFinish() {
    tone(523, 0, 0.16, 0.2); // C5
    tone(659, 0.12, 0.16, 0.2); // E5
    tone(784, 0.24, 0.16, 0.2); // G5
    tone(1047, 0.38, 0.3, 0.22); // C6
  }

  // ─── Konfetti ──────────────────────────────────────────────────────
  const SYMBOLS = ["⭐", "🌟", "🎉", "🌸", "🥕", "🌻", "✨"];
  let fxLayer = null;
  function layer() {
    // Clippende Overlay-Ebene — verhindert horizontalen Body-Scroll durch
    // Konfetti-Teile, die sonst über den Viewport-Rand ragen würden.
    if (!fxLayer || !fxLayer.isConnected) {
      fxLayer = document.createElement("div");
      fxLayer.className = "sv-fx-layer";
      fxLayer.setAttribute("aria-hidden", "true");
      document.body.appendChild(fxLayer);
    }
    return fxLayer;
  }
  function confetti(count) {
    if (reduceMotion) return;
    const box = layer();
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "sv-confetti-piece";
      el.textContent = SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
      el.style.left = Math.random() * 100 + "%";
      const dur = 1.6 + Math.random() * 1.4;
      el.style.animationDuration = dur + "s";
      el.style.fontSize = 16 + Math.random() * 18 + "px";
      box.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000 + 200);
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────
  let toastEl = null;
  let toastTimer = null;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "sv-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    // reflow, damit die Transition erneut greift
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
  }

  // ─── Öffentliche API ───────────────────────────────────────────────
  function randomPraise() {
    return PRAISE[(Math.random() * PRAISE.length) | 0];
  }

  window.svRandomPraise = randomPraise;

  window.svCorrect = function () {
    streak++;
    bumpDaily();
    dingCorrect();
    confetti(14);
    let msg = randomPraise();
    if (streak >= 3) msg += "  🔥 " + streak + " in Folge!";
    toast(msg);
  };

  window.svFinish = function (text) {
    streak = 0;
    dingFinish();
    confetti(42);
    toast(text || "Geschafft! 🏆");
  };

  window.svStreakReset = function () {
    streak = 0;
  };

  // ─── Init ──────────────────────────────────────────────────────────
  function init() {
    injectStyle();
    injectMuteButton();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
