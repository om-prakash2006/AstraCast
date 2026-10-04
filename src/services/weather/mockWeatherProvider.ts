/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Demo / Synthetic Weather Provider
 *
 * Explicitly marked as DEMO DATA. Never claims to be live real-time observations.
 */

import { WeatherProvider } from './weatherProvider';
import { WeatherObservation } from '../../types/observations';

export class MockWeatherProvider implements WeatherProvider {
  public name = 'Synthetic Telemetry Scenario (DEMO)';
  public isConfigured = true;

  public async getCurrentWeather(
    latitude: number,
    longitude: number,
    stationCode?: string
  ): Promise<WeatherObservation> {
    // Generate realistic squall line scenario for demonstration
    return {
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      temperature: 31.5,
      humidity: 82,
      pressure: 998.4,
      windSpeed: 42.0,
      windDirection: 250,
      windGusts: 68.5,
      precipitation: 28.0,
      cloudCover: 95,
      dewPoint: 28.1,
      cape: 2450,
      liftedIndex: -4.8,
      weatherCode: 95, // Thunderstorm
      source: 'Pre-Recorded Severe Convection Scenario (DEMO)',
      isLive: false,
      dataQuality: 'DEMO',
      stationCode: stationCode || 'DEMO_DWR',
    };
  }
}
