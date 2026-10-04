import React from 'react';
import { DailyForecastItem } from '../types/weather';
import { WeatherIcon } from './WeatherIcon';
import { Calendar } from 'lucide-react';

interface TenDayForecastCardProps {
  daily: DailyForecastItem[];
  currentTemp: number;
  isCleanLight: boolean;
  isSage?: boolean;
}

export const TenDayForecastCard: React.FC<TenDayForecastCardProps> = ({
  daily,
  currentTemp,
  isCleanLight,
  isSage = false,
}) => {
  if (!daily || daily.length === 0) return null;

  // Calculate overall min and max across all days to normalize horizontal gradient bars
  let overallMin = Infinity;
  let overallMax = -Infinity;

  daily.forEach((d) => {
    if (d.minTemp < overallMin) overallMin = d.minTemp;
    if (d.maxTemp > overallMax) overallMax = d.maxTemp;
  });

  // Safe bounds
  if (overallMax <= overallMin) {
    overallMax = overallMin + 10;
  }
  const totalRange = overallMax - overallMin;

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
        className={`flex items-center space-x-2 pb-3 mb-3 border-b text-xs uppercase tracking-wider font-semibold font-mono ${
          isSage ? 'border-[#9AAEA3]/40' : 'border-white/5'
        }`}
      >
        <Calendar
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
          10-DAY CONVECTIVE OUTLOOK
        </span>
      </div>

      {/* Daily Rows */}
      <div className="space-y-3">
        {daily.map((item, index) => {
          const isToday = index === 0;

          // Range bar position math
          const leftPercent = Math.max(
            0,
            Math.min(100, ((item.minTemp - overallMin) / totalRange) * 100)
          );
          const rightPercent = Math.max(
            0,
            Math.min(100, ((overallMax - item.maxTemp) / totalRange) * 100)
          );
          const widthPercent = Math.max(8, 100 - leftPercent - rightPercent);

          // Today's current temp indicator dot position
          const currentDotPercent = Math.max(
            0,
            Math.min(100, ((currentTemp - overallMin) / totalRange) * 100)
          );

          return (
            <div
              key={item.date || index}
              className={`flex items-center justify-between text-xs py-1 transition-colors ${
                isToday ? 'font-bold' : 'font-medium'
              }`}
            >
              {/* Day Name */}
              <div className="w-14 sm:w-16 truncate font-mono">
                <span
                  className={
                    isToday
                      ? isSage
                        ? 'text-[#59705B] font-extrabold'
                        : isCleanLight
                        ? 'text-sky-700 font-bold'
                        : 'text-sky-300 font-bold'
                      : isSage
                      ? 'text-[#59705B]/85 font-semibold'
                      : isCleanLight
                      ? 'text-slate-700'
                      : 'text-slate-300'
                  }
                >
                  {item.dayName}
                </span>
              </div>

              {/* Weather Icon & POP */}
              <div className="flex items-center space-x-1.5 w-16 sm:w-20">
                <WeatherIcon code={item.weatherCode} className="w-5 h-5 shrink-0" />
                {item.popMax > 15 ? (
                  <span
                    className={`text-[10px] font-mono font-bold tabular-nums ${
                      isSage ? 'text-[#59705B]' : 'text-sky-400'
                    }`}
                  >
                    {item.popMax}%
                  </span>
                ) : (
                  <span className="text-[10px] text-transparent select-none">
                    --
                  </span>
                )}
              </div>

              {/* Min Temp */}
              <div
                className={`w-7 text-right font-mono tabular-nums ${
                  isSage ? 'text-[#59705B]/65' : 'text-slate-400'
                }`}
              >
                {item.minTemp}°
              </div>

              {/* Horizontal Temperature Range Bar (Signature Range Pill) */}
              <div
                className={`flex-1 mx-3 sm:mx-4 relative h-1.5 rounded-full overflow-visible ${
                  isSage ? 'bg-[#9AAEA3]/30' : 'bg-black/20 dark:bg-white/10'
                }`}
              >
                {/* Colored temperature range gradient */}
                <div
                  className={`absolute top-0 bottom-0 rounded-full shadow-sm ${
                    isSage
                      ? 'bg-gradient-to-r from-[#9AAEA3] via-[#BBBB9A] to-[#59705B]'
                      : 'bg-gradient-to-r from-sky-400 via-amber-400 to-rose-400'
                  }`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                />

                {/* For Today: Current Temperature Indicator Dot */}
                {isToday && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 ${
                      isSage
                        ? 'bg-[#59705B] border-2 border-[#E2E2DB] shadow-[0_0_8px_rgba(89,112,91,0.8)]'
                        : 'bg-white border border-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                    }`}
                    style={{ left: `calc(${currentDotPercent}% - 5px)` }}
                    title={`Current: ${currentTemp}°`}
                  />
                )}
              </div>

              {/* Max Temp */}
              <div
                className={`w-7 text-left font-mono font-semibold tabular-nums ${
                  isSage ? 'text-[#59705B]' : ''
                }`}
              >
                {item.maxTemp}°
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
