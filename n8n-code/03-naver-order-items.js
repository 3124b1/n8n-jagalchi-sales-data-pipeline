// ===== 네이버: 칼럼 선택 + 행 필터 + 상품명 전처리 (최종) =====
const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

const normDT = (v) => {
  if (v == null || v === '') return '';
  if (typeof v === 'number' && v > 20000) {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 19).replace('T', ' ');
  }
  const s = String(v).trim();
  const m = s.match(/(\d{4})[.\-\/\s]+(\d{1,2})[.\-\/\s]+(\d{1,2})/);
  if (m) {
    const time = (s.match(/\d{1,2}:\d{2}(:\d{2})?/) || [''])[0];
    return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0') + (time ? ' ' + time : '');
  }
  return s;
};

const clean = (s) => String(s == null ? '' : s)
  .replace(/[A-Za-z]/g, '')
  .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
  .replace(/[,.]/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const prodValue = (optRaw) => {
  const m = String(optRaw == null ? '' : optRaw).match(/제품명\s*[:=]\s*([^,\/|]+)/);
  return m ? clean(m[1]) : '';
};
const afterLastColon = (optRaw) => {
  const s = String(optRaw == null ? '' : optRaw);
  const i = s.lastIndexOf(':');
  return i >= 0 ? clean(s.slice(i + 1)) : '';
};

// 하드코딩 매핑 (특수 상품 예외)
const HARDCODE = [
  { test: /김스낵 간식 선물세트\s*\(\s*8입\s*\)/, name: '김스낵-혼합 8입' }
];

// 건어물 어종 키워드 — 신규 어종 출시 시 여기에 단어만 추가 (긴 이름 먼저)
const DRIED = ['버터오징어', '숏다리', '쥐포', '아귀', '오징어'];

const nameOf = (nameRaw, optRaw) => {
  for (const h of HARDCODE) { if (h.test.test(nameRaw)) return h.name; }
  const hasSet = nameRaw.includes('세트');
  let n = null;
  if (nameRaw.includes('김')) {
    if (hasSet) { const t = afterLastColon(optRaw); if (t) n = '김스낵-' + t; }
    else { const v = prodValue(optRaw); if (v) n = '김스낵-' + v; }
  }
  if (!n && nameRaw.includes('건어물')) {
    if (hasSet) { const t = afterLastColon(optRaw); if (t) n = '건어물-' + t; }
    else { const v = prodValue(optRaw); if (v) n = '건어물-' + v; }
  }
  // 건어물 키워드 폴백
  if (!n && !nameRaw.includes('세트')) {
    for (const k of DRIED) { if (nameRaw.includes(k)) { n = '건어물-' + k; break; } }
  }
  if (!n) n = clean(nameRaw);
  return n.replace(/선물세트/g, '').replace(/\s{2,}/g, ' ').replace(/[\s-]+$/, '').trim();
};

const out = [];
for (const item of $input.all()) {
  const r = item.json;
  const pon = String(r['상품주문번호'] == null ? '' : r['상품주문번호']).trim();
  if (!pon) continue;

  const claim = String(r['클레임상태'] == null ? '' : r['클레임상태']).trim();
  if (claim === '취소철회') continue;
  if (String(r['주문상태'] == null ? '' : r['주문상태']).trim() !== '구매확정') continue;

  const nameRaw = String(r['상품명'] == null ? '' : r['상품명']);
  const optRaw = String(r['옵션정보'] == null ? '' : r['옵션정보']);

  out.push({ json: {
    '상품주문번호': pon,
    '주문일시': normDT(r['주문일시']),
    '주문상태': String(r['주문상태'] == null ? '' : r['주문상태']).trim(),
    '클레임상태': claim,
    '상품명': nameOf(nameRaw, optRaw),
    '옵션정보': optRaw.trim(),
    '수량': num(r['수량'])
  } });
}

out.sort((a, b) => a.json['주문일시'] < b.json['주문일시'] ? -1 : a.json['주문일시'] > b.json['주문일시'] ? 1 : 0);
return out;
