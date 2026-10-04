-- ============================================================================
-- AstraCast Platform — Database Schema (PostgreSQL / Supabase)
-- AI/ML-Based Nowcasting of Thunderstorms & Lightning Ingestion Architecture
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DATA SOURCES METADATA
CREATE TABLE IF NOT EXISTS data_sources (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(64) NOT NULL, -- WEATHER, SATELLITE, RADAR, LIGHTNING, NOWCAST_ENGINE
    endpoint_url TEXT,
    requires_auth BOOLEAN DEFAULT false,
    is_restricted_gov_feed BOOLEAN DEFAULT false,
    status VARCHAR(64) NOT NULL DEFAULT 'NOT_CONFIGURED',
    last_health_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WEATHER GROUND OBSERVATIONS (AWS / SYNOP)
CREATE TABLE IF NOT EXISTS weather_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    station_code VARCHAR(64),
    temperature NUMERIC(5, 2),        -- °C
    humidity NUMERIC(5, 2),           -- %
    pressure NUMERIC(7, 2),           -- hPa
    wind_speed NUMERIC(6, 2),         -- km/h
    wind_direction NUMERIC(5, 1),     -- degrees
    wind_gusts NUMERIC(6, 2),         -- km/h
    precipitation NUMERIC(6, 2),      -- mm/h
    cloud_cover NUMERIC(5, 2),        -- %
    dew_point NUMERIC(5, 2),          -- °C
    cape NUMERIC(7, 2),               -- J/kg
    lifted_index NUMERIC(5, 2),
    weather_code INT,
    source VARCHAR(255) NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT true,
    data_quality VARCHAR(32) NOT NULL DEFAULT 'LIVE', -- LIVE, RECENT, HISTORICAL, DEMO, UNAVAILABLE
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_weather_obs UNIQUE (timestamp, latitude, longitude, source)
);

CREATE INDEX IF NOT EXISTS idx_weather_obs_time ON weather_observations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_obs_geo ON weather_observations(latitude, longitude);

-- 3. SATELLITE OBSERVATIONS (ISRO MOSDAC INSAT-3D/3DR)
CREATE TABLE IF NOT EXISTS satellite_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    satellite_name VARCHAR(64) NOT NULL DEFAULT 'INSAT-3D',
    channel VARCHAR(32) NOT NULL, -- TIR1, TIR2, WV, VIS, RGB
    cloud_top_temperature_k NUMERIC(6, 2),
    cloud_fraction NUMERIC(4, 3),
    water_vapour_mm NUMERIC(6, 2),
    cloud_motion_deg NUMERIC(5, 1),
    cloud_motion_speed_kmh NUMERIC(6, 2),
    imagery_url TEXT,
    source VARCHAR(255) NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT true,
    data_quality VARCHAR(32) NOT NULL DEFAULT 'LIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_satellite_obs UNIQUE (timestamp, latitude, longitude, channel, source)
);

CREATE INDEX IF NOT EXISTS idx_satellite_obs_time ON satellite_observations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_obs_geo ON satellite_observations(latitude, longitude);

-- 4. RADAR OBSERVATIONS (DWR STORM CELLS)
CREATE TABLE IF NOT EXISTS radar_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    radar_station_code VARCHAR(64),
    cell_name VARCHAR(128),
    reflectivity_dbz NUMERIC(5, 2),
    precipitation_intensity_mmh NUMERIC(6, 2),
    movement_direction NUMERIC(5, 1),
    movement_speed_kmh NUMERIC(6, 2),
    storm_area_sqkm NUMERIC(8, 2),
    severity_level VARCHAR(32), -- NORMAL, WATCH, ALERT, CRITICAL
    source VARCHAR(255) NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT true,
    data_quality VARCHAR(32) NOT NULL DEFAULT 'LIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radar_obs_time ON radar_observations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_radar_obs_geo ON radar_observations(latitude, longitude);

-- 5. LIGHTNING OBSERVATIONS & ESTIMATES
CREATE TABLE IF NOT EXISTS lightning_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    intensity_ka NUMERIC(6, 2),
    strike_count INT DEFAULT 1,
    strike_type VARCHAR(16) DEFAULT 'CG', -- CG (Cloud-to-ground), IC (Intra-cloud)
    is_ai_estimated BOOLEAN DEFAULT false,
    source VARCHAR(255) NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT true,
    data_quality VARCHAR(32) NOT NULL DEFAULT 'LIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lightning_obs_time ON lightning_observations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lightning_obs_geo ON lightning_observations(latitude, longitude);

-- 6. NOWCAST PREDICTIONS (+15m, +30m, +45m, +60m)
CREATE TABLE IF NOT EXISTS nowcast_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generated_at TIMESTAMPTZ NOT NULL,
    valid_time TIMESTAMPTZ NOT NULL,
    horizon VARCHAR(16) NOT NULL, -- +15m, +30m, +45m, +60m
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    thunderstorm_probability INT NOT NULL,
    lightning_probability INT NOT NULL,
    expected_rain_rate_mmh NUMERIC(6, 2),
    expected_wind_gust_kmh NUMERIC(6, 2),
    risk_level VARCHAR(64) NOT NULL, -- STAGE_I_NORMAL, STAGE_II_WATCH, STAGE_III_ALERT, STAGE_IV_WARNING
    predicted_movement_direction NUMERIC(5, 1),
    predicted_movement_speed NUMERIC(6, 2),
    model_name VARCHAR(128) NOT NULL,
    is_prototype BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_nowcast_pred UNIQUE (generated_at, horizon, latitude, longitude, model_name)
);

CREATE INDEX IF NOT EXISTS idx_nowcast_time ON nowcast_predictions(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_nowcast_geo ON nowcast_predictions(latitude, longitude);

-- 7. WEATHER ALERTS (IMD NOWCAST ADVISORIES)
CREATE TABLE IF NOT EXISTS weather_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issued_at TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    station_code VARCHAR(64),
    headline TEXT NOT NULL,
    alert_stage VARCHAR(64) NOT NULL,
    stage_color VARCHAR(32) NOT NULL,
    recommended_action TEXT,
    dispatched_to TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_time ON weather_alerts(issued_at DESC);

-- ============================================================================
-- 8. USER ACTIVITIES & AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,                                 -- User / Auth UID (nullable for guest/anonymous sessions)
    session_id TEXT,                              -- Browser session identifier
    activity_type VARCHAR(64) NOT NULL,           -- e.g., 'STATION_VIEW', 'PDF_EXPORT', 'RADAR_MODE_TOGGLE', 'THEME_CHANGE'
    activity_category VARCHAR(64) DEFAULT 'GENERAL', -- 'NAVIGATION', 'TELEMETRY', 'EXPORT', 'MAP_INTERACTION', 'CONFIG'
    description TEXT,                             -- Human-readable description of the user action
    station_code VARCHAR(64),                     -- Selected meteorological station code (e.g. 'VECC', 'VIDP')
    latitude NUMERIC(8, 4),                       -- Associated coordinates if applicable
    longitude NUMERIC(8, 4),
    metadata JSONB DEFAULT '{}'::jsonb,           -- Arbitrary key-value payload (filters, state diffs, timestamps)
    ip_address INET,                              -- Client IP address (optional)
    user_agent TEXT,                              -- Client browser user agent
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_activities_time ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_session ON user_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_station ON user_activities(station_code);
CREATE INDEX IF NOT EXISTS idx_user_activities_meta ON user_activities USING GIN (metadata);

-- Row-Level Security (RLS) policies for Supabase
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert of user activity logs"
    ON user_activities
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow read access to user activities"
    ON user_activities
    FOR SELECT
    USING (true);
