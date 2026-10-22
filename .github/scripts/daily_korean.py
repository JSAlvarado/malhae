"""Daily Korean email: Seoul's weather and a phrase from Malhae's phrasebook, sent every morning.

Run by .github/workflows/daily-korean.yml. Uses only Python's standard library.

Settings come from environment variables (GitHub secrets in the workflow):
  GMAIL_ADDRESS       the Gmail account that sends (and receives) the email
  GMAIL_APP_PASSWORD  a Gmail app password (not the normal password)
  DRY_RUN=1           print the email instead of sending it (for testing)
"""

import datetime
import json
import os
import re
import smtplib
import urllib.request
from email.message import EmailMessage
from pathlib import Path
from zoneinfo import ZoneInfo

SEOUL = ZoneInfo("Asia/Seoul")
WEATHER_URL = (
    "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978"
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    "&timezone=Asia%2FSeoul&forecast_days=1"
)
RAIN_THRESHOLD = 50  # percent chance of rain that adds the umbrella reminder
APP_JS = Path(__file__).resolve().parents[2] / "app.js"


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
    with urllib.request.urlopen(WEATHER_URL, timeout=20) as response:
        daily = json.load(response)["daily"]
    return {
        "high": daily["temperature_2m_max"][0],
        "low": daily["temperature_2m_min"][0],
        "rain": daily["precipitation_probability_max"][0],
    }


def build_email(day, weather, phrase, address):
    english, korean, romanization = phrase
    rainy = weather["rain"] is not None and weather["rain"] >= RAIN_THRESHOLD
    umbrella = "우산 챙기세요! Bring an umbrella." if rainy else ""
    weather_line = f"Seoul today: high {weather['high']}°C, low {weather['low']}°C, chance of rain {weather['rain']}%."

    msg = EmailMessage()
    msg["Subject"] = f"Seoul {weather['high']}°C · {korean}"
    msg["From"] = address
    msg["To"] = address
    # A plain-text version for any mail app, and an HTML version with spacing and bold
    lines = [f"Good morning! {day:%A, %B %d}", "", weather_line]
    if umbrella:
        lines.append(umbrella)
    lines += ["", "Korean phrase of the day:", english, f"{korean} ({romanization})", "",
              "From Malhae: https://jsalvarado.github.io/malhae/"]
    msg.set_content("\n".join(lines))
    msg.add_alternative(f"""\
<p>Good morning! {day:%A, %B %d}</p>
<p>{weather_line}{'<br><b>' + umbrella + '</b>' if umbrella else ''}</p>
<p><b>Korean phrase of the day</b><br>
{english}<br>
<span style="font-size:20px;color:#0b4fa8"><b>{korean}</b></span> ({romanization})</p>
<p><a href="https://jsalvarado.github.io/malhae/">Open Malhae</a> to hear it spoken.</p>
""", subtype="html")
    return msg


def main():
    day = datetime.datetime.now(SEOUL).date()
    phrase = phrase_for(day, load_phrases())
    weather = get_weather()
    address = os.environ.get("GMAIL_ADDRESS", "you@example.com")
    msg = build_email(day, weather, phrase, address)

    if os.environ.get("DRY_RUN") == "1":
        print(msg.get_body(preferencelist=("plain",)).get_content())
        return

    password = os.environ.get("GMAIL_APP_PASSWORD")
    if not password or "GMAIL_ADDRESS" not in os.environ:
        raise SystemExit("Set the GMAIL_ADDRESS and GMAIL_APP_PASSWORD secrets in the repository settings.")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as smtp:
        smtp.login(address, password)
        smtp.send_message(msg)
    print(f"Sent: {msg['Subject']}")


if __name__ == "__main__":
    main()
