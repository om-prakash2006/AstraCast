import React from 'react';
import { AIBulletinResponse, CityWeatherData } from '../types/weather';
import { RotateCw } from 'lucide-react';

interface AIBulletinTeletypeProps {
  weatherData: CityWeatherData;
  bulletin: AIBulletinResponse | null;
  isLoading: boolean;
  onRegenerate: () => void;
  isCleanLight?: boolean;
  isSage?: boolean;
}

export const AIBulletinTeletype: React.FC<AIBulletinTeletypeProps> = ({
  weatherData,
  bulletin,
  isLoading,
  onRegenerate,
  isCleanLight = false,
  isSage = false,
}) => {
  const { severity } = weatherData;
  const isRed = severity.stageColor === 'red';

  if (isSage) {
    return (
      <div className="bg-[#E2E2DB]/90 backdrop-blur-xl border border-[#9AAEA3]/70 text-[#59705B] p-4 sm:p-5 rounded-2xl font-mono flex-1 flex flex-col justify-between select-none shadow-lg">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#9AAEA3]/40 pb-2 mb-2.5">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#59705B] shadow-[0_0_8px_rgba(89,112,91,0.6)]"></span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#59705B]">
                ACTIVE NOWCAST BULLETIN
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-[#59705B]/80">
                {bulletin ? bulletin.id : 'NWC-LIVE'}
              </span>
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                title="Re-synthesize AI Bulletin with Gemini"
                className="text-[#E2E2DB] bg-[#59705B] hover:bg-[#4a5e4c] p-1 rounded-lg border border-[#BBBB9A] disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#BBBB9A]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="py-6 text-center text-xs font-mono text-[#59705B] space-y-2">
              <div className="inline-block w-4 h-4 border-2 border-[#59705B] border-t-transparent rounded-full animate-spin"></div>
              <div className="uppercase tracking-widest text-[10px] font-bold text-[#59705B]">
                SYNTHESIZING METEOROLOGICAL NOWCAST...
              </div>
              <div className="text-[10px] text-[#59705B]/70">
                ANALYZING CAPE {weatherData.current.cape} J/KG • RADAR {weatherData.current.peakReflectivity} DBZ
              </div>
            </div>
          ) : bulletin ? (
            <div className="text-xs leading-relaxed tracking-tight text-[#59705B] uppercase font-mono space-y-2 py-1">
              <p className={`font-extrabold text-sm ${isRed ? 'text-red-700' : 'text-[#59705B]'}`}>
                {bulletin.headline}
              </p>
              <p className="text-[11px] text-[#59705B]/90 font-medium leading-normal">
                MOVEMENT: <strong className="text-[#59705B] font-extrabold">{bulletin.movement}</strong>. THREATS:{' '}
                <strong className="text-[#59705B] font-extrabold">
                  {Array.isArray(bulletin.threats) ? bulletin.threats.join(', ') : bulletin.threats}
                </strong>.
              </p>
              {bulletin.recommendedAction && (
                <p className="text-[10px] text-[#59705B] font-bold bg-[#9AAEA3]/25 p-2.5 rounded-xl border border-[#9AAEA3]/60 shadow-xs">
                  ACTION: {bulletin.recommendedAction}
                </p>
              )}
              <div className="border-t border-[#9AAEA3]/40 pt-1.5 text-[10px] text-[#59705B]/70 font-medium">
                {bulletin.source ||
                  'VERIFIED BY DUTY METEOROLOGICAL OFFICER • NOWCAST ADVISORY DESK'}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#59705B]/60 py-3">NO BULLETIN LOADED</div>
          )}
        </div>

        {/* Terminal Acknowledgment Status */}
        <div className="mt-3.5 pt-2 border-t border-[#9AAEA3]/40 flex items-center justify-between text-[10px]">
          <span className="text-[#59705B]/80 truncate max-w-[210px] font-medium">
            DISPATCHED TO: {bulletin?.dispatchedTo?.join(', ') || 'NDMA, STATE SEOC, AIRPORT ATC'}
          </span>
          <span className="bg-[#59705B] text-[#E2E2DB] border border-[#BBBB9A] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider shrink-0 shadow-xs">
            BROADCASTED
          </span>
        </div>
      </div>
    );
  }

  if (isCleanLight) {
    return (
      <div className="bg-white/80 backdrop-blur-xl border border-sky-200/90 text-slate-800 p-4 sm:p-5 rounded-2xl font-mono flex-1 flex flex-col justify-between select-none shadow-lg">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-2.5">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]"></span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-950">
                ACTIVE NOWCAST BULLETIN
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-sky-800">
                {bulletin ? bulletin.id : 'NWC-LIVE'}
              </span>
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                title="Re-synthesize AI Bulletin with Gemini"
                className="text-sky-700 hover:text-sky-950 p-1 rounded-lg border border-sky-300 hover:bg-sky-50 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="py-6 text-center text-xs font-mono text-slate-600 space-y-2">
              <div className="inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent animate-spin"></div>
              <div className="uppercase tracking-widest text-[10px] font-bold text-sky-900">
                SYNTHESIZING METEOROLOGICAL NOWCAST...
              </div>
              <div className="text-[10px] text-slate-500">
                ANALYZING CAPE {weatherData.current.cape} J/KG • RADAR {weatherData.current.peakReflectivity} DBZ
              </div>
            </div>
          ) : bulletin ? (
            <div className="text-xs leading-relaxed tracking-tight text-slate-900 uppercase font-mono space-y-2 py-1">
              <p className={`font-extrabold text-sm ${isRed ? 'text-red-600' : 'text-slate-950'}`}>
                {bulletin.headline}
              </p>
              <p className="text-[11px] text-slate-700 font-medium leading-normal">
                MOVEMENT: <strong className="text-slate-950 font-extrabold">{bulletin.movement}</strong>. THREATS:{' '}
                <strong className="text-slate-950 font-extrabold">
                  {Array.isArray(bulletin.threats) ? bulletin.threats.join(', ') : bulletin.threats}
                </strong>.
              </p>
              {bulletin.recommendedAction && (
                <p className="text-[10px] text-sky-950 font-semibold bg-sky-50/80 p-2.5 rounded-xl border border-sky-200 shadow-xs">
                  ACTION: {bulletin.recommendedAction}
                </p>
              )}
              <div className="border-t border-sky-100 pt-1.5 text-[10px] text-slate-500 font-medium">
                {bulletin.source ||
                  'VERIFIED BY DUTY METEOROLOGICAL OFFICER • NOWCAST ADVISORY DESK'}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3">NO BULLETIN LOADED</div>
          )}
        </div>

        {/* Terminal Acknowledgment Status */}
        <div className="mt-3.5 pt-2 border-t border-sky-100 flex items-center justify-between text-[10px]">
          <span className="text-slate-600 truncate max-w-[210px] font-medium">
            DISPATCHED TO: {bulletin?.dispatchedTo?.join(', ') || 'NDMA, STATE SEOC, AIRPORT ATC'}
          </span>
          <span className="bg-sky-600 text-white px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider shrink-0 shadow-xs">
            BROADCASTED
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1f38]/65 backdrop-blur-xl border border-white/10 text-slate-100 p-4 sm:p-5 rounded-2xl font-mono flex-1 flex flex-col justify-between select-none shadow-xl">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,1)]"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-200">
              ACTIVE NOWCAST BULLETIN
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-sky-200">
              {bulletin ? bulletin.id : 'NWC-LIVE'}
            </span>
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              title="Re-synthesize AI Bulletin with Gemini"
              className="text-sky-200 hover:text-white p-1 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-50 cursor-pointer transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-6 text-center text-xs font-mono text-sky-100 space-y-2">
            <div className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent animate-spin"></div>
            <div className="uppercase tracking-widest text-[10px] font-bold text-white">
              SYNTHESIZING METEOROLOGICAL NOWCAST...
            </div>
            <div className="text-[10px] text-sky-200">
              ANALYZING CAPE {weatherData.current.cape} J/KG • RADAR {weatherData.current.peakReflectivity} DBZ
            </div>
          </div>
        ) : bulletin ? (
          <div className="text-xs leading-relaxed tracking-tight text-white uppercase font-mono space-y-2 py-1">
            <p className={`font-extrabold text-sm ${isRed ? 'text-red-300' : 'text-white'}`}>
              {bulletin.headline}
            </p>
            <p className="text-[11px] text-sky-100 font-medium leading-normal">
              MOVEMENT: <strong className="text-white">{bulletin.movement}</strong>. THREATS:{' '}
              <strong className="text-white">
                {Array.isArray(bulletin.threats) ? bulletin.threats.join(', ') : bulletin.threats}
              </strong>.
            </p>
            {bulletin.recommendedAction && (
              <p className="text-[10px] text-white font-semibold bg-white/5 p-2.5 rounded-xl border border-white/10 shadow-sm">
                ACTION: {bulletin.recommendedAction}
              </p>
            )}
            <div className="border-t border-white/5 pt-1.5 text-[10px] text-sky-200 font-medium">
              {bulletin.source ||
                'VERIFIED BY DUTY METEOROLOGICAL OFFICER • NOWCAST ADVISORY DESK'}
            </div>
          </div>
        ) : (
          <div className="text-xs text-sky-200 py-3">NO BULLETIN LOADED</div>
        )}
      </div>

      {/* Terminal Acknowledgment Status */}
      <div className="mt-3.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
        <span className="text-sky-200 truncate max-w-[210px] font-medium">
          DISPATCHED TO: {bulletin?.dispatchedTo?.join(', ') || 'NDMA, STATE SEOC, AIRPORT ATC'}
        </span>
        <span className="bg-sky-500 text-white px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.5)]">
          BROADCASTED
        </span>
      </div>
    </div>
  );
};
