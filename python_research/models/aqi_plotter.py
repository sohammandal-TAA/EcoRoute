import os
import pandas as pd
import matplotlib.pyplot as plt

CSV_FILE = "aqi_model_comparison.csv"


def plot_all_models():
    if not os.path.exists(CSV_FILE):
        print("CSV file not found.")
        return

    df = pd.read_csv(CSV_FILE)

    plt.figure(figsize=(12, 7))

    for model in df["model_name"].unique():
        model_df = df[df["model_name"] == model]

        plt.plot(
            model_df["hour_ahead"],
            model_df["aqi"],
            marker='o',
            linewidth=2,
            label=model
        )

    plt.title("AQI Forecast Comparison (Next 12 Hours)")
    plt.xlabel("Hours Ahead")
    plt.ylabel("AQI")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    plot_all_models()