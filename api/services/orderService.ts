import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { calculateOrderOverdue } from './pricingService.js'
import type { Order, OrderDetail, CreateOrderRequest, OrderBatchItem } from '../../shared/types.js'

export function getOrders(filters?: { status?: string; orderNo?: string; phone?: string }): Order[] {
  const db = getDb()
  let sql = 'SELECT * FROM orders WHERE 1=1'
  const params: any[] = []

  if (filters?.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }
  if (filters?.orderNo) {
    sql += ' AND order_no LIKE ?'
    params.push(`%${filters.orderNo}%`)
  }
  if (filters?.phone) {
    sql += ' AND customer_phone LIKE ?'
    params.push(`%${filters.phone}%`)
  }

  sql += ' ORDER BY created_at DESC'

  return db.prepare(sql).all(...params) as Order[]
}

export function getOrderDetail(id: string): OrderDetail {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined
  if (!order) throw new Error('Order not found')

  const batches = db.prepare(
    'SELECT * FROM order_batches WHERE order_id = ? ORDER BY batch_no ASC'
  ).all(id) as any[]

  const batchesWithItems = batches.map(batch => {
    const items = db.prepare(
      'SELECT * FROM order_batch_items WHERE batch_id = ?'
    ).all(batch.id) as OrderBatchItem[]
    return { ...batch, items }
  })

  const overdueCalculations = calculateOrderOverdue(id)
  const totalServiceFee = overdueCalculations.reduce((sum, c) => sum + c.totalFee, 0)

  return {
    order,
    batches: batchesWithItems,
    overdueCalculations,
    totalServiceFee
  }
}

export function createOrder(data: CreateOrderRequest): Order {
  const db = getDb()
  const orderId = uuidv4()
  const ts = Date.now()
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const orderNo = `ORD${ts}${rand}`

  const insertOrder = db.prepare(
    `INSERT INTO orders (id, order_no, customer_name, customer_phone, status, total_amount, total_service_fee, locked, locked_reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, 0, 0, NULL, datetime('now','localtime'), datetime('now','localtime'))`
  )
  const insertBatch = db.prepare(
    `INSERT INTO order_batches (id, order_id, batch_no, arrived_at, prepared_at, picked_at, status)
     VALUES (?, ?, ?, datetime('now','localtime'), NULL, NULL, 'arrived')`
  )
  const insertItem = db.prepare(
    `INSERT INTO order_batch_items (id, batch_id, product_name, quantity, unit_price, subtotal)
     VALUES (?, ?, ?, ?, ?, ?)`
  )

  let totalAmount = 0

  const transaction = db.transaction(() => {
    insertOrder.run(orderId, orderNo, data.customerName, data.customerPhone)

    data.batches.forEach((batchData, idx) => {
      const batchId = uuidv4()
      const batchNo = idx + 1
      insertBatch.run(batchId, orderId, batchNo)

      for (const item of batchData.items) {
        const subtotal = item.quantity * item.unitPrice
        totalAmount += subtotal
        insertItem.run(uuidv4(), batchId, item.productName, item.quantity, item.unitPrice, subtotal)
      }
    })

    db.prepare(
      "UPDATE orders SET total_amount = ?, updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(totalAmount, orderId)
  })

  transaction()

  return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Order
}

export function lockOrder(orderId: string, locked: boolean, reason?: string): Order {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Order | undefined
  if (!order) throw new Error('Order not found')

  if (locked) {
    db.prepare(
      "UPDATE orders SET locked = 1, locked_reason = ?, status = 'locked', updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(reason || '手动锁定', orderId)
  } else {
    const newStatus = getNewStatusAfterUnlock(orderId)
    db.prepare(
      "UPDATE orders SET locked = 0, locked_reason = NULL, status = ?, updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(newStatus, orderId)
  }

  return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Order
}

export function getNewStatusAfterUnlock(orderId: string): string {
  const db = getDb()
  const batches = db.prepare('SELECT status FROM order_batches WHERE order_id = ?').all(orderId) as any[]
  const allPicked = batches.every(b => b.status === 'picked')
  if (allPicked) return 'completed'
  const somePicked = batches.some(b => b.status === 'picked')
  if (somePicked) return 'partial_picked'
  return 'pending'
}
