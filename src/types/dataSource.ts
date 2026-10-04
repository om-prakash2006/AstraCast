/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Data Source & Quality Type Definitions
 */

export type DataQuality = 'LIVE' | 'RECENT' | 'HISTORICAL' | 'DEMO' | 'UNAVAILABLE';

export type SourceType = 'WEATHER' | 'SATELLITE' | 'RADAR' | 'LIGHTNING' | 'NOWCAST_ENGINE';

export type IngestionMode = 'REAL_DATA' | 'DEMO_DATA';

export interface DataSourceStatus {
  id: string;
  name: string;
  sourceType: SourceType;
  configured: boolean;
  status: 'CONNECTED' | 'AUTHENTICATION_REQUIRED' | 'NOT_CONFIGURED' | 'ERROR' | 'FALLBACK_DEMO';
  statusLabel: string;
  endpointUrl?: string;
  lastUpdated: string | null;
  dataQuality: DataQuality;
  notes: string;
  requiresAuth: boolean;
  isRestrictedGovFeed: boolean;
}

export interface IngestionMetadata {
  ingestedAt: string;
  observationTime: string;
  sourceName: string;
  isLive: boolean;
  dataQuality: DataQuality;
  latencySeconds?: number;
  rawPayloadSnippet?: string;
}
