/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Demo / Simulated Radar Provider
 *
 * Explicitly marked as DEMO DATA.
 */

import { RadarProvider } from './radarProvider';
import { StormObservation } from '../../types/observations';
import { RadarScanHeader } from '../../types/radar';

export class MockRadarProvider implements RadarProvider {
  public name = 'Severe Convective Scenario (DEMO RADAR)';
  public isConfigured = true;
  public isDirectIndianDwrFeed = false;

  public async getScanHeader(stationCode: string): Promise<RadarScanHeader> {
    return {
      stationCode: stationCode || 'DWR_DEMO',
      radarType: 'S-Band Doppler (Simulated Demonstration)',
      sweepElevationDeg: 0.5,
      scanTimeUtc: new Date().toISOString(),
      maxRangeKm: 250,
      azimuthResolutionDeg: 0.5,
      prfHz: 600,
      pulseWidthMicroSec: 1.0,
      source: 'Pre-Recorded Severe Thunderstorm Scenario (DEMO)',
      isAuthorizedIndianRadarFeed: false,
      isLive: false,
      dataQuality: 'DEMO',
    };
  }

  public async getDetectedStormCells(lat: number, lng: number): Promise<StormObservation[]> {
    return [
      {
        id: 'CELL-DEMO-01',
        timestamp: new Date().toISOString(),
        latitude: lat + 0.18,
        longitude: lng + 0.22,
        intensity: 58.5,
        movementDirection: 240,
        movementSpeed: 44,
        stormAreaSqKm: 185,
        cellName: 'Severe Hail/Squall Core Alpha',
        severityLevel: 'CRITICAL',
        source: 'Demonstration Convection Model',
        isLive: false,
        dataQuality: 'DEMO',
      },
      {
        id: 'CELL-DEMO-02',
        timestamp: new Date().toISOString(),
        latitude: lat - 0.25,
        longitude: lng + 0.15,
        intensity: 46.0,
        movementDirection: 235,
        movementSpeed: 38,
        stormAreaSqKm: 120,
        cellName: 'Secondary Flanking Cell Beta',
        severityLevel: 'ALERT',
        source: 'Demonstration Convection Model',
        isLive: false,
        dataQuality: 'DEMO',
      },
    ];
  }

  public getTileUrlTemplate(): string | null {
    return null;
  }
}
