/**
 * Data Quality classification for SIH26072 Data Ingestion Architecture
 */
export type DataQualityTier = 'LIVE' | 'RECENT' | 'HISTORICAL' | 'DEMO' | 'UNAVAILABLE';

export interface DataQualityMetadata {
  isLive: boolean;
  dataQuality: DataQualityTier;
  source: string;
  sourceType: 'API_OPEN_METEO' | 'API_CUSTOM' | 'MOSDAC_INSAT3DR' | 'IMD_DWR' | 'RAINVIEWER_RADAR' | 'SYNTHETIC_SIMULATION' | 'HISTORICAL_CASE_STUDY' | 'UNCONFIGURED';
  lastObservedTimestamp: string | null; // ISO string
  latencySeconds?: number;
  confidenceScore?: number; // 0 - 100
  notes?: string;
}
