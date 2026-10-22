// ============ MALHAE (말해, "say it"): find or type an English phrase, hear it in Korean ============
// The phrases are written in advance (polite 해요/합니다 style), so they are accurate and work offline.
// The voice is the phone's own Korean speech voice (Web Speech API); nothing is sent anywhere to speak.
// Only a sentence you type yourself is sent to MyMemory to be translated.
(() => {
  "use strict";

  // ---- Phrasebook: [English, Korean, romanization] by topic ----
  const TOPICS = [
    { id: "basics", name: "Basics", phrases: [
      ["Hello", "안녕하세요", "annyeonghaseyo"],
      ["Thank you", "감사합니다", "gamsahamnida"],
      ["I'm sorry", "죄송합니다", "joesonghamnida"],
      ["Excuse me (to call staff)", "저기요", "jeogiyo"],
      ["Yes", "네", "ne"],
      ["No", "아니요", "aniyo"],
      ["Nice to meet you", "만나서 반가워요", "mannaseo bangawoyo"],
      ["I'm from the Philippines", "저는 필리핀에서 왔어요", "jeoneun pillipineseo wasseoyo"],
      ["I don't speak Korean well", "한국어를 잘 못해요", "hangugeoreul jal motaeyo"],
      ["Please speak slowly", "천천히 말해 주세요", "cheoncheonhi malhae juseyo"],
      ["Could you say that again?", "다시 한번 말해 주세요", "dasi hanbeon malhae juseyo"],
      ["Goodbye (you are leaving)", "안녕히 계세요", "annyeonghi gyeseyo"],
      ["Goodbye (they are leaving)", "안녕히 가세요", "annyeonghi gaseyo"]
    ] },
    { id: "food", name: "Restaurant", phrases: [
      ["One person, please", "한 명이에요", "han myeongieyo"],
      ["Two people, please", "두 명이에요", "du myeongieyo"],
      ["Is this seat taken?", "여기 자리 있어요?", "yeogi jari isseoyo?"],
      ["Menu, please", "메뉴판 주세요", "menyupan juseyo"],
      ["This one, please", "이거 주세요", "igeo juseyo"],
      ["One more, please", "하나 더 주세요", "hana deo juseyo"],
      ["Not spicy, please", "안 맵게 해 주세요", "an maepge hae juseyo"],
      ["I'm allergic to shrimp", "새우 알레르기가 있어요", "saeu allereugiga isseoyo"],
      ["Water, please", "물 좀 주세요", "mul jom juseyo"],
      ["It's delicious", "맛있어요", "masisseoyo"],
      ["To go, please", "포장해 주세요", "pojanghae juseyo"],
      ["The bill, please", "계산해 주세요", "gyesanhae juseyo"]
    ] },
    { id: "shop", name: "Shopping", phrases: [
      ["How much is it?", "얼마예요?", "eolmayeyo?"],
      ["Can I pay by card?", "카드 돼요?", "kadeu dwaeyo?"],
      ["A bag, please", "봉투 주세요", "bongtu juseyo"],
      ["Please heat this up", "데워 주세요", "dewo juseyo"],
      ["I'm just looking", "그냥 구경하는 거예요", "geunyang gugyeonghaneun geoyeyo"],
      ["Do you have a bigger size?", "더 큰 사이즈 있어요?", "deo keun saijeu isseoyo?"],
      ["Could you give me a discount?", "깎아 주세요", "kkakka juseyo"],
      ["Receipt, please", "영수증 주세요", "yeongsujeung juseyo"]
    ] },
    { id: "travel", name: "Getting around", phrases: [
      ["Where is the subway station?", "지하철역이 어디예요?", "jihacheollyeogi eodiyeyo?"],
      ["Where is the exit?", "출구가 어디예요?", "chulguga eodiyeyo?"],
      ["Where is the restroom?", "화장실이 어디예요?", "hwajangsiri eodiyeyo?"],
      ["Please charge my T-money card", "티머니 충전해 주세요", "timeoni chungjeonhae juseyo"],
      ["Please take me to this address", "이 주소로 가 주세요", "i jusoro ga juseyo"],
      ["Please stop here", "여기서 세워 주세요", "yeogiseo sewo juseyo"],
      ["Does this bus go to Seoul Station?", "이 버스 서울역 가요?", "i beoseu seoullyeok gayo?"],
      ["How long does it take?", "얼마나 걸려요?", "eolmana geollyeoyo?"],
      ["I'm lost", "길을 잃었어요", "gireul ireosseoyo"]
    ] },
    { id: "talk", name: "Talking", phrases: [
      ["I'm a computer engineering student", "저는 컴퓨터공학과 학생이에요", "jeoneun keompyuteogonghakgwa haksaengieyo"],
      ["Could you help me?", "도와주실 수 있어요?", "dowajusil su isseoyo?"],
      ["Wait a moment, please", "잠시만요", "jamsimanyo"],
      ["I understand", "이해했어요", "ihaehaesseoyo"],
      ["I don't understand", "이해가 안 돼요", "ihaega an dwaeyo"],
      ["Please write it down", "적어 주세요", "jeogeo juseyo"],
      ["What's the Wi-Fi password?", "와이파이 비밀번호가 뭐예요?", "waipai bimilbeonhoga mwoyeyo?"]
    ] },
    { id: "help", name: "Emergency", phrases: [
      ["Help!", "도와주세요!", "dowajuseyo!"],
      ["Please call an ambulance", "구급차 불러 주세요", "gugeupcha bulleo juseyo"],
      ["Please call the police", "경찰 불러 주세요", "gyeongchal bulleo juseyo"],
      ["I'm sick", "아파요", "apayo"],
      ["Where is the hospital?", "병원이 어디예요?", "byeongwoni eodiyeyo?"],
      ["Where is a pharmacy?", "약국이 어디예요?", "yakgugi eodiyeyo?"],
      ["I lost my phone", "핸드폰을 잃어버렸어요", "haendeuponeul ireobeoryeosseoyo"]
    ] }
  ];
  // Every built-in phrase as one object; the English text is its stable id (used for saved stars)
  const BUILT_IN = TOPICS.flatMap((t) => t.phrases.map(([en, ko, rom]) => ({ id: "p:" + en, en, ko, rom, topic: t.id })));

  // ---- Saved on this phone: starred phrases, your own translations, the slow setting ----
  const store = {
    get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* not saved: private browsing */ } }
  };
  const starred = new Set(store.get("malhaeStarred", []).filter((id) => typeof id === "string"));
  let own = store.get("malhaeOwn", []).filter((p) => p && typeof p.en === "string" && typeof p.ko === "string");
  // Version 1 saved typed sentences as [en, ko, note]; bring them over once
  store.get("malhaeMine", []).forEach((p) => {
    if (Array.isArray(p) && p.length === 3 && !own.some((o) => o.en === p[0])) own.push({ id: "o:" + p[0], en: p[0], ko: p[1] });
  });
  const saveStars = () => store.set("malhaeStarred", [...starred]);
  const saveOwn = () => store.set("malhaeOwn", own);
  saveOwn();

  // ---- State and elements ----
  const state = { query: "", topic: "all", slow: store.get("malhaeSlow", false) === true, last: null, pending: null };
  const $ = (id) => document.getElementById(id);
  const list = $("list"), chips = $("chips"), finding = $("finding"), q = $("q");
  const ownPhrase = (p) => ({ ...p, rom: "Machine translation. Check it if it matters.", topic: "saved", own: true });
  const savedPhrases = () => [...own.map(ownPhrase), ...BUILT_IN.filter((p) => starred.has(p.id))];

  // Search: English, Korean and romanization, ignoring case and extra spaces
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const matches = (p) => !state.query || [p.en, p.ko, p.rom || ""].some((s) => norm(s).includes(norm(state.query)));
  function inTopic(topic) {
    if (topic === "all") return [...own.map(ownPhrase), ...BUILT_IN];
    if (topic === "saved") return savedPhrases();
    return BUILT_IN.filter((p) => p.topic === topic);
  }

  // ---- Korean voice: the best installed ko-KR voice (voices load late on some phones) ----
  const synth = window.speechSynthesis;
  let voice = null;
  function pickVoice() {
    if (!synth) return;
    const ko = synth.getVoices().filter((v) => /^ko(-|_|$)/i.test(v.lang));
    // "Yuna" is the usual Korean voice on Apple devices
    voice = ko.find((v) => /yuna|유나/i.test(v.name)) || ko.find((v) => v.localService) || ko[0] || null;
  }
  if (synth) { pickVoice(); synth.addEventListener?.("voiceschanged", pickVoice); }

  function speak(p) {
    state.last = p;
    renderPlayer();
    document.querySelectorAll(".row.is-playing").forEach((r) => r.classList.remove("is-playing"));
    const row = list.querySelector('[data-id="' + CSS.escape(p.id) + '"]');
    if (row) row.classList.add("is-playing");
    if (!synth) { notice("This browser can't speak. Use Show to let the other person read the Korean."); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(p.ko);
    u.lang = "ko-KR";
    if (voice) u.voice = voice;
    u.rate = state.slow ? 0.6 : 0.9;
    u.onend = u.onerror = () => { if (row) row.classList.remove("is-playing"); };
    synth.speak(u);
    if (!voice && !synth.getVoices().some((v) => /^ko/i.test(v.lang))) {
      notice("No Korean voice found on this phone. On iPhone: Settings, Accessibility, Spoken Content, Voices, Korean.");
    }
  }
  function notice(text) { const n = $("notice"); n.textContent = text; n.hidden = !text; }

  // ---- Drawing ----
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';

  function renderChips() {
    chips.replaceChildren();
    const all = [{ id: "all", name: "All" }, ...(savedPhrases().length ? [{ id: "saved", name: "Saved" }] : []), ...TOPICS];
    all.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-pressed", String(t.id === state.topic));
      const n = inTopic(t.id).filter(matches).length;
      b.append(t.name);
      const count = document.createElement("span");
      count.className = "n";
      count.textContent = n;
      b.append(count);
      b.addEventListener("click", () => { state.topic = t.id; render(); });
      chips.append(b);
    });
  }

  function phraseRow(p) {
    const li = document.createElement("li");
    li.className = "row";
    li.dataset.id = p.id;
    if (state.last && state.last.id === p.id && synth && synth.speaking) li.classList.add("is-playing");
    const say = document.createElement("button");
    say.type = "button";
    say.className = "say";
    say.setAttribute("aria-label", p.en + ". Play in Korean: " + p.ko);
    const en = document.createElement("span"); en.className = "en"; en.textContent = p.en;
    const ko = document.createElement("span"); ko.className = "ko"; ko.lang = "ko"; ko.textContent = p.ko;
    const rom = document.createElement("span"); rom.className = "rom"; rom.textContent = p.rom || "";
    say.append(en, ko, rom);
    say.addEventListener("click", () => speak(p));

    const acts = document.createElement("div");
    acts.className = "acts";
    const star = document.createElement("button");
    star.type = "button";
    star.className = "icon-btn";
    const isSaved = p.own || starred.has(p.id);
    star.setAttribute("aria-pressed", String(isSaved));
    star.setAttribute("aria-label", (isSaved ? "Remove from saved: " : "Save: ") + p.en);
    star.innerHTML = STAR;
    star.addEventListener("click", () => {
      if (p.own) { own = own.filter((o) => o.id !== p.id); saveOwn(); }
      else if (starred.has(p.id)) starred.delete(p.id);
      else starred.add(p.id);
      saveStars();
      if (state.topic === "saved" && !savedPhrases().length) state.topic = "all";
      render();
    });
    const show = document.createElement("button");
    show.type = "button";
    show.className = "text-btn";
    show.textContent = "Show";
    show.setAttribute("aria-label", "Show " + p.en + " in large Korean text");
    show.addEventListener("click", () => openShow(p));
    acts.append(star, show);
    li.append(say, acts);
    return li;
  }

  // The row that translates what you typed, with its loading and error states
  function ownRow(text) {
    const li = document.createElement("li");
    li.className = "row row--own";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "say";
    const label = document.createElement("span"); label.className = "label";
    const en = document.createElement("span"); en.className = "en";
    const strong = document.createElement("strong"); strong.textContent = text;
    en.append(strong);
    b.append(label, en);
    const p = state.pending;
    if (p && p.text === text && p.status === "loading") {
      label.textContent = "Translating";
      const bar = document.createElement("span"); bar.className = "bar";
      b.append(bar);
      b.disabled = true;
    } else if (p && p.text === text && p.status === "error") {
      label.textContent = "Your own sentence";
      const err = document.createElement("span"); err.className = "err"; err.textContent = p.message + " Tap to try again.";
      b.append(err);
    } else {
      label.textContent = "Not in the phrasebook? Tap to translate and hear it";
    }
    b.addEventListener("click", () => translateOwn(text));
    li.append(b);
    return li;
  }

  function renderList() {
    list.replaceChildren();
    const rows = inTopic(state.topic).filter(matches);
    const text = state.query.trim();
    // A typed sentence that isn't an exact phrase gets its own translate row, first
    const exact = rows.some((p) => norm(p.en) === norm(text));
    if (text.length >= 2 && !exact && !/[가-힣]/.test(text)) list.append(ownRow(text));
    rows.forEach((p) => list.append(phraseRow(p)));
    if (!list.children.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No phrase matches “" + text + "”.";
      list.append(li);
    }
    // The line under the title: what is on screen right now
    const topicName = state.topic === "all" ? "" : " in " + (state.topic === "saved" ? "Saved" : TOPICS.find((t) => t.id === state.topic).name);
    finding.textContent = text
      ? rows.length + (rows.length === 1 ? " phrase matches" : " phrases match") + " “" + text + "”" + topicName + "."
      : rows.length + " phrases" + topicName + ". Tap one to hear it in Korean.";
  }

  function renderPlayer() {
    const p = state.last;
    $("player").hidden = !p;
    document.body.classList.toggle("has-player", !!p);
    if (!p) return;
    $("player-ko").textContent = p.ko;
    $("player-en").textContent = p.en;
  }

  function render() { renderChips(); renderList(); renderPlayer(); }

  // ---- Translating your own sentence (MyMemory; its machine translation is preferred) ----
  const HANGUL = /[가-힣]/;
  async function translate(text) {
    const url = "https://api.mymemory.translated.net/get?" + new URLSearchParams({ q: text, langpair: "en|ko" });
    let res;
    try { res = await fetch(url); } catch (e) { throw new Error(navigator.onLine === false ? "offline" : "network"); }
    if (res.status === 429) throw new Error("limit");
    if (!res.ok) throw new Error("network");
    const data = await res.json();
    if (data.quotaFinished || String(data.responseStatus) === "429") throw new Error("limit");
    const found = Array.isArray(data.matches) ? data.matches : [];
    const machine = found.find((m) => m["created-by"] === "MT!" && HANGUL.test(m.translation || ""));
    const top = data.responseData && data.responseData.translatedText;
    const best = machine ? machine.translation : HANGUL.test(top || "") ? top
      : (found.filter((m) => HANGUL.test(m.translation || "")).sort((a, b) => b.match - a.match)[0] || {}).translation;
    if (!best) throw new Error("empty");
    return new DOMParser().parseFromString(best, "text/html").documentElement.textContent;
  }
  const MESSAGES = {
    limit: "Today's free translations are used up. Try again tomorrow.",
    offline: "No internet. The phrasebook still works offline.",
    network: "Couldn't reach the translator.",
    empty: "No translation found. Try simpler words."
  };
  async function translateOwn(text) {
    if (state.pending && state.pending.status === "loading") return;
    state.pending = { text, status: "loading" };
    renderList();
    try {
      const ko = await translate(text);
      const p = { id: "o:" + text, en: text, ko };
      own = [p, ...own.filter((o) => o.en !== text)].slice(0, 40);
      saveOwn();
      state.pending = null;
      state.query = "";
      q.value = "";
      $("clear").hidden = true;
      state.topic = "saved";
      render();
      speak(ownPhrase(p));
    } catch (e) {
      state.pending = { text, status: "error", message: MESSAGES[e.message] || MESSAGES.network };
      renderList();
    }
  }

  // ---- Find field ----
  q.addEventListener("input", () => {
    state.query = q.value;
    state.pending = null;
    $("clear").hidden = !q.value;
    renderChips();
    renderList();
  });
  $("find").addEventListener("submit", (e) => {
    e.preventDefault();
    q.blur();
    const text = state.query.trim();
    const rows = inTopic(state.topic).filter(matches);
    // Enter plays the only match, or translates when nothing matches
    if (rows.length === 1) speak(rows[0]);
    else if (!rows.length && text.length >= 2 && !HANGUL.test(text)) translateOwn(text);
  });
  $("clear").addEventListener("click", () => {
    q.value = "";
    state.query = "";
    state.pending = null;
    $("clear").hidden = true;
    render();
    q.focus();
  });

  // ---- Slow voice ----
  const slowBtn = $("slow");
  slowBtn.setAttribute("aria-pressed", String(state.slow));
  slowBtn.addEventListener("click", () => {
    state.slow = !state.slow;
    slowBtn.setAttribute("aria-pressed", String(state.slow));
    store.set("malhaeSlow", state.slow);
  });

  // ---- Player and Show ----
  $("replay").addEventListener("click", () => state.last && speak(state.last));
  $("player-show").addEventListener("click", () => state.last && openShow(state.last));
  let lastFocus = null;
  function openShow(p) {
    lastFocus = document.activeElement;
    $("show-ko").textContent = p.ko;
    $("show-en").textContent = p.en;
    $("show").hidden = false;
    $("show-play").focus();
    speak(p);
  }
  function closeShow() {
    $("show").hidden = true;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  $("show-play").addEventListener("click", () => state.last && speak(state.last));
  $("show-close").addEventListener("click", closeShow);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("show").hidden) closeShow(); });

  // ---- Works offline after the first visit ----
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* works without it */ });
  }

  render();
})();
