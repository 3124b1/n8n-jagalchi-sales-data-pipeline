const allItems = $input.all();

let timesArr = [];
let viewArr = [];

for (const it of allItems) {
  if (Array.isArray(it.json.times)) timesArr = it.json.times;
  if (Array.isArray(it.json.view)) viewArr = it.json.view;
}

const dateVal = $('Code').item.json.target_date;

let orderCount = 0;
let orderAmount = 0;
for (const t of timesArr) {
  orderCount += Number(t.order_count) || 0;
  orderAmount += Number(t.order_amount) || 0;
}

const visitCount = (viewArr.length > 0) ? (Number(viewArr[0].visit_count) || 0) : 0;

return [{
  json: {
    date: dateVal,
    visit_count: visitCount,
    order_count: orderCount,
    order_amount: orderAmount
  }
}];
