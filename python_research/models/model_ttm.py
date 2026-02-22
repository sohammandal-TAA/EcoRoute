import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from tsfm_public.models.tinytimemixer import TinyTimeMixerForPrediction, TinyTimeMixerConfig
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import joblib, os

if torch.cuda.is_available():
    DEVICE = "cuda"
elif torch.backends.mps.is_available():
    DEVICE = "mps"
else:
    DEVICE = "cpu"

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)
if torch.backends.mps.is_available():
    torch.mps.manual_seed(SEED)
os.environ["PYTHONHASHSEED"] = str(SEED)
torch.use_deterministic_algorithms(True)

# =====================================
# 1. Load Data
# =====================================

data = pd.read_csv("../data/durgapur_final.csv")

continuous_cols = [
    "pm2_5", "pm10", "no2", "co", "so2", "o3",
    "temp_c", "wind", "humidity"
]

cyclical_cols = [
    "hour_sin", "hour_cos",
    "date_sin", "date_cos",
    "month_sin", "month_cos",
    "year"
]


base_feature_cols = continuous_cols + cyclical_cols 
target_col = "AQI"
feature_cols = base_feature_cols + [target_col]
# =====================================
# 2. Train/Test Split (Chronological)
# =====================================

train_ratio = 0.7
val_ratio = 0.1
test_ratio = 0.2

train_parts, val_parts, test_parts = [], [], []

for station in data["station_id"].unique():
    df_s = data[data["station_id"] == station]

    n = len(df_s)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_parts.append(df_s.iloc[:train_end])
    val_parts.append(df_s.iloc[train_end:val_end])
    test_parts.append(df_s.iloc[val_end:])

train_df = pd.concat(train_parts).reset_index(drop=True)
val_df = pd.concat(val_parts).reset_index(drop=True)
test_df = pd.concat(test_parts).reset_index(drop=True)

# =====================================
# 3. Scaling
# =====================================

scaler_X = StandardScaler()
scaler_y = StandardScaler()

scaler_X.fit(train_df[base_feature_cols])
scaler_y.fit(train_df[[target_col]])

for df in [train_df, val_df, test_df]:
    df[base_feature_cols] = scaler_X.transform(df[base_feature_cols])
    df[[target_col]] = scaler_y.transform(df[[target_col]])

# =====================================
# 4. Sequence Creation
# =====================================

def create_sequences(df, look_back=24, look_ahead=12):
    X, y = [], []

    for station in df["station_id"].unique():
        df_s = df[df["station_id"] == station]

        # Now includes scaled AQI
        features = df_s[feature_cols].values
        targets = df_s[target_col].values

        for i in range(len(df_s) - look_back - look_ahead + 1):
            X.append(features[i:i+look_back])
            y.append(targets[i+look_back:i+look_back+look_ahead])

    return (
        torch.tensor(np.array(X), dtype=torch.float32),
        torch.tensor(np.array(y), dtype=torch.float32),
    )



look_back = 24
look_ahead = 12

X_train, y_train = create_sequences(train_df, look_back, look_ahead)
X_val, y_val = create_sequences(val_df, look_back, look_ahead)
X_test, y_test = create_sequences(test_df, look_back, look_ahead)

print("Train:", X_train.shape)
print("Val:", X_val.shape)
print("Test:", X_test.shape)

# =====================================
# 5. Model
# =====================================

config = TinyTimeMixerConfig(
    context_length=look_back,
    prediction_length=look_ahead,
    num_input_channels=len(feature_cols),
    d_model=48,
    num_time_features=0,
    num_static_categorical_features=0,
    patch_size=4,
    num_static_real_features=0,
    cardinality=None,
)

model = TinyTimeMixerForPrediction.from_pretrained(
    "ibm-granite/granite-timeseries-ttm-r1",
    config=config,
    ignore_mismatched_sizes=True
).to(DEVICE)

for param in model.backbone.parameters():
    param.requires_grad = False

print("Backbone frozen. Decoder + Head trainable.")
# print("\nTrainable Parameters:")
# for name, param in model.named_parameters():
#     if param.requires_grad:
#         print(name)


optimizer = torch.optim.AdamW(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=1e-5
)

loss_fn = nn.L1Loss()

train_loader = DataLoader(
    TensorDataset(X_train, y_train),
    batch_size=32,
    shuffle=False
)

val_loader = DataLoader(
    TensorDataset(X_val, y_val),
    batch_size=32,
    shuffle=False
)

# =====================================
# 6. Training with Validation
# =====================================

epochs = 20
train_losses = []
val_losses = []

print("\n" + "="*50)
print("\nTRAINING...\n")
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total = sum(p.numel() for p in model.parameters())

print(f"Trainable params: {trainable:,}")
print(f"Total params: {total:,}")
print(f"% Trainable: {100 * trainable / total:.2f}%")
print("="*50)

for epoch in range(epochs):
    model.train()
    total_train_loss = 0

    for xb, yb in train_loader:
        xb, yb = xb.to(DEVICE), yb.to(DEVICE)

        optimizer.zero_grad()

        output = model(
            past_values=xb
        ).prediction_outputs

        loss = loss_fn(output[:, :, 0], yb)
        loss.backward()
        optimizer.step()

        total_train_loss += loss.item()

    avg_train_loss = total_train_loss / len(train_loader)
    train_losses.append(avg_train_loss)

    # Validation
    model.eval()
    total_val_loss = 0

    with torch.no_grad():
        for xb, yb in val_loader:
            xb, yb = xb.to(DEVICE), yb.to(DEVICE)

            output = model(
                past_values=xb
            ).prediction_outputs

            loss = loss_fn(output[:, :, 0], yb)
            total_val_loss += loss.item()

    avg_val_loss = total_val_loss / len(val_loader)
    val_losses.append(avg_val_loss)

    print(f"Epoch {epoch+1:2d}/{epochs} | "
          f"Train Loss: {avg_train_loss:.4f} | "
          f"Val Loss: {avg_val_loss:.4f}")

