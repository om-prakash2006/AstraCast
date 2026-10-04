import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Snowflake,
  Moon,
  CloudMoon,
} from 'lucide-react';

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  className?: string;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  code,
  isDay = true,
  className = 'w-5 h-5',
  size,
}) => {
  // WMO weather code mapping with 9-green palette
  if (code === 0) {
    return isDay ? (
      <Sun className={`${className} text-[#74C476]`} size={size} />
    ) : (
      <Moon className={`${className} text-[#A1D99B]`} size={size} />
    );
  }

  if (code === 1 || code === 2) {
    return isDay ? (
      <CloudSun className={`${className} text-[#74C476]`} size={size} />
    ) : (
      <CloudMoon className={`${className} text-[#A1D99B]`} size={size} />
    );
  }

  if (code === 3) {
    return <Cloud className={`${className} text-[#C7E9C0]`} size={size} />;
  }

  if (code === 45 || code === 48) {
    return <CloudFog className={`${className} text-[#A1D99B]`} size={size} />;
  }

  if (code >= 51 && code <= 57) {
    return <CloudDrizzle className={`${className} text-[#74C476]`} size={size} />;
  }

  if (code >= 61 && code <= 67) {
    return <CloudRain className={`${className} text-[#41AB5D]`} size={size} />;
  }

  if (code >= 71 && code <= 77) {
    return <Snowflake className={`${className} text-[#E5F5E0]`} size={size} />;
  }

  if (code >= 80 && code <= 82) {
    return <CloudRain className={`${className} text-[#238B45]`} size={size} />;
  }

  if (code >= 95) {
    return <CloudLightning className={`${className} text-[#A1D99B]`} size={size} />;
  }

  return isDay ? (
    <Sun className={`${className} text-[#74C476]`} size={size} />
  ) : (
    <Moon className={`${className} text-[#A1D99B]`} size={size} />
  );
};
