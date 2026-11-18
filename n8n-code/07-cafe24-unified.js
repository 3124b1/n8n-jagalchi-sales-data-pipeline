// 카페24 KPI4 집계 결과 → 04_통합 스키마로 변환
// KPI4 집계 노드가 이미 네이버와 동일한 축(월×성별×연령대, 알수없음 합산, 13개 조합 0채움)으로 출력하므로 그대로 매핑한다.
// channel='cafe24', visitors_count는 카페24 KPI4에 없으므로 공란
const src = $('KPI4 집계 (월×연령×성별)').all();
const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

const now = new Date().toISOString();
const out = src.map((it) => {
  const d = it.json;
  return { json: {
    row_key: [d.data_month, 'cafe24', d.gender, d.age_group].join('_'),
    data_month: d.data_month,
    channel: 'cafe24',
    gender: d.gender,
    age_group: d.age_group,
    visitors_count: '',
    buyers_count: num(d.buyers_count),
    order_count: num(d.order_count),
    order_amount: num(d.order_amount),
    collected_at: now
  } };
});
out.sort((a, b) => (a.json.row_key > b.json.row_key ? 1 : -1));
return out;
