# import os
# import pandas as pd
# import matplotlib.pyplot as plt

# CSV_FILE = "aqi_model_comparison.csv"


# def plot_all_models():
#     if not os.path.exists(CSV_FILE):
#         print("CSV file not found.")
#         return

#     df = pd.read_csv(CSV_FILE)

#     plt.figure(figsize=(12, 7))

#     for model in df["model_name"].unique():
#         model_df = df[df["model_name"] == model]

#         plt.plot(
#             model_df["hour_ahead"],
#             model_df["aqi"],
#             marker='o',
#             linewidth=2,
#             label=model
#         )

#     plt.title("AQI Forecast Comparison (Next 12 Hours)")
#     plt.xlabel("Hours Ahead")
#     plt.ylabel("AQI")
#     plt.legend()
#     plt.grid(True)
#     plt.tight_layout()
#     plt.show()


# if __name__ == "__main__":
#     plot_all_models()



import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib
import matplotlib.pyplot as plt

# ---------------------------
# CONFIG
# ---------------------------

FILE_PATH = "../data/durgapur_final_aqi.csv"
sample_idx = 1450
N_IN = 24
N_OUT = 12

BASELINE_MODES = [
    "persistence",
    "prev_day",
    "prev_week",
    "prev_month"
]

# Load LSTM predictions
lstm_pred = np.load("lstm_predictions.npy")
lstm_actual = np.load("lstm_actual.npy")

# ---------------------------
# Baseline Predictor
# ---------------------------

def predict_baseline(series, idx, mode, n_out=12):

    try:
        if mode == "persistence":
            return np.full(n_out, series[idx])

        elif mode == "prev_day":
            start = idx - 24 + 1
            return series[start:start+n_out]

        elif mode == "prev_week":
            start = idx - 168 + 1
            return series[start:start+n_out]

        elif mode == "prev_month":
            start = idx - 720 + 1
            return series[start:start+n_out]

    except:
        return np.full(n_out, series[idx])


# ---------------------------
# Generate Baseline Forecasts
# ---------------------------

def generate_baselines(df):

    actual_all = []
    baseline_preds = {mode: [] for mode in BASELINE_MODES}

    for station in df["station_id"].unique():

        series = df[df["station_id"] == station]["AQI"].values

        start_point = max(N_IN, 720)

        for i in range(start_point, len(series) - N_OUT):

            y_true = series[i+1:i+1+N_OUT]
            actual_all.append(y_true)

            for mode in BASELINE_MODES:

                pred = predict_baseline(series, i, mode)
                baseline_preds[mode].append(pred)

    actual_all = np.array(actual_all)

    for mode in BASELINE_MODES:
        baseline_preds[mode] = np.array(baseline_preds[mode])

    return actual_all, baseline_preds


# ---------------------------
# Metric Function
# ---------------------------

def compute_metrics(actual, pred):

    rmse = np.sqrt(mean_squared_error(actual.flatten(), pred.flatten()))
    mae = mean_absolute_error(actual.flatten(), pred.flatten())
    mape = np.mean(np.abs((actual - pred) / actual)) * 100

    return rmse, mae, mape


# ---------------------------
# Per Horizon Metrics
# ---------------------------

def per_horizon_metrics(actual, pred):

    results = []

    for h in range(N_OUT):

        rmse = np.sqrt(mean_squared_error(actual[:,h], pred[:,h]))
        mae = mean_absolute_error(actual[:,h], pred[:,h])
        mape = np.mean(np.abs((actual - pred) / (actual + 1e-6))) * 100

        results.append((rmse, mae, mape))

    return results


# ---------------------------
# Main
# ---------------------------

df = pd.read_csv(FILE_PATH)

actual_all, baseline_preds = generate_baselines(df)

print("Baseline samples:", actual_all.shape)

# ---------------------------
# Evaluate Baselines
# ---------------------------

for mode in BASELINE_MODES:

    rmse, mae, mape = compute_metrics(actual_all, baseline_preds[mode])

    print("\nBaseline:", mode)
    print("RMSE:", rmse)
    print("MAE:", mae)
    print("MAPE:", mape)

# ---------------------------
# Evaluate LSTM
# ---------------------------

rmse, mae, mape = compute_metrics(lstm_actual, lstm_pred)

print("\nLSTM Model")
print("RMSE:", rmse)
print("MAE:", mae)
print("MAPE:", mape)

# ---------------------------
# Per Hour Comparison
# ---------------------------

print("\nPer Hour RMSE Comparison")

lstm_hour = per_horizon_metrics(lstm_actual, lstm_pred)

for h in range(N_OUT):

    print(f"\nHour {h+1}")

    print("LSTM RMSE:", lstm_hour[h][0])

    for mode in BASELINE_MODES:

        rmse = np.sqrt(mean_squared_error(
            actual_all[:,h],
            baseline_preds[mode][:,h]
        ))

        print(mode, "RMSE:", rmse)

# ---------------------------
# 12 Hour Forecast Comparison Plot
# ---------------------------

horizon = np.arange(1, N_OUT + 1)

plt.figure(figsize=(10,6))

# Actual
plt.plot(
    horizon,
    actual_all[sample_idx],
    marker='o',
    linewidth=3,
    label="Actual",
    color="black"
)

# LSTM
plt.plot(
    horizon,
    lstm_pred[sample_idx],
    marker='o',
    linestyle='-',
    label="LSTM"
)

# Baselines
for mode in BASELINE_MODES:

    plt.plot(
        horizon,
        baseline_preds[mode][sample_idx],
        marker='o',
        linestyle='--',
        label=mode
    )

plt.xlabel("Forecast Horizon (Hours)")
plt.ylabel("AQI")
plt.title("12 Hour AQI Forecast Comparison")

plt.legend()
plt.grid(True)

plt.show()