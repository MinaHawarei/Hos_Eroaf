import requests
import json
import os
import time
from bs4 import BeautifulSoup

BASE_URL = "https://www.copticchurch.net/synaxarium"

os.makedirs("synaxarium", exist_ok=True)


def extract_content(text):
    start_marker = "1."
    end_marker = "If you have benefited"

    start = text.find(start_marker)

    if start == -1:
        return None

    end = text.find(end_marker, start)

    if end != -1:
        text = text[start:end]

    return text.strip()


day_index = 1

for month in range(1, 14):

    max_day = 6 if month == 13 else 30

    for day in range(1, max_day + 1):

        url = f"{BASE_URL}/{month}_{day}.html?lang=ar#1"

        try:

            print(f"[{day_index:03d}] {url}")

            response = requests.get(url, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(
                response.text,
                "html.parser"
            )

            text = soup.get_text(
                separator="\n",
                strip=True
            )

            content = extract_content(text)

            if not content:
                print("No content found")
                continue

            result = {
                "coptic_date": f"{day}/{month}",
                "content": content
            }

            filename = (
                f"synaxarium/{day_index:03d}.json"
            )

            with open(
                filename,
                "w",
                encoding="utf-8"
            ) as file:
                json.dump(
                    result,
                    file,
                    ensure_ascii=False,
                    indent=4
                )

            day_index += 1

            time.sleep(0.2)

        except Exception as e:
            print(
                f"Error in month={month} day={day}"
            )
            print(e)

print("Finished.")
