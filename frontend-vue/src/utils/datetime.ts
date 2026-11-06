export function fmtDateTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  const s = String(ts);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) {
    const [, yyyy, mm, dd, hh, mi] = m;
    return `${dd}.${mm}.${yyyy}   ${hh}:${mi}`;
  }
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}   ${hh}:${mi}`;
}
