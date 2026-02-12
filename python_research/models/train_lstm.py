import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from tensorflow import keras
from sklearn.metrics import r2_score, mean_absolute_error

# 1. Load and Clean
data = pd.read_csv("../data/Kolkata_AQI_HistoricalData.csv")
data['Datetime'] = pd.to_datetime(data['Datetime'])
data.sort_values('Datetime', inplace=True)

# Feature Engineering: Extract time signals
data['Hour'] = data['Datetime'].dt.hour
data['Month'] = data['Datetime'].dt.month

# 2. Define Features (X) and Target (y)
target_col = 'AQI'
feature_cols = ['Latitude', 'Longitude', 'PM2.5', 'PM10', 'NO2', 'CO', 'SO2', 'O3', 'Hour', 'Month']

# Scalers
scaler_x = StandardScaler()
scaler_y = StandardScaler()

X_scaled = scaler_x.fit_transform(data[feature_cols])
y_scaled = scaler_y.fit_transform(data[[target_col]])

# 3. Create Sequences (24h in -> 24h out)
look_back, look_ahead = 24, 24
X_seq, y_seq = [], []

for i in range(look_back, len(data) - look_ahead + 1):
    X_seq.append(X_scaled[i-look_back:i])
    y_seq.append(y_scaled[i:i+look_ahead, 0])

X_seq, y_seq = np.array(X_seq), np.array(y_seq)

# 4. Split (80% Train, 20% Test)
train_size = int(len(X_seq) * 0.8)
X_train, X_test = X_seq[:train_size], X_seq[train_size:]
y_train, y_test = y_seq[:train_size], y_seq[train_size:]

# 5. Build and Train Model
model = keras.Sequential([
    keras.layers.LSTM(64, return_sequences=True, input_shape=(look_back, len(feature_cols))),
    keras.layers.LSTM(32),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(look_ahead)
])

model.compile(optimizer='adam', loss='mse')
model.fit(X_train, y_train, epochs=20, batch_size=32, validation_split=0.1)

# 6. Evaluation
predictions_scaled = model.predict(X_test)
predictions = scaler_y.inverse_transform(predictions_scaled)
actuals = scaler_y.inverse_transform(y_test)

# Calculate "Accuracy" via R2 Score for the next hour (t+1)
score = r2_score(actuals[:, 0], predictions[:, 0])
print(f"R2 Score (Next Hour Prediction): {score:.4f}")