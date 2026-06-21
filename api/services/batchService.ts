import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { calculateOverdueFee } from './pricingService.js'
import type { OrderBatch, PickupRecord, Transaction } from '../../shared/types.js'

export function markPrepared(batchId: string): OrderBatch {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM order_batches WHERE id = ?').get(batchId) as OrderBatch | undefined
  if (!batch) throw new Error('Batch not found')
  if (batch.status !== 'arrived') throw new Error('Batch is not in arrived status')

  db.prepare(
    "UPDATE order_batches SET status = 'prepared', prepared_at = datetime('now','localtime') WHERE id = ?"
  ).run(batchId)

  return db.prepare('SELECT * FROM order_batches WHERE id = ?').get(batchId) as OrderBatch
}

export function pickupBatch(batchId: string): { pickup: PickupRecord; transaction: Transaction } {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM order_batches WHERE id = ?').get(batchId) as any
  if (!batch) throw new Error('Batch not found')
  if (batch.status === 'picked') throw new Error('Batch already picked')

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(batch.order_id) as any
  if (!order) throw new Error('Order not found')
  if (order.locked) throw new Error('Order is locked, cannot pick up')

  const items = db.prepare('SELECT * FROM order_batch_items WHERE batch_id = ?').all(batchId) as any[]
  const goodsAmount = items.reduce((sum: number, item: any) => sum + item.subtotal, 0)

  const result = db.transaction(() => {
    db.prepare(
      "UPDATE order_batches SET status = 'picked', picked_at = datetime('now','localtime') WHERE id = ?"
    ).run(batchId)

    const updatedBatch = db.prepare('SELECT picked_at FROM order_batches WHERE id = ?').get(batchId) as any
    const calc = calculateOverdueFee(batch.arrived_at, updatedBatch.picked_at)
    const overdueFee = calc.totalFee

    const pickupId = uuidv4()
    db.prepare(
      `INSERT INTO pickup_records (id, order_id, batch_id, picked_at, goods_amount, overdue_fee, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(pickupId, batch.order_id, batchId, updatedBatch.picked_at, goodsAmount, overdueFee, goodsAmount + overdueFee)

    const goodsTxnId = uuidv4()
    db.prepare(
      `INSERT INTO transactions (id, order_id, batch_id, type, amount, description, created_at)
       VALUES (?, ?, ?, 'pickup', ?, ?, datetime('now','localtime'))`
    ).run(goodsTxnId, batch.order_id, batchId, goodsAmount, `取货商品款-批次${batch.batch_no}`)

    if (overdueFee > 0) {
      const feeTxnId = uuidv4()
      db.prepare(
        `INSERT INTO transactions (id, order_id, batch_id, type, amount, description, created_at)
         VALUES (?, ?, ?, 'overdue_fee', ?, ?, datetime('now','localtime'))`
      ).run(feeTxnId, batch.order_id, batchId, overdueFee, `逾期保管费-批次${batch.batch_no}`)
    }

    const allBatches = db.prepare('SELECT status FROM order_batches WHERE order_id = ?').all(batch.order_id) as any[]
    const allPicked = allBatches.every((b: any) => b.status === 'picked')
    const newStatus = allPicked ? 'completed' : 'partial_picked'

    const totalServiceFee = order.total_service_fee + overdueFee

    db.prepare(
      "UPDATE orders SET status = ?, total_service_fee = ?, updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(newStatus, totalServiceFee, batch.order_id)

    const pickup = db.prepare('SELECT * FROM pickup_records WHERE id = ?').get(pickupId) as PickupRecord
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(goodsTxnId) as Transaction

    return { pickup, transaction }
  })()

  return result
}
