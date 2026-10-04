/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * User Authentication & Activity Telemetry Types
 */

export type UserRole =
  | 'METEOROLOGIST'
  | 'RADAR_ANALYST'
  | 'DISASTER_DISPATCHER'
  | 'FIELD_OBSERVER'
  | 'AVIATION_CONTROLLER'
  | 'GUEST_OPERATOR';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  stationCode?: string;
  createdAt: string;
  lastLoginAt: string;
  isDemoAccount?: boolean;
}

export interface UserActivityRecord {
  id?: string;
  userId?: string | null;
  sessionId: string;
  activityType: string;
  activityCategory: 'NAVIGATION' | 'TELEMETRY' | 'EXPORT' | 'MAP_INTERACTION' | 'CONFIG' | 'AUTH';
  description: string;
  stationCode?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
}

export interface UserActivityAnalyticsItem {
  activityDate: string;
  activityType: string;
  activityCategory: string;
  stationCode?: string;
  totalEvents: number;
  uniqueSessions: number;
  uniqueUsers: number;
}
