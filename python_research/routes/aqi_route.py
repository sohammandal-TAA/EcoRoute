import asyncio
import logging
import os
from fastapi import APIRouter, HTTPException
from python_research.schemas.schema import JavaRouteRequest, ForecastRequest, ForecastResponse, RouteRequest
from python_research.services.aqi_engine import fetch_google_aqi_profile, get_aqi_info, get_multi_station_forecast, haversine, interpolate_pollutants, fetch_google_weather_history, fetch_google_aqi_history, weighted_average
import numpy as np
from datetime import datetime, timedelta
import httpx
http_client = httpx.AsyncClient(timeout=5)

router = APIRouter()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Fixed Station Coordinates
STATIONS = {
    "station_0": {"lat": 23.51905342888936, "lon": 87.34565136450719},
    "station_1": {"lat": 23.564018931392827, "lon": 87.31123928017463},
    "station_2": {"lat": 23.5391718044899, "lon": 87.30401858752859},
    "station_3": {"lat": 23.554806202241476, "lon": 87.24681601086061},
}

def find_nearest_station(lat, lon):
    min_dist = float("inf")
    nearest_station = None

    for station_id, coords in STATIONS.items():
        d = haversine(lat, lon, coords["lat"], coords["lon"])
        if d < min_dist:
            min_dist = d
            nearest_station = station_id

    return nearest_station
    
@router.post("/analyze-routes")
async def analyze_routes(data: JavaRouteRequest):
    print(f"DEBUG: Processing {data.routeCount} routes", flush=True)
    
    # 1. Handle API Failures for Start/End points
    try:
        start_p = fetch_google_aqi_profile(data.start_loc[0], data.start_loc[1], GOOGLE_API_KEY)
        end_p = fetch_google_aqi_profile(data.end_loc[0], data.end_loc[1], GOOGLE_API_KEY)
    except Exception as e:
        logging.error(f"Google API Error: {e}")
        raise HTTPException(status_code=503, detail="Air Quality Service temporarily unavailable")
    
    comparisons = {}
    for i, route in enumerate(data.routes):
        points = [[c.lat, c.lng] for c in route.coordinates]
        path_details = interpolate_pollutants(start_p, end_p, points)

        pm25_vals = [p['pm25'] for p in path_details if isinstance(p.get('pm25'), (int, float))]
        pm10_vals = [p['pm10'] for p in path_details if isinstance(p.get('pm10'), (int, float))]
        co_vals   = [p['co']   for p in path_details if isinstance(p.get('co'), (int, float))]

        avg_pm25 = round(sum(pm25_vals) / len(pm25_vals), 2) if pm25_vals else 0
        avg_pm10 = round(sum(pm10_vals) / len(pm10_vals), 2) if pm10_vals else 0
        avg_co   = round(sum(co_vals)   / len(co_vals), 2) if co_vals else 0

        
        # aqis = [p['aqi'] for p in path_details if isinstance(p['aqi'], (int, float))]
        # # avg_exposure = sum(aqis)/len(aqis) if aqis else 0
       
        comparisons[f"Route_{i+1}"] = {
            # "avg_exposure_aqi": round(avg_exposure, 2),
            "distance": route.distance,
            "duration": route.duration,
            "avg_pm25": avg_pm25,
            "avg_pm10": avg_pm10,
            "avg_co": avg_co,
            "details": path_details
        }
    return {"status": "success", 
            "ground_truth": {"start_point": start_p, "end_point": end_p},
            "route_analysis": comparisons}


@router.post("/history_data_all")
async def history_data_all():
    try:
        async def process_station(station_id, coords):
            
            try:
                # Fetch weather + AQI in parallel
                weather_task = fetch_google_weather_history(coords["lat"], coords["lon"], http_client)
                aqi_task = fetch_google_aqi_history(coords["lat"], coords["lon"], http_client)

                weather_res, aqi_res = await asyncio.gather(weather_task, aqi_task)

                # Basic API failure check
                if "error" in weather_res or "error" in aqi_res:
                    print(f"API error for station {station_id}", flush=True)
                    return station_id, {"error": "API failure"}

                combined_history = []

                for w, a in zip(weather_res.get("history", []),
                                aqi_res.get("history", [])):

                    combined_history.append({
                        "time": a.get("time"),
                        "pm2_5": a.get("pm25", 0),
                        "pm10": a.get("pm10", 0),
                        "no2": a.get("no2", 0),
                        "co": a.get("co", 0),
                        "so2": a.get("so2", 0),
                        "o3": a.get("o3", 0),
                        "temp_c": w.get("temp_c", 0),
                        "wind": w.get("wind", 0),
                        "humidity": w.get("humidity", 0)
                    })

                return station_id, {
                    "location": coords,
                    "history_count": len(combined_history),
                    "data": combined_history
                }

            except Exception as e:
                print(f"Station processing failed: {station_id} | {str(e)}", flush=True)
                return station_id, {"error": str(e)}

        tasks = [
            process_station(station_id, coords)
            for station_id, coords in STATIONS.items()
        ]

        results = await asyncio.gather(*tasks)

        return {
            "status": "success",
            "data": dict(results)
        }

    except Exception as e:
        print(f"history_data_all failed: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict-all-stations")
