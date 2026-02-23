import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import torch
import joblib
import os
import gc
from tensorflow import keras
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_absolute_error
from tsfm_public.models.tinytimemixer import TinyTimeMixerForPrediction, TinyTimeMixerConfig

# Environment Fixes for Mac Stability
os.environ['KMP_DUPLICATE_LIB_OK']='True'
os.environ['OPENBLAS_NUM_THREADS'] = '1'
DEVICE = "cpu" # CPU is faster for small batches on Mac when mixing libraries

# 1. Load Data
data = pd.read_csv("../data/durgapur_final.csv")
stations = data["station_id"].unique()

# 2. Load Models and Scalers
scaler_X_lstm = joblib.load("scaler_x.pkl")
model_lstm = keras.models.load_model("durgapur_aqi_v1.h5", compile=False)

scaler_X_ttm = joblib.load("scaler_x_ttm.pkl")
scaler_y_ttm = joblib.load("scaler_y_ttm.pkl")

# TTM Config & Load
ttm_config = TinyTimeMixerConfig(
    context_length=24, prediction_length=12, num_input_channels=17, 
    d_model=48, patch_size=4, num_time_features=0
)
model_ttm = TinyTimeMixerForPrediction(ttm_config)
model_ttm.load_state_dict(torch.load("durgapur_ttm_model.pt", map_location=DEVICE))
model_ttm.eval()

# 3. Features Setup
cols_lstm = ["pm2_5", "pm10", "no2", "co", "so2", "o3", "temp_c", "wind", "humidity", 
             "hour_sin", "hour_cos", "date_sin", "date_cos", "month_sin", "month_cos", "year"]
cols_ttm = cols_lstm + ["AQI"]

# Dictionary to store all station models
unified_sarima_store = {}

print(f"--- STARTING UNIFIED TRAINING & COMPARISON ---")

for station in stations:
    df_s = data[data["station_id"] == station].copy()
    split_idx = int(len(df_s) * 0.8)
    
    # --- SARIMA: Train on a smaller window (Fast & Efficient) ---
    # We take the last 200 points for baseline training
    train_series = df_s["AQI"].iloc[max(0, split_idx-200) : split_idx].values
    
    print(f"Training Station {station}...", end=" ", flush=True)
    
    # Optimized SARIMA fit
    sarima_res = SARIMAX(train_series, order=(1,1,1), seasonal_order=(1,1,1,24)).fit(disp=False)
    unified_sarima_store[station] = sarima_res # Store in dict
    
    # --- PREDICTIONS ---
    test_block = df_s.iloc[split_idx : split_idx + 36].copy()
    if len(test_block) < 36: continue
    
    actual_12 = test_block["AQI"].iloc[24:].values

    # 1. SARIMA Prediction
    stat_pred = sarima_res.get_forecast(steps=12).predicted_mean

    # 2. LSTM Prediction
    lstm_in = scaler_X_lstm.transform(test_block[cols_lstm].iloc[:24])
    lstm_in = lstm_in.reshape(1, 24, -1)
    s_id = np.array([[station]])
    # Use direct call for speed on Mac
    lstm_pred = model_lstm([lstm_in, s_id], training=False).numpy().flatten()

    # 3. TTM Prediction (Foundation Model)
    ttm_df = test_block.copy()
    ttm_df[cols_lstm] = scaler_X_ttm.transform(ttm_df[cols_lstm])
    ttm_df[["AQI"]] = scaler_y_ttm.transform(ttm_df[["AQI"]])
    
    X_ttm = torch.tensor(ttm_df[cols_ttm].values[:24], dtype=torch.float32).unsqueeze(0)
    with torch.no_grad():
        ttm_out = model_ttm(past_values=X_ttm).prediction_outputs
        ttm_scaled = ttm_out[0, :, 0].numpy().reshape(-1, 1)
        ttm_pred = scaler_y_ttm.inverse_transform(ttm_scaled).flatten()

    print("Done.")

    # --- 4. 3-WAY PLOT ---
    plt.figure(figsize=(12, 6))
    plt.plot(actual_12, label="Actual AQI", color='black', linewidth=3, marker='o')
    plt.plot(stat_pred, label=f"SARIMA Baseline (MAE: {mean_absolute_error(actual_12, stat_pred):.2f})", color='blue', linestyle='--')
    plt.plot(lstm_pred, label=f"LSTM AI (MAE: {mean_absolute_error(actual_12, lstm_pred):.2f})", color='green', alpha=0.7)
    plt.plot(ttm_pred, label=f"TTM Foundation (MAE: {mean_absolute_error(actual_12, ttm_pred):.2f})", color='red', linewidth=2)
    
    plt.title(f"3-Way Model Benchmarking: Station {station}")
    plt.xlabel("Hours Ahead")
    plt.ylabel("AQI Value")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.show()
    
    gc.collect()

