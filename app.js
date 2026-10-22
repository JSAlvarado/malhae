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
    { id: "words", name: "Words", phrases: [
      ["Water", "물", "mul"],
      ["Restroom", "화장실", "hwajangsil"],
      ["Hospital", "병원", "byeongwon"],
      ["Pharmacy", "약국", "yakguk"],
      ["Subway", "지하철", "jihacheol"],
      ["Bus", "버스", "beoseu"],
      ["Taxi", "택시", "taeksi"],
      ["Station", "역", "yeok"],
      ["Exit", "출구", "chulgu"],
      ["Left", "왼쪽", "oenjjok"],
      ["Right", "오른쪽", "oreunjjok"],
      ["Straight ahead", "직진", "jikjin"],
      ["Here", "여기", "yeogi"],
      ["There", "저기", "jeogi"],
      ["Now", "지금", "jigeum"],
      ["Today", "오늘", "oneul"],
      ["Tomorrow", "내일", "naeil"],
      ["Yesterday", "어제", "eoje"],
      ["Cash", "현금", "hyeongeum"],
      ["Card", "카드", "kadeu"],
      ["Rice", "밥", "bap"],
      ["Coffee", "커피", "keopi"],
      ["Beef", "소고기", "sogogi"],
      ["Pork", "돼지고기", "dwaejigogi"],
      ["It's spicy", "매워요", "maewoyo"],
      ["It's hot (temperature)", "뜨거워요", "tteugeowoyo"],
      ["It's cold", "차가워요", "chagawoyo"]
    ] },
    // Korean has two number systems: Sino-Korean (일, 이, 삼) for money, minutes, dates and phone numbers,
    // and native Korean (하나, 둘, 셋) for counting things, hours and age
    { id: "numbers", name: "Numbers", phrases: [
      ["0 (zero)", "영", "yeong"],
      ["1 (money, minutes)", "일", "il"],
      ["2 (money, minutes)", "이", "i"],
      ["3 (money, minutes)", "삼", "sam"],
      ["4 (money, minutes)", "사", "sa"],
      ["5 (money, minutes)", "오", "o"],
      ["6 (money, minutes)", "육", "yuk"],
      ["7 (money, minutes)", "칠", "chil"],
      ["8 (money, minutes)", "팔", "pal"],
      ["9 (money, minutes)", "구", "gu"],
      ["10 (money, minutes)", "십", "sip"],
      ["100", "백", "baek"],
      ["1,000", "천", "cheon"],
      ["10,000", "만", "man"],
      ["1 (counting things)", "하나", "hana"],
      ["2 (counting things)", "둘", "dul"],
      ["3 (counting things)", "셋", "set"],
      ["4 (counting things)", "넷", "net"],
      ["5 (counting things)", "다섯", "daseot"],
      ["6 (counting things)", "여섯", "yeoseot"],
      ["7 (counting things)", "일곱", "ilgop"],
      ["8 (counting things)", "여덟", "yeodeol"],
      ["9 (counting things)", "아홉", "ahop"],
      ["10 (counting things)", "열", "yeol"],
      ["One of these, please", "한 개 주세요", "han gae juseyo"],
      ["Two of these, please", "두 개 주세요", "du gae juseyo"],
      ["Three of these, please", "세 개 주세요", "se gae juseyo"],
      ["1,000 won", "천 원", "cheon won"],
      ["5,000 won", "오천 원", "ocheon won"],
      ["10,000 won", "만 원", "man won"],
      ["50,000 won", "오만 원", "oman won"],
      ["1 o'clock", "한 시", "han si"],
      ["2 o'clock", "두 시", "du si"],
      ["30 minutes", "삼십 분", "samsip bun"]
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
  const BY_ID = new Map(BUILT_IN.map((p) => [p.id, p]));

  // ---- Suggested next: what people usually say after each phrase, best first ----
  // This is the starting point; the app also learns from the order you tap phrases on this phone.
  const NEXT = {
    "Hello": ["I don't speak Korean well", "Could you help me?", "Excuse me (to call staff)"],
    "Excuse me (to call staff)": ["Menu, please", "Water, please", "The bill, please"],
    "I don't speak Korean well": ["Please speak slowly", "Please write it down", "Thank you"],
    "Could you say that again?": ["Please speak slowly", "Please write it down", "I understand"],
    "I don't understand": ["Please speak slowly", "Please write it down", "Could you say that again?"],
    "Nice to meet you": ["I'm from the Philippines", "I'm a computer engineering student", "Thank you"],
    "I'm from the Philippines": ["I'm a computer engineering student", "I don't speak Korean well", "Nice to meet you"],
    "One person, please": ["Menu, please", "Water, please", "Is this seat taken?"],
    "Two people, please": ["Menu, please", "Water, please", "Is this seat taken?"],
    "Is this seat taken?": ["Thank you", "Menu, please", "Water, please"],
    "Menu, please": ["This one, please", "Not spicy, please", "I'm allergic to shrimp"],
    "This one, please": ["One more, please", "Not spicy, please", "Water, please"],
    "Not spicy, please": ["This one, please", "Water, please", "Thank you"],
    "I'm allergic to shrimp": ["Not spicy, please", "This one, please", "Thank you"],
    "It's delicious": ["One more, please", "The bill, please", "Thank you"],
    "To go, please": ["The bill, please", "Can I pay by card?", "Thank you"],
    "The bill, please": ["Can I pay by card?", "Receipt, please", "Thank you"],
    "How much is it?": ["Can I pay by card?", "Could you give me a discount?", "This one, please"],
    "Can I pay by card?": ["Receipt, please", "A bag, please", "Thank you"],
    "I'm just looking": ["How much is it?", "Do you have a bigger size?", "Thank you"],
    "Do you have a bigger size?": ["How much is it?", "This one, please", "Thank you"],
    "Please heat this up": ["A bag, please", "Can I pay by card?", "Thank you"],
    "Where is the subway station?": ["How long does it take?", "Left", "Right"],
    "Where is the restroom?": ["Thank you", "Left", "Right"],
    "Please take me to this address": ["How long does it take?", "Please stop here", "Can I pay by card?"],
    "Please stop here": ["Can I pay by card?", "Receipt, please", "Thank you"],
    "Does this bus go to Seoul Station?": ["How long does it take?", "Please charge my T-money card", "Thank you"],
    "How long does it take?": ["Thank you", "Please speak slowly", "30 minutes"],
    "I'm lost": ["Where is the subway station?", "Could you help me?", "Please take me to this address"],
    "Could you help me?": ["I'm lost", "I don't speak Korean well", "Thank you"],
    "Help!": ["Please call an ambulance", "Please call the police", "I'm sick"],
    "I'm sick": ["Where is the hospital?", "Where is a pharmacy?", "Please call an ambulance"],
    "Where is the hospital?": ["Please call an ambulance", "Please take me to this address", "Thank you"],
    "I lost my phone": ["Please call the police", "Could you help me?", "Thank you"],
    "Thank you": ["Goodbye (you are leaving)", "Goodbye (they are leaving)", "It's delicious"]
  };
  // What you yourself tapped after each phrase, counted on this phone
  const learned = (() => { try { const v = JSON.parse(localStorage.getItem("malhaeLearned")); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } })();
  function learn(prev, next) {
    // Typed numbers are one-offs, so they are never learned as a step in a conversation
    if (!prev || !next || prev.id === next.id || prev.temp || next.temp) return;
    const row = (learned[prev.id] = learned[prev.id] || {});
    row[next.id] = (row[next.id] || 0) + 1;
    try { localStorage.setItem("malhaeLearned", JSON.stringify(learned)); } catch (e) { /* not saved */ }
  }
  // Top next phrases: your own habits count double, the usual patterns fill the rest
  function suggestNext(p, count = 4) {
    const score = new Map();
    // A typed price leads to paying, like "How much is it?"
    const key = p.temp && p.id.endsWith("w") ? "How much is it?" : p.en;
    (NEXT[key] || []).forEach((en, i) => { if (BY_ID.has("p:" + en)) score.set("p:" + en, 3 - i); });
    Object.entries(learned[p.id] || {}).forEach(([id, n]) => score.set(id, (score.get(id) || 0) + 2 * n));
    score.delete(p.id);
    const picks = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => phraseById(id)).filter(Boolean).slice(0, count);
    // Not enough known? Fill with the phrases that follow this one in its topic
    const topic = TOPICS.find((t) => t.id === p.topic);
    if (picks.length < count && topic) {
      const list = topic.phrases.map(([en]) => BY_ID.get("p:" + en));
      const at = list.findIndex((x) => x.id === p.id);
      for (let i = 1; i < list.length && picks.length < count; i++) {
        const x = list[(at + i) % list.length];
        if (x.id !== p.id && !picks.some((y) => y.id === x.id)) picks.push(x);
      }
    }
    return picks;
  }

  // ---- Numbers: any number you type is read the Sino-Korean way (prices, minutes, phone numbers) ----
  const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  function fourDigits(n) {
    // "일" is left out before 십, 백 and 천: 10 is 십, not 일십
    return [[1000, "천"], [100, "백"], [10, "십"], [1, ""]].map(([v, unit]) => {
      const d = Math.floor(n / v) % 10;
      return d ? (d === 1 && unit ? "" : DIGITS[d]) + unit : "";
    }).join("");
  }
  function sinoKorean(n) {
    if (n === 0) return "영";
    const eok = Math.floor(n / 1e8), man = Math.floor(n / 1e4) % 1e4, rest = n % 1e4;
    return [eok ? fourDigits(eok) + "억" : "", man ? (man === 1 ? "" : fourDigits(man)) + "만" : "", rest ? fourDigits(rest) : ""]
      .filter(Boolean).join(" ");
  }
  // "12500", "12,500 won" or "₩12500" becomes a playable row
  function numberPhrase(text) {
    const m = text.match(/^\s*(₩\s*)?(\d[\d,]*)\s*(won|원)?\s*$/i);
    if (!m) return null;
    const n = Number(m[2].replace(/,/g, ""));
    if (!Number.isSafeInteger(n) || n >= 1e12) return null;
    const won = !!(m[1] || m[3]);
    return { id: "n:" + n + (won ? "w" : ""), en: n.toLocaleString("en-US") + (won ? " won" : ""), ko: sinoKorean(n) + (won ? " 원" : ""),
      rom: won ? "Korean price" : "Korean number (for money, minutes and phone numbers)", temp: true };
  }

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
  const phraseById = (id) => { if (BY_ID.has(id)) return BY_ID.get(id); const o = own.find((x) => x.id === id); return o ? ownPhrase(o) : null; };

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

  function speak(p, opts = {}) {
    learn(state.last, p);
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
    u.rate = state.slow || opts.slow ? 0.6 : 0.9;
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
    // A typed number is not a phrase to keep, so it gets no star
    if (p.temp) acts.append(show); else acts.append(star, show);
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
    const num = numberPhrase(text);
    if (num) list.append(phraseRow(num));
    else if (text.length >= 2 && !exact && !/[가-힣]/.test(text)) list.append(ownRow(text));
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
      : rows.length + " phrases" + topicName + ". Tap one to hear it in Korean." + (state.topic === "numbers" ? " Type any number or price above to hear it." : "");
  }

  function renderPlayer() {
    const p = state.last;
    $("player").hidden = !p;
    document.body.classList.toggle("has-player", !!p);
    if (!p) return;
    $("player-ko").textContent = p.ko;
    $("player-en").textContent = p.en;
    // Suggested next: one tap plays it
    const next = $("next");
    next.replaceChildren();
    const picks = suggestNext(p);
    next.hidden = !picks.length;
    if (!picks.length) return;
    const lbl = document.createElement("span");
    lbl.className = "next-lbl";
    lbl.textContent = "Next";
    next.append(lbl);
    picks.forEach((s) => next.append(tile(s, () => speak(s))));
  }

  // A big say-it button: English over Korean
  function tile(p, onTap) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tile";
    b.setAttribute("aria-label", "Say: " + p.en + ", " + p.ko);
    const en = document.createElement("span"); en.className = "en"; en.textContent = p.en;
    const ko = document.createElement("span"); ko.className = "ko"; ko.lang = "ko"; ko.textContent = p.ko;
    b.append(en, ko);
    b.addEventListener("click", onTap);
    return b;
  }

  function render() { renderChips(); renderList(); renderPlayer(); }

  // ---- Translating your own sentence (MyMemory; its machine translation is preferred) ----
  const HANGUL = /[가-힣]/;
  async function translate(text, from = "en", to = "ko") {
    // A Korean answer must contain Hangul; an English one must not
    const fits = (s) => typeof s === "string" && s.trim() !== "" && (to === "ko" ? HANGUL.test(s) : !HANGUL.test(s));
    const url = "https://api.mymemory.translated.net/get?" + new URLSearchParams({ q: text, langpair: from + "|" + to });
    let res;
    try { res = await fetch(url); } catch (e) { throw new Error(navigator.onLine === false ? "offline" : "network"); }
    if (res.status === 429) throw new Error("limit");
    if (!res.ok) throw new Error("network");
    const data = await res.json();
    if (data.quotaFinished || String(data.responseStatus) === "429") throw new Error("limit");
    const found = Array.isArray(data.matches) ? data.matches : [];
    const machine = found.find((m) => m["created-by"] === "MT!" && fits(m.translation));
    const top = data.responseData && data.responseData.translatedText;
    const best = machine ? machine.translation : fits(top) ? top
      : (found.filter((m) => fits(m.translation)).sort((a, b) => b.match - a.match)[0] || {}).translation;
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
    const num = numberPhrase(text);
    // Enter plays a typed number, the only match, or translates when nothing matches
    if (num) speak(num);
    else if (rows.length === 1) speak(rows[0]);
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

  // ---- Slow voice (one setting, a button in the phrasebook and one in Talk mode) ----
  const slowBtns = [$("slow"), $("m-slow")];
  const showSlow = () => slowBtns.forEach((b) => b.setAttribute("aria-pressed", String(state.slow)));
  showSlow();
  slowBtns.forEach((b) => b.addEventListener("click", () => {
    state.slow = !state.slow;
    showSlow();
    store.set("malhaeSlow", state.slow);
  }));

  // ============ TALK MODE: face to face on one phone ============
  // Their one-tap replies, in Korean, with what each means for me
  const REPLIES = [
    ["네", "Yes"], ["아니요", "No"], ["맞아요", "That's right"],
    ["잠시만요", "One moment, please"], ["괜찮아요", "It's okay"], ["몰라요", "I don't know"],
    ["있어요", "We have it / There is"], ["없어요", "We don't have it / There isn't"], ["안 돼요", "That's not possible"],
    ["저쪽이에요", "It's over there"], ["여기예요", "It's here"], ["직진하세요", "Go straight"],
    ["왼쪽으로 가세요", "Go left"], ["오른쪽으로 가세요", "Go right"], ["다시 말해 주세요", "Please say it again"],
    ["카드 돼요", "Card is fine"], ["현금만 돼요", "Cash only"], ["감사합니다", "Thank you"]
  ];
  const AGAIN = "다시 말해 주세요";
  // What I am most likely to say after each reply (English phrases from the phrasebook)
  const AFTER_REPLY = {
    "네": ["Thank you", "How much is it?", "This one, please", "How long does it take?"],
    "아니요": ["Thank you", "I'm sorry", "Could you help me?", "Where is the subway station?"],
    "맞아요": ["Thank you", "How much is it?", "How long does it take?", "This one, please"],
    "잠시만요": ["Thank you", "Yes", "I understand", "Wait a moment, please"],
    "괜찮아요": ["Thank you", "I'm sorry", "Goodbye (you are leaving)", "Nice to meet you"],
    "몰라요": ["Thank you", "Could you help me?", "Where is the subway station?", "I'm lost"],
    "있어요": ["This one, please", "How much is it?", "Can I pay by card?", "Thank you"],
    "없어요": ["Thank you", "Do you have a bigger size?", "Where is a pharmacy?", "I'm sorry"],
    "안 돼요": ["I'm sorry", "Thank you", "Could you help me?", "I don't understand"],
    "저쪽이에요": ["Thank you", "How long does it take?", "Please write it down", "Left"],
    "여기예요": ["Thank you", "How much is it?", "This one, please", "Please stop here"],
    "직진하세요": ["Thank you", "How long does it take?", "Please speak slowly", "I understand"],
    "왼쪽으로 가세요": ["Thank you", "How long does it take?", "I understand", "Please speak slowly"],
    "오른쪽으로 가세요": ["Thank you", "How long does it take?", "I understand", "Please speak slowly"],
    [AGAIN]: ["I don't speak Korean well", "Please write it down", "Please speak slowly", "Thank you"],
    "카드 돼요": ["Receipt, please", "A bag, please", "Thank you", "To go, please"],
    "현금만 돼요": ["I'm sorry", "Thank you", "Where is the exit?", "Could you help me?"],
    "감사합니다": ["Thank you", "Goodbye (you are leaving)", "Goodbye (they are leaving)", "Nice to meet you"]
  };
  const START_TALK = ["Hello", "Excuse me (to call staff)", "Could you help me?", "I don't speak Korean well"];
  // After a reply they typed themselves (no preset follow-ups), these fit almost any answer
  const AFTER_TYPED = ["Thank you", "I understand", "Please speak slowly", "Could you say that again?"];
  const talk = { turn: "me", mine: null, theirs: null, last: null, query: "" };
  const byEn = (list) => list.map((en) => BY_ID.get("p:" + en)).filter(Boolean);

  // The four tiles: matches while I type, otherwise what fits the conversation so far
  function talkTiles() {
    const text = talk.query.trim();
    let picks = [];
    if (text) {
      const num = numberPhrase(text);
      if (num) picks.push(num);
      picks.push(...[...own.map(ownPhrase), ...BUILT_IN].filter((p) => [p.en, p.ko, p.rom || ""].some((s) => norm(s).includes(norm(text)))));
    } else if (talk.last === "them" && talk.theirs) {
      picks = byEn(AFTER_REPLY[talk.theirs.ko] || AFTER_TYPED);
      if (talk.mine) picks.push(...suggestNext(talk.mine));
    } else if (talk.mine) {
      picks = suggestNext(talk.mine);
    }
    picks.push(...byEn(START_TALK));
    const seen = new Set();
    return picks.filter((p) => !seen.has(p.id) && seen.add(p.id) && (!talk.mine || text || p.id !== talk.mine.id)).slice(0, 4);
  }

  function renderTalk() {
    $("talk").dataset.turn = talk.turn;
    // Their half: what I said, in big Korean
    const said = $("t-said");
    said.classList.toggle("is-hint", !talk.mine);
    said.textContent = talk.mine ? talk.mine.ko : "안녕하세요! 상대방이 하는 말이 여기에 한국어로 나와요. 아래 버튼으로 답해 주세요.";
    $("t-replay").hidden = !talk.mine;
    // My half: what they said, in big English
    const heard = $("m-heard");
    heard.replaceChildren();
    if (talk.theirs) {
      const en = document.createElement("p"); en.className = "en"; en.textContent = talk.theirs.en;
      const ko = document.createElement("p"); ko.className = "ko"; ko.lang = "ko"; ko.textContent = "They said: " + talk.theirs.ko;
      heard.append(en, ko);
    } else {
      const hint = document.createElement("p"); hint.className = "hint";
      hint.textContent = talk.mine ? "Waiting for their answer. They tap a reply on their half." : "Tap what you want to say. It appears in Korean on the other half and is spoken aloud.";
      heard.append(hint);
    }
    const tiles = $("m-tiles");
    tiles.replaceChildren();
    talkTiles().forEach((p) => tiles.append(tile(p, () => sayToThem(p))));
  }

  // I say something: spoken, and shown big on their half
  function sayToThem(p) {
    talk.mine = p;
    talk.last = "me";
    talk.query = "";
    $("m-input").value = "";
    $("m-note").textContent = "";
    speak(p);
    renderTalk();
  }
  // They answer: shown big on my half; "say it again" replays my phrase slowly
  function theyReplied(ko, en) {
    talk.theirs = { ko, en };
    talk.last = "them";
    if (ko === AGAIN && talk.mine) speak(talk.mine, { slow: true });
    renderTalk();
  }

  // Their one-tap replies
  const replies = $("t-replies");
  REPLIES.forEach(([ko, en]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "reply";
    b.textContent = ko;
    b.addEventListener("click", () => theyReplied(ko, en));
    replies.append(b);
  });
  $("t-replay").addEventListener("click", () => talk.mine && speak(talk.mine));

  // My typing: search as I type; Enter says the top match, a number, or translates my own sentence
  $("m-input").addEventListener("input", (e) => { talk.query = e.target.value; $("m-note").textContent = ""; renderTalk(); });
  $("m-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = talk.query.trim();
    if (!text) return;
    const exact = [...own.map(ownPhrase), ...BUILT_IN].find((p) => norm(p.en) === norm(text));
    const num = numberPhrase(text);
    if (num || exact) { sayToThem(num || exact); return; }
    if (HANGUL.test(text)) { $("m-note").textContent = "Type in English here. Korean goes on the other half."; return; }
    $("m-note").textContent = "Translating…";
    try {
      const ko = await translate(text, "en", "ko");
      const p = { id: "o:" + text, en: text, ko };
      own = [p, ...own.filter((o) => o.en !== text)].slice(0, 40);
      saveOwn();
      sayToThem(ownPhrase(p));
    } catch (err) {
      $("m-note").textContent = MESSAGES[err.message] || MESSAGES.network;
    }
  });

  // Their typing: the halves swap so the keyboard is on their side; after sending, the turn comes back to me
  $("t-type").addEventListener("click", () => { talk.turn = "them"; renderTalk(); });
  $("m-back").addEventListener("click", () => { talk.turn = "me"; renderTalk(); });
  $("t-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("t-input");
    const ko = input.value.trim();
    if (!ko) return;
    $("t-note").textContent = "번역 중…";
    try {
      const en = await translate(ko, "ko", "en");
      input.value = "";
      $("t-note").textContent = "";
      talk.turn = "me";
      theyReplied(ko, en);
    } catch (err) {
      $("t-note").textContent = err.message === "limit" ? "오늘 무료 번역 한도를 다 썼어요. 위의 버튼으로 답해 주세요."
        : "번역하지 못했어요. 위의 버튼으로 답해 주세요.";
    }
  });

  // Opening and closing Talk mode
  let talkFocus = null;
  $("talk-open").addEventListener("click", () => {
    talkFocus = document.activeElement;
    talk.turn = "me";
    $("talk").hidden = false;
    document.body.classList.add("in-talk");
    renderTalk();
    $("talk-close").focus();
  });
  function closeTalk() {
    $("talk").hidden = true;
    document.body.classList.remove("in-talk");
    render();
    if (talkFocus) talkFocus.focus();
  }
  $("talk-close").addEventListener("click", closeTalk);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("talk").hidden && $("show").hidden) closeTalk(); });

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
