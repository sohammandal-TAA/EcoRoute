import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import RobustScaler, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import matplotlib.pyplot as plt
import joblib
from torch.utils.data import Dataset, DataLoader


# =========================================
# 2. Device
# =========================================

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# =========================================
# 3. Load Data
# =========================================

data = pd.read_csv("../data/durgapur_final_aqi.csv")

# Ensure station ids start from 0
station_map = {s:i for i,s in enumerate(data["station_id"].unique())}
data["station_id"] = data["station_id"].map(station_map)

continuous_cols = [
    "pm2_5","pm10","no2","co","so2","o3",
    "temp_c","wind","humidity"
]

cyclical_cols = [
    "hour_sin","hour_cos",
    "date_sin","date_cos",
    "month_sin","month_cos","year"
]

feature_cols = continuous_cols + cyclical_cols
target_col = "AQI"

# =========================================
# 4. Train Test Split
# =========================================

train_ratio = 0.8
train_parts = []
test_parts = []

for station in data["station_id"].unique():

    df_s = data[data["station_id"] == station]

    split = int(len(df_s) * train_ratio)

    train_parts.append(df_s.iloc[:split])
    test_parts.append(df_s.iloc[split:])

train_df = pd.concat(train_parts).reset_index(drop=True)
test_df  = pd.concat(test_parts).reset_index(drop=True)

# =========================================
# 5. Scaling
# =========================================

scaler_X = RobustScaler()
scaler_y = StandardScaler()

scaler_X.fit(train_df[feature_cols])
scaler_y.fit(train_df[[target_col]])

train_df[feature_cols] = scaler_X.transform(train_df[feature_cols])
test_df[feature_cols]  = scaler_X.transform(test_df[feature_cols])

train_df[target_col] = scaler_y.transform(train_df[[target_col]])
test_df[target_col]  = scaler_y.transform(test_df[[target_col]])

# =========================================
# 6. Sequence Creation
# =========================================

def create_sequences(df, feature_cols, target_col,
                     look_back=24, look_ahead=12):

    X, station_ids, y, last_values_list = [], [], [], []

    for station in df["station_id"].unique():

        df_s = df[df["station_id"] == station]
        features = df_s[feature_cols].values
        targets  = df_s[target_col].values

        for i in range(len(df_s) - look_back - look_ahead + 1):

            X_seq = features[i:i+look_back]
            y_future = targets[i+look_back:i+look_back+look_ahead]

            last_value = targets[i+look_back-1]
            y_delta = y_future - last_value

            X.append(X_seq)
            station_ids.append(station)
            y.append(y_delta)
            last_values_list.append(last_value)

    return (
        np.array(X, dtype=np.float32),
        np.array(station_ids, dtype=np.int64),
        np.array(y, dtype=np.float32),
        np.array(last_values_list, dtype=np.float32)
    )

look_back = 24
look_ahead = 12

X_train, station_train, y_train, last_aqi_train = create_sequences(
    train_df, feature_cols, target_col, look_back, look_ahead
)

X_test, station_test, y_test, last_aqi_test = create_sequences(
    test_df, feature_cols, target_col, look_back, look_ahead
)


# =========================================
# 7. Dataset
# =========================================

class AQIDataset(Dataset):
    def __init__(self, X, station, y, last_aqi_values):
        self.X = torch.tensor(X)
        self.station = torch.tensor(station)
        self.y = torch.tensor(y)
        self.last_aqi_values = torch.tensor(last_aqi_values)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.station[idx], self.y[idx], self.last_aqi_values[idx]

train_dataset = AQIDataset(X_train, station_train, y_train, last_aqi_train)
test_dataset  = AQIDataset(X_test, station_test, y_test, last_aqi_test)

train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
test_loader  = DataLoader(test_dataset, batch_size=64, shuffle=False)

# =========================================
# 8. Model
# =========================================

class AQIModel(nn.Module):
    def __init__(self, input_size, num_stations, look_ahead):
        super().__init__()

        self.embedding = nn.Embedding(num_stations, 4)

        self.encoder_lstm1 = nn.LSTM(
            input_size + 4, 128, batch_first=True
        )

        self.encoder_lstm2 = nn.LSTM(
            128, 64, batch_first=True
        )

        self.fc = nn.Linear(64, 128)
        self.dropout = nn.Dropout(0.1)

        self.decoder_lstm1 = nn.LSTM(
            128, 64, batch_first=True
        )

        self.decoder_lstm2 = nn.LSTM(
            64, 64, batch_first=True
        )

        self.output_layer = nn.Linear(64, 1)

        self.look_ahead = look_ahead

    def forward(self, x, station):

        emb = self.embedding(station)
        emb = emb.unsqueeze(1).repeat(1, x.size(1), 1)

        x = torch.cat([x, emb], dim=2)

        x, _ = self.encoder_lstm1(x)
        x, _ = self.encoder_lstm2(x)

        x = x[:, -1, :]

        x = torch.relu(self.fc(x))
        x = self.dropout(x)

        x = x.unsqueeze(1).repeat(1, self.look_ahead, 1)

        x, _ = self.decoder_lstm1(x)
        x, _ = self.decoder_lstm2(x)

        x = self.output_layer(x)

        return x.squeeze(-1)

