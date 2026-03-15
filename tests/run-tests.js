const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../server');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3022;
const BASE = `http://127.0.0.1:${PORT}`;

function createJar() {
  const store = new Map();
  return {
    setFrom(headers) {
      const values = headers.getSetCookie ? headers.getSetCookie() : [];
      values.forEach(value => {
        const first = value.split(';')[0];
        const index = first.indexOf('=');
        if (index !== -1) store.set(first.slice(0, index), first.slice(index + 1));
      });
    },
    header() {
      return Array.from(store.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    },
  };
}

async function request(jar, pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (jar.header()) headers.Cookie = jar.header();
  const res = await fetch(`${BASE}${pathname}`, { ...options, headers });
  jar.setFrom(res.headers);
  return res;
}

async function main() {
  const server = createApp();
  await new Promise((resolve, reject) => {
    server.listen(PORT, '127.0.0.1', err => (err ? reject(err) : resolve()));
  });

  try {
    const jar = createJar();

    const productsRes = await request(jar, '/api/products');
    assert.equal(productsRes.status, 200, 'GET /api/products should return 200');
    const productsData = await productsRes.json();
    assert.ok(Array.isArray(productsData.products) && productsData.products.length > 0, 'products should be returned');

    const noCsrfRegister = await request(jar, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Csrf', email: 'no-csrf@example.com', password: 'password123' }),
    });
    assert.equal(noCsrfRegister.status, 403, 'register without CSRF should be blocked');

    const csrfRes = await request(jar, '/api/csrf');
    assert.equal(csrfRes.status, 200, 'GET /api/csrf should return 200');
    const csrf = (await csrfRes.json()).csrfToken;
    assert.ok(csrf, 'csrf token should be issued');

    const email = `test-${Date.now()}@example.com`;
    const registerRes = await request(jar, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ name: 'Test User', email, password: 'password123' }),
    });
    assert.equal(registerRes.status, 201, 'register should succeed');

    const beforeProducts = await (await request(jar, '/api/products')).json();
    const target = beforeProducts.products.find(product => product.id === 12);
    assert.ok(target, 'target product should exist');

    const invalidOrderRes = await request(jar, '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({
        items: [{ productId: 12, name: target.name, qty: 1, unitPrice: target.price }],
        pricing: { subtotal: target.price, discount: 0, tax: 4, total: target.price + 4 },
        contact: { firstName: 'T', lastName: '', email: 'bad', phone: '12' },
        shipping: { method: 'express', methodLabel: 'Express (2-3 days)', fee: 9.99, address: '1', city: 'A', postalCode: '1' },
      }),
    });
    assert.equal(invalidOrderRes.status, 400, 'invalid order should be rejected');

    const createOrderRes = await request(jar, '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({
        items: [{ productId: 12, name: target.name, qty: 1, unitPrice: target.price }],
        pricing: { subtotal: target.price, discount: 0, tax: 4, total: target.price + 4 },
        contact: { firstName: 'Test', lastName: 'User', email, phone: '1234567890' },
        shipping: { method: 'express', methodLabel: 'Express (2-3 days)', fee: 9.99, address: '123 Main Street', city: 'Mumbai', postalCode: '400001' },
      }),
    });
    assert.equal(createOrderRes.status, 201, 'valid order should succeed');
    const createdOrder = await createOrderRes.json();
    assert.ok(createdOrder.order.id, 'created order should include id');

    const ordersRes = await request(jar, '/api/orders');
    assert.equal(ordersRes.status, 200, 'GET /api/orders should succeed');
    const ordersData = await ordersRes.json();
    assert.ok(ordersData.orders.some(order => order.id === createdOrder.order.id), 'created order should be returned');

    const afterProducts = await (await request(jar, '/api/products')).json();
    const afterTarget = afterProducts.products.find(product => product.id === 12);
    assert.equal(afterTarget.stock, target.stock - 1, 'stock should decrement after purchase');

    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.match(html, /class="skip-link"/, 'skip link should exist');
    assert.match(html, /role="dialog"/, 'dialogs should exist');
    assert.match(html, /aria-modal="true"/, 'dialogs should declare aria-modal');
    assert.match(html, /label for="loginEmail"/, 'login label should be associated');
    assert.match(html, /label for="f_first"/, 'checkout label should be associated');

    console.log('All automated checks passed.');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
