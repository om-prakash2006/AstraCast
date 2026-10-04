/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AstraCast User Authentication & Activity Persistence Service
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppUser, UserActivityRecord, UserActivityAnalyticsItem, UserRole } from '../../types/user';

const STORAGE_KEY_USER = 'astracast_auth_user';
const STORAGE_KEY_SESSION = 'astracast_session_id';

class AuthService {
  private supabase: SupabaseClient | null = null;
  private currentUser: AppUser | null = null;
  private sessionId: string;
  private listeners: Array<(user: AppUser | null) => void> = [];
  private localActivitiesCache: UserActivityRecord[] = [];

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.initSupabase();
    this.loadPersistedUser();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'sess_server';
    let sid = sessionStorage.getItem(STORAGE_KEY_SESSION);
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem(STORAGE_KEY_SESSION, sid);
    }
    return sid;
  }

  private initSupabase() {
    const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://xplqemhiyaictydxppdq.supabase.co';
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

    if (url && anonKey) {
      try {
        this.supabase = createClient(url, anonKey);
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
      }
    }
  }

  public updateSupabaseClient(url: string, anonKey: string) {
    if (url && anonKey) {
      try {
        this.supabase = createClient(url, anonKey);
      } catch (err) {
        console.warn('Failed to reinitialize Supabase client:', err);
      }
    }
  }

  private loadPersistedUser() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch {
      this.currentUser = null;
    }
  }

  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public onAuthStateChanged(cb: (user: AppUser | null) => void): () => void {
    this.listeners.push(cb);
    cb(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }

  /**
   * Log In with Email and Password
   */
  public async signIn(email: string, password: string): Promise<{ success: boolean; user?: AppUser; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try real Supabase auth if client is active
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data.user) {
          const user: AppUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            role: (data.user.user_metadata?.role as UserRole) || 'METEOROLOGIST',
            createdAt: data.user.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          this.setUser(user);
          await this.logActivity({
            activityType: 'USER_LOGIN',
            activityCategory: 'AUTH',
            description: `Operator signed in (${user.role})`,
            metadata: { method: 'SUPABASE_AUTH', email: user.email },
          });

          return { success: true, user };
        }
      } catch (err: unknown) {
        console.warn('Supabase auth sign-in notice:', err);
      }
    }

    // 2. Local fallback / Operator Demo Credentials
    if (password.length >= 6) {
      let role: UserRole = 'METEOROLOGIST';
      let name = cleanEmail.split('@')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);

      if (cleanEmail.includes('radar')) role = 'RADAR_ANALYST';
      else if (cleanEmail.includes('dispatch') || cleanEmail.includes('alert')) role = 'DISASTER_DISPATCHER';
      else if (cleanEmail.includes('aviation')) role = 'AVIATION_CONTROLLER';

      const user: AppUser = {
        id: 'usr_' + Math.random().toString(36).substring(2, 10),
        email: cleanEmail,
        name: name || 'Station Forecaster',
        role,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isDemoAccount: !this.supabase,
      };

      this.setUser(user);
      await this.logActivity({
        activityType: 'USER_LOGIN',
        activityCategory: 'AUTH',
        description: `Operator authenticated session (${user.role})`,
        metadata: { method: 'LOCAL_OPERATOR_AUTH', email: user.email },
      });

      return { success: true, user };
    }

    return {
      success: false,
      message: 'Password must be at least 6 characters long.',
    };
  }

  /**
   * Sign Up / Register New Operator
   */
  public async signUp(
    email: string,
    password: string,
    name: string,
    role: UserRole = 'METEOROLOGIST'
  ): Promise<{ success: boolean; user?: AppUser; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: name, role },
          },
        });

        if (!error && data.user) {
          const user: AppUser = {
            id: data.user.id,
            email: cleanEmail,
            name: name || cleanEmail.split('@')[0],
            role,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          this.setUser(user);
          await this.logActivity({
            activityType: 'USER_REGISTER',
            activityCategory: 'AUTH',
            description: `New operator registered (${role})`,
            metadata: { method: 'SUPABASE_SIGNUP', role },
          });

          return { success: true, user };
        }
      } catch (err: unknown) {
        console.warn('Supabase auth sign-up notice:', err);
      }
    }

    // Local Operator Account Creation
    const user: AppUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      email: cleanEmail,
      name: name || 'Operator ' + cleanEmail.split('@')[0],
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isDemoAccount: !this.supabase,
    };

    this.setUser(user);
    await this.logActivity({
      activityType: 'USER_REGISTER',
      activityCategory: 'AUTH',
      description: `New operator account created (${role})`,
      metadata: { method: 'LOCAL_OPERATOR_SIGNUP', role },
    });

    return { success: true, user };
  }

  /**
   * Sign Out
   */
  public async signOut(): Promise<void> {
    const prevEmail = this.currentUser?.email;
    if (this.currentUser) {
      await this.logActivity({
        activityType: 'USER_LOGOUT',
        activityCategory: 'AUTH',
        description: `Operator session closed (${this.currentUser.email})`,
      });
    }

    if (this.supabase) {
      try {
        await this.supabase.auth.signOut();
      } catch {
        // ignore
      }
    }

    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
    this.notify();
    console.info(`Signed out: ${prevEmail || 'Guest'}`);
  }

  private setUser(user: AppUser) {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
    this.notify();
  }

  /**
   * Log User Activity into PostgreSQL user_activities table
   */
  public async logActivity(activity: Omit<UserActivityRecord, 'sessionId'>): Promise<void> {
    const record: UserActivityRecord = {
      ...activity,
      userId: this.currentUser?.id || null,
      sessionId: this.sessionId,
      createdAt: new Date().toISOString(),
    };

    // Keep cached locally for instant display in user history modal
    this.localActivitiesCache.unshift(record);
    if (this.localActivitiesCache.length > 50) {
      this.localActivitiesCache.pop();
    }

    // 1. Direct Supabase write if active
    if (this.supabase) {
      try {
        await this.supabase.from('user_activities').insert([
          {
            user_id: record.userId,
            session_id: record.sessionId,
            activity_type: record.activityType,
            activity_category: record.activityCategory,
            description: record.description,
            station_code: record.stationCode || null,
            latitude: record.latitude || null,
            longitude: record.longitude || null,
            metadata: record.metadata || {},
          },
        ]);
      } catch (err) {
        console.warn('Direct Supabase activity log notice:', err);
      }
    }

    // 2. Backend API proxy write (keeps backend records synchronized)
    try {
      await fetch('/api/auth/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch {
      // Non-blocking
    }
  }

  /**
   * Fetch Recent Activities for the Activity Modal
   */
  public async fetchRecentActivities(): Promise<UserActivityRecord[]> {
    // 1. Try Supabase
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('user_activities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && data && data.length > 0) {
          return data.map((d: Record<string, unknown>) => ({
            id: String(d.id),
            userId: d.user_id as string,
            sessionId: (d.session_id as string) || '',
            activityType: (d.activity_type as string) || 'GENERAL',
            activityCategory: (d.activity_category as UserActivityRecord['activityCategory']) || 'GENERAL',
            description: (d.description as string) || '',
            station_code: d.station_code as string,
            latitude: Number(d.latitude) || undefined,
            longitude: Number(d.longitude) || undefined,
            metadata: (d.metadata as Record<string, unknown>) || {},
            createdAt: (d.created_at as string) || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch activities error:', err);
      }
    }

    // 2. Try Server endpoint
    try {
      const res = await fetch('/api/auth/activities');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activities) && data.activities.length > 0) {
          return data.activities;
        }
      }
    } catch {
      // Fallback to local
    }

    return this.localActivitiesCache;
  }

  /**
   * Fetch Activity Analytics (from user_activity_analytics view)
   */
  public async fetchActivityAnalytics(): Promise<UserActivityAnalyticsItem[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('user_activity_analytics')
          .select('*')
          .limit(20);

        if (!error && Array.isArray(data)) {
          return data.map((r: Record<string, unknown>) => ({
            activityDate: String(r.activity_date || ''),
            activityType: String(r.activity_type || ''),
            activityCategory: String(r.activity_category || ''),
            stationCode: r.station_code ? String(r.station_code) : undefined,
            totalEvents: Number(r.total_events || 0),
            uniqueSessions: Number(r.unique_sessions || 0),
            uniqueUsers: Number(r.unique_users || 0),
          }));
        }
      } catch {
        // Fallback below
      }
    }

    try {
      const res = await fetch('/api/auth/analytics');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.analytics)) {
          return data.analytics;
        }
      }
    } catch {
      // ignore
    }

    // Synthesize from local activities if database view not populated yet
    const counts: Record<string, UserActivityAnalyticsItem> = {};
    for (const act of this.localActivitiesCache) {
      const key = `${act.activityType}_${act.stationCode || 'GLOBAL'}`;
      if (!counts[key]) {
        counts[key] = {
          activityDate: new Date().toISOString().split('T')[0],
          activityType: act.activityType,
          activityCategory: act.activityCategory,
          stationCode: act.stationCode,
          totalEvents: 0,
          uniqueSessions: 1,
          uniqueUsers: this.currentUser ? 1 : 0,
        };
      }
      counts[key].totalEvents++;
    }

    return Object.values(counts);
  }
}

export const authService = new AuthService();
