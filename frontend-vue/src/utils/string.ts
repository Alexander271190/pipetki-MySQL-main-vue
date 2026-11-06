export function esc(s: unknown): string {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

export function slugify(text: string): string {
  if (!text) return '';
  const ru: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y',
    'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
    'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  };
  let result = text.toLowerCase().split('').map(ch => ru[ch] !== undefined ? ru[ch] : ch).join('');
  result = result.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return result || 'item_' + Math.floor(Math.random() * 1000);
}

export function pluralizeType(label: string): string {
  if (!label) return '';
  const s = label.trim();
  if (!s) return '';
  if (s.endsWith('ы') || s.endsWith('и')) return s;
  if (s.endsWith('ь'))  return s.slice(0, -1) + 'и';
  if (s.endsWith('ка')) return s.slice(0, -2) + 'ки';
  if (s.endsWith('га')) return s.slice(0, -1) + 'и';
  if (s.endsWith('а'))  return s.slice(0, -1) + 'ы';
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(s)) return s + 'ы';
  return s;
}

export function normalizeSearch(s: string | null | undefined): string {
  if (!s) return '';
  const map: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i',
    'й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t',
    'у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'',
    'э':'e','ю':'yu','я':'ya',
  };
  return String(s).toLowerCase().split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('');
}
