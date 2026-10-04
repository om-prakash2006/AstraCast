/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Data Quality Badge Component
 */

import React from 'react';
import { DataQuality } from '../types/dataSource';

interface DataQualityBadgeProps {
  quality: DataQuality;
  isLive?: boolean;
  sourceLabel?: string;
  size?: 'sm' | 'md';
}

export const DataQualityBadge: React.FC<DataQualityBadgeProps> = ({
  quality,
  isLive = false,
  sourceLabel,
  size = 'md',
}) => {
  let badgeStyle = 'bg-slate-500/20 text-slate-300 border-slate-500/40';
  let dotColor = 'bg-slate-400';
  let text: string = quality;

  switch (quality) {
    case 'LIVE':
      badgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]';
      dotColor = 'bg-emerald-400 animate-pulse';
      text = 'LIVE TELEMETRY';
      break;
    case 'RECENT':
      badgeStyle = 'bg-sky-500/15 text-sky-300 border-sky-500/40';
      dotColor = 'bg-sky-400';
      text = 'RECENT';
      break;
    case 'HISTORICAL':
      badgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      dotColor = 'bg-amber-400';
      text = 'HISTORICAL ARCHIVE';
      break;
    case 'DEMO':
      badgeStyle = 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.25)]';
      dotColor = 'bg-purple-400';
      text = 'DEMO / SYNTHETIC';
      break;
    case 'UNAVAILABLE':
      badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
      dotColor = 'bg-rose-400';
      text = 'UNAVAILABLE';
      break;
  }

  const isSmall = size === 'sm';

  return (
    <span
      title={sourceLabel ? `Source: ${sourceLabel} (${quality})` : `Data Quality: ${quality}`}
      className={`inline-flex items-center space-x-1.5 font-mono uppercase font-extrabold rounded-lg border ${
        isSmall ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
      } ${badgeStyle}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      <span>{text}</span>
    </span>
  );
};
