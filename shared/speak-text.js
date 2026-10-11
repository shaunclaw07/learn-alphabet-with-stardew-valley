/* shared/speak-text.js — Silben-/Wort-/Satz-Sprachausgabe mit Highlight.
   Global: svSay.{word,renderSyllables,bySyllables,line}.

   Baut auf speak()/saySyllable() (voice-picker.js → audio.js) auf und wartet
   die Wiedergabe über Promises ab — die Reihenfolge hängt am Ende der echten
   Audiodatei, nicht an festen Pausen (Silben sind 0,4–0,8 s lang). */
(() => {
	function word(text, rate) {
		return speak(String(text).toLowerCase(), rate || 0.85);
	}

	function renderSyllables(container, silben) {
		container.replaceChildren();
		silben.forEach((syl, i) => {
			if (i > 0) {
				const dot = document.createElement("span");
				dot.className = "dot";
				dot.textContent = "·";
				container.appendChild(dot);
			}
			const s = document.createElement("span");
			s.className = "syl";
			s.textContent = syl;
			container.appendChild(s);
		});
	}

	// Einsilbige (kurze) Wörter: nur einmal als Ganzes sprechen (aus Ph3).
	// speak() löste false auf, wenn inzwischen etwas anderes gesprochen wurde —
	// dann bricht der Ablauf ab (sonst liefe die alte Sequenz weiter und
	// überschriebe die neue Eingabe).
	async function bySyllables(silben, wordText, sylSpans, opts) {
		void opts;
		if (!silben || silben.length <= 1) {
			if (sylSpans && sylSpans[0]) sylSpans[0].classList.add("lit");
			await word(wordText);
			if (sylSpans) sylSpans.forEach((s) => s.classList.remove("lit"));
			return;
		}
		for (let i = 0; i < silben.length; i++) {
			if (sylSpans) sylSpans.forEach((s) => s.classList.remove("lit"));
			if (sylSpans && sylSpans[i]) sylSpans[i].classList.add("lit");
			const ok = await saySyllable(silben[i]);
			if (!ok) {
				if (sylSpans) sylSpans.forEach((s) => s.classList.remove("lit"));
				return;
			}
		}
		await word(wordText);
		if (sylSpans) sylSpans.forEach((s) => s.classList.remove("lit"));
	}

	// Erst jedes Wort einzeln, dann den ganzen Satz.
	async function line(spans, words, done) {
		for (let i = 0; i < words.length; i++) {
			spans.forEach((s) => s.classList.remove("lit"));
			if (spans[i]) spans[i].classList.add("lit");
			const ok = await word(words[i], 0.8);
			if (!ok) {
				spans.forEach((s) => s.classList.remove("lit"));
				return;
			}
		}
		spans.forEach((s) => s.classList.remove("lit"));
		const fertig = await speak(words.join(" ").toLowerCase(), 0.85);
		if (fertig && done) done();
	}

	window.svSay = { word, renderSyllables, bySyllables, line };
})();
