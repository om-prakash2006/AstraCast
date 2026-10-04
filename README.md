# AstraCast Nowcast Terminal

> **High-Fidelity Real-Time Meteorological Nowcasting & Severe Weather Intelligence Terminal**

AstraCast is an advanced meteorological terminal built for real-time thunderstorm tracking, Doppler weather radar analysis, 0–3 hour convective nowcasting, and automated AI advisory bulletin synthesis. Designed for meteorologists, radar analysts, and emergency dispatchers.

---

## 🌟 Key Features

### 1. 📡 Live Doppler Radar & Mosaic Sweeps
- **Interactive Doppler Radar Player**: Live composite radar sweeps from regional Doppler Weather Radar (DWR) stations (including Kolkata, Delhi Palam, Mumbai Colaba, Chennai, Guwahati, and more).
- **Time-Scrubber Controls**: Step backwards and forwards through historical scan frames with playback speed control and looping.
- **Dual-Polarization Diagnostics**: Base reflectivity ($Z$), differential reflectivity ($Z_{DR}$), correlation coefficient ($\rho_{HV}$), and radial velocity sweeps.

### 2. ⚡ Real-Time Lightning Detection Network
- **Interactive Strike Map**: Interactive geo-referenced mapping of Cloud-to-Ground (CG) and Intra-Cloud (IC) lightning strikes.
- **Strike Density & Trend Analysis**: Real-time strike rate per minute, polarity breakdown, peak current ($\text{kA}$), and convective cell proximity warnings.

### 3. ⏱️ 0–3 Hour Convective Nowcasting Engine
- **Severe Weather Threat Index**: Dynamic calculation combining CAPE (Convective Available Potential Energy), Lifted Index (LI), vertical wind shear, and precipitable water.
- **Kinematic Storm Tracking**: Automatic convective cell tracking with direction of movement (azimuth), translation speed ($\text{km/h}$), and estimated time of arrival (ETA).

### 4. 🛰️ Satellite Convective Monitoring
- **Multi-Spectral Imagery**: Support for INSAT-3D/3DR equivalent channels (Thermal Infrared TIR-1/TIR-2, Water Vapor WV, Visible).
- **Cloud-Top Temperature (CTT)**: Detection of convective overshooting tops penetrating the tropopause ($< -65^\circ\text{C}$).

### 5. 🤖 AI Meteorological Advisory Synthesis
- **Gemini-Powered Bulletins**: Automatically synthesizes complex multi-sensor observations into standardized meteorological nowcast bulletins and public safety advisories using the Google GenAI SDK.
- **Teletype Live Stream**: Watch advisories generate in real time with severity scoring and immediate dispatcher action recommendations.

### 6. 📄 Official Meteorological Bulletin PDF Export
- Generates official, publication-ready PDF bulletins compliant with meteorological formats (including station metadata, observed parameters, threat metrics, and operator cryptographic session verification).

### 7. 🔐 Operator Authentication & Clearances
- **Multi-Role Support**: Meteorologists, Doppler Radar Analysts, and Emergency Dispatchers.
- **Database Persistence**: Powered by PostgreSQL / Supabase with offline session fallback.
- **Unlocked Operator Telemetry**: Access to high-resolution polar radar metrics, kinematic storm vectors, and dispatch stamps when signed in.

