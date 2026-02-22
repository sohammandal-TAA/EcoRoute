import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score
from tensorflow import keras
from tensorflow.keras import layers
import matplotlib.pyplot as plt
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib

# 1. Load and Clean
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

feature_cols = continuous_cols + cyclical_cols
target_col = "AQI"

# ===============================
# Train/Test Split (Per Station, Chronological)
# ===============================

train_ratio = 0.8
train_parts = []
test_parts = []

for station in data["station_id"].unique():
    
    df_s = data[data["station_id"] == station]
    
    split_index = int(len(df_s) * train_ratio)
    
    train_parts.append(df_s.iloc[:split_index])
    test_parts.append(df_s.iloc[split_index:])

train_df = pd.concat(train_parts).reset_index(drop=True)
test_df  = pd.concat(test_parts).reset_index(drop=True)


# ===============================
# Scaling (NO LEAKAGE)
# ===============================

scaler_X = StandardScaler()

# Fit feature scaler ONLY on training features
scaler_X.fit(train_df[feature_cols])

# Transform training data
train_df[feature_cols] = scaler_X.transform(train_df[feature_cols])

# Transform test data
test_df[feature_cols] = scaler_X.transform(test_df[feature_cols])


# ===============================
# Sequence Creation
# ===============================

def create_sequences(df, feature_cols, target_col,
                     look_back=24, look_ahead=24):
    
    X = []
    X_station = []
    y = []
    
    for station in df["station_id"].unique():
        
        df_s = df[df["station_id"] == station]
        
        features = df_s[feature_cols].values
        targets  = df_s[target_col].values
        
        for i in range(len(df_s) - look_back - look_ahead + 1):
            
            X.append(features[i:i+look_back])
            X_station.append(station)
            y.append(targets[i+look_back:i+look_back+look_ahead])
    
    X = np.array(X, dtype=np.float32)
    X_station = np.array(X_station, dtype=np.int32)
    y = np.array(y, dtype=np.float32)
    
    # reshape target for Seq2Seq models
    y = y[..., np.newaxis]   # (samples, 24, 1)
    
    return X, X_station, y

# ===============================
#  Create Final Train/Test Arrays
# ===============================

look_back  = 24
look_ahead = 12

X_train, station_train, y_train = create_sequences(
    train_df, feature_cols, target_col, look_back, look_ahead
)

X_test, station_test, y_test = create_sequences(
    test_df, feature_cols, target_col, look_back, look_ahead
)


# 5. Build and Train Model
num_stations = data["station_id"].nunique()

# Inputs
feature_input = layers.Input(shape=(look_back, len(feature_cols)))
station_input = layers.Input(shape=(1,))

# Embedding
embedding = layers.Embedding(
    input_dim=num_stations,
    output_dim=4
)(station_input)

embedding = layers.Flatten()(embedding)
embedding = layers.RepeatVector(look_back)(embedding)

# Concatenate
x = layers.Concatenate()([feature_input, embedding])

# ---- Encoder ----
x = layers.LSTM(
    128,
    return_sequences=True
)(x)

x = layers.LSTM(
    128,
    return_sequences=True
)(x)
x = layers.LSTM(128, dropout=0.0, return_sequences=False)(x)

# ---- Bottleneck ----
# bottleneck = layers.Dense(64, activation="relu")(encoder)
# bottleneck = layers.BatchNormalization()(bottleneck)

# ---- Decoder ----
x = layers.Dense(256, activation="relu")(x)
x = layers.BatchNormalization()(x)
x = layers.Dropout(0.3)(x)

# ---- TimeDistributed Output ----
output = layers.Dense(look_ahead)(x)
# # Extract last observed AQI value from input sequence
# last_value = layers.Lambda(lambda x: x[:, -1, 0:1])(feature_input)

# # Repeat it for 24 future hours
# last_value = layers.RepeatVector(look_ahead)(last_value)

# # Add residual connection
# output = layers.Add()([output, last_value])
# output = layers.TimeDistributed(layers.Dense(1))(decoder)


model = keras.Model(
    inputs=[feature_input, station_input],
    outputs=output
)

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss=keras.losses.Huber(delta=20),
    # loss="mse",
    metrics=[keras.metrics.RootMeanSquaredError()]
)

model.summary()


station_train = station_train.reshape(-1, 1)
station_test  = station_test.reshape(-1, 1)

early_stop = keras.callbacks.EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True
)

reduce_lr = keras.callbacks.ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=3,
    min_lr=1e-5
)


checkpoint = keras.callbacks.ModelCheckpoint(
    filepath="best_aqi_model.keras", 
    monitor="val_loss",              
    save_best_only=True,             
    mode="min",                      
    verbose=1                        
)


model.fit(
    [X_train, station_train],
    y_train,
    epochs=20,
    batch_size=32,
    validation_data=([X_test, station_test], y_test),
    callbacks=[early_stop, reduce_lr, checkpoint] 
)


# 6. Evaluation
pred = model.predict([X_test, station_test])
pred = np.clip(pred, 0, 500)
actual = y_test

# Reshape for inverse scaling
print("Max Predicted AQI (t+1):", np.max(pred[:, 0]))
print("Min Predicted AQI (t+1):", np.min(pred[:, 0]))
print("Sample pred:", pred[0][:5])

rmse = np.sqrt(mean_squared_error(actual.flatten(), pred.flatten()))
print("RMSE:", rmse)
mae = mean_absolute_error(y_test.flatten(), pred.flatten())
print("MAE:", mae)

baseline_pred = np.repeat(
    X_test[:, -1, 0:1],  # last AQI
    look_ahead,
    axis=1
)

baseline_rmse = np.sqrt(mean_squared_error(y_test.flatten(), baseline_pred.flatten()))
print("Baseline RMSE:", baseline_rmse)


for i in range(look_ahead):
    step_rmse = np.sqrt(mean_squared_error(
        y_test[:, i],
        pred[:, i]
    ))
    print(f"Hour {i+1} RMSE:", step_rmse)

# R2 for next 12 (t+1)
for i in range(look_ahead):
    r2 = r2_score(actual[:, i], pred[:, i])
    print(f"Hour {i+1}: {r2}")

# Plot first test sample (next 12 hours)
sample_index = 0

plt.figure(figsize=(10, 5))

plt.plot(
    actual[sample_index],
    label="Actual AQI",
    marker='o'
)

plt.plot(
    pred[sample_index],
    label="Predicted AQI",
    marker='x'
)

plt.title("AQI Forecast (Next 12 Hours)")
plt.xlabel("Hour Ahead")
plt.ylabel("AQI")
plt.legend()
plt.grid(True)
plt.show()

# Plot first 200 predictions of next-hour forecast
plt.figure(figsize=(12,6))

plt.plot(actual[:200, 0], label="Actual t+1")
plt.plot(pred[:200, 0], label="Predicted t+1")

plt.title("Next Hour AQI Prediction")
plt.xlabel("Time Step")
plt.ylabel("AQI")
plt.legend()
plt.grid(True)
plt.show()

print("--- MODEL INPUT FEATURES REQUIRED ---")
for i, col in enumerate(feature_cols):
    print(f"Feature {i}: {col}")

# print("\n--- INPUT SHAPES ---")
# print(f"Main Features: (Batch_Size, {look_back}, {len(feature_cols)})")
# print(f"Station ID:    (Batch_Size, 1)")

# Save the final weights after the evaluation block
model.save("durgapur_aqi_v1.h5") 
joblib.dump(scaler_X,"scaler_x.pkl")
print("Model saved successfully!")