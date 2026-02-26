# EcoRoute.ai – Air Quality Intelligent Routing Platform

AI-powered clean route navigation for urban environments

---

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Data & Models](#data--models)
- [Deployment](#deployment)
- [License](#license)

---

## Project Overview
EcoRoute.ai is a full-stack platform that delivers real-time, eco-friendly route recommendations by integrating air quality data, advanced AI forecasting, and geospatial analytics. Designed for urban commuters, it empowers users to make healthier travel choices by avoiding pollution hotspots and optimizing for both air quality and travel time.

---

## Features
- **AQI-Aware Route Analysis:**
	- Real-time Google Maps routes enriched with pollutant data (PM2.5, PM10, CO, NO2, O3).
	- Composite AQI-exposure + travel-time scoring for each route.
	- Route ranking: `best`, `moderate`, `poor`, with a `recommended` label.
- **12-Hour AQI Forecast:**
	- Per-route AQI prediction using time series prediction models.
- **Interactive Dashboard:**
	- Live AQI display, forecast charts, weather sensor data, eco tips, and statistics.
- **Google OAuth2 Authentication:**
	- Secure login for personalized features and history.
- **Data-Driven Insights:**
	- Historical route analysis, exposure tracking, and eco-friendly tips.

---

## Architecture
```mermaid
graph TD
		A[Frontend (React/Vite)] -- REST --> B[Backend API (FastAPI)]
		B -- Model Inference --> C[Python ML Models]
		B -- Data --> D[CSV/Google API]
		B -- Routes --> E[Java Spring Boot]
		A -- OAuth2 --> E
		E -- Swagger --> F[API Documentation]
		B -- Docker --> G[Containerization]
```

---

## Tech Stack
- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS, @react-google-maps/api
- **Backend:** FastAPI (Python), Java Spring Boot
- **AI/ML Models:** TensorFlow, PyTorch, LSTM, TinyTimeMixer
- **Data:** Google Maps API, Google Places API, CSV datasets
- **DevOps:** Docker, docker-compose
- **Authentication:** Google OAuth2

---

## Setup & Installation
### Prerequisites
- Node.js (v18+)
- Python (3.8+)
- Java (11+)
- Docker & docker-compose

### 1. Clone the Repository
```bash
git clone https://github.com/<username>/stealth.git
cd stealth
```

### 2. Environment Variables
- Create a `.env` file at the project root with your Google API keys:
```
GOOGLE_API_KEY=your_google_api_key
```

### 3. Backend Setup
#### Python API
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```
#### Java Spring Boot
```bash
./mvnw spring-boot:run
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 5. Docker (Optional)
```bash
docker-compose up --build
```

---

## Usage
- Access the frontend at [http://localhost:5173](http://localhost:5173)
- API available at [http://localhost:8000](http://localhost:8000) (FastAPI) and [http://localhost:8080](http://localhost:8080) (Spring Boot)
- Authenticate via Google OAuth2 for personalized features

---

## API Endpoints
### Route Analysis
- `POST /api/routes/process` – Returns Google Maps routes with AQI and travel-time scores
### AQI Forecast
- `POST /api/routes/predict` – 12-hour AQI forecast for stations/routes
### History
- `GET /api/routes/history` – Returns authenticated user's past route searches
### Health Check
- `GET /health` – System status

> All endpoints (except home) are protected by Google OAuth2

---

## Data & Models
- **Datasets:**
	- City-level CSVs (e.g., durgapur_final.csv)
	- Real-time data from Google Air Quality API
- **Models:**
	- LSTM (TensorFlow): AQI time-series prediction
	- TinyTimeMixer (PyTorch): Advanced AQI forecasting
	- Kriging (pykrige): Spatial interpolation for pollutant mapping
- **Model Files:**
	- `durgapur_aqi_v1.h5`, `durgapur_ttm_model.pt`, `best_aqi_model.keras`

---

## Deployment
- **Local:**
	- Run backend, frontend, and Java API as described above
- **Docker:**
	- Use `docker-compose.yml` for full-stack containerized deployment
- **Production:**
	- Configure environment variables, reverse proxy, and secure API keys

---

## License
This project is licensed under the MIT License. 

---

© 2026 EcoRoute.ai · AI-powered clean route navigation · All rights reserved.