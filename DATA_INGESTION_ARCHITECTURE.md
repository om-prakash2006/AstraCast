# SIH Problem Statement SIH26072: AI/ML-Based Nowcasting of Thunderstorms & Lightning
## Real-Time / Near-Real-Time Data Ingestion Architecture

---

### Executive Summary

This document describes the production-grade data ingestion architecture implemented for **SIH Problem Statement SIH26072** — *AI/ML-based nowcasting of thunderstorms and lightning*.

The architecture enforces strict data integrity:
* **No fake real-time telemetry**: Synthetic or historical data is never labeled as live.
* **Separation of concerns**: Real external data pipelines and demo/benchmark simulation modes are completely decoupled.
* **Strict credential handling**: Restricted departmental feeds (IMD DWR, ISRO MOSDAC, Ground Lightning Sensor Networks) clearly indicate required credentials without scraping or circumventing authentication.
* **Resilient fallbacks**: When live APIs are unreachable or unconfigured, the system reports explicit data quality statuses (`LIVE`, `RECENT`, `HISTORICAL`, `DEMO`, `UNAVAILABLE`) instead of silently injecting artificial data.
* **Extensible AI/ML Nowcasting Engine**: A standardized nowcasting interface ingests real multi-sensor observations and outputs 15, 30, 45, and 60-minute prediction horizons.

---

## 1. System Architecture

The data ingestion pipeline consists of five decoupled layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA INGESTION SOURCES                          │
│                                                                        │
│  [Open-Meteo / WMO AWS]   [ISRO MOSDAC INSAT-3DR]   [IMD Doppler Radar]│
│      Ground Observations      Geostationary Imagery     Volume Scans   │
│               │                         │                     │        │
│               ▼                         ▼                     ▼        │
│    [Lightning Sensors]       [Geographic Coordinates & Met Stations]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  SERVICE & NORMALIZATION LAYER (src/services)          │
│                                                                        │
│  • WeatherProvider      ──> RealWeatherApiProvider / MockWeather       │
│  • SatelliteProvider    ──> MosdacProvider / MockSatellite             │
│  • RadarProvider        ──> ImdRadarProvider / RainViewerComposite     │
│  • LightningProvider    ──> GroundLdsProvider / AtmosphericRiskEstimator│
│  • DataNormalizer       ──> Maps heterogeneous schemas to common types │
│  • DataProviderRegistry ──> Single point of orchestration & mode switch│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 NOWCASTING ENGINE (src/services/nowcasting)            │
│                                                                        │
│  Inputs: WeatherObs + SatObs + RadarCells + LightningObs + Indices     │
│  Calculates:                                                           │
│    • Thunderstorm Probability (0-100%)                                 │
│    • Convective Severity Index (0-100)                                 │
│    • Lightning Strike Potential                                        │
│    • Cell Advection & Storm Vector (Direction + Speed)                 │
│    • 15 / 30 / 45 / 60-Minute Horizon Forecast Timeline                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              PERSISTENCE & OBSERVATION STORE (supabase/schema.sql)     │
│                                                                        │
│  • observationStore.ts  ──> In-memory caching + local sync             │
│  • PostgreSQL / Supabase ─> Normalized tables (weather, satellite,     │
│                             radar, lightning, nowcasts)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE & MONITORING                        │
│                                                                        │
│  • DataSourceDashboard  ──> Real-time pipeline health & credentials    │
│  • DataQualityBadge     ──> Visible LIVE / DEMO / UNAVAILABLE markers  │
│  • NowcastingHorizonView──> +15m, +30m, +45m, +60m timeline cards      │
│  • Mode Switcher        ──> Instant toggle: REAL DATA MODE ⮂ DEMO MODE  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Common Normalized Data Structures

All data providers normalize heterogeneous external feeds into consistent internal interfaces (`src/types/observations.ts` & `src/types/nowcast.ts`). If a provider does not supply a specific parameter, the field is typed strictly as `null` rather than generating placeholder numbers.

### A. WeatherObservation
```typescript
interface WeatherObservation {
  id: string;
  timestamp: string | null;          // ISO 8601 UTC
  latitude: number;
  longitude: number;
  temperature: number | null;        // °C
  humidity: number | null;           // %
  pressure: number | null;           // hPa
  windSpeed: number | null;          // km/h
  windDirection: number | null;      // degrees (0-360)
  precipitation: number | null;      // mm/h
  cloudCover: number | null;         // %
  dewPoint: number | null;           // °C
  cape: number | null;               // J/kg (Convective Available Potential Energy)
  liftedIndex: number | null;        // °C
  source: string;                    // e.g. "Open-Meteo AWS Telemetry Feed"
  isLive: boolean;                   // true ONLY when fetched from live external source
  dataQuality: DataQuality;          // 'LIVE' | 'RECENT' | 'HISTORICAL' | 'DEMO' | 'UNAVAILABLE'
}
```

