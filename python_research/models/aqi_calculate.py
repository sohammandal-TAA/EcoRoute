# import os
# import requests
# import numpy as np
# from pykrige.ok import OrdinaryKriging
# import json
# from dotenv import load_dotenv, dotenv_values

# # 1. Get the absolute path to your current script's folder
# current_dir = os.path.dirname(os.path.abspath(__file__))

# # 2. Move up to the 'STEALTH' root
# # models -> python_research -> STEALTH
# root_dir = os.path.dirname(os.path.dirname(current_dir))

# # 3. Construct the path
# env_path = os.path.join(root_dir, '.env')

# # 4. Load it
# load_dotenv(dotenv_path=env_path)

# # --- THE DEBUGGER ---
# if os.path.exists(env_path):
#     # This reads the file into a dictionary without setting env vars
#     actual_content = dotenv_values(env_path)
#     # print(f"✅ Found .env at: {env_path}")
#     # print(f"🔑 Keys found in file: {list(actual_content.keys())}")
    
#     # Try to grab the key directly from the file content if getenv fails
#     GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or actual_content.get("GOOGLE_API_KEY")
# else:
#     print(f"❌ .env file NOT FOUND at: {env_path}")
#     GOOGLE_API_KEY = None

# # Final check
# if GOOGLE_API_KEY:
#     print(f" API Key Loaded Successfully")
# else:
#     print("⚠️  API Key is still missing. Check if there is a space: 'GOOGLE_API_KEY = '")

# def fetch_google_aqi_profile(lat, lon):
#     """Fetches full pollutant profile from Google Air Quality API."""
#     url = f"https://airquality.googleapis.com/v1/currentConditions:lookup?key={GOOGLE_API_KEY}"
    
#     payload = {
#         "location": {"latitude": lat, "longitude": lon},
#         "universalAqi": False,
#         "extraComputations": ["POLLUTANT_CONCENTRATION", "LOCAL_AQI"],
#         "languageCode": "en"
#     }

#     try:
#         response = requests.post(url, json=payload)
#         response.raise_for_status()
#         data = response.json()
        
#         # Map all pollutants into a clean dictionary
#         pollutants = {p['code']: p['concentration']['value'] for p in data.get('pollutants', [])}
        
#         return {
#             "lat": lat,
#             "lon": lon,
#             "aqi": data.get('indexes', [{}])[0].get('aqi', 0),
#             "pm25": pollutants.get('pm25', 0),
#             "pm10": pollutants.get('pm10', 0),
#             "co": pollutants.get('co', 0),
#             "no2": pollutants.get('no2', 0)
#         }
#     except Exception as e:
#         print(f"⚠️ API Fetch Failed for ({lat}, {lon}): {e}. Using safe fallback.")
#         return {"lat": lat, "lon": lon, "aqi": 50, "pm25": 15, "pm10": 25, "co": 400, "no2": 20}

# # ---------------------------------------------------
# # KRIGING PREDICTION ENGINE (Mathematical interpolation)
# # ---------------------------------------------------
# def interpolate_pollutants(start_data, end_data, route_points):
#     """
#     Uses Ordinary Kriging to predict full pollutant profiles 
#     along a route using only 2 real data points.
#     """
#     # 1. Setup Spatial Geometry
#     mid_lat = (start_data['lat'] + end_data['lat']) / 2
#     mid_lon = (start_data['lon'] + end_data['lon']) / 2
#     offset = 0.005 

#     # We create 4 anchor points to stabilize the Kriging Variogram
#     lats = np.array([start_data['lat'], end_data['lat'], mid_lat + offset, mid_lat - offset])
#     lons = np.array([start_data['lon'], end_data['lon'], mid_lon, mid_lon])

#     target_pollutants = ['aqi', 'pm25', 'pm10', 'co', 'no2']
    
#     # Initialize results container
#     route_profiles = [{"location": p} for p in route_points]

#     # 2. Loop through each pollutant and run Kriging
#     for p_type in target_pollutants:
#         val_start = start_data[p_type]
#         val_end = end_data[p_type]
#         avg_val = (val_start + val_end) / 2
        
#         z_values = np.array([val_start, val_end, avg_val, avg_val], dtype=float)

#         try:
#             # Setup the model for this specific pollutant
#             OK = OrdinaryKriging(
#                 lons, lats, z_values,
#                 variogram_model='gaussian',
#                 variogram_parameters=[1.0, 0.1],
#                 verbose=False, enable_plotting=False
#             )

#             # Predict for every point in the route
#             for i, (p_lat, p_lon) in enumerate(route_points):
#                 z_pred, _ = OK.execute('points', np.array([p_lon]), np.array([p_lat]))
#                 route_profiles[i][p_type] = round(float(z_pred[0]), 2)
        
#         except Exception as e:
#             print(f"Error modeling {p_type}: {e}")
#             for i in range(len(route_profiles)): route_profiles[i][p_type] = "N/A"

#     return route_profiles

# # ---------------------------------------------------
# # MAIN: ROUTE COMPARISON LOGIC
# # ---------------------------------------------------
# if __name__ == "__main__":
#     # USER INPUTS
#     start_loc = (23.5392, 87.2911)
#     end_loc = (23.5311, 87.3278)

#     # Simulated Route Paths (These would come from Mapbox/Google Directions)
#     routes_to_compare = {
#         "Main Road Path": [(23.5410, 87.2950), (23.5450, 87.3000), (23.5480, 87.3050)],
#         "Green Park Path": [(23.5350, 87.3000), (23.5330, 87.3100), (23.5310, 87.3200)]
#     }

#     print("--- Initializing Stealth Prediction Engine ---")
    
#     # STEP 1: Fetch Ground Truth (API CALLS: 2)
#     start_profile = fetch_google_aqi_profile(*start_loc)
#     end_profile = fetch_google_aqi_profile(*end_loc)