num_stations = data["station_id"].nunique()
model = AQIModel(len(feature_cols), num_stations, look_ahead).to(device)

criterion = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.0001)

scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
    optimizer,
    T_0=10,        # First restart after 10 epochs
    T_mult=2,      # After each restart, cycle length doubles
    eta_min=1e-5
)


# =========================================
# 9. Training
# =========================================

epochs = 30

for epoch in range(epochs):

    model.train()
    total_loss = 0

    for X_batch, station_batch, y_batch, last_aqi_batch in train_loader:

        X_batch = X_batch.to(device)
        station_batch = station_batch.to(device)
        y_batch = y_batch.to(device)

        optimizer.zero_grad()

        pred = model(X_batch, station_batch)
        loss = criterion(pred, y_batch)

        loss.backward()

        # 🔥 Recommended for LSTM stability
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)

        optimizer.step()

        total_loss += loss.item()

    # 🔥 Cosine scheduler step
    scheduler.step()

    current_lr = optimizer.param_groups[0]['lr']

    print(f"Epoch {epoch+1}/{epochs}, "
          f"Loss: {total_loss/len(train_loader):.6f}, "
          f"LR: {current_lr:.8f}")
# =========================================
# 10. Prediction
# =========================================

model.eval()
pred_scaled_list = []
actual_scaled_list = []

with torch.no_grad():
    for X_batch, station_batch, y_batch, last_aqi_batch in test_loader:

        X_batch = X_batch.to(device)
        station_batch = station_batch.to(device)
        y_batch = y_batch.to(device)
        last_aqi_batch = last_aqi_batch.to(device)

        pred = model(X_batch, station_batch)

        # Residual reconstruction
        pred_scaled_batch = pred + last_aqi_batch.unsqueeze(-1)
        actual_scaled_batch = y_batch + last_aqi_batch.unsqueeze(-1)

        pred_scaled_list.append(pred_scaled_batch.cpu().numpy())
        actual_scaled_list.append(actual_scaled_batch.cpu().numpy())

pred_scaled_all = np.vstack(pred_scaled_list)
actual_scaled_all = np.vstack(actual_scaled_list)

# Inverse transformation and clipping
pred = scaler_y.inverse_transform(pred_scaled_all.reshape(-1,1)).reshape(pred_scaled_all.shape)
actual = scaler_y.inverse_transform(actual_scaled_all.reshape(-1,1)).reshape(actual_scaled_all.shape)

# Clip values to be non-negative as AQI cannot be negative
actual = np.maximum(0, actual)
pred = np.maximum(0, pred)

# =========================================
# 12. Metrics
# =========================================

rmse = np.sqrt(mean_squared_error(actual.flatten(), pred.flatten()))
mae = mean_absolute_error(actual.flatten(), pred.flatten())

# MAPE
mape = np.mean(np.abs((actual.flatten() - pred.flatten()) / actual.flatten())) * 100

print("RMSE:", rmse)
print("MAE:", mae)
print("MAPE:", mape, "%")


# Per-hour RMSE
for i in range(look_ahead):
    step_rmse = np.sqrt(mean_squared_error(actual[:, i], pred[:, i]))
    print(f"Hour {i+1} RMSE:", step_rmse)


# Per-hour MAPE
for i in range(look_ahead):
    step_mape = np.mean(np.abs((actual[:, i] - pred[:, i]) / actual[:, i])) * 100
    print(f"Hour {i+1} MAPE:", step_mape, "%")


# =========================================
# 13. Plots
# =========================================

plt.figure(figsize=(10,5))
plt.plot(actual[0],label="Actual")
plt.plot(pred[0],label="Predicted")
plt.legend()
plt.title("Next 12 Hour AQI Forecast")
plt.grid()
plt.show()

# =========================================
# 14. Save Model + Predictions
# =========================================

torch.save(model.state_dict(),"aqi_lstm_seq2seq.pt")

joblib.dump(scaler_X,"scaler_x_lstm.pkl")
joblib.dump(scaler_y,"scaler_y_lstm.pkl")

np.save("lstm_predictions.npy",pred)
np.save("lstm_actual.npy",actual)

print("\nModel + Predictions Saved")