/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Real Weather API Provider
 */

import { WeatherProvider } from './weatherProvider';
import { WeatherObservation } from '../../types/observations';
import { DataNormalizer } from '../dataNormalizer';
import { DATA_SOURCE_CONFIG } from '../../config/dataSources';

export class OpenMeteoWeatherProvider implements WeatherProvider {
  public name = 'Open-Meteo High-Resolution Surface Telemetry';
  public isConfigured = true;

  private baseUrl = DATA_SOURCE_CONFIG.weather.apiUrl;
  private apiKey = DATA_SOURCE_CONFIG.weather.apiKey;

  public async getCurrentWeather(
    latitude: number,
    longitude: number,
    stationCode?: string
  ): Promise<WeatherObservation> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'dew_point_2m',
        'surface_pressure',
        'wind_speed_10m',
        'wind_gusts_10m',
        'wind_direction_10m',
        'precipitation',
        'rain',
        'weather_code',
        'cape',
        'lifted_index',
        'cloud_cover',
      ].join(','),
      timezone: 'auto',
    });

    if (this.apiKey) {
      params.append('apikey', this.apiKey);
    }

    const requestUrl = `${this.baseUrl}?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(requestUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Weather API HTTP error: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      if (!json || !json.current) {
        throw new Error('Malformed weather API response payload: missing current field');
      }

      // Canonical normalization with isLive = true
      return DataNormalizer.normalizeWeather(
        json,
        latitude,
        longitude,
        'Open-Meteo High-Res AWS (Live Feed)',
        true,
        stationCode
      );
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn(`[WeatherProvider] Real API request failed (${err?.message}). Providing clearly marked fallback.`);

      // Return a clearly labeled non-live observation
      return {
        timestamp: new Date().toISOString(),
        latitude,
        longitude,
        temperature: null,
        humidity: null,
        pressure: null,
        windSpeed: null,
        windDirection: null,
        windGusts: null,
        precipitation: null,
        cloudCover: null,
        dewPoint: null,
        cape: null,
        liftedIndex: null,
        weatherCode: null,
        source: 'Weather API Temporarily Unavailable',
        isLive: false,
        dataQuality: 'UNAVAILABLE',
        stationCode: stationCode || null,
      };
    }
  }
}
