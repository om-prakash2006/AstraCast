/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Demo / Simulated Lightning Provider
 *
 * Explicitly marked as DEMO DATA.
 */

import { LightningObservation } from '../../types/observations';
import { LightningProvider, LightningRiskEstimate } from '../../types/lightning';
import { mockLightningDetectionService } from './mockLightningDetectionService';

export class MockLightningProvider implements LightningProvider {
  public name = 'Pre-Recorded Thunderstorm Lightning Scenario (DEMO)';

  public isSensorFeedAvailable(): boolean {
    return true; // Active in demo mode
  }

  public async getObservedStrikes(
    lat: number,
    lng: number,
    _radiusKm: number = 80
  ): Promise<{
    observations: LightningObservation[];
    statusMessage: string;
    isSensorFeedLive: boolean;
  }> {
    mockLightningDetectionService.setStationCoordinates(lat, lng);
    const strikes = mockLightningDetectionService.getStrikes(15);
    const observations: LightningObservation[] = strikes.map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      latitude: s.latitude,
      longitude: s.longitude,
      intensity: s.peakCurrentKA,
      intensityKa: s.peakCurrentKA,
      strikeCount: 1,
      strikeType: s.strikeType,
      polarity: s.polarity === 'NEGATIVE' ? '-' : '+',
      detectionConfidence: s.confidence,
      sensorNetwork: s.sensorNetwork,
      source: 'Mock Ground Lightning Detection Network (LDS-DEMO)',
      isLive: false,
      dataQuality: 'DEMO',
      isAiEstimated: false,
    }));

    return {
      observations,
      statusMessage: `DEMO MODE: Showing ${observations.length} lightning strike observations from mock detection service.`,
      isSensorFeedLive: false,
    };
  }

  public estimateLightningRisk(
    lat: number,
    lng: number,
    atmosphericFeatures: { cape: number; liftedIndex: number; rh: number; precipRate: number }
  ): LightningRiskEstimate {
    return {
      timestamp: new Date().toISOString(),
      latitude: lat,
      longitude: lng,
      lightningProbabilityPercent: 88,
      threatLevel: 'CRITICAL',
      estimatedStrikeDensityPerSqKm: 3.4,
      capeContributionJkg: atmosphericFeatures.cape,
      isAiEstimated: true,
      modelRationale: 'High instability pre-recorded scenario (CAPE > 2400 J/kg).',
    };
  }
}
