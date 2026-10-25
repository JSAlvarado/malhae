"""Malhae Daily: a morning and an evening email with Seoul's weather and a phrase from Malhae's phrasebook.

Run by .github/workflows/daily-korean.yml at 06:00 and 20:00 Seoul time. Uses only Python's standard library.

  Morning brief (06:00): today's weather and today's phrase.
  Evening brief (20:00): tomorrow's weather, a review of today's phrase and a preview of tomorrow's.

Settings come from environment variables (GitHub secrets in the workflow):
  GMAIL_ADDRESS       the Gmail account that sends (and receives) the email
  GMAIL_APP_PASSWORD  a Gmail app password (not the normal password)
  EDITION             "morning", "evening" or "auto" (auto: the next brief, sent on time; see below)
  DRY_RUN=1           write the email to preview.html and print the text instead of sending it

GitHub often starts scheduled runs late, sometimes by hours. So the workflow starts several runs well
before each brief, and in "auto" the script waits until exactly 06:00 or 20:00 before sending. A run
first asks Gmail (IMAP) whether that brief was already sent since its window opened, so it goes out once.
(Gmail picks the Message-ID: a custom one made Gmail file the email under Sent only, not the inbox.) A run that starts too long after a brief's time sends nothing.
"""

import datetime
import html
import json
import os
import re
import imaplib
import smtplib
import time
import urllib.request
from email.message import EmailMessage
from pathlib import Path
from zoneinfo import ZoneInfo

SEOUL = ZoneInfo("Asia/Seoul")
WEATHER_URL = (
    "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978"
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    "&timezone=Asia%2FSeoul&forecast_days=2"
)
# Send times in Seoul, and the window around each: runs start up to EARLY before and send up to LATE after
SEND_AT = {"morning": datetime.time(6, 0), "evening": datetime.time(20, 0)}
EARLY, LATE = datetime.timedelta(hours=4, minutes=30), datetime.timedelta(hours=3)
RAIN_THRESHOLD = 50  # percent chance of rain that adds the umbrella reminder
APP_JS = Path(__file__).resolve().parents[2] / "app.js"
APP_URL = "https://jsalvarado.github.io/malhae/"

# Weather codes from Open-Meteo (WMO standard), in plain words
CONDITIONS = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Rain showers", 81: "Rain showers", 82: "Heavy rain showers", 85: "Snow showers", 86: "Snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
}

# Colours shared with the Malhae app
INK, MUTED, ACCENT, LINE, GROUND, PANEL = "#111111", "#5f6368", "#0b4fa8", "#e6e6e1", "#f5f5f2", "#f8f8f6"
FONT = "-apple-system, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif"


def load_phrases():
    """Read Malhae's phrasebook from app.js: every ["English", "Korean", "romanization"] line."""
    text = APP_JS.read_text(encoding="utf-8")
    rows = re.findall(r'^\s*\["([^"]+)", "([^"]+)", "([^"]+)"\]', text, re.MULTILINE)
    if not rows:
        raise SystemExit("No phrases found in app.js")
    return rows


def phrase_for(day, phrases):
    """The same phrase all day, a different one each day, cycling through the whole phrasebook."""
    return phrases[day.toordinal() % len(phrases)]


def get_weather():
    """Today's and tomorrow's forecast for Seoul."""
    with urllib.request.urlopen(WEATHER_URL, timeout=20) as response:
        d = json.load(response)["daily"]
    return [
        {
            "date": datetime.date.fromisoformat(d["time"][i]),
            "condition": CONDITIONS.get(d["weather_code"][i], "Mixed conditions"),
            "high": round(d["temperature_2m_max"][i]),
            "low": round(d["temperature_2m_min"][i]),
            "rain": d["precipitation_probability_max"][i] or 0,
        }
        for i in range(2)
    ]


# ---- Pieces of the HTML email (tables and inline styles, so every mail app shows it the same way) ----

def section_title(text):
    return (f'<tr><td style="padding:24px 24px 8px;font:600 12px/1.4 {FONT};color:{MUTED};'
            f'letter-spacing:0.02em">{html.escape(text)}</td></tr>')


