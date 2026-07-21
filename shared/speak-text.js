/* shared/speak-text.js — Silben-/Wort-/Satz-Sprachausgabe mit Highlight.
   Global: svSay.{word,renderSyllables,bySyllables,line}.
   Baut auf speak()/saySyllable() aus voice-picker.js auf. */
(() => {
	function word(text, rate) {
		speak(String(text).toLowerCase(), rate || 0.85);
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
	function bySyllables(silben, wordText, sylSpans, opts) {
		const o = opts || {};
		const stepMs = o.step || 620;
		const tailMs = o.tail || 120;
		const rate = o.rate || 0.85;
		// Einsilbige (kurze) Wörter: nur einmal als Ganzes sprechen (aus Ph3).
		if (silben.length <= 1) {
			if (sylSpans && sylSpans[0]) {
				sylSpans[0].classList.add("lit");
				setTimeout(() => sylSpans[0].classList.remove("lit"), 700);
			}
			word(wordText, rate);
			return;
		}
		let i = 0;
		const step = () => {
			if (sylSpans) sylSpans.forEach((s) => s.classList.remove("lit"));
			if (i < silben.length) {
				if (sylSpans && sylSpans[i]) sylSpans[i].classList.add("lit");
				saySyllable(silben[i]);
				i++;
				setTimeout(step, stepMs);
			} else {
				setTimeout(() => {
					word(wordText, rate);
					if (sylSpans) sylSpans.forEach((s) => s.classList.remove("lit"));
				}, tailMs);
			}
		};
		step();
	}
	function line(spans, words, done) {
		let i = 0;
		const step = () => {
			spans.forEach((s) => s.classList.remove("lit"));
			if (i < words.length) {
				if (spans[i]) spans[i].classList.add("lit");
				word(words[i], 0.8);
				i++;
				setTimeout(step, 720);
			} else {
				setTimeout(() => {
					speak(words.join(" ").toLowerCase(), 0.85);
					spans.forEach((s) => s.classList.remove("lit"));
					if (done) done();
				}, 160);
			}
		};
		step();
	}
	window.svSay = { word, renderSyllables, bySyllables, line };
})();
