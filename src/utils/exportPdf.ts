import { jsPDF } from 'jspdf';
import { CityWeatherData } from '../types/weather';

/**
 * Generates and downloads an official AstraCast Doppler Radar
 * Meteorological Nowcast Bulletin as a multi-page/single-page PDF document.
 */
export function exportNowcastBulletinPdf(
  weatherData: CityWeatherData,
  aiBulletin?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const { station, current, severity, nowcast, stormCells, lightningStrikes, radarScanMeta } = weatherData;

  // Helper: Draw horizontal line
  const drawDivider = (currentY: number, color = 180) => {
    doc.setDrawColor(color);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
  };

  // Helper: Section Header Box
  const drawSectionHeader = (title: string, currentY: number) => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.4);
    doc.rect(margin, currentY, contentWidth, 6, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(title.toUpperCase(), margin + 3, currentY + 4.3);
    return currentY + 8.5;
  };

  // 1. TOP HEADER BANNER
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('INDIA METEOROLOGICAL DEPARTMENT / NATIONAL NOWCAST CENTRE', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `ASTRACAST DOPPLER WEATHER RADAR (DWR) NOWCAST BULLETIN - ${station.radarStationCode.toUpperCase()}`,
    margin + 4,
    y + 11.5
  );

  const docDateStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  doc.setFontSize(7);
  doc.text(`ISSUED: ${docDateStr}`, pageWidth - margin - 4, y + 11.5, { align: 'right' });

  y += 19;

  // 2. STATION & METADATA BAR
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 11, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`STATION: ${station.name.toUpperCase()}, ${station.state.toUpperCase()}`, margin + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `RADAR CODE: ${station.radarStationCode} | SYNOP ID: ${station.synopId} | COORDS: ${station.lat.toFixed(4)}°N, ${station.lng.toFixed(4)}°E | ELEV: ${station.elevationM}M`,
    margin + 3,
    y + 8.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`SURVEILLANCE RANGE: 250 KM`, pageWidth - margin - 3, y + 4.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`CYCLE: 06Z OPERATIONAL`, pageWidth - margin - 3, y + 8.5, { align: 'right' });

  y += 13.5;

  // 3. SEVERITY & ADVISORY ALERT BOX
  const alertColorRgb: Record<string, [number, number, number]> = {
    red: [185, 28, 28],
    orange: [194, 65, 12],
    yellow: [161, 98, 7],
    emerald: [21, 128, 61],
  };
  const activeAlertColor = alertColorRgb[severity.stageColor] || [15, 23, 42];

  doc.setDrawColor(...activeAlertColor);
  doc.setLineWidth(1.2);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 15, 'FD');

  doc.setFillColor(...activeAlertColor);
  doc.rect(margin, y, 4, 15, 'F'); // Left color accent bar

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...activeAlertColor);
  doc.text(`${severity.stageName} - ${severity.alertTitle.toUpperCase()}`, margin + 7, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `COMPOSITE CONVECTIVE INDEX: ${severity.compositeScore.toFixed(0)}/100 | THREAT MATRIX -> WIND: ${severity.windThreat} | LIGHTNING: ${severity.lightningThreat} | PRECIP: ${severity.precipThreat}`,
    margin + 7,
    y + 10.5
  );

  y += 18;

  // 4. SURFACE TELEMETRY & ATMOSPHERIC SOUNDING MATRIX (Two Columns)
  y = drawSectionHeader('1. Surface Telemetry & Atmospheric Sounding Matrix', y);

  const colWidth = (contentWidth - 4) / 2;
  const rowHeight = 4.8;
  const metricsLeft: [string, string][] = [
    ['Temperature', `${current.temperature.toFixed(1)} °C`],
    ['Relative Humidity', `${current.relativeHumidity.toFixed(0)} %`],
    ['Dew Point Temp', `${current.dewPoint.toFixed(1)} °C`],
    ['Heat Index', `${current.heatIndex.toFixed(1)} °C`],
    ['Atmospheric Pressure', `${current.surfacePressure.toFixed(1)} hPa`],
    ['Pressure Trend (3h)', `${current.pressureTrend > 0 ? '+' : ''}${current.pressureTrend.toFixed(1)} hPa`],
    ['Surface Precipitation', `${current.precipitation.toFixed(1)} mm`],
  ];

  const metricsRight: [string, string][] = [
    ['Wind Velocity', `${current.windSpeed.toFixed(1)} km/h (${current.windDirectionCardinal} - ${current.windDirection}°)`],
    ['Max Wind Gusts', `${current.windGusts.toFixed(1)} km/h`],
    ['Precipitation Rate', `${current.rainRate.toFixed(1)} mm/h`],
    ['24h Acc. Rain Total', `${current.accum24h.toFixed(1)} mm`],
    ['CAPE Index (Sounding)', `${current.cape.toFixed(0)} J/kg`],
    ['Lifted Convective Index', `${current.liftedIndex.toFixed(1)}`],
    ['Peak Core Reflectivity', `${current.peakReflectivity.toFixed(1)} dBZ (Calculated)`],
  ];

  const tableTopY = y;
  // Left Column Table
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  metricsLeft.forEach((row, i) => {
    const curRowY = tableTopY + i * rowHeight;
    doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255);
    doc.rect(margin, curRowY, colWidth, rowHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], margin + 2.5, curRowY + 3.4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], margin + colWidth - 2.5, curRowY + 3.4, { align: 'right' });
  });

  // Right Column Table
  metricsRight.forEach((row, i) => {
    const curRowY = tableTopY + i * rowHeight;
    const startX = margin + colWidth + 4;
    doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255);
    doc.rect(startX, curRowY, colWidth, rowHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], startX + 2.5, curRowY + 3.4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], startX + colWidth - 2.5, curRowY + 3.4, { align: 'right' });
  });

  y = tableTopY + metricsLeft.length * rowHeight + 5;

  // 5. 0 - 3 HOUR NOWCAST EVOLUTION TIMELINE
  y = drawSectionHeader('2. Convective Nowcast Trajectory (0 - 3 Hour Projection)', y);

  const nowcastCols = [
    { header: 'WINDOW', width: 26 },
    { header: 'ALERT STAGE', width: 34 },
    { header: 'RAIN RATE', width: 28 },
    { header: 'WIND GUST', width: 28 },
    { header: 'LIGHTNING PROB', width: 34 },
    { header: 'CAPE', width: contentWidth - 150 },
  ];

  // Header Row
  doc.setFillColor(226, 232, 240); // slate-200
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);

  let curX = margin;
  nowcastCols.forEach((col) => {
    doc.text(col.header, curX + 2, y + 3.5);
    curX += col.width;
  });

  y += 5;

  // Data Rows
  const nRowHeight = 4.8;
  nowcast.slice(0, 6).forEach((step, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, nRowHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    let cellX = margin;
    // Window
    doc.setFont('helvetica', 'bold');
    doc.text(step.timeOffset, cellX + 2, y + 3.4);
    cellX += nowcastCols[0].width;

    // Stage
    doc.setFont('helvetica', 'normal');
    doc.text(step.stageAlert.replace('STAGE_', '').replace('_', ' '), cellX + 2, y + 3.4);
    cellX += nowcastCols[1].width;

    // Rain Rate
    doc.text(`${step.forecastRain.toFixed(1)} mm/h`, cellX + 2, y + 3.4);
    cellX += nowcastCols[2].width;

    // Wind Gust
    doc.text(`${step.windGust.toFixed(0)} km/h`, cellX + 2, y + 3.4);
    cellX += nowcastCols[3].width;

    // Lightning
    doc.text(`${step.lightningProb.toFixed(0)} %`, cellX + 2, y + 3.4);
    cellX += nowcastCols[4].width;

    // CAPE
    doc.text(`${step.cape.toFixed(0)} J/kg`, cellX + 2, y + 3.4);

    y += nRowHeight;
  });

  y += 5;

  // 6. TRACKED DOPPLER STORM CELLS & LIGHTNING TELEMETRY
  y = drawSectionHeader('3. Active Doppler Storm Cells & Lightning Flash Density', y);

  if (stormCells.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No active convective radar storm cells detected within the 250km surveillance range.', margin + 3, y + 4);
    y += 7;
  } else {
    const stormCols = [
      { header: 'CELL ID', width: 22 },
      { header: 'NAME / DESIGNATION', width: 44 },
      { header: 'DISTANCE', width: 26 },
      { header: 'HEADING', width: 24 },
      { header: 'SPEED', width: 24 },
      { header: 'CORE REFLECTIVITY', width: contentWidth - 140 },
    ];

    // Header
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);

    let sX = margin;
    stormCols.forEach((col) => {
      doc.text(col.header, sX + 2, y + 3.5);
      sX += col.width;
    });
    y += 5;

    // Rows
    const sRowHeight = 4.5;
    stormCells.slice(0, 5).forEach((cell, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, contentWidth, sRowHeight, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      let cX = margin;
      doc.text(cell.id, cX + 2, y + 3.2);
      cX += stormCols[0].width;

      doc.setFont('helvetica', 'normal');
      doc.text(cell.name, cX + 2, y + 3.2);
      cX += stormCols[1].width;

      doc.text(`${cell.distanceKm.toFixed(1)} km`, cX + 2, y + 3.2);
      cX += stormCols[2].width;

      doc.text(`${cell.heading.toFixed(0)}°`, cX + 2, y + 3.2);
      cX += stormCols[3].width;

      doc.text(`${cell.speedKmH.toFixed(0)} km/h`, cX + 2, y + 3.2);
      cX += stormCols[4].width;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cell.dbz >= 55 ? 185 : cell.dbz >= 45 ? 194 : 30, cell.dbz >= 55 ? 28 : cell.dbz >= 45 ? 65 : 41, cell.dbz >= 55 ? 28 : cell.dbz >= 45 ? 12 : 59);
      doc.text(`${cell.dbz.toFixed(1)} dBZ ${cell.statusTag || ''}`, cX + 2, y + 3.2);

      y += sRowHeight;
    });
    y += 3;
  }

  // Lightning note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Total Lightning Detection (Last 15m): ${lightningStrikes.length} strikes recorded. Active threat classification: ${severity.lightningThreat}.`,
    margin + 1,
    y + 2
  );
  y += 6;

  // 7. SYNOPTIC AI BULLETIN / METEOROLOGIST ASSESSMENT
  if (aiBulletin && y < pageHeight - 35) {
    y = drawSectionHeader('4. Meteorological Synoptic Narrative & Aviation Advisory', y);

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);

    const maxNarrativeHeight = pageHeight - y - 18;
    const splitNarrative = doc.splitTextToSize(aiBulletin.replace(/[#*`_]/g, ''), contentWidth - 6);
    const linesToPrint = splitNarrative.slice(0, Math.floor((maxNarrativeHeight - 4) / 3.4));

    const boxHeight = Math.max(10, linesToPrint.length * 3.4 + 4);
    doc.rect(margin, y, contentWidth, boxHeight, 'FD');

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(linesToPrint, margin + 3, y + 3.8);

    y += boxHeight + 4;
  }

  // 8. FOOTER BAR
  const footerY = pageHeight - margin + 2;
  drawDivider(footerY - 3, 203);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `RADAR SPEC: ELEV ${radarScanMeta.elevation} | FREQ ${radarScanMeta.freq} | PRF ${radarScanMeta.prf} | PULSE ${radarScanMeta.pulse} | AZ_RES ${radarScanMeta.azimuthRes}`,
    margin,
    footerY
  );

  doc.setFont('helvetica', 'bold');
  doc.text(
    `ASTRACAST NOWCAST SYSTEM - OFFICIAL DOCUMENT - PAGE 1 OF 1`,
    pageWidth - margin,
    footerY,
    { align: 'right' }
  );

  // Trigger browser download directly
  const dateStamp = new Date().toISOString().substring(0, 10);
  const fileName = `AstraCast_${station.radarStationCode}_${dateStamp}.pdf`;
  doc.save(fileName);
}
