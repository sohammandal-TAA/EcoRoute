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

export const MOCK_ROUTES: RouteOption[] = [
  {
    id: '1',
    name: 'Via Downtown Express',
    duration: 52,
    distance: '32 km',
    pollutionLevel: 'low',
    label: 'BEST ECO ROUTE',
  },
  {
    id: '2',
    name: 'Parkway Avenue',
    duration: 65,
    distance: '30 km',
    pollutionLevel: 'medium',
    label: 'MODERATE POLLUTION',
  },
  {
    id: '3',
    name: 'Main Street Highway',
    duration: 112,
    distance: '30 km',
    pollutionLevel: 'high',
    label: 'HIGH POLLUTION',
  },
];

export const MOCK_SENSORS: SensorData = {
  humidity: 45,
  temperature: 22,
  windSpeed: 12,
};

export const MOCK_AQI = 78;
export const MOCK_KG_SAVED = 2.4;
export const MOCK_PERCENT = 85;

export const MOCK_FORECAST: ForecastBar[] = [
  { time: '6am', value: 30, level: 'low' },
  { time: '8am', value: 75, level: 'medium' },
  { time: '10am', value: 90, level: 'high' },
  { time: '12pm', value: 45, level: 'low' },
  { time: '2pm', value: 60, level: 'medium' },
  { time: '4pm', value: 85, level: 'high' },
  { time: '6pm', value: 40, level: 'low' },
  { time: '8pm', value: 55, level: 'medium' },
];

