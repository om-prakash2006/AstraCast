/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Demo / Sample Satellite Provider
 *
 * Provides historical INSAT-3D sample product for SIH demonstration.
 * Explicitly marked as DEMO DATA.
 */

import { SatelliteProvider } from './satelliteProvider';
import { SatelliteObservation } from '../../types/observations';
import { MosdacAuthStatus } from '../../types/satellite';

export class MockSatelliteProvider implements SatelliteProvider {
  public name = 'INSAT-3D Historical Sample Product (DEMO)';
  public isConfigured = true;

  public getAuthStatus(): MosdacAuthStatus {
    return {
      isAuthenticated: true,
      endpointUrl: 'Demo Local Archive',
      hasApiKey: true,
      message: 'Demo mode active: Using historical INSAT-3D rapid scan sample product.',
    };
  }

  public async getLatestObservation(
    lat: number,
    lng: number,
    channel: 'TIR1' | 'WV' | 'VIS' | 'RGB' = 'TIR1'
  ): Promise<SatelliteObservation> {
    return {
      id: `SAT-DEMO-${channel}`,
      timestamp: new Date().toISOString(),
      satelliteName: 'INSAT-3D (82.5°E Geo Orbit)',
      channel,
      centerLatitude: lat,
      centerLongitude: lng,
      cloudTopTemperatureK: 218.4, // -54.75°C (deep convective cloud top)
      cloudFraction: 0.88,
      waterVapourMm: 58.2,
      cloudMotionVector: {
        directionDeg: 245,
        speedKmH: 38,
      },
      infraredObservationUrl: '/assets/sample-insat-cloud.png',
      source: 'INSAT-3D Rapid Scan Archive (DEMO PRODUCT)',
      isLive: false,
      dataQuality: 'DEMO',
      requiresAuth: false,
    };
  }
}