### B. StormObservation (Radar Detection)
```typescript
interface StormObservation {
  id: string;
  timestamp: string | null;
  latitude: number;
  longitude: number;
  intensity: number | null;          // dBZ (Radar Reflectivity)
  movementDirection: number | null;  // degrees
  movementSpeed: number | null;      // km/h
  stormAreaSqKm?: number | null;     // km²
  source: string;
  isLive: boolean;
  dataQuality: DataQuality;
}
```

### C. LightningObservation
```typescript
interface LightningObservation {
  id: string;
  timestamp: string | null;
  latitude: number;
  longitude: number;
  intensity: number | null;          // kA peak current
  strikeCount: number | null;        // strike event count in window
  source: string;
  isLive: boolean;
  dataQuality: DataQuality;
}
```

### D. SatelliteObservation (ISRO MOSDAC INSAT-3D/3DR)
```typescript
interface SatelliteObservation {
  id: string;
  timestamp: string | null;
  latitude: number;
  longitude: number;
  satelliteName: string;             // "INSAT-3D" | "INSAT-3DR"
  channel: string;                   // "TIR1" | "TIR2" | "WV" | "VIS"
  brightnessTemperatureK: number | null; // Kelvin
  waterVapourContentMm: number | null;   // Total Precipitable Water in mm
  cloudTopPressureHpa: number | null;
  cloudFraction: number | null;
  cloudType: string | null;
  cloudMovementVector: { headingDeg: number; speedKmH: number } | null;
  source: string;
  isLive: boolean;
  dataQuality: DataQuality;
}
```

---

## 3. Environment Variables & API Configuration

All external endpoints and authentication tokens are configured via `.env` without checking credentials into source control. See `.env.example`:

| Environment Variable | Description | Default Fallback |
| :--- | :--- | :--- |
| `VITE_WEATHER_API_URL` | Base URL for surface weather observations | `https://api.open-meteo.com/v1/forecast` |
| `VITE_WEATHER_API_KEY` | Optional API token for authorized IMD / commercial AWS gateway | Empty (Open-Meteo public tier does not require key) |
| `VITE_MOSDAC_API_URL` | ISRO MOSDAC INSAT-3DR Rapid-Scan API URL | Empty (`AUTHENTICATION_REQUIRED`) |
| `VITE_MOSDAC_API_KEY` | ISRO MOSDAC Institutional API Key / Token | Empty |
| `VITE_RADAR_API_URL` | IMD Doppler Weather Radar volumetric API | Empty (falls back to RainViewer public mosaic tiles) |
| `VITE_RADAR_API_KEY` | IMD Radar Ingestion Token | Empty |
| `VITE_LIGHTNING_API_URL`| Ground Lightning Detection Network API | Empty (activates Atmospheric Convective Risk Estimator) |
| `VITE_LIGHTNING_API_KEY`| Ground Lightning Sensor Access Token | Empty |
| `VITE_NOWCAST_ML_API_URL`| Custom Python/FastAPI PyTorch Nowcasting backend | Empty (uses embedded prototype physics/ML engine) |
| `VITE_SUPABASE_URL` | Supabase / PostgreSQL database host | Optional persistence |
| `VITE_SUPABASE_ANON_KEY`| Supabase public anon key | Optional persistence |

---

## 4. Provider Implementation & Authentication Handling

### 4.1 Weather Provider (`OpenMeteoWeatherProvider` / `RealWeatherApiProvider`)
* Connects directly to the live Open-Meteo endpoint (or custom AWS gateway URL).
* Ingests ambient temperature, humidity, surface pressure, 10m wind speed/direction, precipitation rate, cloud cover, dew point, CAPE, and Lifted Index.
* When live API succeeds: marks record with `isLive: true` and `dataQuality: 'LIVE'`.
* When offline or unconfigured: sets `isLive: false` and `dataQuality: 'RECENT'` (cached) or `DEMO`.

### 4.2 MOSDAC / ISRO Satellite Provider (`MosdacProvider` / `MosdacSatelliteProvider`)
* Geostationary satellite telemetry from INSAT-3D / 3DR requires institutional credentials under ISRO data access policy.
* If credentials are not supplied:
  * Status is flagged as `AUTHENTICATION_REQUIRED`.
  * The system displays: `"MOSDAC authentication/data access required. Set VITE_MOSDAC_API_URL and VITE_MOSDAC_API_KEY."`
  * Does **not** invent fake cloud temperatures or bypass authentication.
