import { LightningObservation, LightningRiskEstimate } from '../../types/lightning';
import {
  ForecastHorizonOffset,
  NowcastHorizonPrediction,
  NowcastResult,
  WeatherObservation,
  HorizonPrediction,
} from '../../types/nowcast';
import { RadarObservation } from '../../types/radar';
import { SatelliteObservation } from '../../types/satellite';

export interface NowcastEngineInput {
  stationId: string;
  latitude: number;
  longitude: number;
  weather: WeatherObservation;
  satellite: SatelliteObservation;
  radar: RadarObservation;
  lightning: LightningObservation | null;
  lightningRiskEstimate: LightningRiskEstimate;
}

export interface NowcastingEngine {
  predict(input: NowcastEngineInput): Promise<NowcastResult>;
  getModelMetadata(): {
    name: string;
    version: string;
    type: 'PROTOTYPE_HEURISTIC_BLEND' | 'REMOTE_PYTHON_ML_SERVICE';
    backendEndpoint?: string;
  };
}

/**
 * Prototype Nowcasting Engine (SIH26072 Baseline Model)
 * Blends available atmospheric variables, satellite thermal IR, radar dBZ, and lightning risk.
 * Ready for drop-in replacement with a Python PyTorch/ONNX/TensorFlow serving endpoint.
 */
export class PrototypeNowcastingEngine implements NowcastingEngine {
  private pythonBackendUrl: string;

  constructor() {
    this.pythonBackendUrl = (import.meta.env.VITE_ML_NOWCAST_URL as string | undefined)?.trim() || '';
  }

  getModelMetadata() {
    if (this.pythonBackendUrl) {
      return {
        name: 'Deep Learning Convective Nowcaster (Remote Backend)',
        version: 'v2.1-prod',
        type: 'REMOTE_PYTHON_ML_SERVICE' as const,
        backendEndpoint: this.pythonBackendUrl,
      };
    }
    return {
      name: 'Prototype Nowcasting Model (Hybrid Baseline)',
      version: 'v1.4-prototype',
      type: 'PROTOTYPE_HEURISTIC_BLEND' as const,
    };
  }

