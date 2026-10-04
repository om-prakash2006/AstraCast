/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Real-Time Mock Lightning Detection Service
 *
 * Simulates an enterprise-grade Lightning Detection Sensor Network (LDS)
 * providing real-time geo-referenced lightning strike coordinates, peak current (kA),
 * stroke polarity, flash type (Cloud-to-Ground CG vs Intra-Cloud IC),
 * and detection confidence clustered around active storm convective cells.
 */

export interface RealTimeLightningStrike {
  id: string;
  timestamp: string; // ISO 8601
  receivedAt: number; // epoch ms
  latitude: number;
  longitude: number;
  peakCurrentKA: number; // e.g. -48.5 kA
  polarity: 'POSITIVE' | 'NEGATIVE';
  strikeType: 'CG' | 'IC'; // Cloud-to-Ground or Intra-Cloud
  multiplicity: number; // 1 to 4 strokes in flash
  bearingDeg: number; // 0 - 360 relative to station
  distanceKm: number; // distance from station
  confidence: number; // 90 - 99.8%
  sensorNetwork: string;
}

export type LightningActivityLevel = 'LOW' | 'MODERATE' | 'SEVERE' | 'BURST';

export interface LightningDetectionStats {
  totalStrikes15m: number;
  totalStrikes60m: number;
  strikesPerMin: number;
  maxCurrentKA: number;
  cgCount: number;
  icCount: number;
  lastStrikeTime: string | null;
  status: LightningActivityLevel;
  sensorNetworkName: string;
}

type StrikeListener = (strike: RealTimeLightningStrike) => void;

class MockLightningDetectionService {
  private strikes: RealTimeLightningStrike[] = [];
  private listeners: Set<StrikeListener> = new Set();
  private timer: number | null = null;
  private activityLevel: LightningActivityLevel = 'SEVERE';
  private centerLat: number = 28.6139; // Default New Delhi
  private centerLng: number = 77.209;
  private stationCode: string = 'DEL';

  constructor() {
    this.seedInitialStrikes();
    this.startStreaming();
  }

  /**
   * Configure station anchor for coordinate generation
   */
  public setStationCoordinates(lat: number, lng: number, code: string = 'RADAR-HQ') {
    this.centerLat = lat;
    this.centerLng = lng;
    this.stationCode = code;
  }

  /**
   * Pre-populates history with realistic strikes over the past 30 minutes
   */
  private seedInitialStrikes() {
    const now = Date.now();
    const count = 28;

    for (let i = 0; i < count; i++) {
      // Offset backwards in time up to 30 mins
      const ageMs = Math.floor((i / count) * 30 * 60 * 1000 + Math.random() * 60000);
      const timestampMs = now - ageMs;

      // Cluster around convective storm cells (East-Northeast sector)
      const angleRad = (Math.PI / 4) + (Math.random() - 0.5) * 1.2; // roughly NE / ENE
      const distKm = 15 + Math.random() * 85;

      const kmPerDegreeLat = 111.0;
      const kmPerDegreeLng = 111.0 * Math.cos((this.centerLat * Math.PI) / 180);

      const dLat = (distKm * Math.cos(angleRad)) / kmPerDegreeLat;
      const dLng = (distKm * Math.sin(angleRad)) / kmPerDegreeLng;

      const isCG = Math.random() > 0.38;
      const isNegative = Math.random() > 0.15;
      const current = isCG
        ? (isNegative ? -(20 + Math.random() * 75) : (25 + Math.random() * 90))
        : (isNegative ? -(8 + Math.random() * 22) : (10 + Math.random() * 28));

      const strike: RealTimeLightningStrike = {
        id: `MOCK-LDS-${timestampMs}-${i}`,
        timestamp: new Date(timestampMs).toISOString(),
        receivedAt: timestampMs,
        latitude: Math.round((this.centerLat + dLat) * 10000) / 10000,
        longitude: Math.round((this.centerLng + dLng) * 10000) / 10000,
        peakCurrentKA: Math.round(current * 10) / 10,
        polarity: isNegative ? 'NEGATIVE' : 'POSITIVE',
        strikeType: isCG ? 'CG' : 'IC',
        multiplicity: isCG ? Math.floor(1 + Math.random() * 3) : 1,
        bearingDeg: Math.round(((angleRad * 180) / Math.PI + 360) % 360),
        distanceKm: Math.round(distKm * 10) / 10,
        confidence: Math.round((92 + Math.random() * 7.5) * 10) / 10,
        sensorNetwork: 'Mock Ground Lightning Detection Network (LDS-DEMO)',
      };

      this.strikes.push(strike);
    }

    // Sort newest first
    this.strikes.sort((a, b) => b.receivedAt - a.receivedAt);
  }

  /**
   * Starts real-time automated strike streaming
   */
  public startStreaming() {
    if (this.timer) return;

    const scheduleNext = () => {
      let intervalMs = 2800;
      switch (this.activityLevel) {
        case 'BURST':
          intervalMs = 800 + Math.random() * 1200;
          break;
        case 'SEVERE':
          intervalMs = 2000 + Math.random() * 2500;
          break;
        case 'MODERATE':
          intervalMs = 4500 + Math.random() * 5000;
          break;
        case 'LOW':
          intervalMs = 9000 + Math.random() * 9000;
          break;
      }

      this.timer = window.setTimeout(() => {
        this.generateRandomStrike();
        scheduleNext();
      }, intervalMs);
    };

    scheduleNext();
  }

