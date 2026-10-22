# Malhae (말해, "say it")

**Live app: https://jsalvarado.github.io/malhae/**

A Korean conversation companion for everyday life in Korea. Tap an English phrase and the phone says it aloud in
Korean, hand the phone across the table for a face-to-face conversation, or speak into the mic and hear the
translation. Built by Johnstheward S. Alvarado as an installable web app (PWA).

## Features

| Feature | What it does |
|---|---|
| **Phrasebook** | 117 phrases and words in 8 topics (Basics, Words, Numbers, Restaurant, Shopping, Getting around, Talking, Emergency), each with Korean text, romanization and one-tap speech. Written in advance in polite Korean, so it works offline. |
| **Search, or type your own** | One field finds phrases in English, Korean or romanization. If nothing matches, it translates your own sentence and saves it. |
| **Number and price speaker** | Type `12,500 won` and hear `만 이천오백 원`: numbers up to the hundreds of billions are converted to Sino-Korean in code. |
| **Suggested next** | After each phrase, four likely follow-ups from common conversation patterns, which also learn from the order you tap phrases on your phone. |
| **Talk mode** | A face-to-face screen: the Korean half is turned to face the other person, who answers with 18 one-tap Korean replies. Follow-up suggestions react to the answer, and "say it again" replays the phrase slowly. |
| **Voice mode** | Each half has its own mic. Speech is recognised in that half's language, translated, shown on the other half and spoken aloud. |
| **Show** | Fills the screen with the Korean text for the other person to read. |
| **Offline and installable** | A service worker keeps the app, its typeface and the phrasebook on the phone; Add to Home Screen installs it. |
| **Malhae Daily** | A GitHub Actions automation that emails a morning brief (06:00) and an evening brief (20:00) with Seoul's weather and a phrase from the phrasebook. |

## How it is built

- **Plain HTML, CSS and JavaScript**, no framework and no build step, hosted on GitHub Pages.
- **Web Speech API:** speech synthesis for the Korean and English voices built into the phone, and speech
  recognition for Voice mode.
- **Translation:** the free MyMemory API for typed and spoken sentences. Its machine translation is preferred,
  and answers in the wrong script are skipped.
- **Design:** an app-screen style with neutral surfaces and colour only on the Korean text, set in IBM Plex Sans KR
  for both English and Korean.
- **Automation:** `.github/workflows/daily-korean.yml` runs `.github/scripts/daily_korean.py` (Python standard
  library only) on a schedule. It fetches the forecast from Open-Meteo, picks the day's phrase from `app.js`, adds
  an umbrella reminder on rainy days and sends an HTML email through Gmail. Credentials are repository secrets.
- **Tested** in WebKit at phone sizes, including simulated speech recognition and network failures.

| File | Holds |
|---|---|
| `index.html`, `style.css`, `app.js` | The phrasebook, the player, Show and Talk mode |
| `voice.html`, `voice.css`, `voice.js` | Voice mode |
| `sw.js`, `manifest.webmanifest`, icons | Offline support and installation |
| `.github/` | The Malhae Daily email automation |

## Privacy

Phrases, saved phrases and the suggestion history stay on the phone. Only sentences you type or speak are sent
to the translation service, and speech recognition uses the browser's own service (Apple or Google).

## Built with

Built with the help of **Claude Code** (AI-assisted development).
