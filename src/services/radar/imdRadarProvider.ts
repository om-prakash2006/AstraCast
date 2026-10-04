/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Indian Doppler Weather Radar Provider
 *
 * NOTE: If no authorized DWR API is configured via VITE_RADAR_API_URL,
 * it returns 'Radar data source not configured' rather than manufacturing fake echoes.
 */

import { RadarProvider } from './radarProvider';
import { StormObservation } from '../../types/observations';
import { RadarScanHeader } from '../../types/radar';
import { DATA_SOURCE_CONFIG } from '../../config/dataSources';
import { DataNormalizer } from '../dataNormalizer';

export class ImdRadarProvider implements RadarProvider {
  public name = 'IMD Doppler Weather Radar Network';
  public isConfigured = DATA_SOURCE_CONFIG.radar.isConfigured;
  public isDirectIndianDwrFeed = true;

  private apiUrl = DATA_SOURCE_CONFIG.radar.apiUrl;
  private apiKey = DATA_SOURCE_CONFIG.radar.apiKey;

  public async getScanHeader(stationCode: string): Promise<RadarScanHeader> {
    if (!this.isConfigured || !this.apiUrl) {
      return {
        stationCode,
        radarType: 'S-Band Doppler (Unconfigured)',
        sweepElevationDeg: 0.5,
        scanTimeUtc: new Date().toISOString(),
        maxRangeKm: 250,
        azimuthResolutionDeg: 0.5,
        prfHz: 600,
        pulseWidthMicroSec: 1.0,
        source: 'Radar data source not configured',
        isAuthorizedIndianRadarFeed: false,
        isLive: false,
        dataQuality: 'UNAVAILABLE',
      };
    }

    try {
      const res = await fetch(`${this.apiUrl}/scan/header?station=${stationCode}`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      });
      if (!res.ok) throw new Error(`DWR API returned HTTP ${res.status}`);
      const raw = await res.json();
      return {
        stationCode: raw.stationCode || stationCode,
        radarType: raw.radarType || 'S-Band Doppler Weather Radar',
        sweepElevationDeg: raw.elevation ?? 0.5,
        scanTimeUtc: raw.scanTimeUtc || new Date().toISOString(),
        maxRangeKm: raw.maxRangeKm ?? 250,
        azimuthResolutionDeg: raw.azimuthResolutionDeg ?? 0.5,
        prfHz: raw.prfHz ?? 600,
        pulseWidthMicroSec: raw.pulseWidthMicroSec ?? 1.0,
        source: 'IMD Authorized DWR Stream',
        isAuthorizedIndianRadarFeed: true,
        isLive: true,
        dataQuality: 'LIVE',
      };
    } catch (err: any) {
      console.warn(`[ImdRadarProvider] Failed to fetch scan header: ${err?.message}`);
      return {
        stationCode,
        radarType: 'S-Band Doppler',
        sweepElevationDeg: 0.5,
        scanTimeUtc: new Date().toISOString(),
        maxRangeKm: 250,
        azimuthResolutionDeg: 0.5,
        prfHz: 600,
        pulseWidthMicroSec: 1.0,
        source: 'DWR Gateway Connection Error',
        isAuthorizedIndianRadarFeed: false,
        isLive: false,
        dataQuality: 'UNAVAILABLE',
      };
    }
  }

  public async getDetectedStormCells(lat: number, lng: number): Promise<StormObservation[]> {
    if (!this.isConfigured || !this.apiUrl) {
      // In REAL DATA MODE without a configured DWR endpoint:
      // Return empty array with honest indication
      return [];
    }

    try {
      const res = await fetch(`${this.apiUrl}/cells?lat=${lat}&lng=${lng}`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      });
      if (!res.ok) throw new Error(`DWR cell detection returned HTTP ${res.status}`);
      const list = await res.json();
      return (list || []).map((cell: any) =>
        DataNormalizer.normalizeStormCell(cell, 'IMD DWR Tracking Alg', true)
      );
    } catch {
      return [];
    }
  }

  public getTileUrlTemplate(): string | null {
    if (this.isConfigured && this.apiUrl) {
      return `${this.apiUrl}/tiles/{z}/{x}/{y}.png`;
    }
    return null;
  }
}
