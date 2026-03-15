const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

function createDatabase({ rootDir }) {
  const dataDir = path.join(rootDir, 'data');
  const dbPath = path.join(dataDir, 'store.db');
  const productsSeedPath = path.join(dataDir, 'products.json');

  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      cat TEXT NOT NULL,
      emoji TEXT NOT NULL,
      price REAL NOT NULL,
      compare REAL,
      desc TEXT NOT NULL,
      stock INTEGER NOT NULL,
      badge TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      shipping_method TEXT NOT NULL,
      shipping_method_label TEXT NOT NULL,
      shipping_fee REAL NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      shipping_postal_code TEXT NOT NULL,
      contact_first_name TEXT NOT NULL,
      contact_last_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);

  seedProducts(db, productsSeedPath);

  const statements = {
    allProducts: db.prepare(`SELECT * FROM products ORDER BY id`),
    getProductById: db.prepare(`SELECT * FROM products WHERE id = ?`),
    getUserById: db.prepare(`SELECT * FROM users WHERE id = ?`),
    getUserByEmail: db.prepare(`SELECT * FROM users WHERE email = ?`),
    createUser: db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    createSession: db.prepare(`
      INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    getSession: db.prepare(`SELECT * FROM sessions WHERE token_hash = ?`),
    touchSession: db.prepare(`UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?`),
    deleteSession: db.prepare(`DELETE FROM sessions WHERE token_hash = ?`),
    deleteExpiredSessions: db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`),
    insertOrder: db.prepare(`
      INSERT INTO orders (
        id, user_id, created_at, subtotal, discount, tax, total,
        shipping_method, shipping_method_label, shipping_fee,
        shipping_address, shipping_city, shipping_postal_code,
        contact_first_name, contact_last_name, contact_email, contact_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    insertOrderItem: db.prepare(`
      INSERT INTO order_items (order_id, product_id, name, qty, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    updateProductStock: db.prepare(`UPDATE products SET stock = ? WHERE id = ?`),
    allOrdersForUser: db.prepare(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `),
    itemsForOrder: db.prepare(`
      SELECT product_id, name, qty, unit_price, line_total
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC
    `),
  };

  function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  function normalizeProduct(row) {
    return {
      id: row.id,
      name: row.name,
      cat: row.cat,
      emoji: row.emoji,
      price: row.price,
      compare: row.compare,
      desc: row.desc,
      stock: row.stock,
      badge: row.badge,
    };
  }

  function normalizeUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  }

  function normalizeOrder(orderRow) {
    return {
      id: orderRow.id,
      userId: orderRow.user_id,
      createdAt: orderRow.created_at,
      pricing: {
        subtotal: orderRow.subtotal,
        discount: orderRow.discount,
        tax: orderRow.tax,
        total: orderRow.total,
      },
      shipping: {
        method: orderRow.shipping_method,
        methodLabel: orderRow.shipping_method_label,
        fee: orderRow.shipping_fee,
        address: orderRow.shipping_address,
        city: orderRow.shipping_city,
        postalCode: orderRow.shipping_postal_code,
      },
      contact: {
        firstName: orderRow.contact_first_name,
        lastName: orderRow.contact_last_name,
        email: orderRow.contact_email,
        phone: orderRow.contact_phone,
      },
      items: statements.itemsForOrder.all(orderRow.id).map(item => ({
        productId: item.product_id,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
      })),
    };
  }

  return {
    db,
    allProducts() {
      return statements.allProducts.all().map(normalizeProduct);
    },
    getProductById(id) {
      return normalizeProduct(statements.getProductById.get(id));
    },
    findUserById(id) {
      return normalizeUser(statements.getUserById.get(id));
    },
    findUserByEmail(email) {
      return normalizeUser(statements.getUserByEmail.get(email));
    },
    createUser({ id, name, email, passwordHash, createdAt }) {
      statements.createUser.run(id, name, email, passwordHash, createdAt);
      return this.findUserById(id);
    },
    deleteExpiredSessions(nowIso) {
      statements.deleteExpiredSessions.run(nowIso);
    },
    createSession({ token, userId, createdAt, expiresAt }) {
      statements.createSession.run(hashToken(token), userId, createdAt, expiresAt, createdAt);
    },
    findSession(token) {
      const row = statements.getSession.get(hashToken(token));
      return row
        ? {
            tokenHash: row.token_hash,
            userId: row.user_id,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            lastSeenAt: row.last_seen_at,
          }
        : null;
    },
    touchSession(token, lastSeenAt) {
      statements.touchSession.run(lastSeenAt, hashToken(token));
    },
    deleteSession(token) {
      statements.deleteSession.run(hashToken(token));
    },
    allOrdersForUser(userId) {
      return statements.allOrdersForUser.all(userId).map(normalizeOrder);
    },
    createOrder(payload) {
      withTransaction(db, () => {
        const order = payload;
        statements.insertOrder.run(
          order.id,
          order.userId,
          order.createdAt,
          order.pricing.subtotal,
          order.pricing.discount,
          order.pricing.tax,
          order.pricing.total,
          order.shipping.method,
          order.shipping.methodLabel,
          order.shipping.fee,
          order.shipping.address,
          order.shipping.city,
          order.shipping.postalCode,
          order.contact.firstName,
          order.contact.lastName,
          order.contact.email,
          order.contact.phone
        );
        order.items.forEach(item => {
          const product = statements.getProductById.get(item.productId);
          if (!product) throw new Error(`Product ${item.productId} was not found.`);
          if (product.stock < item.qty) throw new Error(`${product.name} only has ${product.stock} left in stock.`);
        });
        order.items.forEach(item => {
          statements.insertOrderItem.run(order.id, item.productId, item.name, item.qty, item.unitPrice, item.lineTotal);
          const product = statements.getProductById.get(item.productId);
          statements.updateProductStock.run(Math.max(0, product.stock - item.qty), item.productId);
        });
      });
      return this.allOrdersForUser(payload.userId).find(order => order.id === payload.id);
    },
    close() {
      db.close();
    },
  };
}

function seedProducts(db, seedPath) {
  const count = db.prepare(`SELECT COUNT(*) AS count FROM products`).get().count;
  if (count > 0) return;
  if (!fs.existsSync(seedPath)) return;
  const products = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const insert = db.prepare(`
    INSERT INTO products (id, name, cat, emoji, price, compare, desc, stock, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  withTransaction(db, () => {
    products.forEach(product => {
      insert.run(product.id, product.name, product.cat, product.emoji, product.price, product.compare, product.desc, product.stock, product.badge);
    });
  });
}

function withTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    fn();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = { createDatabase };