# --- 5. SAVE UNIFIED MODEL ---
joblib.dump(unified_sarima_store, "final_unified_sarima.pkl")
print(f"\n✅ All stations processed. Unified model saved: final_unified_sarima.pkl")


# =========================================================
# FINAL UNIFIED PLOT: NEXT HOUR (t+1) FOR ALL STATIONS
# =========================================================

# =========================================================
# FINAL UNIFIED PLOT: NEXT HOUR (t+1) FOR ALL STATIONS
# =========================================================

all_actual_t1 = []
all_lstm_t1 = []
all_ttm_t1 = []
all_sarima_t1 = []

target_col = "AQI" 

print(f"\n--- GENERATING UNIFIED NEXT-HOUR (t+1) PLOT ---")

for station in stations:
    df_s = data[data["station_id"] == station].copy()
    split_idx = int(len(df_s) * 0.8)
    test_df = df_s.iloc[split_idx:].copy()
    
    # Sample window (40 points per station)
    max_pts = min(40, len(test_df) - 36) 
    
    for i in range(max_pts):
        window = test_df.iloc[i : i + 36]
        
        # Ground Truth (t+1)
        actual_val = window[target_col].iloc[24] 
        
        # 1. LSTM t+1 Prediction
        l_feat = scaler_X_lstm.transform(window[cols_lstm].iloc[:24])
        l_pred = model_lstm([l_feat.reshape(1, 24, -1), np.array([[station]])], training=False).numpy()[0, 0]
        
        # 2. TTM t+1 Prediction
        ttm_seg = window.copy()
        ttm_seg[cols_lstm] = scaler_X_ttm.transform(ttm_seg[cols_lstm])
        ttm_seg[[target_col]] = scaler_y_ttm.transform(ttm_seg[[target_col]])
        X_t = torch.tensor(ttm_seg[cols_ttm].values[:24], dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            t_out = model_ttm(past_values=X_t).prediction_outputs
            t_scaled = t_out[0, 0, 0].numpy().reshape(-1, 1)
            t_pred = scaler_y_ttm.inverse_transform(t_scaled).flatten()[0]

        # 3. SARIMA t+1 (From Unified Store)
        s_pred = unified_sarima_store[station].get_forecast(steps=1).predicted_mean[0]

        all_actual_t1.append(actual_val)
        all_lstm_t1.append(l_pred)
        all_ttm_t1.append(t_pred)
        all_sarima_t1.append(s_pred)

# --- THE BIG PLOT ---
plt.figure(figsize=(16, 6))
plt.plot(all_actual_t1, label="Actual AQI (Ground Truth)", color='black', linewidth=2.5, zorder=3)
plt.plot(all_lstm_t1, label=f"LSTM AI (MAE: {mean_absolute_error(all_actual_t1, all_lstm_t1):.2f})", color='#2ecc71', alpha=0.8)
plt.plot(all_ttm_t1, label=f"TTM Foundation (MAE: {mean_absolute_error(all_actual_t1, all_ttm_t1):.2f})", color='#e74c3c', linewidth=2)
plt.plot(all_sarima_t1, label="SARIMA Baseline", color='#3498db', linestyle='--', alpha=0.5)

plt.title("Unified System-Wide Performance: Next Hour Forecast (t+1)", fontsize=15, fontweight='bold')
plt.xlabel("Test Samples (Aggregated across all stations)", fontsize=12)
plt.ylabel("AQI Value", fontsize=12)
plt.legend(loc='upper right', frameon=True, shadow=True)
plt.grid(True, which='both', linestyle='--', alpha=0.4)
plt.tight_layout()
plt.show()

print("✅ Unified Plot Generated successfully!")