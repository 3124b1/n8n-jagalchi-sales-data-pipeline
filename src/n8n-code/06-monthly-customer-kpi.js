// 주문 × 회원정보 조인 → 월 × 성별 × 연령대 집계 (KPI 4)
// 네이버 리포트와 동일한 축을 사용한다:
//  - row_key = 월_성별_연령대 (예: 2026-06_여성_40대)
//  - 연령대: 10대 이하 / 20대 / 30대 / 40대 / 50대 / 60대 이상 / 알수없음
//  - 비회원·정보없음(생년월일/성별 미확인)은 모두 '알수없음' 단일 버킷으로 합산
//  - 매월 13개 조합(남성6+여성6+알수없음1)을 구매가 없어도 0으로 모두 생성
// PII(생년월일 등)는 시트에 저장하지 않고 여기서 버킷팅 후 폐기한다.

// 1) 회원정보 맵 구성
const privPages = $input.all();
const memberMap = {};
for (const p of privPages) {
  const arr = (p.json && Array.isArray(p.json.customersprivacy)) ? p.json.customersprivacy : [];
  for (const c of arr) {
    if (c.member_id) memberMap[String(c.member_id)] = { birthday: c.birthday || '', gender: c.gender || '' };
  }
}

// 2) 주문 로드
const pages = $('주문 조회').all();
let orders = [];
for (const p of pages) {
  const arr = Array.isArray(p.json.orders) ? p.json.orders : [];
  orders = orders.concat(arr);
}

const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const genderKo = (g) => {
  const s = String(g || '').trim().toUpperCase();
  if (s === 'M' || s === 'MALE' || s === '남' || s === '남성') return '남성';
  if (s === 'F' || s === 'FEMALE' || s === '여' || s === '여성') return '여성';
  return '알수없음';
};
const ageBucket = (birthday, orderDate) => {
  const by = Number(String(birthday).slice(0, 4));
  const oy = Number(String(orderDate).slice(0, 4));
  if (!by || !oy || by < 1900) return '알수없음';
  const age = oy - by; // 연 나이 기준(가정) — 관리자 통계와 오차 가능
  if (age < 20) return '10대 이하';
  if (age >= 60) return '60대 이상';
  return Math.floor(age / 10) * 10 + '대';
};

// 3) 집계: key = 월|성별|연령
const agg = {};
const seenOrder = new Set();
const monthsWithData = new Set();
for (const o of orders) {
  const oid = o.order_id || '';
  if (oid && seenOrder.has(oid)) continue; // 페이지 중복 방어
  if (oid) seenOrder.add(oid);

  const act = o.actual_order_amount || {};
  const totalPaid = o.payment_amount != null ? num(o.payment_amount) : num(act.payment_amount);
  const paid = o.paid || '';
  if (paid === 'T' && totalPaid === 0) continue;
  if (paid === 'F') continue;

  const month = String(o.order_date || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) continue;
  monthsWithData.add(month);

  const mid = o.member_id ? String(o.member_id) : '';
  let gender = '알수없음', age = '알수없음';
  if (mid && memberMap[mid]) {
    gender = genderKo(memberMap[mid].gender);
    age = ageBucket(memberMap[mid].birthday, o.order_date);
  }
  // 네이버와 동일 축 유지: 성별·연령 중 하나라도 모르면 '알수없음' 단일 버킷으로
  if (gender === '알수없음' || age === '알수없음') { gender = '알수없음'; age = '알수없음'; }

  // 구매자 중복 제거 키: 회원ID > 이메일 > 이름+연락처 > 주문번호
  const b = o.buyer || {};
  const buyerKey = mid
    || b.email || o.member_email || o.buyer_email
    || ((b.name || o.buyer_name) ? (b.name || o.buyer_name) + '|' + (b.cellphone || b.phone || o.buyer_cellphone || '') : oid);

  const key = month + '|' + gender + '|' + age;
  if (!agg[key]) agg[key] = { buyers: new Set(), orderCnt: 0, amount: 0 };
  agg[key].buyers.add(buyerKey);
  agg[key].orderCnt += 1;
  agg[key].amount += totalPaid;
}

// 4) 대상 월 목록: 기간 계산 노드의 월 단위 청크 기준 (주문이 없는 달도 0으로 생성)
const months = new Set(monthsWithData);
for (const it of $('기간 계산').all()) {
  const m = String(it.json.start_date || '').slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(m)) months.add(m);
}

// 5) 매월 13개 조합을 모두 출력
const AGES = ['10대 이하', '20대', '30대', '40대', '50대', '60대 이상'];
const COMBOS = [];
for (const g of ['남성', '여성']) for (const a of AGES) COMBOS.push([g, a]);
COMBOS.push(['알수없음', '알수없음']);

const now = new Date().toISOString();
const rows = [];
for (const m of [...months].sort()) {
  for (const [g, a] of COMBOS) {
    const v = agg[m + '|' + g + '|' + a];
    rows.push({ json: {
      row_key: [m, g, a].join('_'),
      data_month: m,
      age_group: a,
      gender: g,
      buyers_count: v ? v.buyers.size : 0,
      order_count: v ? v.orderCnt : 0,
      order_amount: v ? v.amount : 0,
      collected_at: now
    } });
  }
}
return rows;
