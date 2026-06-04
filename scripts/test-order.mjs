/**
 * Test order script — creates a real order in Clover POS using atomic_order
 * Run with: node scripts/test-order.mjs
 */
import 'dotenv/config';

const BASE_URL = process.env.CLOVER_API_BASE_URL;
const TOKEN    = process.env.CLOVER_API_TOKEN;
const MID      = process.env.CLOVER_MERCHANT_ID;
const ORDER_TYPE_ID     = process.env.CLOVER_ORDER_TYPE_ID;
const EMPLOYEE_ID       = process.env.CLOVER_EMPLOYEE_ID;
const PRINTER_DEVICE_ID = process.env.CLOVER_PRINTER_DEVICE_ID;

const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function clover(method, path, body) {
  const url = `${BASE_URL}/v3/merchants/${MID}${path}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`Clover ${method} ${path} → ${res.status}: ${text}`);
  return JSON.parse(text);
}

const TEST_ITEMS = [
  { cloverId: '2MAXX5A4XKTQ6', name: 'Chicken Wings (8)', price: 999,  note: 'Style: Extra Crispy | Flavor: Hot | Dipping: Ranch' },
  { cloverId: 'SBV0AMYG7B7X6', name: 'Bruschetta',        price: 899,  note: '' },
];

const CUSTOMER  = { firstName: 'TEST', lastName: 'ORDER', phone: '7025550000' };
const REFERENCE = 'ORD-TEST-001';

async function main() {
  console.log('Creating test order in Clover POS (atomic_order)...\n');

  const lineItems = TEST_ITEMS.map((item) => {
    const li = { name: item.name, price: item.price, unitQty: 1000, item: { id: item.cloverId } };
    if (item.note) li.modifications = [{ name: item.note, amount: 0 }];
    return li;
  });

  const note = `ONLINE ORDER casadepizzawingslv.com | Ref: ${REFERENCE} | Cliente: ${CUSTOMER.firstName} ${CUSTOMER.lastName} | Tel: ${CUSTOMER.phone}`;
  const subtotal = TEST_ITEMS.reduce((s, i) => s + i.price, 0);
  const fee      = Math.round(subtotal * 0.03);
  const total    = subtotal + fee;

  const result = await clover('POST', '/atomic_order/orders', {
    orderCart: {
      lineItems,
      note,
      orderType: { id: ORDER_TYPE_ID },
      employee:  { id: EMPLOYEE_ID },
      total,
    },
  });

  const orderId = result.id;
  console.log('Order created: ' + orderId);
  console.log('View: https://www.clover.com/dashboard/m/' + MID + '/orders/' + orderId + '\n');

  console.log('Sending to printer...');
  try {
    await clover('POST', `/orders/${orderId}/print_event`, { deviceId: PRINTER_DEVICE_ID, printCategory: 'ORDER' });
    console.log('Print job sent!\n');
  } catch (e) {
    console.log('Print failed (printer may be offline): ' + e.message + '\n');
  }

  console.log('==========================================');
  console.log('       CASA DE PIZZA & WINGS');
  console.log('     765 N Nellis Blvd, Las Vegas');
  console.log('          (702) 200-5252');
  console.log('==========================================');
  console.log('ORDER TYPE : PICK UP');
  console.log('REF        : ' + REFERENCE);
  console.log('CLOVER ID  : ' + orderId);
  console.log('------------------------------------------');
  console.log('NOTE: ONLINE ORDER casadepizzawingslv.com');
  console.log('      Ref: ' + REFERENCE);
  console.log('      Cliente: ' + CUSTOMER.firstName + ' ' + CUSTOMER.lastName);
  console.log('      Tel: ' + CUSTOMER.phone);
  console.log('------------------------------------------');
  for (const item of TEST_ITEMS) {
    const priceStr = '$' + (item.price / 100).toFixed(2);
    console.log('1x ' + item.name.padEnd(30) + priceStr);
    if (item.note) item.note.split(' | ').forEach(w => console.log('   -> ' + w));
  }
  console.log('------------------------------------------');
  console.log('SUBTOTAL           $' + (subtotal / 100).toFixed(2).padStart(8));
  console.log('CONVENIENCE FEE 3% $' + (fee / 100).toFixed(2).padStart(8));
  console.log('TOTAL              $' + (total / 100).toFixed(2).padStart(8));
  console.log('==========================================');
  console.log('      THANK YOU FOR YOUR ORDER!');
  console.log('   Please pick up at the counter.');
  console.log('==========================================');
}

main().catch(console.error);
