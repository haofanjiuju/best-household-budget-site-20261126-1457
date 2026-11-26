// Hearth & Ledger — charts drawn as plain SVG, no library.
//
// The donut is a stack of stroked circles (one per category) and the monthly
// comparison is grouped SVG bars. Both are built as strings so views can drop
// them into the page, and both degrade to an empty state when there is nothing
// to show instead of rendering a broken chart.

import { money0 } from './data.js';

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A donut of category shares. `slices` are {name, color, value} with value > 0.
// The hole carries the total, so the figure is readable even at a glance.
export function donutChart(slices, totalLabel, totalValue) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return '<p class="empty">No spending in this month yet.</p>';
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const rings = slices.map((slice) => {
    const fraction = slice.value / total;
    const length = fraction * circumference;
    const ring = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${slice.color}" `
      + `stroke-width="30" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" `
      + `stroke-dashoffset="${(-offset).toFixed(2)}" />`;
    offset += length;
    return ring;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" `
    + `aria-label="Spending by category, total ${esc(totalLabel)}">
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#ece7d9" stroke-width="30" />
    ${rings}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="15" fill="#6b7a70">Total spent</text>
    <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="21" font-weight="700" fill="#143627">${esc(totalValue)}</text>
  </svg>`;
}

export function donutLegend(slices) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return slices.map((slice) => {
    const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
    return `<div class="li"><span><span class="cat-dot" style="background:${slice.color}"></span>${esc(slice.name)}</span>`
      + `<span>${money0(slice.value)} · ${pct}%</span></div>`;
  }).join('');
}

// Grouped bars: income (green) against spending (amber) for each month.
// `months` are {label, income, spending}; values are dollars.
export function monthBars(months) {
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.spending]));
  const groups = months.map((m) => {
    const inHeight = Math.max(2, Math.round((m.income / max) * 150));
    const outHeight = Math.max(2, Math.round((m.spending / max) * 150));
    return `<div class="bar-group">
      <div class="bar-values">${money0(m.income)}<br>${money0(m.spending)}</div>
      <div class="bar-pair">
        <div class="bar in" style="height:${inHeight}px" title="Income ${money0(m.income)}"></div>
        <div class="bar out" style="height:${outHeight}px" title="Spending ${money0(m.spending)}"></div>
      </div>
      <div class="bar-label">${esc(m.label)}</div>
    </div>`;
  }).join('');
  return `<div class="bars" role="img" aria-label="Monthly income against spending, June to November 2026">${groups}</div>
  <div class="chart-key">
    <span><span class="swatch" style="background:#2e7d4f"></span>Income</span>
    <span><span class="swatch" style="background:#c77f1a"></span>Spending</span>
  </div>`;
}
