// ============ MALHAE (말해, "say it"): tap an English phrase, hear it in Korean ============
// The phrases are written in advance (polite 해요/합니다 style), so they are accurate and work offline.
// The voice is the phone's own Korean speech voice (Web Speech API); nothing is sent anywhere to speak.
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
      ["Menu, please", "메뉴판 주세요", "menyupan juseyo"],
      ["This one, please", "이거 주세요", "igeo juseyo"],
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
      ["Receipt, please", "영수증 주세요", "yeongsujeung juseyo"]
    ] },
    { id: "travel", name: "Getting around", phrases: [
      ["Where is the subway station?", "지하철역이 어디예요?", "jihacheollyeogi eodiyeyo?"],
      ["Where is the restroom?", "화장실이 어디예요?", "hwajangsiri eodiyeyo?"],
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
      ["Please write it down", "적어 주세요", "jeogeo juseyo"]
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
  const MINE = { id: "mine", name: "My phrases", phrases: [] };

  // ---- Elements ----
  const cats = document.getElementById("cats");
  const list = document.getElementById("list");
  const note = document.getElementById("note");
  const slowBtn = document.getElementById("slow");
  const show = document.getElementById("show");
  let current = "basics";
  let slow = false;

  // ---- Saved own phrases: this phone only, inside try/catch (private browsing can block storage) ----
  const KEY = "malhaeMine";
  try { MINE.phrases = JSON.parse(localStorage.getItem(KEY) || "[]").filter((p) => Array.isArray(p) && p.length === 3); } catch (e) { /* none */ }
  const saveMine = () => { try { localStorage.setItem(KEY, JSON.stringify(MINE.phrases)); } catch (e) { /* not saved */ } };
  const topics = () => (MINE.phrases.length ? [...TOPICS, MINE] : TOPICS);

  // ---- Korean voice: pick the best installed ko-KR voice (voices load late on some phones) ----
  const synth = window.speechSynthesis;
  let voice = null;
  function pickVoice() {
    if (!synth) return;
    const ko = synth.getVoices().filter((v) => /^ko(-|_|$)/i.test(v.lang));
    // Prefer a local, default-quality voice; "Yuna" is the usual iPhone Korean voice
    voice = ko.find((v) => /yuna|유나/i.test(v.name)) || ko.find((v) => v.localService) || ko[0] || null;
  }
  if (synth) {
    pickVoice();
    synth.addEventListener?.("voiceschanged", pickVoice);
  }

  // Speak one Korean phrase; the card (if any) is highlighted while it plays
  let speakingCard = null;
  function speak(korean, card) {
    if (!synth) { note.textContent = "This browser can't speak. Show the Korean text instead."; return; }
    synth.cancel();
    if (speakingCard) speakingCard.classList.remove("is-speaking");
    const u = new SpeechSynthesisUtterance(korean);
    u.lang = "ko-KR";
    if (voice) u.voice = voice;
    u.rate = slow ? 0.6 : 0.9;
    speakingCard = card || null;
    if (card) card.classList.add("is-speaking");
    const done = () => { if (card) card.classList.remove("is-speaking"); if (speakingCard === card) speakingCard = null; };
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
    if (!voice && !synth.getVoices().some((v) => /^ko/i.test(v.lang))) {
      note.textContent = "No Korean voice found. On iPhone: Settings → Accessibility → Spoken Content → Voices → Korean.";
    }
  }

  // ---- Drawing the topics and the phrase cards ----
  function renderCats() {
    cats.replaceChildren();
    topics().forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t.name;
      b.setAttribute("aria-pressed", String(t.id === current));
      b.addEventListener("click", () => { current = t.id; renderCats(); renderList(); window.scrollTo(0, 0); });
      cats.append(b);
    });
  }

  function renderList() {
    const topic = topics().find((t) => t.id === current) || TOPICS[0];
    list.replaceChildren();
    topic.phrases.forEach(([en, ko, rom], i) => {
      const li = document.createElement("li");
      li.className = "phrase";
      const say = document.createElement("button");
      say.type = "button";
      say.className = "say";
      say.setAttribute("aria-label", en + ". Play in Korean: " + ko);
      const e = document.createElement("span"); e.className = "en"; e.textContent = en;
      const k = document.createElement("span"); k.className = "ko"; k.lang = "ko"; k.textContent = ko;
      const r = document.createElement("span"); r.className = "rom"; r.textContent = rom;
      say.append(e, k, r);
      say.addEventListener("click", () => speak(ko, li));
      const big = document.createElement("button");
      big.type = "button";
      big.className = "big";
      big.textContent = "Show";
      big.setAttribute("aria-label", "Show " + en + " in large Korean text");
      big.addEventListener("click", () => openShow(en, ko));
      li.append(say, big);
      if (topic === MINE) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "big";
        del.textContent = "Delete";
        del.setAttribute("aria-label", "Delete " + en);
        del.addEventListener("click", () => {
          MINE.phrases.splice(i, 1);
          saveMine();
          if (!MINE.phrases.length) current = "basics";
          renderCats();
          renderList();
        });
        li.style.gridTemplateColumns = "1fr auto auto";
        li.append(del);
      }
      list.append(li);
    });
  }

  // ---- Show large, for the other person to read ----
  let showing = "";
  let lastFocus = null;
  function openShow(en, ko) {
    showing = ko;
    lastFocus = document.activeElement;
    document.getElementById("show-ko").textContent = ko;
    document.getElementById("show-en").textContent = en;
    show.hidden = false;
    document.getElementById("show-play").focus();
    speak(ko);
  }
  function closeShow() {
    show.hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  document.getElementById("show-play").addEventListener("click", () => speak(showing));
  document.getElementById("show-close").addEventListener("click", closeShow);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !show.hidden) closeShow(); });

  // ---- Your own sentence: translated by MyMemory (machine translation preferred), spoken, and saved ----
  const HANGUL = /[가-힣]/;
  async function translate(text) {
    const url = "https://api.mymemory.translated.net/get?" + new URLSearchParams({ q: text, langpair: "en|ko" });
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status === 429 ? "limit" : "network");
    const data = await res.json();
    if (data.quotaFinished || String(data.responseStatus) === "429") throw new Error("limit");
    const matches = Array.isArray(data.matches) ? data.matches : [];
    const machine = matches.find((m) => m["created-by"] === "MT!" && HANGUL.test(m.translation || ""));
    const top = data.responseData && data.responseData.translatedText;
    const best = machine ? machine.translation : HANGUL.test(top || "") ? top
      : (matches.filter((m) => HANGUL.test(m.translation || "")).sort((a, b) => b.match - a.match)[0] || {}).translation;
    if (!best) throw new Error("empty");
    return new DOMParser().parseFromString(best, "text/html").documentElement.textContent;
  }
  document.getElementById("own").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const input = document.getElementById("own-text");
    const en = input.value.trim();
    if (!en) return;
    note.textContent = "Translating…";
    try {
      const ko = await translate(en);
      note.textContent = "";
      input.value = "";
      MINE.phrases.unshift([en, ko, "Machine translation. Check before relying on it."]);
      MINE.phrases = MINE.phrases.slice(0, 30);
      saveMine();
      current = "mine";
      renderCats();
      renderList();
      speak(ko, list.firstElementChild);
    } catch (e) {
      note.textContent = e.message === "limit" ? "Today's free translations are used up. Try again tomorrow."
        : navigator.onLine === false ? "No internet connection. The phrasebook still works offline."
        : "Couldn't translate that. Try a shorter, simpler sentence.";
    }
  });

  // ---- Slow speech ----
  slowBtn.addEventListener("click", () => {
    slow = !slow;
    slowBtn.setAttribute("aria-pressed", String(slow));
  });

  // ---- Works offline after the first visit ----
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* works without it */ });
  }

  renderCats();
  renderList();
})();
