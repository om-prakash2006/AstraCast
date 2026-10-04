/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Prototype Nowcasting Model
 *
 * NOTE: Clearly labeled as a prototype nowcasting model.
 * If VITE_NOWCAST_ML_API_URL is configured, it forwards the multi-modal
 * observation tensor to the trained Python ML backend (e.g. PyTorch ConvLSTM / UNet).
 * Otherwise, it executes a physics-grounded heuristic convective advection model.
 */

import { NowcastingEngine } from './nowcastingEngine';
import { NowcastInputFeatures, NowcastResult, HorizonPrediction } from '../../types/nowcast';
import { DATA_SOURCE_CONFIG } from '../../config/dataSources';

export class PrototypeNowcastingEngine implements NowcastingEngine {
  public engineName = 'Prototype Nowcasting Model (Heuristic Convective Engine)';
  public isPrototype = !DATA_SOURCE_CONFIG.nowcastingBackend.isConfigured;

  private mlBackendUrl = DATA_SOURCE_CONFIG.nowcastingBackend.apiUrl;
  private mlApiKey = DATA_SOURCE_CONFIG.nowcastingBackend.apiKey;

  public async computeNowcast(input: NowcastInputFeatures): Promise<NowcastResult> {
    // 1. If external trained Python ML service is configured, query it directly
    if (this.mlBackendUrl && this.mlBackendUrl.startsWith('http')) {
      try {
        const response = await fetch(`${this.mlBackendUrl}/predict/nowcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.mlApiKey ? { 'Authorization': `Bearer ${this.mlApiKey}` } : {}),
          },
          body: JSON.stringify(input),
        });

        if (response.ok) {
          const mlResult = await response.json();
          return {
            ...mlResult,
            engineName: 'Trained Python ML Nowcasting Service (ConvLSTM/UNet)',
            isPrototypeModel: false,
          };
        }
      } catch (err) {
        console.warn('[NowcastingEngine] External ML backend unavailable, using prototype engine fallback:', err);
      }
    }

    // 2. Physics-grounded Prototype Nowcasting Model
    return this.runHeuristicNowcast(input);
  }

  private runHeuristicNowcast(input: NowcastInputFeatures): NowcastResult {
    const { weather, radarCells, atmosphericIndices } = input;
    const now = new Date();

    const cape = weather.cape ?? atmosphericIndices?.cape ?? 500;
    const li = weather.liftedIndex ?? atmosphericIndices?.liftedIndex ?? 0;
    const rainRate = weather.precipitation ?? 0;
    const windGust = weather.windGusts ?? weather.windSpeed ?? 25;
    const windDir = weather.windDirection ?? 240;

    // Detect storm cells
    let maxDbz = 15;
    let primaryHeading = windDir;
    let primarySpeed = Math.max(25, (weather.windSpeed || 20) * 1.2);

    if (radarCells && radarCells.length > 0) {
      maxDbz = Math.max(...radarCells.map((c) => c.intensity || 0));
      if (radarCells[0].movementDirection !== null && radarCells[0].movementDirection !== undefined) {
        primaryHeading = radarCells[0].movementDirection;
      }
      if (radarCells[0].movementSpeed !== null && radarCells[0].movementSpeed !== undefined) {
        primarySpeed = radarCells[0].movementSpeed;
      }
    } else if (rainRate > 0) {
      // Marshall-Palmer estimation
      maxDbz = Math.min(65, Math.max(15, 200 * Math.pow(rainRate, 0.4)));
    }

    // Thunderstorm Probability (0-100)
    let tsProb = 10;
    if (cape >= 2500) tsProb += 40;
    else if (cape >= 1500) tsProb += 25;
    else if (cape >= 800) tsProb += 15;

    if (li <= -5) tsProb += 30;
    else if (li <= -3) tsProb += 20;
    else if (li <= -1) tsProb += 10;

    if (maxDbz >= 50) tsProb += 25;
    else if (maxDbz >= 35) tsProb += 15;

    if (rainRate > 15) tsProb += 15;

    const clampedTsProb = Math.min(95, Math.max(5, Math.round(tsProb)));

    // Lightning Probability (0-100)
    const ltgProb = Math.min(95, Math.max(5, Math.round(clampedTsProb * (cape > 1200 ? 1.05 : 0.85))));

    // Composite Severity Risk
    let riskLevel: 'STAGE_I_NORMAL' | 'STAGE_II_WATCH' | 'STAGE_III_ALERT' | 'STAGE_IV_WARNING' = 'STAGE_I_NORMAL';
    let riskLabel = 'STAGE I: NORMAL (NO ACTIVE CONVECTIVE WARNING)';

    if (clampedTsProb >= 75 || maxDbz >= 50 || windGust >= 65) {
      riskLevel = 'STAGE_IV_WARNING';
      riskLabel = 'STAGE IV: SEVERE SQUALL & THUNDERSTORM WARNING';
    } else if (clampedTsProb >= 55 || maxDbz >= 40 || windGust >= 45) {
      riskLevel = 'STAGE_III_ALERT';
      riskLabel = 'STAGE III: MODERATE THUNDERSTORM ALERT';
    } else if (clampedTsProb >= 35 || maxDbz >= 30) {
      riskLevel = 'STAGE_II_WATCH';
      riskLabel = 'STAGE II: CONVECTIVE THUNDERSTORM WATCH';
    }

    // 15, 30, 45, 60 minute prediction timeline
    const horizons: Array<{ label: '+15m' | '+30m' | '+45m' | '+60m'; mins: number }> = [
      { label: '+15m', mins: 15 },
      { label: '+30m', mins: 30 },
      { label: '+45m', mins: 45 },
      { label: '+60m', mins: 60 },
    ];

    const timeline: HorizonPrediction[] = horizons.map(({ label, mins }) => {
      const futureTime = new Date(now.getTime() + mins * 60 * 1000).toISOString();
      const distanceTravelledKm = (primarySpeed * mins) / 60;
      const rad = (primaryHeading * Math.PI) / 180;
      const dx = Math.round(distanceTravelledKm * Math.sin(rad) * 10) / 10;
      const dy = Math.round(distanceTravelledKm * Math.cos(rad) * 10) / 10;

      // Cell lifecycle decay/growth factor
      const lifeFactor = mins <= 30 ? 1.05 : Math.max(0.65, 1.15 - (mins / 60) * 0.45);

      return {
        horizon: label,
        minutesAhead: mins,
        timestamp: futureTime,
        thunderstormProbability: Math.min(99, Math.max(5, Math.round(clampedTsProb * lifeFactor))),
        lightningProbability: Math.min(99, Math.max(5, Math.round(ltgProb * lifeFactor))),
        expectedRainRateMmH: Math.round(rainRate * lifeFactor * 10) / 10,
        expectedWindGustKmH: Math.round(windGust * lifeFactor * 10) / 10,
        riskLevel,
        predictedMovementDirection: primaryHeading,
        predictedMovementSpeed: primarySpeed,
        stormDisplacementKm: { dx, dy },
      };
    });

    return {
      engineName: this.engineName,
      isPrototypeModel: true,
      modelIdentifier: 'HEURISTIC-CONV-V1',
      generatedAt: now.toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
      overallThunderstormProbability: clampedTsProb,
      overallLightningProbability: ltgProb,
      riskLevel,
      riskLabel,
      predictedMovementDirection: primaryHeading,
      predictedMovementSpeed: primarySpeed,
      timeline,
      disclaimer: 'PROTOTYPE MODEL: Output generated via thermodynamic and kinematic convective rules engine for platform demonstration. Replaceable with trained Python ConvLSTM/U-Net weights.',
    };
  }
}
