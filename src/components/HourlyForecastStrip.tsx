import React from 'react';
import { HourlyForecastItem } from '../types/weather';
import { WeatherIcon } from './WeatherIcon';
import { Clock } from 'lucide-react';

interface HourlyForecastStripProps {
  hourly: HourlyForecastItem[];
  isCleanLight: boolean;
  isSage?: boolean;
  summaryText?: string;
}

export const HourlyForecastStrip: React.FC<HourlyForecastStripProps> = ({
  hourly,
  isCleanLight,
  isSage = false,
  summaryText,
}) => {
  if (!hourly || hourly.length === 0) return null;

  return (
    <div
      className={`rounded-2xl backdrop-blur-xl transition-all p-4 sm:p-5 shadow-lg border ${
        isSage
          ? 'bg-[#E2E2DB]/90 border-[#9AAEA3]/70 text-[#59705B] shadow-[#59705B]/5'
          : isCleanLight
          ? 'bg-white/75 border-sky-200/80 text-slate-800 shadow-sky-900/5'
          : 'bg-[#0f1f38]/60 border-white/10 text-slate-100 shadow-black/30'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between pb-3 mb-2 border-b ${
          isSage ? 'border-[#9AAEA3]/40' : 'border-white/5'
        }`}
      >
        <div className="flex items-center space-x-2 text-xs uppercase tracking-wider font-semibold font-mono">
          <Clock
            className={`w-3.5 h-3.5 ${
              isSage ? 'text-[#59705B]' : isCleanLight ? 'text-sky-600' : 'text-sky-400'
            }`}
          />
          <span
            className={
              isSage
                ? 'text-[#59705B] font-extrabold'
                : isCleanLight
                ? 'text-slate-700'
                : 'text-slate-300'
            }
          >
            HOURLY NOWCAST OUTLOOK
          </span>
        </div>
        {summaryText && (
          <span
            className={`text-[11px] truncate max-w-[280px] sm:max-w-md ${
              isSage ? 'text-[#59705B]/70' : isCleanLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {summaryText}
          </span>
        )}
      </div>

      {/* Horizontal Carousel */}
      <div className="flex items-center space-x-3 sm:space-x-5 overflow-x-auto pb-2 pt-1 custom-scrollbar">
        {hourly.map((item, index) => {
          const isNow = index === 0;
          return (
            <div
              key={item.time || index}
              className={`flex flex-col items-center justify-between py-2 px-3 rounded-xl min-w-[62px] sm:min-w-[70px] shrink-0 transition-colors ${
                isNow
                  ? isSage
                    ? 'bg-[#59705B] border border-[#BBBB9A] text-[#E2E2DB] shadow-md'
                    : isCleanLight
                    ? 'bg-sky-100/70 border border-sky-300/80 text-slate-900'
                    : 'bg-sky-500/20 border border-sky-400/40 text-white'
                  : isSage
                  ? 'hover:bg-[#9AAEA3]/20 border border-transparent'
                  : 'hover:bg-white/5'
              }`}
            >
              {/* Hour Label */}
              <span
                className={`text-xs font-mono font-medium ${
                  isNow
                    ? isSage
                      ? 'font-bold text-[#E2E2DB]'
                      : 'font-bold text-sky-600 dark:text-sky-300'
                    : isSage
                    ? 'text-[#59705B]/80 font-bold'
                    : isCleanLight
                    ? 'text-slate-600'
                    : 'text-slate-300'
                }`}
              >
                {item.hourLabel}
              </span>

              {/* Weather Icon */}
              <div className="my-2.5 flex flex-col items-center">
                <WeatherIcon code={item.weatherCode} isDay={item.isDay} className="w-6 h-6" />
                {item.pop > 10 ? (
                  <span
                    className={`text-[10px] font-mono font-bold mt-1 tabular-nums ${
                      isNow && isSage
                        ? 'text-[#BBBB9A]'
                        : isSage
                        ? 'text-[#59705B]'
                        : 'text-sky-400'
                    }`}
                  >
                    {item.pop}%
                  </span>
                ) : (
                  <span className="text-[10px] text-transparent mt-1 select-none">
                    0%
                  </span>
                )}
              </div>

              {/* Temperature */}
              <span
                className={`text-sm font-semibold tabular-nums ${
                  isNow && isSage
                    ? 'text-[#E2E2DB] font-extrabold'
                    : isSage
                    ? 'text-[#59705B]'
                    : isCleanLight
                    ? 'text-slate-900'
                    : 'text-white'
                }`}
              >
                {Math.round(item.temp)}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
