import {
  CityWeatherData,
  CurrentTelemetry,
  IMDAlertStage,
  IMDColor,
  LightningStrike,
  NowcastStep,
  SeverityAssessment,
  StormCell,
  ThreatLevel,
} from '../../src/types/weather';
import { findStationByCoords } from '../../src/data/stations';

export function getWindCardinal(degrees: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(((degrees % 360) / 22.5)) % 16;
  return directions[index];
}

export function getWeatherDescription(code: number): string {
  switch (code) {
    case 0: return 'CLEAR SKY';
    case 1: return 'MAINLY CLEAR';
    case 2: return 'PARTLY CLOUDY';
    case 3: return 'OVERCAST';
    case 45: return 'FOGGY';
    case 48: return 'DEPOSITING RIME FOG';
    case 51: return 'LIGHT DRIZZLE';
    case 53: return 'MODERATE DRIZZLE';
    case 55: return 'DENSE DRIZZLE';
    case 61: return 'SLIGHT RAIN';
    case 63: return 'MODERATE RAIN';
    case 65: return 'HEAVY CONVECTIVE RAIN';
    case 80: return 'SCATTERED SHOWERS';
    case 81: return 'MODERATE SHOWERS';
    case 82: return 'VIOLENT SQUALL SHOWERS';
    case 95: return 'SEVERE THUNDERSTORM';
    case 96: return 'THUNDERSTORM WITH HAIL';
    case 99: return 'SEVERE THUNDERSTORM WITH HEAVY HAIL';
    default: return 'SCATTERED CONVECTIVE CLOUDS';
  }
}

export function calculateHeatIndex(tempC: number, rh: number): number {
  if (tempC < 27 || rh < 40) return tempC;
  // Rothfusz formula approximation in Celsius
  const T = (tempC * 9) / 5 + 32;
  const R = rh;
  let hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
    - 6.83783e-3 * T * T - 5.481717e-2 * R * R + 1.22874e-3 * T * T * R
    + 8.5282e-4 * T * R * R - 1.99e-6 * T * T * R * R;
  return Math.round((((hi - 32) * 5) / 9) * 10) / 10;
}

export function calculatePeakReflectivity(rainMmH: number, cape: number): number {
  if (rainMmH <= 0 && cape < 800) return 18.0;
  // Marshall-Palmer relation: Z = 200 * R^1.6
  const safeR = Math.max(0.01, rainMmH);
  const z = 200 * Math.pow(safeR, 1.6);
  let dbz = 10 * Math.log10(Math.max(1, z));
  
  // Thermodynamic convective enhancement
  if (cape > 1000) {
    dbz += Math.min(22, (cape / 300) * 1.5);
  }
  return Math.min(75.0, Math.max(15.0, Math.round(dbz * 10) / 10));
}

export function computeSeverity(
  windGust: number,
  rainRate: number,
  cape: number,
  weatherCode: number,
  liftedIndex: number
): SeverityAssessment {
  // Wind sub-score (0-100)
  let windScore = Math.min(100, Math.max(10, (windGust / 80) * 100));
  // Precip sub-score (0-100)
  let rainScore = Math.min(100, Math.max(10, (rainRate / 45) * 100));
  // CAPE sub-score (0-100)
  let capeScore = Math.min(100, Math.max(10, (cape / 3000) * 100));

  // Severe thunderstorm booster
  let thunderstormBonus = 0;
  if ([95, 96, 99, 82].includes(weatherCode) || liftedIndex < -4) {
    thunderstormBonus = 15;
  }

  const rawScore = 0.35 * windScore + 0.35 * rainScore + 0.30 * capeScore + thunderstormBonus;
  const compositeScore = Math.min(99, Math.max(15, Math.round(rawScore)));

  let stageAlert: IMDAlertStage = 'STAGE_I_NORMAL';
  let stageName = 'IMD STAGE-I ADVISORY';
  let stageColor: IMDColor = 'emerald';
  let alertTitle = 'NORMAL WEATHER / NO WARNING';

  if (compositeScore >= 75) {
    stageAlert = 'STAGE_IV_WARNING';
    stageName = 'IMD STAGE-IV ALERT';
    stageColor = 'red';
    alertTitle = 'SEVERE SQUALL WARNING';
  } else if (compositeScore >= 55) {
    stageAlert = 'STAGE_III_ALERT';
    stageName = 'IMD STAGE-III ALERT';
    stageColor = 'orange';
    alertTitle = 'SQUALL & THUNDERSTORM ALERT';
  } else if (compositeScore >= 35) {
    stageAlert = 'STAGE_II_WATCH';
    stageName = 'IMD STAGE-II WATCH';
    stageColor = 'yellow';
    alertTitle = 'MODERATE CONVECTIVE WATCH';
  }

  const windThreat: ThreatLevel =
    windGust >= 65 ? 'CRITICAL' : windGust >= 50 ? 'ALERT' : windGust >= 35 ? 'WATCH' : 'NORMAL';

  const lightningThreat: ThreatLevel =
    cape >= 2400 ? 'CRITICAL' : cape >= 1600 ? 'HIGH' : cape >= 800 ? 'WATCH' : 'LOW';

  const precipThreat: ThreatLevel =
    rainRate >= 30 ? 'CRITICAL' : rainRate >= 18 ? 'ALERT' : rainRate >= 4 ? 'WATCH' : 'NORMAL';

  return {
    compositeScore,
    stageAlert,
    stageName,
    stageColor,
    alertTitle,
    windThreat,
    lightningThreat,
    precipThreat,
  };
}