  public stopStreaming() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Set activity rate level
   */
  public setActivityLevel(level: LightningActivityLevel) {
    this.activityLevel = level;
  }

  public getActivityLevel(): LightningActivityLevel {
    return this.activityLevel;
  }

  /**
   * Manually generates a new strike or produces an automated random strike
   */
  public generateRandomStrike(customLat?: number, customLng?: number): RealTimeLightningStrike {
    const now = Date.now();
    const kmPerDegreeLat = 111.0;
    const kmPerDegreeLng = 111.0 * Math.cos((this.centerLat * Math.PI) / 180);

    let lat: number;
    let lng: number;
    let distKm: number;
    let bearingDeg: number;

    if (customLat !== undefined && customLng !== undefined) {
      lat = customLat;
      lng = customLng;
      const dLatKm = (lat - this.centerLat) * kmPerDegreeLat;
      const dLngKm = (lng - this.centerLng) * kmPerDegreeLng;
      distKm = Math.sqrt(dLatKm * dLatKm + dLngKm * dLngKm);
      bearingDeg = Math.round(((Math.atan2(dLngKm, dLatKm) * 180) / Math.PI + 360) % 360);
    } else {
      // Convective cluster focus: storm cell drifting along 065° heading
      const baseHeadingRad = (65 * Math.PI) / 180;
      const angleRad = baseHeadingRad + (Math.random() - 0.5) * 0.9;
      distKm = 12 + Math.random() * 75;

      const dLat = (distKm * Math.cos(angleRad)) / kmPerDegreeLat;
      const dLng = (distKm * Math.sin(angleRad)) / kmPerDegreeLng;

      lat = Math.round((this.centerLat + dLat) * 10000) / 10000;
      lng = Math.round((this.centerLng + dLng) * 10000) / 10000;
      bearingDeg = Math.round(((angleRad * 180) / Math.PI + 360) % 360);
    }

    const isCG = Math.random() > 0.35;
    const isNegative = Math.random() > 0.12;
    const current = isCG
      ? (isNegative ? -(22 + Math.random() * 85) : (30 + Math.random() * 95))
      : (isNegative ? -(10 + Math.random() * 25) : (12 + Math.random() * 30));

    const strike: RealTimeLightningStrike = {
      id: `LDS-STRIKE-${now}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date(now).toISOString(),
      receivedAt: now,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lng * 10000) / 10000,
      peakCurrentKA: Math.round(current * 10) / 10,
      polarity: isNegative ? 'NEGATIVE' : 'POSITIVE',
      strikeType: isCG ? 'CG' : 'IC',
      multiplicity: isCG ? Math.floor(1 + Math.random() * 3) : 1,
      bearingDeg,
      distanceKm: Math.round(distKm * 10) / 10,
      confidence: Math.round((93 + Math.random() * 6.5) * 10) / 10,
      sensorNetwork: 'Mock Ground Lightning Detection Network (LDS-DEMO)',
    };

    // Add to buffer (keep up to 150 recent strikes)
    this.strikes.unshift(strike);
    if (this.strikes.length > 150) {
      this.strikes.pop();
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(strike);
      } catch (err) {
        console.error('Error in strike listener:', err);
      }
    });

    return strike;
  }

  /**
   * Subscribe to real-time strike events
   */
  public subscribe(listener: StrikeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Return strikes within specified time window (minutes)
   */
  public getStrikes(windowMinutes: number = 30): RealTimeLightningStrike[] {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    return this.strikes.filter((s) => s.receivedAt >= cutoff);
  }

  /**
   * Return real-time summary statistics
   */
  public getStats(): LightningDetectionStats {
    const now = Date.now();
    const cut15m = now - 15 * 60 * 1000;
    const cut60m = now - 60 * 60 * 1000;

    const strikes15m = this.strikes.filter((s) => s.receivedAt >= cut15m);
    const strikes60m = this.strikes.filter((s) => s.receivedAt >= cut60m);

    let maxKA = 0;
    let cg = 0;
    let ic = 0;

    strikes15m.forEach((s) => {
      const absCurrent = Math.abs(s.peakCurrentKA);
      if (absCurrent > maxKA) maxKA = absCurrent;
      if (s.strikeType === 'CG') cg++;
      else ic++;
    });

    const strikesPerMin = Math.round((strikes15m.length / 15) * 10) / 10;

    return {
      totalStrikes15m: strikes15m.length,
      totalStrikes60m: strikes60m.length,
      strikesPerMin,
      maxCurrentKA: maxKA,
      cgCount: cg,
      icCount: ic,
      lastStrikeTime: this.strikes[0]?.timestamp || null,
      status: this.activityLevel,
      sensorNetworkName: 'Mock Ground LDS Network',
    };
  }

  /**
   * Clear recorded strike history
   */
  public clear() {
    this.strikes = [];
  }
}

// Export singleton instance
export const mockLightningDetectionService = new MockLightningDetectionService();
