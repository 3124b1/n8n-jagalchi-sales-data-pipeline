// 공개 자료 검토 시 중복 삽입된 앞부분을 제거함. 다른 동작은 유지.
const BACKFILL_START = '2025-06-01';
const BACKFILL_END   = '';

const fmt = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
const today = fmt(new Date());

const isEditorRun = ['manual', 'test'].includes(String($execution.mode));

if (!isEditorRun) {
  const weekAgo = fmt(new Date(Date.now() - 6 * 86400000));
  return [{ json: { start_date: weekAgo, end_date: today } }];
}

const toUTC = (str) => { const [y, m, d] = str.split('-').map(Number); return Date.UTC(y, m - 1, d, 12); };
const toStr = (ms) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86400000;

const endMs = toUTC(BACKFILL_END || today);
let sMs = toUTC(BACKFILL_START);
const out = [];
while (sMs <= endMs) {
  const d = new Date(sMs);
  const monthEndMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12);
  const chunkEndMs = Math.min(monthEndMs, endMs);
  out.push({ json: { start_date: toStr(sMs), end_date: toStr(chunkEndMs) } });
  sMs = chunkEndMs + DAY;
}
return out;