export function buildNowcastSteps(
  current: CurrentTelemetry,
  hourlyData: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
    rain: number[];
    wind_gusts_10m: number[];
    cape: number[];
    weather_code: number[];
  },
  currentHourIdx: number
): NowcastStep[] {
  const stepsConfig = [
    { offset: 'T+00m', label: 'T+00m (ANALYSIS / CURRENT)', factor: 0.0 },
    { offset: 'T+30m', label: 'T+30m (PEAK INFLOW)', factor: 0.5 },
    { offset: 'T+60m', label: 'T+60m (MATURE CELL)', factor: 1.0 },
    { offset: 'T+90m', label: 'T+90m (DISSIPATION PHASE)', factor: 1.5 },
    { offset: 'T+120m', label: 'T+120m (LIGHT STRATIFORM)', factor: 2.0 },
    { offset: 'T+180m', label: 'T+180m (CLEARING)', factor: 3.0 },
  ];

  const windAngleRad = (current.windDirection * Math.PI) / 180;
  const speedKmH = Math.max(15, current.windSpeed);

  return stepsConfig.map((cfg, index) => {
    // Interpolate hourly data
    const hourOffset = cfg.factor;
    const baseIdx = Math.min(hourlyData.time.length - 1, currentHourIdx + Math.floor(hourOffset));
    const nextIdx = Math.min(hourlyData.time.length - 1, baseIdx + 1);
    const fraction = hourOffset - Math.floor(hourOffset);

    const interp = (arr: number[] | undefined, defaultVal: number) => {
      if (!arr || arr.length === 0) return defaultVal;
      const v1 = arr[baseIdx] ?? defaultVal;
      const v2 = arr[nextIdx] ?? v1;
      return v1 + (v2 - v1) * fraction;
    };

    let rain = interp(hourlyData.rain || hourlyData.precipitation, current.rainRate);
    let cape = interp(hourlyData.cape, current.cape);
    let gust = interp(hourlyData.wind_gusts_10m, current.windGusts);
    let temp = interp(hourlyData.temperature_2m, current.temperature);
    let rh = interp(hourlyData.relative_humidity_2m, current.relativeHumidity);
    let wCode = hourlyData.weather_code?.[baseIdx] ?? current.weatherCode;

    // For +30m and +60m, simulate convective peak if CAPE is elevated
    if (index === 1 && cape > 1500) {
      rain = Math.max(rain, current.rainRate * 1.35 + 4.5);
      gust = Math.max(gust, current.windGusts * 1.15 + 6.0);
    } else if (index === 2 && cape > 1200) {
      rain = Math.max(rain, current.rainRate * 1.1 + 2.0);
    } else if (index >= 3) {
      // Dissipating trend
      rain = Math.max(0, rain * 0.55);
      gust = Math.max(12, gust * 0.7);
    }

    const rainFixed = Math.round(Math.max(0, rain) * 10) / 10;
    const capeFixed = Math.round(Math.max(0, cape));
    const gustFixed = Math.round(Math.max(8, gust));
    const tempFixed = Math.round(temp * 10) / 10;
    const rhFixed = Math.round(Math.min(100, Math.max(15, rh)));

    // Calculate lightning probability based on CAPE & rain
    let ltgProb = Math.min(99, Math.max(5, Math.round((capeFixed / 2800) * 85 + (rainFixed > 1 ? 15 : 0))));
    if (index >= 4) ltgProb = Math.max(5, Math.round(ltgProb * 0.4));

    const sev = computeSeverity(gustFixed, rainFixed, capeFixed, wCode, -3);

    // Compute storm center displacement along wind trajectory
    const travelDistKm = speedKmH * (hourOffset);
    const dx = Math.round(travelDistKm * Math.sin(windAngleRad));
    const dy = Math.round(-travelDistKm * Math.cos(windAngleRad));

    return {
      stepIndex: index,
      timeOffset: cfg.offset,
      label: cfg.label,
      forecastRain: rainFixed,
      lightningProb: ltgProb,
      cape: capeFixed,
      windGust: gustFixed,
      temperature: tempFixed,
      humidity: rhFixed,
      compositeScore: sev.compositeScore,
      stageAlert: sev.stageAlert,
      stageColor: sev.stageColor,
      stormCenterOffsetKm: { dx, dy },
    };
  });
}