def weather_block(w, umbrella_text):
    # Two rows of two, so it fits a phone screen; dividers between the cells only
    grid = [[("Conditions", w["condition"]), ("Chance of rain", f'{w["rain"]}%')],
            [("High", f'{w["high"]}°C'), ("Low", f'{w["low"]}°C')]]

    def cell(label, value, right, top):
        borders = (f"border-right:1px solid {LINE};" if right else "") + (f"border-top:1px solid {LINE};" if top else "")
        return (f'<td width="50%" style="padding:12px 16px;vertical-align:top;{borders}">'
                f'<div style="font:400 12px/1.4 {FONT};color:{MUTED}">{label}</div>'
                f'<div style="font:600 16px/1.4 {FONT};color:{INK};padding-top:2px">{html.escape(value)}</div></td>')
    tds = "</tr><tr>".join(
        "".join(cell(label, value, c == 0, r == 1) for c, (label, value) in enumerate(row)) for r, row in enumerate(grid)
    )
    notice = ""
    if umbrella_text:
        notice = (f'<tr><td style="padding:12px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
                  f'<tr><td style="padding:12px 16px;background:#eef3fa;border-left:3px solid {ACCENT};'
                  f'font:500 14px/1.5 {FONT};color:{INK}">{umbrella_text}</td></tr></table></td></tr>')
    return (f'<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="border:1px solid {LINE};border-radius:8px;background:{PANEL}"><tr>{tds}</tr></table></td></tr>{notice}')


def phrase_block(phrase, label):
    english, korean, romanization = (html.escape(x) for x in phrase)
    return (f'<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="border:1px solid {LINE};border-radius:8px">'
            f'<tr><td style="padding:20px 20px 4px;font:400 12px/1.4 {FONT};color:{MUTED}">{html.escape(label)}</td></tr>'
            f'<tr><td lang="ko" style="padding:0 20px;font:700 26px/1.3 {FONT};color:{ACCENT}">{korean}</td></tr>'
            f'<tr><td style="padding:4px 20px 0;font:400 14px/1.5 {FONT};color:{MUTED}">{romanization}</td></tr>'
            f'<tr><td style="padding:8px 20px 20px;font:500 16px/1.5 {FONT};color:{INK}">{english}</td></tr>'
            f'</table></td></tr>')


def next_brief(now):
    """The brief this run is for and when to send it, or None if no brief is close enough."""
    for edition, at in SEND_AT.items():
        send_time = datetime.datetime.combine(now.date(), at, tzinfo=SEOUL)
        if send_time - EARLY <= now < send_time + LATE:
            return edition, send_time
    return None


def already_sent(address, password, edition, send_time):
    """Ask Gmail whether this brief was sent since its window opened, so it goes out only once."""
    since = int((send_time - EARLY).timestamp())  # Gmail reads a number after "after:" as Unix time
    try:
        with imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=30) as imap:
            imap.login(address, password)
            # "All Mail" has a different name in each language; find it by its \All flag
            _, boxes = imap.list()
            all_mail = next((b.decode().rsplit(' "/" ', 1)[1] for b in boxes if b"\\All" in b), "INBOX")
            imap.select(all_mail, readonly=True)
            query = f'from:me subject:"Malhae {edition} brief" after:{since}'
            _, found = imap.search(None, "X-GM-RAW", '"' + query.replace('"', '\\"') + '"')
            return bool(found and found[0].split())
    except (imaplib.IMAP4.error, OSError) as error:
        print(f"Could not check Gmail for an earlier send ({error}); sending anyway.")
        return False


