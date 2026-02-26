import sys
from pathlib import Path
root_path = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_path))
from tsfm_public.toolkit.get_model import get_model
import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["TF_NUM_INTRAOP_THREADS"] = "1"
os.environ["TF_NUM_INTEROP_THREADS"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import requests
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import joblib
import numpy as np
from tensorflow import keras
import tensorflow as tf
tf.config.set_visible_devices([], 'GPU')
tf.config.threading.set_intra_op_parallelism_threads(1)
tf.config.threading.set_inter_op_parallelism_threads(1)
import torch
torch.set_num_threads(1)
from tsfm_public.models.tinytimemixer import TinyTimeMixerForPrediction, TinyTimeMixerConfig

# =====================================================
# ENV SETUP
# =====================================================

env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError(f"CRITICAL: GOOGLE_API_KEY is empty. Check {env_path}")

lstm_model_path = os.path.join(os.path.dirname(__file__), "durgapur_aqi_v1.h5")
lstm_scaler_path = os.path.join(os.path.dirname(__file__), "scaler_x.pkl")
ttm_model_path = os.path.join(os.path.dirname(__file__), "ttm_aqi_model.pt")
# ttm_scaler_path_x = os.path.join(os.path.dirname(__file__), "scaler_x_ttm.pkl")
# ttm_scaler_path_y = os.path.join(os.path.dirname(__file__), "scaler_y_ttm.pkl")
ttm_scaler_path = os.path.join(os.path.dirname(__file__), "scaler.pkl")
# =====================================================
# LOAD MODELS
# =====================================================

print("Loading models...")

lstm_model = keras.models.load_model(lstm_model_path, compile=False)
lstm_scaler = joblib.load(lstm_scaler_path)

print("Loading TTM model...")

TTM_MODEL_PATH = "ibm-granite/granite-timeseries-ttm-r2"

model_ttm = get_model(
    TTM_MODEL_PATH,
    context_length=512,
    prediction_length=96,
    freq_prefix_tuning=False,
    freq=None,
    prefer_l1_loss=False,
    prefer_longer_context=True,
    head_dropout=0.7,
    loss="mse",
    quantile=0.5,
)

state_dict = torch.load(ttm_model_path, map_location="cpu")
model_ttm.load_state_dict(state_dict)

model_ttm.eval()

ttm_scaler = joblib.load(ttm_scaler_path)

print("TTM model loaded successfully.")

# =====================================================
# STATIONS CONFIG
# =====================================================

STATIONS = {
    "station_0": {"lat": 23.51905342888936, "lon": 87.34565136450719},
    "station_1": {"lat": 23.564018931392827, "lon": 87.31123928017463},
    "station_2": {"lat": 23.5391718044899, "lon": 87.30401858752859},
    "station_3": {"lat": 23.554806202241476, "lon": 87.24681601086061},
}

CSV_FILE = "aqi_model_comparison.csv"


# =====================================================
# GOOGLE 12H FORECAST (BASELINE)
# =====================================================

def forecast_with_google_api(lat, lon):

    # 1. Use the Air Quality Forecast endpoint
    url = f"https://airquality.googleapis.com/v1/forecast:lookup?key={GOOGLE_API_KEY}"
    
    # 2. Define the payload
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start_time = now + timedelta(hours=1)
    end_time = start_time + timedelta(hours=12)

    payload = {
        "location": {
            "latitude": lat,
            "longitude": lon
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
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()

    ist_offset = timezone(timedelta(hours=5, minutes=30))
    output = []

    for hour in data.get("hourlyForecasts", []):
        utc_dt = datetime.fromisoformat(hour["dateTime"].replace("Z", "+00:00"))
        ist_dt = utc_dt.astimezone(ist_offset)

        local_aqi = None
        for idx in hour.get("indexes", []):
            if idx.get("code") != "UAQI":
                local_aqi = idx.get("aqi")
                break

        if local_aqi is not None:
            output.append({
                "datetime_ist": ist_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "aqi": local_aqi
            })

    return output

# =====================================================
#  GOOGLE HISTORY FETCH (FOR MODEL INPUTS)
# =====================================================

def fetch_google_weather_history(lat, lon, api_key=None):
    # Use the passed key, or fallback to your global variable
    key = api_key or GOOGLE_API_KEY
    
    # Endpoint for 24-hour historical weather
    url = "https://weather.googleapis.com/v1/history/hours:lookup"
    
    # These must be sent as URL parameters for a GET request
    params = {
        "key": key,
        "location.latitude": lat,
        "location.longitude": lon,
        "hours": 24, 
        "unitsSystem": "METRIC",
        "languageCode": "en"
    }
    
    try:
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        history_list = []
        # The API returns an array of 'historyHours'
        for hour in data.get('historyHours', []):
            history_list.append({
                "time": hour.get('interval', {}).get('startTime'),
                "temp_c": hour.get('temperature', {}).get('degrees', 0),
                "wind": hour.get('wind', {}).get('speed', {}).get('value', 0),
                "humidity": hour.get('relativeHumidity', 0)
            })
            
        return history_list
    except Exception as e:
        print(f"⚠️ Weather History Fetch Failed for ({lat}, {lon}): {e}", flush=True)
        return {"lat": lat, "lon": lon, "error": str(e)}


def fetch_google_aqi_history(lat, lon, api_key=None):
    key = api_key or GOOGLE_API_KEY
    
    # Endpoint for historical lookups
    url = f"https://airquality.googleapis.com/v1/history:lookup?key={key}"
    
    payload = {
        "location": {"latitude": lat, "longitude": lon},
        "hours": 24,  
        "pageSize": 24,
        "universalAqi": False, 
        "extraComputations": ["POLLUTANT_CONCENTRATION", "LOCAL_AQI"],
        "languageCode": "en"
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        history_list = []
        # The API returns a list of 'hoursInfo' objects
        for hour_info in data.get('hoursInfo', []):
            # SAFELY fetch concentrations using .get() to avoid KeyError
            pollutants = {
                p['code']: p.get('concentration', {}).get('value', 0) 
                for p in hour_info.get('pollutants', [])
            }
            
            history_list.append({
                "time": hour_info.get('dateTime'),
                "aqi": hour_info.get('indexes', [{}])[0].get('aqi', 0),
                "pm25": pollutants.get('pm25', 0),
                "pm10": pollutants.get('pm10', 0),
                "no2": pollutants.get('no2', 0),
                "co": pollutants.get('co', 0),
                "so2": pollutants.get('so2', 0),
                "o3": pollutants.get('o3', 0)
            })
            
        return  history_list
    except Exception as e:
        print(f"⚠️ AQI History Fetch Failed for ({lat}, {lon}): {e}", flush=True)
        return {"lat": lat, "lon": lon, "error": str(e)}
    

# =====================================================
# SAVE TO CSV (STRICT FORMAT)
# datetime_ist, station, model_name, aqi
# =====================================================

def save_predictions(hourly_data, model_name, station_id):

    rows = []

    for item in hourly_data:
        rows.append({
            "datetime_ist": item["datetime_ist"],
            "station": station_id,
            "model_name": model_name,
            "aqi": item["aqi"]
        })

    df = pd.DataFrame(rows)

    if os.path.exists(CSV_FILE):
        df.to_csv(CSV_FILE, mode="a", header=False, index=False)
    else:
        df.to_csv(CSV_FILE, index=False)

    print(f"Saved {model_name} predictions for {station_id}")


# =====================================================
# PLOT COMPARISON FROM CSV
# =====================================================

def plot_all_models(station_id=None):

    if not os.path.exists(CSV_FILE):
        print("CSV file not found.")
        return

    df = pd.read_csv(CSV_FILE)

    if station_id:
        df = df[df["station"] == station_id]

    if df.empty:
        print("No data available for plotting.")
        return

    df["datetime_ist"] = pd.to_datetime(df["datetime_ist"])

    plt.figure(figsize=(12, 7))

    for model in df["model_name"].unique():
        model_df = df[df["model_name"] == model]
        model_df = model_df.sort_values("datetime_ist")

        plt.plot(
            model_df["datetime_ist"],
            model_df["aqi"],
            marker="o",
            linewidth=2,
            label=model
        )

    plt.title("AQI Forecast Comparison")
    plt.xlabel("Datetime (IST)")
    plt.ylabel("AQI")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()
# =====================================================
# LSTM MODEL PREDICTION
# =====================================================

def run_lstm_model(lat, lon, station_index):

    history = fetch_combined_history(lat, lon)
    print("Scaler expects:", lstm_scaler.n_features_in_)
    print("LSTM input shape:", lstm_model.input_shape)

    if len(history) < 24:
        print(f"Only {len(history)} rows found. Padding missing hours...")

    X = build_feature_matrix(history)


    X_scaled = lstm_scaler.transform(X).reshape(1, 24, 16)
    X_scaled = X_scaled.reshape(1, 24, 16)  
    station_input = np.array([[station_index]], dtype=np.int32)
    print("Final X shape:", X_scaled.shape)
    print("Station input shape:", station_input.shape)
    pred_scaled = lstm_model([X_scaled, station_input], training=False)
    pred_scaled = pred_scaled.numpy()  
    predictions = pred_scaled.flatten() 

    # Build output
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    ist_offset = timezone(timedelta(hours=5, minutes=30))

    output = []

    for i, val in enumerate(predictions, start=1):
        future_time = now + timedelta(hours=i)
        ist_time = future_time.astimezone(ist_offset)

        output.append({
            "datetime_ist": ist_time.strftime("%Y-%m-%d %H:%M:%S"),
            "aqi": float(val)
        })

    return output
# =====================================================
# TTM MODEL PREDICTION
# =====================================================

def run_ttm_model(lat, lon):
    history = fetch_combined_history(lat, lon)

    if len(history) < 24:
        return []

    # 1️⃣ Build ONLY the features used during training
    X_base = build_feature_matrix(history)

    # IMPORTANT:
    # If scaler expects 9 features, slice to first 9
    expected_features = len(ttm_scaler.mean_)
    X_base = X_base[:, :expected_features]   # Force match

    print("Feature matrix shape:", X_base.shape)
    print("Scaler expects:", expected_features)

    # 2️⃣ Scale
    full_scaled = ttm_scaler.transform(X_base)

    # 3️⃣ Pad 24 → 512
    context_length = 512
    current_length = full_scaled.shape[0]

    if current_length < context_length:
        pad_rows = np.zeros((context_length - current_length, expected_features))
        full_scaled = np.vstack([pad_rows, full_scaled])

    # 4️⃣ Convert to tensor
    X_tensor = torch.tensor(full_scaled, dtype=torch.float32).unsqueeze(0)

    # 5️⃣ Forward pass
    with torch.no_grad():
        output_obj = model_ttm(past_values=X_tensor)
        ttm_out = output_obj.prediction_outputs.cpu().numpy()

    # 6️⃣ Extract target channel
    raw_preds = ttm_out[0, :, -1]

    # 7️⃣ Inverse scale correctly
    aqi_index = expected_features - 1  # Last feature index

    mean = ttm_scaler.mean_[aqi_index]
    scale = ttm_scaler.scale_[aqi_index]

    final_aqi = raw_preds * scale + mean

    final_aqi = final_aqi[:12]

    # 8️⃣ Time formatting
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    ist_offset = timezone(timedelta(hours=5, minutes=30))

    output = []

    for i, val in enumerate(final_aqi, start=1):
        future_time = now + timedelta(hours=i)
        ist_time = future_time.astimezone(ist_offset)

        output.append({
            "datetime_ist": ist_time.strftime("%Y-%m-%d %H:%M:%S"),
            "aqi": float(val)
        })

    return output
# =====================================================
# MAIN PIPELINE
# =====================================================

def run_pipeline():

    for idx, (station_id, coords) in enumerate(STATIONS.items()):   

        print(f"\nProcessing {station_id}")

        # 🔹 Google baseline
        google_pred = forecast_with_google_api(
            coords["lat"], coords["lon"]
        )
        save_predictions(google_pred, "Google_API", station_id)

        # 🔹 LSTM
        lstm_pred = run_lstm_model(
            coords["lat"], coords["lon"], idx
        )
        save_predictions(lstm_pred, "LSTM", station_id)

        # 🔹 TTM
        ttm_pred = run_ttm_model(
            coords["lat"], coords["lon"]
        )
        save_predictions(ttm_pred, "TTM", station_id)

    print("\nAll predictions saved.")

def fetch_combined_history(lat, lon):
    aqi_hist = fetch_google_aqi_history(lat, lon)
    weather_hist = fetch_google_weather_history(lat, lon)

    if isinstance(aqi_hist, dict) or isinstance(weather_hist, dict):
        print("Error fetching data")
        return []

    # Convert both to UTC datetime objects rounded to hour
    def normalize(ts):
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.replace(minute=0, second=0, microsecond=0)

    weather_dict = {}
    for w in weather_hist:
        if w.get("time"):
            key = normalize(w["time"])
            weather_dict[key] = w

    combined = []

    for a in aqi_hist:
        if not a.get("time"):
            continue

        key = normalize(a["time"])

        if key in weather_dict:
            w = weather_dict[key]

            combined.append({
                "time": key,
                "pm2_5": a.get("pm25", 0),
                "pm10": a.get("pm10", 0),
                "no2": a.get("no2", 0),
                "co": a.get("co", 0),
                "so2": a.get("so2", 0),
                "o3": a.get("o3", 0),
                "aqi": a.get("aqi", 0),
                "temp_c": w.get("temp_c", 0),
                "wind": w.get("wind", 0),
                "humidity": w.get("humidity", 0),
            })

    combined = sorted(combined, key=lambda x: x["time"])

    print(f"Combined rows found: {len(combined)}")
    if len(combined) >= 24:
        return combined[-24:]

    # If less than 24, pad using earliest available row
    if len(combined) > 0:
        first_row = combined[0]
        while len(combined) < 24:
            combined.insert(0, first_row)

    print(f"Padded to 24 rows. Final count: {len(combined)}")
    return combined


def build_feature_matrix(combined_history_list):

    feature_rows = []

    for h in combined_history_list:

        dt = h["time"]  # already normalized datetime

        # Time encodings
        hour = dt.hour
        date = dt.day
        month = dt.month
        year = dt.year

        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)

        date_sin = np.sin(2 * np.pi * date / 31)
        date_cos = np.cos(2 * np.pi * date / 31)

        month_sin = np.sin(2 * np.pi * month / 12)
        month_cos = np.cos(2 * np.pi * month / 12)

        feature_rows.append([
            hour_sin,
            hour_cos,
            date_sin,
            date_cos,
            month_sin,
            month_cos,
            year,  # numeric (optional: scale properly)
            h.get("pm2_5", 0),
            h.get("pm10", 0),
            h.get("no2", 0),
            h.get("co", 0),
            h.get("so2", 0),
            h.get("o3", 0),
            h.get("temp_c", 0),
            h.get("wind", 0),
            h.get("humidity", 0),
        ])

    feature_matrix = np.array(feature_rows, dtype=float)

    print("Feature matrix shape:", feature_matrix.shape)

    return feature_matrix


# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":
    run_pipeline()

    plot_all_models("station_0")