export function generateLiveStormCellsAndLightning(
  lat: number,
  lng: number,
  current: CurrentTelemetry,
  severity: SeverityAssessment
): { stormCells: StormCell[]; lightningStrikes: LightningStrike[] } {
  const stormCells: StormCell[] = [];
  const lightningStrikes: LightningStrike[] = [];

  const windDirRad = (current.windDirection * Math.PI) / 180;
  const kmPerDegreeLat = 111.0;
  const kmPerDegreeLng = 111.0 * Math.cos((lat * Math.PI) / 180);

  // Cell 1: Primary convective core (if CAPE > 800 or Rain > 0 or Gust > 40)
  const isSevere = severity.stageColor === 'red' || severity.stageColor === 'orange';
  const primaryDbz = Math.max(38.0, current.peakReflectivity);

  // Position Cell 1 about 45km - 90km upwind/downwind
  const cell1DistKm = 65;
  const cell1AngleRad = windDirRad + Math.PI * 0.25;
  const cell1Lat = lat + (cell1DistKm * Math.cos(cell1AngleRad)) / kmPerDegreeLat;
  const cell1Lng = lng + (cell1DistKm * Math.sin(cell1AngleRad)) / kmPerDegreeLng;

  stormCells.push({
    id: 'CELL_A1',
    name: 'CELL_A1',
    lat: cell1Lat,
    lng: cell1Lng,
    dbz: primaryDbz,
    stageColor: severity.stageColor,
    statusTag: severity.stageColor === 'red' ? '[RED]' : severity.stageColor === 'orange' ? '[ALERT]' : '[WATCH]',
    heading: (current.windDirection + 15) % 360,
    speedKmH: Math.round(current.windSpeed * 1.2 + 10),
    distanceKm: cell1DistKm,
  });

  // Cell 2: Developing convective cluster
  const cell2DistKm = 115;
  const cell2AngleRad = windDirRad - Math.PI * 0.6;
  const cell2Lat = lat + (cell2DistKm * Math.cos(cell2AngleRad)) / kmPerDegreeLat;
  const cell2Lng = lng + (cell2DistKm * Math.sin(cell2AngleRad)) / kmPerDegreeLng;
  const cell2Dbz = Math.min(primaryDbz - 12, 42.5);

  stormCells.push({
    id: 'CELL_B4',
    name: 'CELL_B4',
    lat: cell2Lat,
    lng: cell2Lng,
    dbz: Math.max(28.0, cell2Dbz),
    stageColor: cell2Dbz > 40 ? 'orange' : 'yellow',
    statusTag: cell2Dbz > 40 ? '[ALERT]' : '[WATCH]',
    heading: (current.windDirection - 10 + 360) % 360,
    speedKmH: Math.round(current.windSpeed * 0.9 + 5),
    distanceKm: cell2DistKm,
  });

  // Cell 3: Secondary peripheral echo
  const cell3DistKm = 175;
  const cell3AngleRad = windDirRad + Math.PI * 0.85;
  const cell3Lat = lat + (cell3DistKm * Math.cos(cell3AngleRad)) / kmPerDegreeLat;
  const cell3Lng = lng + (cell3DistKm * Math.sin(cell3AngleRad)) / kmPerDegreeLng;

  stormCells.push({
    id: 'CELL_C2',
    name: 'CELL_C2',
    lat: cell3Lat,
    lng: cell3Lng,
    dbz: 26.5,
    stageColor: 'emerald',
    statusTag: '[ADVISORY]',
    heading: current.windDirection,
    speedKmH: Math.round(current.windSpeed),
    distanceKm: cell3DistKm,
  });

  // Generate live lightning strikes around high reflectivity cell
  const strikeCount = isSevere ? 8 : current.cape > 1200 ? 5 : 2;
  const types: ('CG' | 'IC')[] = ['CG', 'IC', 'CG', 'CG', 'IC', 'CG'];

  for (let i = 0; i < strikeCount; i++) {
    // Clustered around cell 1
    const jitterKmX = (Math.random() - 0.5) * (isSevere ? 35 : 20);
    const jitterKmY = (Math.random() - 0.5) * (isSevere ? 35 : 20);
    const sLat = cell1Lat + jitterKmY / kmPerDegreeLat;
    const sLng = cell1Lng + jitterKmX / kmPerDegreeLng;
    const currentKA = Math.round((Math.random() > 0.4 ? -1 : 1) * (20 + Math.random() * 45));

    lightningStrikes.push({
      id: `LTG_${Date.now()}_${i}`,
      lat: sLat,
      lng: sLng,
      currentKA,
      type: types[i % types.length],
      ageSeconds: Math.floor(Math.random() * 90),
    });
  }

  return { stormCells, lightningStrikes };
}