### 8. 🎨 Multi-Theme Interface
- **Astra Dark**: Low-fatigue nocturnal operational theme for dim control room environments.
- **Clean Light**: High-contrast daylight theme for desktop and field devices.
- **Sage Earth**: Muted earth-tone theme inspired by natural terrain palettes.
- **Atmospheric Rain Glass**: Canvas-based dynamic condensation and raindrop simulation.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/)
- **Mapping & Geospatial**: [Leaflet](https://leafletjs.com/), [RainViewer Radar API](https://www.rainviewer.com/api.html), [Open-Meteo API](https://open-meteo.com/)
- **Backend & Proxy**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [tsx](https://github.com/privatenumber/tsx)
- **AI Synthesis**: [@google/genai](https://github.com/googleapis/genai-js) (Google Gemini Flash models)
- **Database & Storage**: [PostgreSQL](https://www.postgresql.org/) / [Supabase](https://supabase.com/)
- **Document Generation**: [jsPDF](https://github.com/parallax/jsPDF)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher recommended)
- **npm** or **bun** / **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/astracast-terminal.git
   cd astracast-terminal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your preferred settings (all external APIs have fallbacks for local and offline use).

4. **Launch development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

## ⚙️ Configuration & Environment Variables

| Variable | Type | Description |
|---|---|---|
| `GEMINI_API_KEY` | String | *Optional.* Google Gemini API key for server-side AI advisory bulletin generation. |
| `PORT` | Number | Server listening port (default: `3000`). |
| `APP_URL` | String | *Optional.* Canonical deployment or Cloud Run URL. |
| `VITE_SUPABASE_URL` | String | *Optional.* Supabase project URL for remote PostgreSQL storage. |
| `VITE_SUPABASE_ANON_KEY` | String | *Optional.* Supabase anon public key for database authentication. |
| `VITE_CARTO_API_KEY` | String | *Optional.* API key for high-throughput Carto basemap tiles. |
| `VITE_NOWCAST_ML_API_URL` | String | *Optional.* Endpoint for custom Python/FastAPI nowcasting ML model service. |

---

## 🗄️ Database Setup (PostgreSQL / Supabase)

To enable persistent multi-sensor telemetry, custom nowcast score recording, and operator accounts:

1. Open your Supabase SQL Editor or PostgreSQL client.
2. Execute the script located at `supabase/schema.sql`.
3. The schema sets up:
   - `data_sources`: Source status, endpoints, and health check monitoring.
   - `weather_observations`: Surface AWS and synoptic observations.
   - `satellite_observations`: Multi-band INSAT-3D/3DR cloud products.
   - `radar_scans`: Station-level radar scan records and reflectivity metrics.
   - `lightning_events`: Flash telemetry and geo-coordinates.
   - `nowcast_predictions`: AI/ML convective forecast outputs and verification scores.
   - `advisory_bulletins`: Generated emergency bulletins and impact zones.
   - `app_users`: User authentication, roles, and session records.

---

## 📁 Project Structure

```text
├── index.html                   # HTML entry point with metadata
├── server.ts                    # Express server with Vite middleware integration
├── server/
│   └── routes/                  # Backend endpoints (/api/weather, /api/ai-bulletin)
├── src/
│   ├── App.tsx                  # Main terminal workspace and station router
│   ├── main.tsx                 # React application mounting
│   ├── index.css                # Global Tailwind CSS imports and fonts
│   ├── components/
│   │   ├── AIBulletinTeletype.tsx     # Gemini AI advisory generator & stream
│   │   ├── AtmosphericBackdrop.tsx    # Dynamic glass condensation animation
│   │   ├── BentoTelemetryGrid.tsx     # Meteorological metric dashboard
│   │   ├── LightningStrikeMap.tsx     # Interactive lightning strike locator
│   │   ├── NowcastScrubber.tsx        # Timeline scrubber & forecast player
│   │   ├── NowcastingHorizonView.tsx  # 0-3 hour convective hazard timeline
│   │   ├── RadarMap.tsx               # Leaflet Doppler radar overlay
│   │   ├── RadarMosaicView.tsx        # Multi-station radar mosaic
│   │   ├── SatelliteView.tsx          # Convective cloud & thermal infrared map
│   │   ├── SurfaceTelemetryGrid.tsx   # Detailed surface station observations
│   │   ├── UserAuthModal.tsx          # Operator sign in, registration & details
│   │   └── WeatherHeroHeader.tsx      # Station summary & primary conditions
│   ├── config/
│   │   ├── dataSources.ts       # Meteorological pipeline configurations
│   │   └── stations.ts          # IMD Doppler Weather Radar station catalog
│   ├── services/
│   │   ├── auth/                # Supabase & local operator session management
│   │   ├── lightning/           # Ground LDS telemetry & strike tracking
│   │   ├── nowcasting/          # Diagnostic convective rules engine
│   │   ├── radar/               # Doppler radar tile providers & frames
│   │   └── weather/             # Surface telemetry & Open-Meteo integration
│   └── types/                   # TypeScript interfaces for meteorological data
├── supabase/
│   └── schema.sql               # PostgreSQL database migrations & tables
├── package.json                 # Project dependencies & build scripts
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 📜 Available Scripts

- `npm run dev` - Starts the full-stack server (Express + Vite) in development mode on port 3000.
- `npm run build` - Builds the frontend assets for production into the `dist/` folder.
- `npm start` - Runs the production server serving built assets and backend API routes.
- `npm run lint` - Validates TypeScript code and checks for compiler errors without emitting files.
- `npm run preview` - Previews the production build locally.

---

## 📄 License

This project is licensed under the Apache License 2.0. See the source headers for details.
