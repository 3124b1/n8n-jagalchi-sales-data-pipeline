// 주문에서 유효 주문만 남기고, 회원 주문의 member_id 목록을 100개 단위로 묶는다.
// (customersprivacy는 member_id를 콤마로 최대 100개까지 동시 조회 가능)
const pages = $('주문 조회').all();
let orders = [];
for (const p of pages) {
  const arr = Array.isArray(p.json.orders) ? p.json.orders : [];
  orders = orders.concat(arr);
}

const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const memberIds = new Set();

for (const o of orders) {
  const act = o.actual_order_amount || {};
  const totalPaid = o.payment_amount != null ? num(o.payment_amount) : num(act.payment_amount);
  const paid = o.paid || '';
  // 전처리: 테스트 주문(T + 0원) / 미결제(F) 제거
  if (paid === 'T' && totalPaid === 0) continue;
  if (paid === 'F') continue;
  if (o.member_id) memberIds.add(String(o.member_id));
}

const ids = [...memberIds];
const out = [];
for (let i = 0; i < ids.length; i += 100) {
  out.push({ json: { member_ids: ids.slice(i, i + 100).join(',') } });
}
// 회원 주문이 하나도 없어도 다음 노드가 실행되도록 더미 1건 유지
if (out.length === 0) out.push({ json: { member_ids: '' } });
return out;
