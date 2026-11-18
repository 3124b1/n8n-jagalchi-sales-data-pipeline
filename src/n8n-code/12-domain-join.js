const dates = $('날짜 목록').all();
const doms = $('유입 도메인 조회').all();
const domSales = $('유입 도메인 매출 조회').all();

const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const firstArray = (obj) => {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) { const a = firstArray(obj[k]); if (a) return a; }
  }
  return null;
};
const domainKey = (r) => r.domain || r.url || r.name || '(직접유입/기타)';

const rows = [];
dates.forEach((d, i) => {
  const date = d.json.date;
  const list = firstArray(doms[i] && doms[i].json) || [];
  const salesList = firstArray(domSales[i] && domSales[i].json) || [];
  const salesBy = {};
  for (const s of salesList) salesBy[domainKey(s)] = s;

  if (!list.length) {
    rows.push({ json: {
      '키': date + '|-', '날짜': date, '유입경로': '', '방문수': '', '구매건수': '', '매출': ''
    } });
    return;
  }
  for (const r of list) {
    const k = domainKey(r);
    const s = salesBy[k] || {};
    const visits = num(r.visit_count);
    const purchases = s.purchase_count != null ? num(s.purchase_count) : (s.order_count != null ? num(s.order_count) : '');
    rows.push({ json: {
      '키': date + '|' + k,
      '날짜': date,
      '유입경로': k,
      '방문수': visits,
      '구매건수': purchases,
      '매출': s.order_amount != null ? Math.round(num(s.order_amount)) : ''
    } });
  }
});
return rows;;
