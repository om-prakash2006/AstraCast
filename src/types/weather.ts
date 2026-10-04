export * from './dataSource';
export * from './observations';
export * from './satellite';
export * from './radar';
export * from './lightning';
export * from './nowcast';

export interface StationInfo {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  radarStationCode: string;
  synopId: string;
  elevationM: number;
}

export interface CurrentTelemetry {
  temperature: number; // °C
  relativeHumidity: number; // %
  dewPoint: number; // °C
  heatIndex: number; // °C
  surfacePressure: number; // hPa
  pressureTrend: number; // hPa in last 3h
  windSpeed: number; // km/h
  windGusts: number; // km/h
  windDirection: number; // degrees
  windDirectionCardinal: string; // e.g. "WNW"
  precipitation: number; // mm
  rainRate: number; // mm/h
  accum24h: number; // mm
  weatherCode: number;
  weatherDescription: string;
  visibility: number; // meters
  cape: number; // J/kg
  liftedIndex: number;
  peakReflectivity: number; // dBZ calculated from precip and cape
}

export type IMDAlertStage = 'STAGE_I_NORMAL' | 'STAGE_II_WATCH' | 'STAGE_III_ALERT' | 'STAGE_IV_WARNING';
export type IMDColor = 'emerald' | 'yellow' | 'orange' | 'red';
export type ThreatLevel = 'NORMAL' | 'LOW' | 'WATCH' | 'ALERT' | 'CRITICAL' | 'HIGH';

export interface SeverityAssessment {
  compositeScore: number; // 0 - 100
  stageAlert: IMDAlertStage;
  stageName: string; // e.g. "IMD STAGE-IV ALERT"
  stageColor: IMDColor;
  alertTitle: string; // e.g. "SEVERE SQUALL WARNING"
  windThreat: ThreatLevel;
  lightningThreat: ThreatLevel;
  precipThreat: ThreatLevel;
}

export interface NowcastStep {
  stepIndex: number;
  timeOffset: string; // "T+00m", "T+30m", "T+60m", "T+90m", "T+120m", "T+180m"
  label: string; // "T+00m (ANALYSIS / CURRENT)"
  forecastRain: number; // mm/h
  lightningProb: number; // %
  cape: number; // J/kg
  windGust: number; // km/h
  temperature: number; // °C
  humidity: number; // %
  compositeScore: number;
  stageAlert: IMDAlertStage;
  stageColor: IMDColor;
  stormCenterOffsetKm: { dx: number; dy: number };
}

export interface LightningStrike {
  id: string;
  lat: number;
  lng: number;
  currentKA: number;
  type: 'CG' | 'IC'; // Cloud-to-ground or Intra-cloud
  ageSeconds: number;
}

export interface StormCell {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dbz: number;
  stageColor: IMDColor;
  statusTag: string; // e.g. "[RED]", "[WATCH]"
  heading: number; // azimuth degrees
  speedKmH: number; // km/h
  distanceKm: number;
  polygonPoints?: [number, number][]; // relative or lat/lng
}

export interface CityWeatherData {
  station: StationInfo;
  timestamp: string;
  utcTime: string;
  current: CurrentTelemetry;
  severity: SeverityAssessment;
  nowcast: NowcastStep[];
  lightningStrikes: LightningStrike[];
  stormCells: StormCell[];
  radarScanMeta: {
    elevation: string;
    freq: string;
    prf: string;
    pulse: string;
    azimuthRes: string;
    dataIntegrity: string;
  };
  hourlyForecast?: HourlyForecastItem[];
  dailyForecast?: DailyForecastItem[];
  sunMoon?: SunMoonInfo;
  airQuality?: AirQualityInfo;
}

export interface HourlyForecastItem {
  time: string;
  hourLabel: string;
  temp: number;
  pop: number; // probability of precipitation %
  weatherCode: number;
  weatherDesc: string;
  isDay: boolean;
  rainMm: number;
  windSpeed: number;
}

export interface DailyForecastItem {
  date: string;
  dayName: string;
  minTemp: number;
  maxTemp: number;
  weatherCode: number;
  weatherDesc: string;
  popMax: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface SunMoonInfo {
  sunrise: string;
  sunset: string;
  civilDawn: string;
  civilDusk: string;
  daylightDuration: string;
  sunProgress: number; // 0 to 100
  isDay: boolean;
  moonPhase: string;
  moonIlluminationPercent: number;
}

export interface AirQualityInfo {
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  primaryPollutant: string;
}

export interface RadarTileResponse {
  host: string;
  latestPath: string;
  latestTimestamp: number;
  pastFrames: Array<{ time: number; path: string }>;
  nowcastFrames: Array<{ time: number; path: string }>;
  tileTemplate: string;
  colorPalette: number;
}

export interface AIBulletinResponse {
  id: string;
  timestamp: string;
  headline: string;
  bulletinBody: string;
  movement: string;
  threats: string[];
  recommendedAction: string;
  source: string;
  dispatchedTo: string[];
  rawText: string;
}
