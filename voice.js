// ============ MALHAE VOICE: face-to-face voice translation, English ↔ Korean ============
// Each half has a mic. Tap it and speak: the words are recognised in that half's language, translated,
// shown big on the other half and spoken aloud in the other language. Recognition and translation need internet.
(() => {
  "use strict";

  const HANGUL = /[가-힣]/;
  const LANGS = {
    ko: { speech: "ko-KR", other: "en", text: {
      hint: "아래 마이크를 누르고 한국어로 말하세요. 상대방에게 영어로 전해져요.",
      tap: "눌러서 말하기", listening: "듣고 있어요… 다 말하면 멈춰요", translating: "번역 중…",
      noSpeech: "아무 말도 들리지 않았어요. 다시 눌러 주세요.", denied: "마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.",
      failed: "번역하지 못했어요. 다시 말해 주세요.", limit: "오늘 무료 번역 한도를 다 썼어요.", offline: "인터넷 연결이 필요해요.",
      mine: "내가 한 말: ", unsupported: "이 브라우저는 음성 인식을 지원하지 않아요."
    } },
    en: { speech: "en-US", other: "ko", text: {
      hint: "Tap the mic and speak English. It appears in Korean on the other half and is spoken aloud.",
      tap: "Tap to speak", listening: "Listening… stops when you finish", translating: "Translating…",
      noSpeech: "Didn't hear anything. Tap and try again.", denied: "Malhae needs the microphone. Allow it in your browser settings.",
      failed: "Couldn't translate that. Please try again.", limit: "Today's free translations are used up.", offline: "This needs an internet connection.",
      mine: "You said: ", unsupported: "This browser can't listen. Open Malhae in Safari or Chrome, or use Talk mode in the phrasebook."
    } }
  };

  // ---- Elements of each half ----
  const sides = {};
  document.querySelectorAll(".vside").forEach((root) => {
    const lang = root.dataset.lang;
    sides[lang] = {
      root, lang,
      main: root.querySelector(".vmain"), orig: root.querySelector(".vorig"), live: root.querySelector(".vlive"),
      mic: root.querySelector(".vmic"), status: root.querySelector(".vstatus"), replay: root.querySelector(".vreplay"),
      heard: null // the last message shown on this half: { text, lang }
    };
  });
  const T = (lang) => LANGS[lang].text;
  function status(lang, text, isError) {
    const s = sides[lang].status;
    s.textContent = text;
    s.classList.toggle("is-error", !!isError);
  }
  function idle(lang) { sides[lang].mic.setAttribute("aria-pressed", "false"); sides[lang].mic.setAttribute("aria-label", T(lang).tap); status(lang, T(lang).tap); }

  // ---- Speaking aloud: the best installed voice for the language ----
  const synth = window.speechSynthesis;
  let slow = false;
  try { slow = JSON.parse(localStorage.getItem("malhaeSlow")) === true; } catch (e) { /* default */ }
  function voiceFor(code) {
    if (!synth) return null;
    const all = synth.getVoices().filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(code.slice(0, 2)));
    const exact = all.filter((v) => v.lang.replace("_", "-") === code);
    const pool = exact.length ? exact : all;
    return pool.find((v) => /yuna|유나|samantha/i.test(v.name)) || pool.find((v) => v.localService) || pool[0] || null;
  }
  function speak(text, lang) {
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGS[lang].speech;
    const v = voiceFor(u.lang);
    if (v) u.voice = v;
    u.rate = slow ? 0.6 : 0.9;
    synth.speak(u);
  }
  if (synth) synth.addEventListener?.("voiceschanged", () => {});

  // ---- Translating (MyMemory; its machine translation is preferred, answers in the wrong script skipped) ----
  async function translate(text, from, to) {
    const fits = (s) => typeof s === "string" && s.trim() !== "" && (to === "ko" ? HANGUL.test(s) : !HANGUL.test(s));
    const url = "https://api.mymemory.translated.net/get?" + new URLSearchParams({ q: text, langpair: from + "|" + to });
    let res;
    try { res = await fetch(url); } catch (e) { throw new Error(navigator.onLine === false ? "offline" : "failed"); }
    if (res.status === 429) throw new Error("limit");
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    if (data.quotaFinished || String(data.responseStatus) === "429") throw new Error("limit");
    const found = Array.isArray(data.matches) ? data.matches : [];
    const machine = found.find((m) => m["created-by"] === "MT!" && fits(m.translation));
    const top = data.responseData && data.responseData.translatedText;
    const best = machine ? machine.translation : fits(top) ? top
      : (found.filter((m) => fits(m.translation)).sort((a, b) => b.match - a.match)[0] || {}).translation;
    if (!best) throw new Error("failed");
    return new DOMParser().parseFromString(best, "text/html").documentElement.textContent;
  }

  // ---- Showing a message ----
  function render() {
    Object.values(sides).forEach((s) => {
      const h = s.heard;
      s.main.classList.toggle("is-hint", !h);
      s.main.textContent = h ? h.text : T(s.lang).hint;
      s.orig.textContent = h && h.original ? h.original : "";
      s.replay.hidden = !h;
    });
  }
  // Someone on half `from` said `original`; it was translated to `translated` for the other half
  function deliver(from, original, translated) {
    const to = LANGS[from].other;
    sides[to].heard = { text: translated, original };
    sides[from].live.textContent = T(from).mine + original;
    render();
    speak(translated, to);
  }
  Object.values(sides).forEach((s) => s.replay.addEventListener("click", () => s.heard && speak(s.heard.text, s.lang)));

  // ---- Listening: one half at a time ----
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let active = null; // { lang, rec, finalText }

  function stopListening() {
    if (!active) return;
    try { active.rec.stop(); } catch (e) { /* already stopped */ }
  }

  function listen(lang) {
    if (active) { const same = active.lang === lang; stopListening(); if (same) return; }
    if (synth) synth.cancel(); // never let the phone's own voice be picked up by the mic
    const rec = new Recognition();
    rec.lang = LANGS[lang].speech;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    const me = { lang, rec, finalText: "", error: null };
    active = me;
    const s = sides[lang];
    s.mic.setAttribute("aria-pressed", "true");
    s.mic.setAttribute("aria-label", T(lang).listening);
    status(lang, T(lang).listening);
    s.live.textContent = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) me.finalText += r[0].transcript; else interim += r[0].transcript;
      }
      s.live.textContent = (me.finalText + interim).trim();
    };
    rec.onerror = (e) => { me.error = e.error; };
    rec.onend = async () => {
      if (active === me) active = null;
      const text = (me.finalText || s.live.textContent || "").trim();
      if (me.error === "not-allowed" || me.error === "service-not-allowed") { idle(lang); status(lang, T(lang).denied, true); return; }
      if (!text) { idle(lang); if (me.error !== "aborted") status(lang, T(lang).noSpeech, true); return; }
      s.mic.setAttribute("aria-pressed", "false");
      s.mic.disabled = true;
      status(lang, T(lang).translating);
      try {
        const out = await translate(text, lang, LANGS[lang].other);
        deliver(lang, text, out);
        idle(lang);
      } catch (err) {
        idle(lang);
        status(lang, T(lang)[err.message] || T(lang).failed, true);
      } finally {
        s.mic.disabled = false;
      }
    };
    try { rec.start(); } catch (e) { active = null; idle(lang); status(lang, T(lang).failed, true); }
  }

  // ---- Slow voice: the same setting as the phrasebook ----
  const slowBtn = document.getElementById("v-slow");
  slowBtn.setAttribute("aria-pressed", String(slow));
  slowBtn.addEventListener("click", () => {
    slow = !slow;
    slowBtn.setAttribute("aria-pressed", String(slow));
    try { localStorage.setItem("malhaeSlow", JSON.stringify(slow)); } catch (e) { /* not saved */ }
  });

  // ---- Start ----
  render();
  if (!Recognition) {
    Object.values(sides).forEach((s) => { s.mic.disabled = true; status(s.lang, T(s.lang).unsupported, true); });
    return;
  }
  Object.values(sides).forEach((s) => {
    idle(s.lang);
    s.mic.addEventListener("click", () => listen(s.lang));
  });
})();