# =====================================
# 7. Plot Training vs Validation Loss
# =====================================

plt.figure(figsize=(10,6))
plt.plot(train_losses, label="Training Loss", linewidth=2)
plt.plot(val_losses, label="Validation Loss", linewidth=2)
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.title("Training vs Validation Loss")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

# =====================================
# 8. Evaluation
# =====================================

print("\n" + "="*50)
print("EVALUATION")

model.eval()


with torch.no_grad():
    # 1. Move test data to device
    X_test_device = X_test.to(DEVICE)
    
    # 3. Correct forward call and attribute name
    output_obj = model(past_values=X_test_device)
    pred_tensor = output_obj.prediction_outputs
    
    # 4. Slice Channel 0 (AQI) and move to CPU
    # Shape: [N, 12, 22] -> [N, 12]
    pred = pred_tensor[:, :, 0]
    pred = pred.cpu().numpy()

# list of all model modules and their names (for debugging)
# for name, module in model.named_modules():
#     print(name)
# print(model.head)
# for name, module in model.head.named_modules():
#     print(name, module)


# print("Configured output channels:", config.num_output_channels)
# print("Model head:", model.projection)

actual = y_test.numpy()

# Inverse scale AQI
# Reshape to 2D for scaler compatibility, then back to original shape
pred_inv = scaler_y.inverse_transform(pred.reshape(-1, 1)).reshape(pred.shape)
actual_inv = scaler_y.inverse_transform(actual.reshape(-1, 1)).reshape(actual.shape)

pred_inv = np.clip(pred_inv, 0, 500)

# Metrics
mse = mean_squared_error(actual_inv.flatten(), pred_inv.flatten())
mae = mean_absolute_error(actual_inv.flatten(), pred_inv.flatten())
rmse = np.sqrt(mse)
mape = np.mean(
    np.abs((actual_inv - pred_inv) / np.maximum(actual_inv, 1))
) * 100


print("OVERALL METRICS")
print("="*50)
print(f"RMSE: {rmse:.2f}")
print(f"MAE:  {mae:.2f}")
print(f"MAPE: {mape:.2f}%")
print("="*50)

# Stepwise R2
print("\nHOURLY R² SCORES:")
print("-" * 30)
for i in range(look_ahead):
    r2 = r2_score(actual_inv[:, i], pred_inv[:, i])
    print(f"  Hour {i+1:2d} (t+{i+1:2d}): R² = {r2:.4f}")

# =====================================
# 9. Plot 12-Hour Forecast
# =====================================

sample_index = 0

plt.figure(figsize=(12,6))
plt.plot(range(1, look_ahead+1), actual_inv[sample_index], label="Actual AQI", marker='o', linewidth=2, markersize=8)
plt.plot(range(1, look_ahead+1), pred_inv[sample_index], label="Predicted AQI", marker='x', linewidth=2, markersize=8)
plt.title("AQI Forecast (Next 12 Hours) - TTM Model", fontsize=14, fontweight='bold')
plt.xlabel("Hours Ahead", fontsize=12)
plt.ylabel("AQI", fontsize=12)
plt.legend(fontsize=11)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
# plt.savefig("forecast_12h.png", dpi=150, bbox_inches='tight')
# plt.close()
# print("\n✓ Saved: forecast_12h.png")

# =====================================
# 10. Plot Next Hour Forecast (200 points)
# =====================================

plt.figure(figsize=(14,6))
n_points = min(200, len(actual_inv))
plt.plot(actual_inv[:n_points,0], label="Actual AQI (t+1)", alpha=0.8, linewidth=1.5)
plt.plot(pred_inv[:n_points,0], label="Predicted AQI (t+1)", alpha=0.8, linewidth=1.5)
plt.title("Next Hour AQI Prediction - TTM Model", fontsize=14, fontweight='bold')
plt.xlabel("Time Step", fontsize=12)
plt.ylabel("AQI", fontsize=12)
plt.legend(fontsize=11)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
# plt.savefig("forecast_t1.png", dpi=150, bbox_inches='tight')
# plt.close()
# print("✓ Saved: forecast_t1.png")

# =====================================
# 11. Plot Error Distribution
# =====================================

errors = pred_inv[:, 0] - actual_inv[:, 0]
plt.figure(figsize=(10,6))
plt.hist(errors, bins=50, edgecolor='black', alpha=0.7)
plt.axvline(x=0, color='red', linestyle='--', linewidth=2, label='Zero Error')
plt.title("Prediction Error Distribution (t+1)", fontsize=14, fontweight='bold')
plt.xlabel("Prediction Error (AQI)", fontsize=12)
plt.ylabel("Frequency", fontsize=12)
plt.legend(fontsize=11)
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("error_distribution.png", dpi=150, bbox_inches='tight')
plt.close()
print("✓ Saved: error_distribution.png")

# =====================================
# 12. Save Model + Scalers
# =====================================

torch.save(model.state_dict(), "durgapur_ttm_model.pt")
joblib.dump(scaler_X, "scaler_x_ttm.pkl")
joblib.dump(scaler_y, "scaler_y_ttm.pkl")

print("\n" + "="*50)
print("MODEL SAVED")
print("="*50)
print("✓ durgapur_ttm_model.pt")
print("✓ scaler_x_ttm.pkl")
print("✓ scaler_y_ttm.pkl")
print("="*50)

print("\n✅ Training complete! All files saved successfully.")