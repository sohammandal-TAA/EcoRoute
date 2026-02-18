export interface RouteOption {
  id: string;
  name: string;
  duration: number;
  distance: string;
  pollutionLevel: 'low' | 'medium' | 'high';
  label: string;
}

export interface SensorData {
  humidity: number;
  temperature: number;
  windSpeed: number;
}

export interface ForecastBar {
  time: string;
  value: number;
  level: 'low' | 'medium' | 'high';
}

export interface DashboardRouteInfo {
  distance: string;
  duration: string;
}

