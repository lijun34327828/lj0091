import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.resolve(process.cwd(), 'data', 'store.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function initDb(): Database.Database {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  seedPricingTiers()
  seedDemoData()

  return db
}

function createTables() {
  const d = db!

  d.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_amount REAL NOT NULL DEFAULT 0,
      total_service_fee REAL NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      locked_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS order_batches (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      batch_no INTEGER NOT NULL,
      arrived_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      prepared_at TEXT,
      picked_at TEXT,
      status TEXT NOT NULL DEFAULT 'arrived',
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS order_batch_items (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES order_batches(id)
    );

    CREATE TABLE IF NOT EXISTS pickup_records (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      picked_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      goods_amount REAL NOT NULL,
      overdue_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (batch_id) REFERENCES order_batches(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      batch_id TEXT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS pricing_tiers (
      id TEXT PRIMARY KEY,
      max_hours REAL NOT NULL,
      rate_per_hour REAL NOT NULL,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
  `)
}

function seedPricingTiers() {
  const d = db!
  const count = d.prepare('SELECT COUNT(*) as cnt FROM pricing_tiers').get() as { cnt: number }
  if (count.cnt > 0) return

  const insert = d.prepare(
    'INSERT INTO pricing_tiers (id, max_hours, rate_per_hour, label, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
  insert.run(uuidv4(), 12, 0, '12小时内免费', 1)
  insert.run(uuidv4(), 24, 2, '12-24小时一档单价', 2)
  insert.run(uuidv4(), 999, 4, '超24小时双倍计费', 3)
}

function seedDemoData() {
  const d = db!
  const count = d.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number }
  if (count.cnt > 0) return

  const now = new Date()
  const hoursAgo = (h: number) => {
    const d = new Date(now.getTime() - h * 3600 * 1000)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const insertOrder = d.prepare(
    `INSERT INTO orders (id, order_no, customer_name, customer_phone, status, total_amount, total_service_fee, locked, locked_reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertBatch = d.prepare(
    `INSERT INTO order_batches (id, order_id, batch_no, arrived_at, prepared_at, picked_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const insertItem = d.prepare(
    `INSERT INTO order_batch_items (id, batch_id, product_name, quantity, unit_price, subtotal)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  const orderId1 = uuidv4()
  const orderId2 = uuidv4()
  const orderId3 = uuidv4()

  insertOrder.run(orderId1, 'ORD' + Date.now() + '001', '张三', '13800001111', 'pending', 2025, 0, 0, null, hoursAgo(30), hoursAgo(30))

  const batch1a = uuidv4()
  const batch1b = uuidv4()
  insertBatch.run(batch1a, orderId1, 1, hoursAgo(30), hoursAgo(28), null, 'prepared')
  insertBatch.run(batch1b, orderId1, 2, hoursAgo(18), null, null, 'arrived')
  insertItem.run(uuidv4(), batch1a, '东北大米(50kg)', 10, 120, 1200)
  insertItem.run(uuidv4(), batch1a, '食用油(5L)', 5, 65, 325)
  insertItem.run(uuidv4(), batch1b, '面粉(25kg)', 8, 55, 440)
  insertItem.run(uuidv4(), batch1b, '食盐(1kg)', 20, 3, 60)

  insertOrder.run(orderId2, 'ORD' + Date.now() + '002', '李四', '13900002222', 'pending', 1320, 0, 0, null, hoursAgo(8), hoursAgo(8))

  const batch2a = uuidv4()
  const batch2b = uuidv4()
  insertBatch.run(batch2a, orderId2, 1, hoursAgo(8), hoursAgo(6), null, 'prepared')
  insertBatch.run(batch2b, orderId2, 2, hoursAgo(2), null, null, 'arrived')
  insertItem.run(uuidv4(), batch2a, '方便面(箱)', 15, 48, 720)
  insertItem.run(uuidv4(), batch2a, '矿泉水(箱)', 20, 24, 480)
  insertItem.run(uuidv4(), batch2b, '酱油(1L)', 10, 12, 120)

  insertOrder.run(orderId3, 'ORD' + Date.now() + '003', '王五', '13700003333', 'pending', 1640, 0, 0, null, hoursAgo(200), hoursAgo(200))

  const batch3a = uuidv4()
  insertBatch.run(batch3a, orderId3, 1, hoursAgo(200), hoursAgo(195), null, 'prepared')
  insertItem.run(uuidv4(), batch3a, '冻猪肉(kg)', 50, 22, 1100)
  insertItem.run(uuidv4(), batch3a, '冻鸡翅(kg)', 30, 18, 540)
}
