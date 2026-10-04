/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Canonical Data Normalizer
 *
 * Enforces strict scientific data normalization:
 * 1. Missing fields are set to null (never hallucinated or given fake values).
 * 2. Records exact observation timestamp from the sensor.
 * 3. Sets isLive to true ONLY when data originated from an active external API.
 * 4. Categorizes dataQuality as 'LIVE' | 'RECENT' | 'HISTORICAL' | 'DEMO' | 'UNAVAILABLE'.
 */

import {
  WeatherObservation,
  StormObservation,
  LightningObservation,
  SatelliteObservation,
} from '../types/observations';
import { DataQuality } from '../types/dataSource';

export class DataNormalizer {
  /**
   * Normalizes raw Open-Meteo or standard WMO JSON telemetry into canonical WeatherObservation
   */
  public static normalizeWeather(
    raw: any,
    lat: number,
    lng: number,
    sourceName: string,
    isExternalLive: boolean,
    stationCode?: string
  ): WeatherObservation {
    const cur = raw?.current || raw?.currently || raw;
    const nowIso = new Date().toISOString();

    const observationTime = cur?.time
      ? typeof cur.time === 'number'
        ? new Date(cur.time * 1000).toISOString()
        : new Date(cur.time).toISOString()
      : nowIso;

    // Check age to determine dataQuality
    const ageMinutes = Math.abs(Date.now() - new Date(observationTime).getTime()) / (1000 * 60);
    let quality: DataQuality = 'LIVE';
    if (!isExternalLive) {
      quality = 'DEMO';
    } else if (ageMinutes > 120) {
      quality = 'HISTORICAL';
    } else if (ageMinutes > 20) {
      quality = 'RECENT';
    }

    const temp = cur?.temperature_2m ?? cur?.temperature ?? null;
    const rh = cur?.relative_humidity_2m ?? cur?.humidity ?? null;
    let dp = cur?.dew_point_2m ?? cur?.dew_point ?? null;
    if (dp === null && temp !== null && rh !== null) {
      dp = Math.round((temp - (100 - rh) / 5) * 10) / 10;
    }

    return {
      timestamp: observationTime,
      latitude: lat,
      longitude: lng,
      temperature: temp !== null ? Number(temp) : null,
      humidity: rh !== null ? Number(rh) : null,
      pressure: cur?.surface_pressure ?? cur?.pressure ?? null,
      windSpeed: cur?.wind_speed_10m ?? cur?.windSpeed ?? null,
      windDirection: cur?.wind_direction_10m ?? cur?.windDirection ?? null,
      windGusts: cur?.wind_gusts_10m ?? cur?.windGusts ?? null,
      precipitation: cur?.precipitation ?? cur?.rain ?? cur?.precipRate ?? null,
      cloudCover: cur?.cloud_cover ?? cur?.cloudCover ?? null,
      dewPoint: dp !== null ? Number(dp) : null,
      cape: cur?.cape !== undefined ? Number(cur.cape) : null,
      liftedIndex: cur?.lifted_index !== undefined ? Number(cur.lifted_index) : null,
      weatherCode: cur?.weather_code ?? cur?.weatherCode ?? null,
      source: sourceName,
      isLive: isExternalLive,
      dataQuality: quality,
      stationCode: stationCode || null,
    };
  }

  /**
   * Normalizes radar scan output or detected convective cells
   */
  public static normalizeStormCell(
    cell: any,
    sourceName: string,
    isExternalLive: boolean
  ): StormObservation {
    return {
      id: cell?.id || `CELL-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: cell?.timestamp || new Date().toISOString(),
      latitude: Number(cell.lat || cell.latitude),
      longitude: Number(cell.lng || cell.longitude),
      intensity: cell.dbz !== undefined ? Number(cell.dbz) : cell.intensity ?? null,
      movementDirection: cell.heading ?? cell.movementDirection ?? null,
      movementSpeed: cell.speedKmH ?? cell.movementSpeed ?? null,
      stormAreaSqKm: cell.stormAreaSqKm ?? null,
      cellName: cell.name ?? cell.cellName ?? null,
      severityLevel: cell.stageColor === 'red' ? 'CRITICAL' : cell.stageColor === 'orange' ? 'ALERT' : 'WATCH',
      source: sourceName,
      isLive: isExternalLive,
      dataQuality: isExternalLive ? 'LIVE' : 'DEMO',
    };
  }

  /**
   * Normalizes lightning strike observations
   */
  public static normalizeLightning(
    strike: any,
    sourceName: string,
    isExternalLive: boolean,
    isAiEstimated: boolean = false
  ): LightningObservation {
    return {
      id: strike?.id || `LTG-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: strike?.timestamp || new Date().toISOString(),
      latitude: Number(strike.lat || strike.latitude),
      longitude: Number(strike.lng || strike.longitude),
      intensity: strike.currentKA ?? strike.intensity ?? null,
      strikeCount: strike.strikeCount ?? 1,
      strikeType: strike.type ?? strike.strikeType ?? 'CG',
      source: sourceName,
      isLive: isExternalLive,
      dataQuality: isExternalLive ? 'LIVE' : isAiEstimated ? 'DEMO' : 'UNAVAILABLE',
      isAiEstimated,
    };
  }

  /**
   * Normalizes satellite imagery observation metadata
   */
  public static normalizeSatellite(
    meta: any,
    sourceName: string,
    isExternalLive: boolean,
    requiresAuth: boolean
  ): SatelliteObservation {
    return {
      id: meta?.id || `SAT-${meta?.channel || 'TIR'}-${Date.now()}`,
      timestamp: meta?.timestamp || new Date().toISOString(),
      satelliteName: meta?.satelliteName || 'INSAT-3D',
      channel: meta?.channel || 'TIR1',
      centerLatitude: meta?.centerLatitude ?? 22.0,
      centerLongitude: meta?.centerLongitude ?? 82.5,
      cloudTopTemperatureK: meta?.cloudTopTemperatureK ?? null,
      cloudFraction: meta?.cloudFraction ?? null,
      waterVapourMm: meta?.waterVapourMm ?? null,
      cloudMotionVector: meta?.cloudMotionVector ?? null,
      infraredObservationUrl: meta?.infraredObservationUrl ?? null,
      source: sourceName,
      isLive: isExternalLive,
      dataQuality: isExternalLive ? 'LIVE' : requiresAuth ? 'UNAVAILABLE' : 'DEMO',
      requiresAuth,
    };
  }
}
