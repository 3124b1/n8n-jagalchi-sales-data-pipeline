// KPI4는 '월 단위' 집계이므로 기간도 월 단위로 만든다.
// 스케줄 실행(production) = 지난달 전체 + 이번 달 1일~오늘 (매일 두 달치를 재집계 → upsert로 덮어씀)
// 에디터 수동 실행 = BACKFILL_START ~ BACKFILL_END 를 월 단위로 쪼개서 전체 백필
const BACKFILL_START = '2025-01-01';
const BACKFILL_END   = ''; // 비우면 오늘까지

const fmt = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
const today = fmt(new Date());

if ($execution.mode === 'production') {
  const [y, m] = today.split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const lastDay = new Date(Date.UTC(py, pm, 0, 12)).getUTCDate();
  const mm = String(pm).padStart(2, '0');
  return [
    { json: { start_date: `${py}-${mm}-01`, end_date: `${py}-${mm}-${String(lastDay).padStart(2, '0')}` } },
    { json: { start_date: today.slice(0, 7) + '-01', end_date: today } }
  ];
}

// 월 단위 청크 생성 — 서버 시간대 영향이 없도록 전부 UTC 정오 기준으로 계산
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
