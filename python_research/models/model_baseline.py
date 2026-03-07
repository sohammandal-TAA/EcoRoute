import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error

# --- CONSTANTS ---
FILE_PATH = "../data/durgapur_final_aqi.csv"
N_IN = 24  
N_OUT = 12 
RUN_MODE = 'prev_day'       # Options: 'persistence', 'prev_day', 'prev_week', 'prev_month'

def load_data(file_path):
    """
    Attempts to load the AQI dataset from a CSV file.

    Args:
        file_path: Relative or absolute path to the .csv file.

    Returns:
        pd.DataFrame if successful, None otherwise.
    """
    try:
        return pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
        return None

def predict_baseline(full_series, current_idx, mode='persistence', n_out=12):
    """
    Generates a forecast based on a simple historical lookback or persistence.

    Args:
        full_series: The complete 1D array of AQI values for a specific station.
        current_idx: The current time index (the 'Now' or 'Forecast Origin').
        mode: The strategy used to look back into history.
        n_out: The number of future steps to predict.

    Returns:
        np.ndarray: An array of n_out predicted AQI values.
    """
    try:
        if mode == 'persistence':
            return np.full(n_out, full_series[current_idx])
        elif mode == 'prev_day':
            start = current_idx - 24 + 1
            return full_series[start : start + n_out]
        elif mode == 'prev_week':
            start = current_idx - 168 + 1
            return full_series[start : start + n_out]
        elif mode == 'prev_month':
            start = current_idx - 720 + 1
            return full_series[start : start + n_out]
    except (IndexError, ValueError):
        return np.full(n_out, full_series[current_idx])

def run_evaluation_loop(df, mode, n_in, n_out):
    """
    Iterates through all time steps and stations to pre-calculate all 
    possible forecast windows.

    Args:
        df: The loaded air quality DataFrame.
        mode: The chosen baseline strategy.
        n_in: Input window length.
        n_out: Output window length.

    Returns:
        A tuple containing (Actual Values, Predicted Values, Global Row Indices).
    """
    actuals, predictions, global_indices = [], [], []
    
    for station in df['station_id'].unique():
        series = df[df['station_id'] == station]['AQI'].values
        df_indices = df[df['station_id'] == station].index.values
        
        start_point = max(n_in, 720) 
        
        for i in range(start_point, len(series) - n_out):
            y_truth = series[i + 1 : i + 1 + n_out]
            y_guess = predict_baseline(series, i, mode=mode, n_out=n_out)
            
            if len(y_guess) == n_out:
                actuals.append(y_truth)
                predictions.append(y_guess)
                global_indices.append(df_indices[i])
                
    return np.array(actuals), np.array(predictions), np.array(global_indices)

def calculate_local_metrics(y_true_slice, y_pred_slice):
    """
    Calculates statistical errors for a specific 12-hour forecast window.

    Args:
        y_true_slice: The 12-hour actual data.
        y_pred_slice: The 12-hour predicted data.

    Returns:
        Tuple: (Mean Absolute Error, Root Mean Squared Error, Mean Absolute Percentage Error).
    """
    mae = mean_absolute_error(y_true_slice, y_pred_slice)
    rmse = np.sqrt(mean_squared_error(y_true_slice, y_pred_slice))
    # Avoid division by zero for MAPE
    mape = np.mean(np.abs((y_true_slice - y_pred_slice) / (y_true_slice + 1e-7))) * 100
    return mae, rmse, mape

def plot_forecast_with_history(y_true, y_pred, full_series, current_idx, mode, mae, rmse, n_in=24, n_out=12):
    """
    Generates a visualization showing history, actuals, predictions, and local error.
    """
    plt.figure(figsize=(14, 6))
    
    history_steps = np.arange(-n_in + 1, 1)
    future_steps = np.arange(1, n_out + 1)
    history_data = full_series[current_idx - n_in + 1 : current_idx + 1]
    
    plt.plot(history_steps, history_data, label='Input Window (History)', color='blue', marker='s', alpha=0.5)
    plt.plot(future_steps, y_true, label='Actual Future AQI', color='black', marker='o', linewidth=2)
    plt.plot(future_steps, y_pred, label=f'Baseline ({mode})', color='red', linestyle='--', linewidth=2)
    
    plt.axvline(x=0, color='gray', linestyle='-', label='Forecast Point (Now)')
    
    # Show the specific error for THIS window in the title
    plt.title(f"Index {current_idx} | Mode: {mode}\nLocal MAE: {mae:.2f} | Local RMSE: {rmse:.2f}", fontsize=14)
    plt.xlabel("Hours Relative to Now")
    plt.ylabel("AQI Value")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.show()

def main():
    df = load_data(FILE_PATH)
    if df is None: return


    y_true_all, y_pred_all, indices_all = run_evaluation_loop(df, RUN_MODE, N_IN, N_OUT)

    if len(y_true_all) > 0:
        print(f"Dataset ready. Mode: {RUN_MODE} | Total Samples: {len(y_true_all)}")
        

        user_input = input(f"Enter a sample index (0 to {len(y_true_all)-1}): ")
        try:
            idx = int(user_input)
            

            y_true_slice = y_true_all[idx]
            y_pred_slice = y_pred_all[idx]
            mae, rmse, mape = calculate_local_metrics(y_true_slice, y_pred_slice)
            

            print(f"\n--- Metrics for Sample {idx} (Global Row {indices_all[idx]}) ---")
            print(f"Local MAE:  {mae:.4f}")
            print(f"Local RMSE: {rmse:.4f}")
            print(f"Local MAPE: {mape:.2f}%")


            plot_forecast_with_history(
                y_true_slice, y_pred_slice, df['AQI'].values, indices_all[idx], RUN_MODE, mae, rmse
            )
        except (ValueError, IndexError):
            print("Invalid index choice.")
    else:
        print("No samples generated.")

if __name__ == "__main__":
    main()