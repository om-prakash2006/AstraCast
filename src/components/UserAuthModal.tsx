/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AstraCast User Authentication, Account Portal & Extended Details Modal
 */

import React, { useState } from 'react';
import {
  User,
  Shield,
  LogOut,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  MapPin,
  FileText,
  Radio,
  Sparkles,
} from 'lucide-react';
import { AppUser, UserRole } from '../types/user';
import { authService } from '../services/auth/authService';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  currentStationName?: string;
  isSage?: boolean;
  isCleanLight?: boolean;
  onUserChange?: (user: AppUser | null) => void;
}

type ModalTab = 'ACCOUNT' | 'OPERATOR_DETAILS';

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentStationName = 'Kolkata DWR',
  isSage = false,
  isCleanLight = false,
  onUserChange,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('ACCOUNT');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('METEOROLOGIST');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Theming classes
  const modalBg = isSage
    ? 'bg-[#E2E2DB] text-[#59705B] border-[#9AAEA3]'
    : isCleanLight
    ? 'bg-white text-slate-900 border-sky-200'
    : 'bg-[#091528] text-white border-white/15';

  const cardBg = isSage
    ? 'bg-[#BBBB9A]/20 border-[#9AAEA3]/50'
    : isCleanLight
    ? 'bg-slate-50 border-slate-200'
    : 'bg-white/5 border-white/10';

  const inputClass = isSage
    ? 'bg-white/80 border-[#9AAEA3] text-[#59705B] placeholder:text-[#59705B]/50'
    : isCleanLight
    ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
    : 'bg-black/30 border-white/15 text-white placeholder:text-slate-500';

  const btnPrimary = isSage
    ? 'bg-[#59705B] hover:bg-[#485b4a] text-[#E2E2DB] shadow-md'
    : isCleanLight
    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md'
    : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-md';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await authService.signIn(email, password);
    setIsSubmitting(false);

    if (res.success && res.user) {
      setSuccessMessage(`Welcome back, ${res.user.name}!`);
      onUserChange?.(res.user);
      setTimeout(() => {
        setActiveTab('OPERATOR_DETAILS');
      }, 600);
    } else {
      setErrorMessage(res.message || 'Login failed. Check your credentials.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter your full name or call sign.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await authService.signUp(
      email,
      password,
      name.trim(),
      role,
    );
    setIsSubmitting(false);

    if (res.success && res.user) {
      setSuccessMessage(`Account created successfully! Logged in as ${res.user.name}.`);
      onUserChange?.(res.user);
      setTimeout(() => {
        setActiveTab('OPERATOR_DETAILS');
      }, 600);
    } else {
      setErrorMessage(res.message || 'Account registration failed.');
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    onUserChange?.(null);
    setActiveTab('ACCOUNT');
    setSuccessMessage('Successfully signed out.');
  };

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-5 sm:p-7 flex flex-col space-y-5 ${modalBg}`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-current/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs ${
              isSage
                ? 'bg-[#59705B] text-[#E2E2DB] border-[#BBBB9A]'
                : isCleanLight
                ? 'bg-sky-100 text-sky-700 border-sky-300'
                : 'bg-sky-500/20 text-sky-400 border-sky-400/30'
            }`}>
              {currentUser ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  {currentUser ? currentUser.name : 'Operator Authentication'}
                </h2>
                {currentUser && (
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs opacity-75 font-mono">
                {currentUser ? `${currentUser.role.replace(/_/g, ' ')} • ${currentUser.email}` : 'Sign in to access extended telemetry & unlocked operator features'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-current/10 hover:bg-current/20 cursor-pointer transition-all"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Only Account / Profile and More Details) */}
        {currentUser && (
          <div className="flex items-center space-x-2 border-b border-current/10 pb-2 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('ACCOUNT')}
              className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'ACCOUNT'
                  ? isSage
                    ? 'bg-[#59705B] text-[#E2E2DB] font-bold shadow-xs'
                    : isCleanLight
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'bg-white/15 text-white font-bold shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Session</span>
            </button>

            <button
              onClick={() => setActiveTab('OPERATOR_DETAILS')}
              className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'OPERATOR_DETAILS'
                  ? isSage
                    ? 'bg-[#59705B] text-[#E2E2DB] font-bold shadow-xs'
                    : isCleanLight
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 font-bold shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>More Details (Unlocked)</span>
            </button>
          </div>
        )}

        {/* Notifications */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: ACCOUNT (LOGIN / REGISTER / LOGOUT)                                */}
        {/* ========================================================================= */}
        {activeTab === 'ACCOUNT' && (
          <div className="space-y-4">
            {currentUser ? (
              // Authenticated Profile State
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl border ${cardBg} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-extrabold text-lg">
                        {currentUser.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base">{currentUser.name}</h3>
                        <p className="text-xs opacity-75 font-mono">{currentUser.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        {currentUser.role.replace(/_/g, ' ')}
                      </span>
                      <button
                        onClick={handleLogout}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/30 text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-current/10 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-current/5">
                      <span className="opacity-60 block text-[10px]">CURRENT STATION</span>
                      <span className="font-bold truncate block">{currentStationName}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-current/5">
                      <span className="opacity-60 block text-[10px]">SESSION ID</span>
                      <span className="font-bold truncate block">{authService.getSessionId()}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-current/5">
                      <span className="opacity-60 block text-[10px]">SIGN-IN TIME</span>
                      <span className="font-bold truncate block">
                        {new Date(currentUser.lastLoginAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick link to More Details */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-current/5 border border-current/10 text-xs">
                  <div>
                    <h4 className="font-bold flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Extended Meteorological Diagnostics</span>
                    </h4>
                    <p className="opacity-75 text-[11px]">
                      View polar radar metrics, kinematic storm tracking, and official dispatch stamps.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('OPERATOR_DETAILS')}
                    className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${btnPrimary}`}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ) : (
              // Unauthenticated Login / Register Form
              <div className="space-y-4">
                {/* Clean Segmented Tab Toggle for Sign In vs New Account */}
                <div className="p-1 rounded-2xl bg-current/5 border border-current/10 flex items-center">
                  <button
                    type="button"
                    onClick={() => setAuthMode('LOGIN')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                      authMode === 'LOGIN'
                        ? isSage
                          ? 'bg-[#59705B] text-[#E2E2DB] shadow-xs'
                          : isCleanLight
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-sky-500 text-slate-950 shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('SIGNUP')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                      authMode === 'SIGNUP'
                        ? isSage
                          ? 'bg-[#59705B] text-[#E2E2DB] shadow-xs'
                          : isCleanLight
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-sky-500 text-slate-950 shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={authMode === 'LOGIN' ? handleLogin : handleSignUp} className="space-y-3 font-mono text-xs">
                  {authMode === 'SIGNUP' && (
                    <div className="space-y-1">
                      <label className="font-bold opacity-80 block">Full Name / Operator Call Sign</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. A. Sharma"
                        className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-bold opacity-80 block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@weather.gov.in"
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold opacity-80 block">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
                    />
                  </div>

                  {authMode === 'SIGNUP' && (
                    <div className="space-y-1">
                      <label className="font-bold opacity-80 block">Operational Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs cursor-pointer ${inputClass}`}
                      >
                        <option value="METEOROLOGIST">Senior Meteorologist</option>
                        <option value="RADAR_ANALYST">Doppler Radar Specialist</option>
                        <option value="DISASTER_DISPATCHER">Emergency & Disaster Dispatcher</option>
                        <option value="AVIATION_CONTROLLER">Aviation Weather Controller</option>
                        <option value="FIELD_OBSERVER">AWS Surface Field Observer</option>
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-2.5 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center space-x-2 mt-4 ${btnPrimary}`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Session...</span>
                      </>
                    ) : authMode === 'LOGIN' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In as Operator</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Operator Account</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MORE DETAILS (EXTENDED OPERATOR TELEMETRY)                          */}
        {/* ========================================================================= */}
        {activeTab === 'OPERATOR_DETAILS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Authenticated Operator Telemetry</span>
                </h3>
                <p className="text-[11px] opacity-75 font-mono">
                  Additional meteorological diagnostics and dispatcher verification unlocked for {currentUser?.name}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                LEVEL 3 CLEARANCE
              </span>
            </div>

            {/* Diagnostic Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className={`p-4 rounded-2xl border ${cardBg} space-y-2`}>
                <div className="flex items-center space-x-2 text-sky-400 font-bold">
                  <Radio className="w-4 h-4" />
                  <span>Doppler Polar Metrics</span>
                </div>
                <ul className="space-y-1 text-[11px] opacity-80">
                  <li>• Pulse Repetition: <strong>600 Hz (High Sensitivity)</strong></li>
                  <li>• Elevation Angle: <strong>0.5° Base Reflectivity Sweep</strong></li>
                  <li>• Azimuth Resolution: <strong>0.5° Beam Width</strong></li>
                  <li>• Max Doppler Velocity: <strong>±48 m/s (Nyquist Unambiguous)</strong></li>
                </ul>
              </div>

              <div className={`p-4 rounded-2xl border ${cardBg} space-y-2`}>
                <div className="flex items-center space-x-2 text-amber-400 font-bold">
                  <MapPin className="w-4 h-4" />
                  <span>Kinematic Displacement</span>
                </div>
                <ul className="space-y-1 text-[11px] opacity-80">
                  <li>• Convective Cell Drift: <strong>240° WSW @ 44 km/h</strong></li>
                  <li>• Steering Flow Level: <strong>700 hPa - 500 hPa Layer</strong></li>
                  <li>• Storm Area Coverage: <strong>185 km² Severe Core</strong></li>
                  <li>• Echo Top Height: <strong>14.2 km (Tropopause Penetration)</strong></li>
                </ul>
              </div>
            </div>

            {/* Dispatcher Actions */}
            <div className={`p-4 rounded-2xl border ${cardBg} space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs">Official Dispatcher Stamp for Bulletins</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">AUTHENTICATED ✓</span>
              </div>
              <p className="text-xs opacity-75 leading-relaxed font-sans">
                When you export an official PDF nowcast bulletin while signed in, your name (<strong className="font-mono">{currentUser?.name}</strong>), operator role (<strong className="font-mono">{currentUser?.role}</strong>), and cryptographic session verification hash are embedded directly into the export document.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