async def predict_all_stations(data: RouteRequest):
    print("DEBUG: Starting multi-station forecast pipeline", flush=True)

    try:
        # =========================================
        # STEP 1: Fetch all stations in parallel
        # =========================================
        async def fetch_station_data(station_id, coords):
            weather_task = fetch_google_weather_history(coords["lat"], coords["lon"], http_client)
            aqi_task = fetch_google_aqi_history(coords["lat"], coords["lon"], http_client)
            weather_res, aqi_res = await asyncio.gather(weather_task, aqi_task)
            return station_id, coords, weather_res, aqi_res

        fetch_tasks = [fetch_station_data(sid, co) for sid, co in STATIONS.items()]
        station_results = await asyncio.gather(*fetch_tasks)

        # =========================================
        # STEP 2: Build history per station
        # =========================================
        station_histories = {}
        anchor_time = None

        for station_id, coords, weather_res, aqi_res in station_results:
            if "error" in weather_res or "error" in aqi_res:
                return {"status": "error", "message": f"API failure at {station_id}"}

            combined_history = []
            w_hist, a_hist = weather_res.get("history", []), aqi_res.get("history", [])

            for w, a in zip(w_hist, a_hist):
                combined_history.append({
                    "pm2_5": a.get("pm25", 0), "pm10": a.get("pm10", 0),
                    "no2": a.get("no2", 0), "co": a.get("co", 0),
                    "so2": a.get("so2", 0), "o3": a.get("o3", 0),
                    "temp_c": w.get("temp_c", 0), "wind": w.get("wind", 0),
                    "humidity": w.get("humidity", 0)
                })

            if len(combined_history) < 24:
                return {"status": "error", "message": f"Incomplete data at {station_id}"}

            station_histories[station_id] = combined_history

            if anchor_time is None:
                last_time_str = aqi_res["history"][-1]["time"]
                utc_anchor = datetime.fromisoformat(last_time_str.replace("Z", "+00:00"))
                anchor_time = utc_anchor + timedelta(hours=5, minutes=30)

        # =========================================
        # STEP 3: Model inference per station
        # =========================================
        final_forecast_data = {}

        for station_id, history in station_histories.items():
            try:
                raw_forecasts = get_multi_station_forecast(history)
                station_index = list(STATIONS.keys()).index(station_id)
                station_key = f"station_{station_index}"
                
                if station_key not in raw_forecasts:
                    raise KeyError(f"Key {station_key} missing in LSTM output")

                values = raw_forecasts[station_key]
                station_list = []

                for i, val in enumerate(values):
                    future_time = anchor_time + timedelta(hours=i+1)
                    v = round(float(val), 2)
                    station_list.append({
                        "time": future_time.strftime("%I:%M %p"),
                        "aqi": v,
                        "health_info": get_aqi_info(v)
                    })
                final_forecast_data[station_id] = station_list

            except Exception as model_err:
                print(f"Model Error for {station_id}: {str(model_err)}")
                return {"status": "error", "message": f"Model failed at {station_id}"}

        # =========================================
        # STEP 4: Route-specific forecast (PRO-DURGAPUR CALIBRATION)
        # =========================================
        # =========================================
        # STEP 4: ROUTE-SPECIFIC FORECAST (WITH DIVERSIFICATION)
        # =========================================
        route_forecasts = {}

        if data.routes:
            for idx, route in enumerate(data.routes):
                route_name = f"Route_{idx+1}"
                pts = route.coordinates
                
                # --- DIVERSIFICATION LOGIC ---
                # Agar Google same coordinates de raha hai, toh hum 'Path Simulation' karenge
                # Route 1: Direct (Model Default)
                # Route 2: Industry Bias (DSP Side)
                # Route 3: Residential Bias (Bidhannagar Side)
                bias_lat, bias_lng = 0.0, 0.0
                
                if idx == 1: # Route 2 ko Industrial (Station 3) ki taraf thoda pull karo
                    bias_lat = (STATIONS["station_3"]["lat"] - pts[0].lat) * 0.15
                    bias_lng = (STATIONS["station_3"]["lon"] - pts[0].lng) * 0.15
                elif idx == 2: # Route 3 ko Green (Station 0) ki taraf pull karo
                    bias_lat = (STATIONS["station_0"]["lat"] - pts[0].lat) * 0.15
                    bias_lng = (STATIONS["station_0"]["lon"] - pts[0].lng) * 0.15

                route_hourly = []
                total_hours = len(next(iter(final_forecast_data.values())))

                for hour in range(total_hours):
                    point_aqi_values = []
                    for pt in pts:
                        # Applying the path bias
                        adj_lat = pt.lat + bias_lat
                        adj_lng = pt.lng + bias_lng
                        
                        w_sum, w_total = 0, 0
                        for sid in STATIONS.keys():
                            d = ((adj_lat - STATIONS[sid]["lat"])**2 + (adj_lng - STATIONS[sid]["lon"])**2)**0.5
                            # Power 10 for maximum contrast
                            weight = 1 / ((d**10) + 1e-15)
                            w_sum += final_forecast_data[sid][hour]["aqi"] * weight
                            w_total += weight
                        
                        point_aqi_values.append(w_sum / w_total)

                    route_avg = sum(point_aqi_values) / len(point_aqi_values)
                    route_hourly.append({
                        "time": final_forecast_data["station_0"][hour]["time"],
                        "aqi": round(route_avg, 2),
                        "health_info": get_aqi_info(route_avg)
                    })

                route_forecasts[route_name] = {
                    "forecast": route_hourly,
                    "avg_route_aqi": round(sum(h['aqi'] for h in route_hourly)/len(route_hourly), 2)
                }

                
        return {
            "status": "success",
            "station_forecasts": final_forecast_data,
            "route_forecasts": route_forecasts,
            "meta": {"location": "Durgapur"}
        }

    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}", flush=True)
        return {"status": "error", "message": str(e)}