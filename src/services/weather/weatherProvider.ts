/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Weather Provider Interface
 */

import { WeatherObservation } from '../../types/observations';

export interface WeatherProvider {
  name: string;
  isConfigured: boolean;
  getCurrentWeather(latitude: number, longitude: number, stationCode?: string): Promise<WeatherObservation>;
}
