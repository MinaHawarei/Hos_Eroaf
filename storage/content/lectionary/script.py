import requests
import json
import time
from bs4 import BeautifulSoup

BASE_URL = "https://api.coptic.io/api/synaxarium/coptic"

COPTIC_MONTHS = [
    ("Tut", 30),
    ("Baba", 30),
    ("Hator", 30),
    ("Kiahk", 30),
    ("Toba", 30),
    ("Amshir", 30),
    ("Baramhat", 30),
    ("Baramouda", 30),
    ("Bashans", 30),
    ("Paona", 30),
    ("Epep", 30),
    ("Mesra", 30),
    ("Nasie", 6),  # السنة الكبيسة قد تكون 5 أو 6
]


def extract_content(text):
    start_marker = "1."
    end_marker = "If you have benefited"

    start = text.find(start_marker)

    if start == -1:
        return text.strip()

    end = text.find(end_marker, start)

    if end == -1:
        return text[start:].strip()

    return text[start:end].strip()


day_index = 1

for month_name, days_count in COPTIC_MONTHS:

    for day in range(1, days_count + 1):

        coptic_date = f"{day} {month_name}"

        try:
            print(f"[{day_index:03d}] Processing {coptic_date}")

            api_url = f"{BASE_URL}/{coptic_date}"

            response = requests.get(api_url, timeout=30)
            response.raise_for_status()

            items = response.json()

            all_content = []

            for item in items:

                try:
                    arabic_url = item["url"].replace(
                        "lang=en",
                        "lang=ar"
                    )

                    page_response = requests.get(
                        arabic_url,
                        timeout=30
                    )
                    page_response.raise_for_status()

                    soup = BeautifulSoup(
                        page_response.text,
                        "html.parser"
                    )

                    page_text = soup.get_text(
                        separator="\n",
                        strip=True
                    )

                    content = extract_content(page_text)

                    if content:
                        all_content.append(content)

                except Exception as e:
                    print(
                        f"   Error reading page: {arabic_url}"
                    )
                    print(f"   {e}")

            result = {
                "coptic_date": coptic_date,
                "content": "\n\n".join(all_content)
            }

            filename = f"{day_index:03d}.json"

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

            # راحة بسيطة بين الطلبات
            time.sleep(0.5)

        except Exception as e:
            print(
                f"Failed: {coptic_date}"
            )
            print(e)

print("Finished successfully.")
