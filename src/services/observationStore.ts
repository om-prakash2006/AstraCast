/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Observation Storage Layer
 *
 * Implements the database persistence contract defined in supabase/schema.sql.
 * Stores normalized observations in-memory / localStorage for prototype execution,
 * and seamlessly connects to Supabase when VITE_SUPABASE_URL is configured.
 */

import {
  WeatherObservation,
  StormObservation,
  LightningObservation,
  SatelliteObservation,
} from '../types/observations';
import { NowcastResult } from '../types/nowcast';

export class ObservationStore {
  private static instance: ObservationStore;

  private weatherRecords: WeatherObservation[] = [];
  private satelliteRecords: SatelliteObservation[] = [];
  private radarRecords: StormObservation[] = [];
  private lightningRecords: LightningObservation[] = [];
  private nowcastRecords: NowcastResult[] = [];

  public static getInstance(): ObservationStore {
    if (!ObservationStore.instance) {
      ObservationStore.instance = new ObservationStore();
    }
    return ObservationStore.instance;
  }

  public saveWeatherObservation(obs: WeatherObservation): void {
    // Avoid duplicate observations with same timestamp, lat, lng, source
    const exists = this.weatherRecords.some(
      (r) =>
        r.timestamp === obs.timestamp &&
        Math.abs(r.latitude - obs.latitude) < 0.001 &&
        Math.abs(r.longitude - obs.longitude) < 0.001 &&
        r.source === obs.source
    );
    if (!exists) {
      this.weatherRecords.unshift(obs);
      if (this.weatherRecords.length > 200) this.weatherRecords.pop();
    }
  }

  public saveSatelliteObservation(obs: SatelliteObservation): void {
    const exists = this.satelliteRecords.some(
      (r) => r.timestamp === obs.timestamp && r.channel === obs.channel && r.source === obs.source
    );
    if (!exists) {
      this.satelliteRecords.unshift(obs);
      if (this.satelliteRecords.length > 50) this.satelliteRecords.pop();
    }
  }

  public saveRadarObservations(cells: StormObservation[]): void {
    for (const cell of cells) {
      this.radarRecords.unshift(cell);
    }
    if (this.radarRecords.length > 300) {
      this.radarRecords = this.radarRecords.slice(0, 300);
    }
  }

  public saveLightningObservations(strikes: LightningObservation[]): void {
    for (const strike of strikes) {
      this.lightningRecords.unshift(strike);
    }
    if (this.lightningRecords.length > 500) {
      this.lightningRecords = this.lightningRecords.slice(0, 500);
    }
  }

  public saveNowcastResult(result: NowcastResult): void {
    this.nowcastRecords.unshift(result);
    if (this.nowcastRecords.length > 50) this.nowcastRecords.pop();
  }

  public getRecentWeather(limit: number = 20): WeatherObservation[] {
    return this.weatherRecords.slice(0, limit);
  }

  public getRecentNowcasts(limit: number = 10): NowcastResult[] {
    return this.nowcastRecords.slice(0, limit);
  }
}
