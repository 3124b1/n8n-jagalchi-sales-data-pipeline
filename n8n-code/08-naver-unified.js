// 네이버 고객리포트(월 단위, 성별연령) → 04_통합 스키마로 정규화
// 규칙:
//  - '날짜'(2025-06-01~2025-06-30) → data_month '2025-06'
//  - '고객분류'(여성 30대) → gender / age_group 분리, '알수없음'은 둘 다 알수없음
//  - '전체합산' 행은 제외(이중집계 방지)
//  - buyers_count=결제고객수, order_amount=판매금액(총), visitors_count=방문고객수, order_count는 네이버에 없어 공란
const rows = $input.all();
const num = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[,\s%원]/g, ''));
  return isNaN(n) ? 0 : n;
};

const now = new Date().toISOString();
const out = [];
for (const it of rows) {
  const d = it.json;
  const cat = String(d['고객분류'] || '').trim();
  if (!cat || cat === '전체합산') continue;

  const month = String(d['날짜'] || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) continue;

  let gender = '알수없음', age = '알수없음';
  if (cat !== '알수없음') {
    const m = cat.match(/^(남성|여성)\s*(.+)$/);
    if (m) { gender = m[1]; age = m[2].trim(); }
    else { age = cat; }
  }

  out.push({ json: {
    row_key: [month, 'naver', gender, age].join('_'),
    data_month: month,
    channel: 'naver',
    gender: gender,
    age_group: age,
    visitors_count: num(d['방문고객수']),
    buyers_count: num(d['결제고객수']),
    order_count: '',
    order_amount: num(d['판매금액(총)']),
    collected_at: now
  } });
}
out.sort((a, b) => (a.json.row_key > b.json.row_key ? 1 : -1));
return out;
