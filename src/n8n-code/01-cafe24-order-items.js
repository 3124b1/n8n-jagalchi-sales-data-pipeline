// ===== 카페24: 주문 수집 + 전처리 (최종) =====
const pages = $('주문 조회1').all();
let orders = [];
for (const p of pages) {
  const arr = Array.isArray(p.json.orders) ? p.json.orders : [];
  orders = orders.concat(arr);
}

const num = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

// 규칙 1: 이모지, 영문, ',', '.' 제거
const clean = (s) => String(s == null ? '' : s)
  .replace(/[A-Za-z]/g, '')
  .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
  .replace(/[,.]/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();
const stripEmojiOnly = (s) => String(s == null ? '' : s)
  .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const optVal = (opt, key) => {
  const m = String(opt == null ? '' : opt).match(new RegExp(key + '[^=]*=\\s*([^,]+)'));
  return m ? m[1].trim() : '';
};
const stripQty = (v) => clean(String(v).replace(/\([^()]*\)/g, ' ')).replace(/\s*1개$/, '').trim();
const setVal = (opt) => {
  let s = String(opt == null ? '' : opt);
  let i = s.lastIndexOf('='); if (i < 0) return '';
  s = s.slice(i + 1);
  i = s.lastIndexOf(':'); if (i >= 0) s = s.slice(i + 1);
  return clean(s);
};

// 하드코딩 매핑 (특수 상품 예외)
const HARDCODE = [
  { test: /김스낵 간식 선물세트\s*\(\s*8입\s*\)/, name: '김스낵-혼합 8입' }
];

// 건어물 어종 키워드 — 신규 어종 출시 시 여기에 단어만 추가
// ⚠ 순서 중요: 긴 이름 먼저 (버터오징어·숏다리가 오징어보다 앞)
const DRIED = ['버터오징어', '숏다리', '쥐포', '아귀', '오징어'];

// 상품명 표준화
const nameOf = (nameRaw, optRaw) => {
  for (const h of HARDCODE) { if (h.test.test(nameRaw)) return h.name; }
  // 콜라보: {X 앞 브랜드명}-{품목}-{수량값}
  const xm = nameRaw.match(/^(.*?)\sX\s/);
  if (xm) {
    let brand = clean(xm[1]);
    if (!brand) brand = stripEmojiOnly(xm[1]);
    const item = clean(optVal(optRaw, '품목'));
    let v = stripQty(optVal(optRaw, '수량'));
    if (brand && item && v) {
      if (v.startsWith(item + ' ')) v = v.slice(item.length).trim();
      return brand + '-' + item + '-' + v;
    }
    return clean(nameRaw);
  }
  const hasSet = nameRaw.includes('세트');
  const pm = clean(optVal(optRaw, '제품명'));
  const sv = setVal(optRaw);
  let n = null;
  if (nameRaw.includes('김')) {
    if (hasSet && sv) n = '김스낵-' + sv;
    else if (!hasSet && pm) n = '김스낵-' + pm;
  }
  if (!n && nameRaw.includes('건어물')) {
    if (hasSet && sv) n = '건어물-' + sv;
    else if (!hasSet && pm) n = '건어물-' + pm;
  }
  // 건어물 키워드 폴백: 상품명에 '건어물'이 없는 단품 대응
  if (!n && !nameRaw.includes('세트')) {
    for (const k of DRIED) { if (nameRaw.includes(k)) { n = '건어물-' + k; break; } }
  }
  if (!n) n = clean(nameRaw);
  return n.replace(/선물세트/g, '').replace(/\s{2,}/g, ' ').replace(/[\s-]+$/, '').trim();
};

const rows = [];
for (const o of orders) {
  const init = o.initial_order_amount || {};
  const act = o.actual_order_amount || {};

  const totalOrder = num(init.total_amount_due)
    || (num(init.order_price_amount) + num(init.shipping_fee))
    || num(o.order_price_amount);
  const totalPaid = o.payment_amount != null ? num(o.payment_amount) : num(act.payment_amount);
  const paid = o.paid || '';

  if (paid === 'T' && totalPaid === 0) continue; // 테스트 주문 제거
  if (paid === 'F') continue;                    // 미결제 제거

  const items = Array.isArray(o.items) ? o.items : [];
  items.forEach((it, idx) => {
    const nameRaw = String(it.product_name || it.product_name_default || '');
    const optRaw = String(it.option_value || '');
    const unitPrice = num(it.product_price) + num(it.option_price);
    const qty = num(it.quantity);
    rows.push({ json: {
      '주문일': String(o.order_date || '').slice(0, 19).replace('T', ' '),
      '주문번호': o.order_id || '',
      '품목별 주문번호': it.order_item_code || ((o.order_id || '') + '-' + String(idx + 1).padStart(2, '0')),
      '총 주문금액': totalOrder,
      '총 결제금액': totalPaid,
      '주문상품명(옵션포함)': nameOf(nameRaw, optRaw),
      '수량': qty,
      '판매가': unitPrice,
      '상품별판매액': unitPrice * qty,
      '결제구분': paid
    } });
  });
}

rows.sort((a, b) => a.json['주문일'] < b.json['주문일'] ? -1 : a.json['주문일'] > b.json['주문일'] ? 1 : 0);
return rows;
