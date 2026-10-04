import React from 'react';
import {
  CurrentTelemetry,
  DailyForecastItem,
  SunMoonInfo,
  AirQualityInfo,
} from '../types/weather';
import {
  Compass,
  Sun,
  Sunrise,
  Sunset,
  Eye,
  Gauge,
  Thermometer,
  Droplets,
  CloudRain,
  Moon,
  ShieldAlert,
} from 'lucide-react';

interface BentoTelemetryGridProps {
  current: CurrentTelemetry;
  todayDaily?: DailyForecastItem;
  sunMoon?: SunMoonInfo;
  airQuality?: AirQualityInfo;
  isCleanLight: boolean;
  isSage?: boolean;
}

export const BentoTelemetryGrid: React.FC<BentoTelemetryGridProps> = ({
  current,
  todayDaily,
  sunMoon,
  airQuality,
  isCleanLight,
  isSage = false,
}) => {
  const cardBaseStyle = `rounded-2xl backdrop-blur-xl transition-all p-4 sm:p-5 shadow-lg border flex flex-col justify-between select-none ${
    isSage
      ? 'bg-[#E2E2DB]/90 border-[#9AAEA3]/70 text-[#59705B] shadow-[#59705B]/5'
      : isCleanLight
      ? 'bg-white/75 border-sky-200/80 text-slate-800 shadow-sky-900/5'
      : 'bg-[#0f1f38]/60 border-white/10 text-slate-100 shadow-black/30'
  }`;

  const headerStyle = `flex items-center space-x-2 text-[11px] font-mono uppercase tracking-wider font-extrabold ${
    isSage ? 'text-[#59705B]' : isCleanLight ? 'text-slate-500' : 'text-slate-400'
  }`;

  // Air Quality default if not loaded
  const aqi = airQuality || {
    aqi: 45,
    category: 'Good',
    pm25: 12.4,
    pm10: 24.1,
    primaryPollutant: 'PM2.5',
  };

  // Sun and Moon default if not loaded
  const sm = sunMoon || {
    sunrise: '05:42 AM',
    sunset: '06:18 PM',
    civilDawn: '05:18 AM',
    civilDusk: '06:42 PM',
    daylightDuration: '12h 36m',
    sunProgress: 65,
    isDay: true,
    moonPhase: 'Waxing Gibbous',
    moonIlluminationPercent: 78,
  };

  const uvMax = todayDaily?.uvIndexMax ?? 6;
  const uvCategory = uvMax >= 11 ? 'Extreme' : uvMax >= 8 ? 'Very High' : uvMax >= 6 ? 'High' : uvMax >= 3 ? 'Moderate' : 'Low';

  // Pressure in inHg calculation: 1 hPa = 0.02953 inHg
  const inHg = (current.surfacePressure * 0.02953).toFixed(2);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. UV Index Card */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Sun className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-amber-400'}`} />
            <span>UV INDEX</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
              {Math.round(uvMax)}
            </div>
            <div className={`text-xs font-semibold mt-0.5 ${isSage ? 'text-[#59705B]/85' : 'text-amber-500'}`}>
              {uvCategory}
            </div>
          </div>
        </div>

        {/* UV Bar */}
        <div className="mt-4">
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSage ? 'bg-[#9AAEA3]/30' : 'bg-black/20 dark:bg-white/10'}`}>
            <div
              className={`h-full rounded-full ${
                isSage
                  ? 'bg-gradient-to-r from-[#9AAEA3] via-[#BBBB9A] to-[#59705B]'
                  : 'bg-gradient-to-r from-emerald-400 via-amber-400 to-purple-500'
              }`}
              style={{ width: `${Math.min(100, (uvMax / 12) * 100)}%` }}
            />
          </div>
          <div className={`text-[10px] mt-2 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
            {uvMax >= 6 ? 'Sun protection required during peak hours' : 'Low danger for the average person'}
          </div>
        </div>
      </div>

      {/* 2. Wind & Direction (Compass Widget) */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Compass className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-sky-400'}`} />
            <span>WIND & GUSTS</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
                {current.windSpeed}
                <span className={`text-xs font-normal ml-1 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>km/h</span>
              </div>
              <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
                Gusts {current.windGusts} km/h
              </div>
            </div>

            {/* Circular Compass graphic */}
            <div className={`relative w-12 h-12 rounded-full border flex items-center justify-center ${
              isSage ? 'border-[#59705B]/40 bg-[#9AAEA3]/15' : 'border-sky-400/40 bg-black/10'
            }`}>
              <span className={`absolute top-0.5 text-[8px] font-mono font-bold ${isSage ? 'text-[#59705B]' : 'text-slate-400'}`}>N</span>
              <span className={`absolute right-0.5 text-[8px] font-mono font-bold ${isSage ? 'text-[#59705B]' : 'text-slate-400'}`}>E</span>
              <span className={`absolute bottom-0.5 text-[8px] font-mono font-bold ${isSage ? 'text-[#59705B]' : 'text-slate-400'}`}>S</span>
              <span className={`absolute left-0.5 text-[8px] font-mono font-bold ${isSage ? 'text-[#59705B]' : 'text-slate-400'}`}>W</span>
              {/* Needle */}
              <div
                className={`w-1 h-7 rounded-full shadow-sm transition-transform duration-500 ${
                  isSage ? 'bg-[#59705B]' : 'bg-sky-400'
                }`}
                style={{ transform: `rotate(${current.windDirection}deg)` }}
              />
            </div>
          </div>
        </div>

        <div className={`mt-3 text-[10px] font-mono ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
          Direction: <strong className={isSage ? 'text-[#59705B]' : isCleanLight ? 'text-slate-700' : 'text-slate-200'}>{current.windDirection}° {current.windDirectionCardinal}</strong>
        </div>
      </div>

      {/* 3. Sunrise & Sunset Solar Arc */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Sunrise className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-amber-400'}`} />
            <span>SUNRISE & SUNSET</span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-bold font-mono">
              {sm.sunset}
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              Sunrise: {sm.sunrise}
            </div>
          </div>
        </div>

        {/* Solar Progress Bar */}
        <div className="mt-3">
          <div className={`h-1.5 w-full rounded-full relative overflow-hidden ${isSage ? 'bg-[#9AAEA3]/30' : 'bg-black/20 dark:bg-white/10'}`}>
            <div
              className={`h-full rounded-full ${
                isSage
                  ? 'bg-gradient-to-r from-[#9AAEA3] via-[#BBBB9A] to-[#59705B]'
                  : 'bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500'
              }`}
              style={{ width: `${sm.sunProgress}%` }}
            />
          </div>
          <div className={`flex justify-between items-center text-[10px] mt-2 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
            <span>Daylight: {sm.daylightDuration}</span>
            <span>{sm.isDay ? 'Sun is up' : 'Night'}</span>
          </div>
        </div>
      </div>

      {/* 4. Precipitation & Rain Rate */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <CloudRain className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-blue-400'}`} />
            <span>PRECIPITATION</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
              {current.rainRate}
              <span className={`text-xs font-normal ml-1 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>mm/h</span>
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              24h Total: {current.accum24h} mm
            </div>
          </div>
        </div>

        <div className={`mt-3 text-[10px] ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
          {current.rainRate > 15
            ? 'Intense monsoonal downpour in progress'
            : current.rainRate > 2
            ? 'Moderate steady rainfall'
            : current.rainRate > 0
            ? 'Light convective drizzle'
            : 'No rain recorded in past hour'}
        </div>
      </div>

      {/* 5. Feels Like (Apparent Temperature) */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Thermometer className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-rose-400'}`} />
            <span>FEELS LIKE</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
              {current.heatIndex}°
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              Actual: {current.temperature}°
            </div>
          </div>
        </div>

        <div className={`mt-3 text-[10px] ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
          {current.heatIndex > current.temperature
            ? `Humidity is making it feel ${Math.round(current.heatIndex - current.temperature)}° warmer`
            : 'Wind is cooling surface temperatures'}
        </div>
      </div>

      {/* 6. Humidity & Dew Point */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Droplets className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-cyan-400'}`} />
            <span>HUMIDITY</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
              {current.relativeHumidity}
              <span className={`text-xs font-normal ml-1 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>%</span>
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              Dew point: {current.dewPoint}°
            </div>
          </div>
        </div>

        {/* Humidity gauge bar */}
        <div className="mt-3">
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSage ? 'bg-[#9AAEA3]/30' : 'bg-black/20 dark:bg-white/10'}`}>
            <div
              className={`h-full rounded-full ${isSage ? 'bg-[#59705B]' : 'bg-cyan-400'}`}
              style={{ width: `${current.relativeHumidity}%` }}
            />
          </div>
          <div className={`text-[10px] mt-2 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
            The dew point is {current.dewPoint}° right now
          </div>
        </div>
      </div>

      {/* 7. Visibility */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Eye className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-sky-400'}`} />
            <span>VISIBILITY</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
              {(current.visibility / 1000).toFixed(1)}
              <span className={`text-xs font-normal ml-1 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>km</span>
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              {current.visibility >= 8000 ? 'Clear horizon' : 'Atmospheric haze / mist'}
            </div>
          </div>
        </div>

        <div className={`mt-3 text-[10px] ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
          {current.visibility >= 8000
            ? 'Optimal meteorological viewing conditions'
            : 'Precipitation or moisture particles reducing visibility'}
        </div>
      </div>

      {/* 8. Barometric Pressure */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Gauge className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-indigo-400'}`} />
            <span>PRESSURE</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
              {Math.round(current.surfacePressure)}
              <span className={`text-xs font-normal ml-1 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>hPa</span>
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              {inHg} inHg
            </div>
          </div>
        </div>

        <div className={`mt-3 text-[10px] flex items-center justify-between ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
          <span>Trend:</span>
          <span className={`font-mono font-bold ${isSage ? 'text-[#59705B]' : 'text-sky-400'}`}>
            {current.pressureTrend < 0 ? '▼ Falling' : '▲ Rising'} ({Math.abs(current.pressureTrend)} hPa)
          </span>
        </div>
      </div>

      {/* 9. Air Quality Index (AQI) */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <ShieldAlert className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-emerald-400'}`} />
            <span>AIR QUALITY</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
              {aqi.aqi}
            </div>
            <div className={`text-xs font-bold mt-0.5 ${
              isSage
                ? 'text-[#59705B]'
                : aqi.aqi <= 50 ? 'text-emerald-400' : aqi.aqi <= 100 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {aqi.category}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSage ? 'bg-[#9AAEA3]/30' : 'bg-black/20 dark:bg-white/10'}`}>
            <div
              className={`h-full rounded-full ${
                isSage
                  ? 'bg-[#59705B]'
                  : aqi.aqi <= 50 ? 'bg-emerald-400' : aqi.aqi <= 100 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (aqi.aqi / 200) * 100)}%` }}
            />
          </div>
          <div className={`text-[10px] mt-2 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
            Primary pollutant: {aqi.primaryPollutant}
          </div>
        </div>
      </div>

      {/* 10. Lunar Phase */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Moon className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-indigo-300'}`} />
            <span>MOON PHASE</span>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-xl font-bold">
              {sm.moonPhase}
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              Illumination: {sm.moonIlluminationPercent}%
            </div>
          </div>
        </div>

        <div className={`mt-3 flex items-center justify-between text-[10px] ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
          <span>Civil Dawn: {sm.civilDawn}</span>
          <span>Dusk: {sm.civilDusk}</span>
        </div>
      </div>

      {/* 11. Convective CAPE & Storm Instability */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <ShieldAlert className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-amber-400'}`} />
            <span>CONVECTIVE CAPE</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
              {current.cape}
              <span className={`text-xs font-normal ml-1 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>J/kg</span>
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              Lifted Index: {current.liftedIndex}
            </div>
          </div>
        </div>

        <div className={`mt-3 text-[10px] ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
          {current.cape >= 2000
            ? 'Extreme instability · High severe thunderstorm potential'
            : current.cape >= 1000
            ? 'Moderate atmospheric instability'
            : 'Stable boundary atmospheric conditions'}
        </div>
      </div>

      {/* 12. Doppler Radar Reflectivity Peak */}
      <div className={cardBaseStyle}>
        <div>
          <div className={headerStyle}>
            <Gauge className={`w-3.5 h-3.5 ${isSage ? 'text-[#59705B]' : 'text-rose-400'}`} />
            <span>RADAR REFLECTIVITY</span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${isSage ? 'text-[#59705B]' : 'text-sky-400'}`}>
              {current.peakReflectivity}
              <span className={`text-xs font-normal ml-1 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>dBZ</span>
            </div>
            <div className={`text-xs mt-0.5 ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
              Marshall-Palmer Z-R
            </div>
          </div>
        </div>

        <div className={`mt-3 text-[10px] ${isSage ? 'text-[#59705B]/70' : 'text-slate-400'}`}>
          {current.peakReflectivity >= 50
            ? 'Severe convective hail core echo'
            : current.peakReflectivity >= 35
            ? 'Heavy monsoonal rain signature'
            : 'Light to moderate precipitation echo'}
        </div>
      </div>
    </div>
  );
};
