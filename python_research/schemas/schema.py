from pydantic import BaseModel
from typing import List, Dict, Optional

# --- KRIGING SCHEMAS ---
class Coordinate(BaseModel):
    lat: float
    lng: float  # Matches Java 'lng'

class RouteData(BaseModel):
    distance: str
    duration: str
    coordinates: List[Coordinate]

class JavaRouteRequest(BaseModel):
    start_loc: List[float]
    end_loc: List[float]
    routeCount: int
    routes: List[RouteData]

# --- FORECAST SCHEMAS ---
class ForecastRequest(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    #station_id: int = 2

class ForecastResponse(BaseModel):
    status: str
    next_hour_prediction: float
    twelve_hour_forecast: List[float]
    message: str

class RouteRequest(BaseModel):
    sLat: float
    sLon: float
    dLat: float
    dLon: float
    routes: Optional[List[RouteData]]