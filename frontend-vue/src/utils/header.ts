import { esc } from './string';
import type { PrintDocsEffective } from '@/api/settings';

export function buildHeaderHtml(printDocs: PrintDocsEffective | null | undefined): string {
  if (!printDocs || !printDocs.headerEnabled || !printDocs.headerText) return '';

  const align = printDocs.headerAlign || 'left';
  const lines = printDocs.headerText.split('\n').map(l => esc(l.trim())).filter(Boolean);
  if (lines.length === 0) return '';

  let html = `<div style="text-align:${align};margin-bottom:25px;line-height:1.4;color:#000;">`;
  lines.forEach((line, idx) => {
    const isFirst = idx === 0;
    const weight = isFirst ? 'bold' : 'normal';
    const size = isFirst ? '12pt' : '10pt';
    html += `<div style="font-weight:${weight};font-size:${size};">${line}</div>`;
  });
  html += '</div>';
  return html;
}