* When credentials are supplied: parses Thermal Infrared (`TIR1`), Water Vapour (`WV`), and Cloud Motion Vectors (`CMV`).

### 4.3 Radar Provider (`ImdRadarProvider` / `RainViewerRadarProvider`)
* Direct polar volumetric Doppler Weather Radar scans require authorized IMD departmental gateway access.
* When `VITE_RADAR_API_URL` is empty:
  * Informs the evaluator: `"Radar data source not configured."`
  * Gracefully displays the public RainViewer radar composite tiles without claiming to be raw proprietary IMD sweeps.
  * In Demo Mode: renders historical/simulated convective squall cells for validation of tracking algorithms.

### 4.4 Lightning Provider (`ConfigurableLightningProvider`)
* High-frequency Indian Ground Lightning Detection Sensor (LDS) feeds (e.g. IITM Damini, Earth Networks) are restricted.
* When credentials are not configured:
  * Informs the evaluator: `"Direct lightning observations unavailable."`
  * Automatically activates the **Atmospheric Convective Risk Model** which estimates lightning probability using real physical thermodynamic indices:
    $$\text{LightningRisk} = f(\text{CAPE}, \text{Lifted Index}, \text{Dew Point Depress}, \text{Precipitation Rate})$$
  * Marks the output as `AI_ESTIMATED` rather than claiming real sensor hits.

---

## 5. Nowcasting Engine (`PrototypeNowcastingEngine`)

The nowcasting engine implements the `NowcastingEngine` interface:
```typescript
interface NowcastInput {
  stationCode?: string;
  latitude: number;
  longitude: number;
  weather: WeatherObservation;
  satellite?: SatelliteObservation | null;
  radarCells?: StormObservation[];
  lightningObs?: LightningObservation[];
  atmosphericIndices?: {
    cape: number;
    liftedIndex: number;
  };
}

interface NowcastResult {
  generatedAt: string;
  baseLatitude: number;
  baseLongitude: number;
  thunderstormProbability: number;     // 0 - 100%
  convectiveSeverityIndex: number;     // 0 - 100
  lightningRiskLevel: LightningRisk;   // 'NEGLIGIBLE' | 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE'
  predictedMovementDirection: number;  // degrees
  predictedMovementSpeed: number;      // km/h
  isPrototypeModel: boolean;           // true for built-in heuristic/ML prototype
  timeline: NowcastTimelineStep[];     // +15m, +30m, +45m, +60m steps
}
```

The engine generates short-term convective advection vectors across a 4-step timeline:
* **T+15 min**: Immediate convective initiation and localized squall warning.
* **T+30 min**: Storm core displacement and peak lightning activity window.
* **T+45 min**: Downburst risk and precipitation surge.
* **T+60 min**: Storm dissipation or secondary boundary initiation.

---

## 6. How to Switch Between Real Data and Demo Data

The application provides a zero-downtime toggle via the UI and programmatic API:

### Via the User Interface:
1. Open the application.
2. In the top toolbar, click the **"Data Sources"** button (or navigate to the **Data Sources Dashboard**).
3. Click the toggle switch:
   * **REAL DATA MODE**: Queries real external APIs (Open-Meteo, configured MOSDAC/Radar endpoints).
   * **DEMO / BENCHMARK MODE**: Loads curated SIH26072 thunderstorm scenarios (e.g. severe Nor'wester / Kalbaishakhi squall line) for model verification and testing.

### Programmatically:
```typescript
import { DataProviderRegistry } from './services/dataProviderRegistry';

const registry = DataProviderRegistry.getInstance();
registry.setMode('REAL_DATA'); // or 'DEMO_MODE'
const result = await registry.ingestAll(22.57, 88.36, 'VECC');
```

---

## 7. How an Evaluator Can Plug in Their Own APIs

To test custom or departmental endpoints:

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Add your credentials:
```env
# Custom surface weather gateway
VITE_WEATHER_API_URL="https://your-custom-weather-api.com/v1/observations"
VITE_WEATHER_API_KEY="your-secret-api-token"

# MOSDAC Rapid-scan API
VITE_MOSDAC_API_URL="https://mosdac.gov.in/api/v2"
VITE_MOSDAC_API_KEY="your-mosdac-auth-token"

# Doppler Radar endpoint
VITE_RADAR_API_URL="https://dwr-gateway.imd.gov.in/v1/radial"
VITE_RADAR_API_KEY="your-radar-token"

# Ground lightning feed
VITE_LIGHTNING_API_URL="https://lds-network.iitm.gov.in/api/strikes"
VITE_LIGHTNING_API_KEY="your-lightning-token"
```

3. Restart the application server. The **Data Sources Dashboard** will instantly reflect the connected pipelines with green `CONNECTED` status badges and live latency metrics.
