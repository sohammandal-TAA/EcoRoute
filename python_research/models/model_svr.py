import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import GridSearchCV
# 1. LOAD & SPLIT
data = pd.read_csv("../data/durgapur_final_aqi.csv")

continuous_cols = ["pm2_5", "pm10", "no2", "co", "so2", "o3", "temp_c", "wind", "humidity"]
cyclical_cols = ["hour_sin", "hour_cos", "date_sin", "date_cos", "month_sin", "month_cos", "year"]
target_col = "AQI"

train_ratio = 0.8
train_parts, test_parts = [], []

for station in data["station_id"].unique():
    df_s = data[data["station_id"] == station]
    split_index = int(len(df_s) * train_ratio)
    train_parts.append(df_s.iloc[:split_index])
    test_parts.append(df_s.iloc[split_index:])

train_df = pd.concat(train_parts).reset_index(drop=True)
test_df  = pd.concat(test_parts).reset_index(drop=True)

# --- 2. SELECTIVE SCALING & ENCODING (THE CORRECT WAY) ---
"""
ColumnTransformer ensures:
- Standardizing ONLY raw continuous pollutants/weather
- One-Hot Encoding ONLY station_id
- Passing through Cyclical features WITHOUT touching them
"""
ct = ColumnTransformer(transformers=[
    ('scale_cont', StandardScaler(), continuous_cols),
    ('encode_stat', OneHotEncoder(drop='first', sparse_output=False), ['station_id'])
], remainder='passthrough') 

# Fit the ColumnTransformer on training data and transform both train and test
X_train = ct.fit_transform(train_df[continuous_cols + cyclical_cols + ['station_id']])
X_test  = ct.transform(test_df[continuous_cols + cyclical_cols + ['station_id']])

# Scale Target (y) - SVR distance-based hai, isliye y scale karna zaroori hai
scaler_y = StandardScaler()
y_train = scaler_y.fit_transform(train_df[[target_col]]).flatten()
y_test  = test_df[target_col].values

# --- 3. TRAIN & EVALUATE ---

# param_grid = {
#     'C': [10,100],
#     'epsilon': [0.01, 0.1],
#     'gamma': ['scale', 'auto', 0.01, 0.1, 1],
#     'kernel': ['rbf'],
# }
# grid = GridSearchCV(SVR(), param_grid, refit=True, verbose=3, n_jobs=-1)

print("Training SVR with proper selective scaling...")
svr_model = SVR(kernel='rbf', C=100, epsilon=0.01, gamma='scale', cache_size=1000)
svr_model.fit(X_train, y_train)

# Prediction and Inverse Scaling
y_pred_scaled = svr_model.predict(X_test)
y_pred = scaler_y.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()

# 7. EVALUATION
def calculate_metrics(actual, predicted, name="SVR"):
    mae = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))
    mape = np.mean(np.abs((actual - predicted) / (actual + 1e-7))) * 100
    
    print(f"--- {name} Evaluation ---")
    print(f"MAE:  {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"MAPE: {mape:.2f}%")

calculate_metrics(y_test, y_pred)

# 8. VISUALIZATION
plt.figure(figsize=(12, 5))
plt.plot(y_test[:200], label="Actual AQI", color='black', alpha=0.7)
plt.plot(y_pred[:200], label="SVR Predicted", color='blue', linestyle='--')
plt.title("SVR Model: Actual vs Predicted (Next Hour)")
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()

# print("Best SVR Parameters:", grid.best_params_)
# print("Best SVR Score (Negative MSE):", grid.best_score_)