  async predict(input: NowcastEngineInput): Promise<NowcastResult> {
    // If a dedicated Python ML microservice is configured, call it
    if (this.pythonBackendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${this.pythonBackendUrl}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const mlResult = await res.json();
          return mlResult;
        }
      } catch (err) {
        console.warn('[NowcastingEngine] Remote ML backend failed, falling back to prototype model engine:', err);
      }
    }

    // Default: Prototype Nowcasting Model calculation
    const { weather, satellite, radar, lightningRiskEstimate, latitude, longitude, stationId } = input;

    const cape = weather.cape ?? 650;
    const liftedIndex = weather.liftedIndex ?? -1.2;
    const rainRate = weather.precipitation ?? 0;
    const windGusts = weather.windSpeed ? weather.windSpeed * 1.35 : 25;
    const dbz = radar.peakReflectivityDbz ?? (rainRate > 0 ? 38 : 18);
    const irBtK = satellite.cloudTopTemperatureK ?? satellite.brightnessTemperatureK ?? 255;

    // 1. Calculate Base Thunderstorm Probability (0-100)
    // CAPE component (up to 40 pts)
    const capeScore = Math.min(40, (Math.max(0, cape) / 2600) * 40);
    // Lifted index instability (up to 20 pts)
    const liScore = liftedIndex < 0 ? Math.min(20, Math.abs(liftedIndex) * 3.5) : 0;
    // Radar echo strength (up to 25 pts)
    const dbzScore = Math.min(25, (Math.max(0, dbz - 20) / 35) * 25);
    // Satellite convective cloud coldness (up to 15 pts)
    const satScore = irBtK < 240 ? Math.min(15, ((240 - irBtK) / 40) * 15) : 0;

    const rawTstormProb = Math.round(capeScore + liScore + dbzScore + satScore);
    const thunderstormProbability = Math.min(99, Math.max(5, rawTstormProb));
    const lightningProbability = lightningRiskEstimate.riskScore ?? lightningRiskEstimate.lightningProbabilityPercent ?? 20;

    // Overall hazard risk tier
    let riskLevel: 'STAGE_I_NORMAL' | 'STAGE_II_WATCH' | 'STAGE_III_ALERT' | 'STAGE_IV_WARNING' = 'STAGE_I_NORMAL';
    let riskLabel = 'LOW HAZARD RISK';
    if (thunderstormProbability >= 80 || dbz >= 50 || windGusts >= 70) {
      riskLevel = 'STAGE_IV_WARNING';
      riskLabel = 'CRITICAL SQUALL WARNING';
    } else if (thunderstormProbability >= 60 || dbz >= 40 || windGusts >= 50) {
      riskLevel = 'STAGE_III_ALERT';
      riskLabel = 'CONVECTIVE STORM ALERT';
    } else if (thunderstormProbability >= 35 || dbz >= 25) {
      riskLevel = 'STAGE_II_WATCH';
      riskLabel = 'THUNDERSTORM WATCH';
    }

    // Advection / Storm Movement Direction & Speed
    const steerHeading = satellite.cloudMotionVector
      ? satellite.cloudMotionVector.directionDeg
      : weather.windDirection !== null
      ? (weather.windDirection + 15) % 360
      : 270;
    const steerSpeed = satellite.cloudMotionVector
      ? satellite.cloudMotionVector.speedKmH
      : Math.round(Math.max(22, (weather.windSpeed || 15) * 1.3));

    // Generate strict 15/30/45/60 minute prediction timeline
    const horizonMinutesMap: { horizon: ForecastHorizonOffset; minutes: number; factor: number; deltaRain: number }[] = [
      { horizon: '+15m', minutes: 15, factor: 1.08, deltaRain: 1.15 },
      { horizon: '+30m', minutes: 30, factor: 1.18, deltaRain: 1.30 }, // Typical peak convective surge
      { horizon: '+45m', minutes: 45, factor: 1.05, deltaRain: 0.95 }, // Maturing / early outflow
      { horizon: '+60m', minutes: 60, factor: 0.82, deltaRain: 0.65 }, // Dissipating / stratiform rain
    ];

    const baseTime = new Date(weather.timestamp || new Date());

    const timeline: HorizonPrediction[] = horizonMinutesMap.map((h) => {
      const predTime = new Date(baseTime.getTime() + h.minutes * 60 * 1000);
      const projDistKm = (steerSpeed * h.minutes) / 60;
      const rad = ((steerHeading - 90) * Math.PI) / 180;
      const dLat = (projDistKm * Math.cos(rad)) / 111;
      const dLng = (projDistKm * Math.sin(rad)) / (111 * Math.cos((latitude * Math.PI) / 180));

      const horizonTstorm = Math.min(99, Math.max(5, Math.round(thunderstormProbability * h.factor)));
      const horizonLtg = Math.min(99, Math.max(5, Math.round(lightningProbability * (h.factor * 0.95))));

      let hRisk: HorizonPrediction['riskLevel'] = 'STAGE_I_NORMAL';
      if (horizonTstorm >= 75) hRisk = 'STAGE_IV_WARNING';
      else if (horizonTstorm >= 55) hRisk = 'STAGE_III_ALERT';
      else if (horizonTstorm >= 30) hRisk = 'STAGE_II_WATCH';

      return {
        horizon: h.horizon,
        minutesAhead: h.minutes,
        timestamp: predTime.toISOString(),
        thunderstormProbability: horizonTstorm,
        lightningProbability: horizonLtg,
        riskLevel: hRisk,
        expectedRainRateMmH: Math.max(0, Math.round(rainRate * h.deltaRain * 10) / 10),
        expectedWindGustKmH: Math.round(windGusts * (1 + (h.factor - 1) * 0.5)),
        predictedMovementDirection: (steerHeading + (h.minutes / 15) * 2) % 360,
        predictedMovementSpeed: steerSpeed,
        stormDisplacementKm: {
          dx: Math.round(dLng * 111 * 10) / 10,
          dy: Math.round(dLat * 111 * 10) / 10,
        },
      };
    });

    return {
      id: `NOWCAST-${stationId}-${Date.now()}`,
      engineName: this.getModelMetadata().name,
      isPrototypeModel: true,
      modelIdentifier: this.getModelMetadata().name,
      generatedAt: new Date().toISOString(),
      latitude,
      longitude,
      overallThunderstormProbability: thunderstormProbability,
      overallLightningProbability: lightningProbability,
      riskLevel,
      riskLabel,
      predictedMovementDirection: steerHeading,
      predictedMovementSpeed: steerSpeed,
      timeline,
      disclaimer: 'Prototype Nowcasting Model: Diagnostic heuristic blend designed for evaluation. Replace with trained CNN-LSTM/U-Net Python backend via VITE_ML_NOWCAST_URL in production.',
    };
  }
}