def build_email(edition, weather, today_phrase, tomorrow_phrase, address):
    today, tomorrow = weather
    morning = edition == "morning"
    w = today if morning else tomorrow
    when = "today" if morning else "tomorrow"
    umbrella = (f'<b>Bring an umbrella.</b> Rain is likely {when} ({w["rain"]}% chance). '
                f'<span lang="ko" style="color:{ACCENT};font-weight:600">우산 챙기세요!</span>'
                ) if w["rain"] >= RAIN_THRESHOLD else ""
    title = "Morning brief" if morning else "Evening brief"
    date_line = f"{today['date']:%A, %d %B %Y}"
    weather_label = f"Seoul weather today, {today['date']:%a %d %b}" if morning else f"Seoul weather tomorrow, {tomorrow['date']:%a %d %b}"
    intro = ("Good morning. Here is today's weather and your Korean phrase for the day."
             if morning else "Good evening. Here is tomorrow's weather, a quick review of today's phrase and a preview of tomorrow's.")

    body = [
        # Header
        f'<tr><td style="padding:24px 24px;background:{INK}">'
        f'<div style="font:700 18px/1.2 {FONT};color:#ffffff">Malhae Daily</div>'
        f'<div style="font:400 13px/1.5 {FONT};color:#c9c9c9;padding-top:4px">{title} · {date_line}</div></td></tr>',
        f'<tr><td style="padding:24px 24px 0;font:400 15px/1.6 {FONT};color:{INK}">{intro}</td></tr>',
        section_title(weather_label),
        weather_block(w, umbrella),
    ]
    if morning:
        body += [section_title("Phrase of the day"), phrase_block(today_phrase, "Say it today")]
    else:
        body += [section_title("Review"), phrase_block(today_phrase, "Today's phrase"),
                 section_title("Coming up"), phrase_block(tomorrow_phrase, "Tomorrow's phrase")]
    body += [
        # Call to action and footer
        f'<tr><td style="padding:28px 24px 8px"><a href="{APP_URL}" style="display:inline-block;padding:12px 20px;'
        f'background:{INK};color:#ffffff;border-radius:999px;text-decoration:none;font:600 14px/1 {FONT}">'
        f'Hear it in Malhae</a></td></tr>',
        f'<tr><td style="padding:24px 24px 28px;border-top:1px solid {LINE};font:400 12px/1.6 {FONT};color:{MUTED}">'
        f'Sent automatically at 06:00 and 20:00 Seoul time by a GitHub Actions workflow in the Malhae repository. '
        f'Weather data: Open-Meteo.</td></tr>',
    ]
    html_doc = (f'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:{GROUND}">'
                f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{GROUND}">'
                f'<tr><td align="center" style="padding:24px 12px">'
                f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
                f'style="max-width:560px;background:#ffffff;border:1px solid {LINE};border-radius:12px;overflow:hidden">'
                + "".join(body) + "</table></td></tr></table></body></html>")

    # Plain-text version for mail apps that don't show HTML
    def text_phrase(p):
        return f"{p[1]} ({p[2]})\n{p[0]}"
    lines = [f"Malhae Daily · {title} · {date_line}", "", intro, "", weather_label,
             f'{w["condition"]}. High {w["high"]}°C, low {w["low"]}°C, chance of rain {w["rain"]}%.']
    if umbrella:
        lines.append(f'Bring an umbrella. Rain is likely {when} ({w["rain"]}% chance). 우산 챙기세요!')
    if morning:
        lines += ["", "Phrase of the day", text_phrase(today_phrase)]
    else:
        lines += ["", "Review: today's phrase", text_phrase(today_phrase), "", "Coming up: tomorrow's phrase", text_phrase(tomorrow_phrase)]
    lines += ["", f"Hear it in Malhae: {APP_URL}"]

    msg = EmailMessage()
    msg["Subject"] = (f"Malhae {title.lower()} · {w['condition']}, {w['high']}°C · "
                      f"{today_phrase[1] if morning else tomorrow_phrase[1]}")
    msg["From"] = f"Malhae Daily <{address}>"
    msg["To"] = address
    msg.set_content("\n".join(lines))
    msg.add_alternative(html_doc, subtype="html")
    return msg


def main():
    now = datetime.datetime.now(SEOUL)
    edition = os.environ.get("EDITION", "auto").strip().lower()
    dry_run = os.environ.get("DRY_RUN") == "1"
    address = os.environ.get("GMAIL_ADDRESS", "you@example.com")
    password = os.environ.get("GMAIL_APP_PASSWORD")
    if not dry_run and (not password or "GMAIL_ADDRESS" not in os.environ):
        raise SystemExit("Set the GMAIL_ADDRESS and GMAIL_APP_PASSWORD secrets in the repository settings.")

    if edition in ("morning", "evening"):
        auto = False  # a manual test: send this brief right away
    else:
        auto = True
        brief = next_brief(now)
        if dry_run and not brief:
            brief = ("morning" if now.hour < 12 else "evening", now)
        if not brief:
            print(f"It is {now:%H:%M} in Seoul, too far from 06:00 and 20:00; nothing to send.")
            return
        edition, send_time = brief
        if not dry_run:
            if already_sent(address, password, edition, send_time):
                print(f"The {edition} brief for {send_time:%d %b} was already sent.")
                return
            wait = (send_time - datetime.datetime.now(SEOUL)).total_seconds()
            if wait > 0:
                print(f"Waiting until {send_time:%H:%M} Seoul time ({wait / 60:.0f} minutes) to send the {edition} brief.")
                time.sleep(wait)
            now = datetime.datetime.now(SEOUL)

    phrases = load_phrases()
    today = now.date()
    weather = get_weather()
    msg = build_email(edition, weather, phrase_for(today, phrases), phrase_for(today + datetime.timedelta(days=1), phrases), address)

    if dry_run:
        Path(os.environ.get("PREVIEW", "preview.html")).write_text(msg.get_body(preferencelist=("html",)).get_content(), encoding="utf-8")
        print("Subject:", msg["Subject"])
        print(msg.get_body(preferencelist=("plain",)).get_content())
        return

    if auto and already_sent(address, password, edition, send_time):  # another run sent it while this one waited
        print(f"The {edition} brief was already sent.")
        return
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as smtp:
        smtp.login(address, password)
        smtp.send_message(msg)
    print(f"Sent the {edition} brief: {msg['Subject']}")


if __name__ == "__main__":
    main()