#     print(f"\n[START LOCATION] AQI: {start_profile['aqi']} | PM2.5: {start_profile['pm25']}")
#     print(f"[END LOCATION]   AQI: {end_profile['aqi']} | PM2.5: {end_profile['pm25']}\n")

#     # STEP 2: Compare Routes using Kriging (API CALLS: 0)
#     for route_name, points in routes_to_compare.items():
#         print(f"--- Analyzing {route_name} ---")
#         predicted_path = interpolate_pollutants(start_profile, end_profile, points)
        
#         # Calculate Average Exposure for this route
#         avg_aqi = sum([p['aqi'] for p in predicted_path]) / len(predicted_path)
        
#         for p in predicted_path:
#             print(f"  Point {p['location']}: AQI={p['aqi']}, PM2.5={p['pm25']}, CO={p['co']}")
        
#         print(f">> TOTAL EXPOSURE SCORE for {route_name}: {round(avg_aqi, 2)}\n")

#     print("--- Analysis Complete. Recommended Route selected based on lowest Exposure Score. ---")



import os
import requests
import numpy as np
from pykrige.ok import OrdinaryKriging
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
from dotenv import load_dotenv, dotenv_values

# --- 1. SETUP & ENV ---
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(os.path.dirname(current_dir))
env_path = os.path.join(root_dir, '.env')
load_dotenv(dotenv_path=env_path)

actual_content = dotenv_values(env_path) if os.path.exists(env_path) else {}
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or actual_content.get("GOOGLE_API_KEY")

app = FastAPI()

class RouteRequest(BaseModel):
    start_loc: List[float]
    end_loc: List[float]
    routes: Dict[str, List[List[float]]]

# --- 2. GOOGLE API FETCH (GROUND TRUTH) ---
def fetch_google_aqi_profile(lat, lon):
    url = f"https://airquality.googleapis.com/v1/currentConditions:lookup?key={GOOGLE_API_KEY}"
    payload = {
        "location": {"latitude": lat, "longitude": lon},
        "universalAqi": False,
        "extraComputations": ["POLLUTANT_CONCENTRATION", "LOCAL_AQI"],
        "languageCode": "en"
    }
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        pollutants = {p['code']: p['concentration']['value'] for p in data.get('pollutants', [])}
        
        return {
            "lat": lat, "lon": lon,
            "aqi": data.get('indexes', [{}])[0].get('aqi', 0),
            "pm25": pollutants.get('pm25', 0),
            "pm10": pollutants.get('pm10', 0),
            "co": pollutants.get('co', 0),
            "no2": pollutants.get('no2', 0),
            "o3": pollutants.get('o3', 0)  # Added Ozone for more comprehensive profiling
        }
    except Exception as e:
        print(f"⚠️ API Fetch Failed for ({lat}, {lon}). Using safe fallback.")
        return e

# --- 3. KRIGING CALCULATION ENGINE ---
def interpolate_pollutants(start_data, end_data, route_points):
    # Stabilize the grid with 4 anchor points
    mid_lat, mid_lon = (start_data['lat'] + end_data['lat'])/2, (start_data['lon'] + end_data['lon'])/2
    # offset = 0.005
    dist = np.sqrt((start_data['lat'] - end_data['lat'])**2 + (start_data['lon'] - end_data['lon'])**2)
    offset = dist * 0.1
    if dist == 0:
        offset = 0.005
    lats = np.array([start_data['lat'], end_data['lat'], mid_lat + offset, mid_lat - offset])
    lons = np.array([start_data['lon'], end_data['lon'], mid_lon, mid_lon])

    # The 6 core parameters you requested
    target_pollutants = ['aqi', 'pm25', 'pm10', 'co', 'no2', 'o3']
    route_profiles = [{"location": p} for p in route_points]

    for p_type in target_pollutants:
        v_start, v_end = start_data[p_type], end_data[p_type]
        z_values = np.array([v_start, v_end, (v_start+v_end)/2, (v_start+v_end)/2], dtype=float)
        
        try:
            OK = OrdinaryKriging(lons, lats, z_values, variogram_model='gaussian', 
                                 variogram_parameters=[1.0, 0.1, 0.1], verbose=False)
            for i, (p_lat, p_lon) in enumerate(route_points):
                z_pred, _ = OK.execute('points', np.array([p_lon]), np.array([p_lat]))
                route_profiles[i][p_type] = round(float(z_pred[0]), 2)
        except:
            for i in range(len(route_profiles)): route_profiles[i][p_type] = "N/A"
            
    return route_profiles

# --- 4. THE API ROUTE (THE BRIDGE) ---
@app.post("/analyze-routes")
async def analyze_routes(data: RouteRequest):
    # 1. Get real data from API for start/end
    start_p = fetch_google_aqi_profile(data.start_loc[0], data.start_loc[1])
    end_p = fetch_google_aqi_profile(data.end_loc[0], data.end_loc[1])
    
    comparisons = {}
    for name, points in data.routes.items():
        # 2. Calculate pollutants for the path using OK math
        path_details = interpolate_pollutants(start_p, end_p, points)
        
        # 3. Calculate Average Exposure
        aqis = [p['aqi'] for p in path_details if isinstance(p['aqi'], (int, float))]
        avg_exposure = sum(aqis)/len(aqis) if aqis else 0
        
        comparisons[name] = {
            "avg_exposure_aqi": round(avg_exposure, 2),
            "calculated_points": path_details
        }

    # Final response structure
    return {
        "engine": "Stealth Kriging v1.0",
        "ground_truth": {
            "source": "Google Air Quality API",
            "start": start_p,
            "end": end_p
        },
        "route_analysis": comparisons
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)