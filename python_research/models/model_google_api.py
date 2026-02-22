import sys
from pathlib import Path
root_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_path))

from python_research.schemas.schema import ForecastRequest
from dotenv import load_dotenv
import os, requests
from datetime import datetime, timezone, timedelta


env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError(f"CRITICAL: GOOGLE_API_KEY is empty. Check {env_path}")


def forecast_with_google_api(request: ForecastRequest):
    # 1. Use the Air Quality Forecast endpoint
    url = f"https://airquality.googleapis.com/v1/forecast:lookup?key={GOOGLE_API_KEY}"
    
    # 2. Define the payload
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start_time = now + timedelta(hours=1)
    end_time = start_time + timedelta(hours=12)

    payload = {
        "location": {
            "latitude": request.lat,
            "longitude": request.lon
        },
        "period": {
            "startTime": start_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            "endTime": end_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        },
        "universalAqi": False,
        "languageCode": "en",
        "extraComputations": [
            "LOCAL_AQI",
        ]
    }

    try:
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

        raw_hours = data.get("hourlyForecasts", [])
        processed_hours = []

        # IST offset (UTC + 5:30)
        ist_offset = timezone(timedelta(hours=5, minutes=30))

        for hour in raw_hours:
            utc_dt = datetime.fromisoformat(hour["dateTime"].replace("Z", "+00:00"))
            ist_dt = utc_dt.astimezone(ist_offset)

            # Extract NON-universal AQI
            local_aqi = None
            for index in hour.get("indexes", []):
                if index.get("code") != "UAQI":
                    local_aqi = index.get("aqi")
                    break

            if local_aqi is not None:
                processed_hours.append({
                    "datetime_ist": ist_dt.strftime("%Y-%m-%d %H:%M:%S IST"),
                    "aqi": local_aqi
                })

        return processed_hours

    except requests.exceptions.RequestException as e:
        print(f"AQI API Request failed: {e}")
        if response is not None:
            print(f"Error Details: {response.text}")
        raise


if __name__ == "__main__":
    # Test for Durgapur
    test_req = ForecastRequest(lat=23.5389, lon=87.2931)
    forecast = forecast_with_google_api(test_req)
    print(forecast)