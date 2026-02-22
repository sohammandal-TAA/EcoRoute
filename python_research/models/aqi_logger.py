# aqi_logger.py

import os
import pandas as pd

CSV_FILE = "aqi_model_comparison.csv"


def save_model_output(hourly_data, model_name):
    """
    hourly_data format:
    [
        {"datetime_ist": "...", "aqi": 180},
        ...
    ]
    """

    rows = []

    for i, item in enumerate(hourly_data, start=1):
        rows.append({
            "datetime_ist": item["datetime_ist"],
            "hour_ahead": i,
            "model_name": model_name,
            "aqi": item["aqi"]
        })

    df_new = pd.DataFrame(rows)

    # Append if file exists
    if os.path.exists(CSV_FILE):
        df_new.to_csv(CSV_FILE, mode="a", header=False, index=False)
    else:
        df_new.to_csv(CSV_FILE, index=False)

    print(f"Saved {model_name} output to {CSV_FILE}")


    ## How to use:

"""
from aqi_logger import save_model_output

baseline_output = forecast_with_google_api(test_req)
save_model_output(baseline_output, model_name="Baseline")

from aqi_logger import save_model_output

ttm_output = ttm_predict()
save_model_output(ttm_output, model_name="TTM")

"""