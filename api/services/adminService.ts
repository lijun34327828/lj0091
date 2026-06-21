import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { getPricingTiers, calculateOverdueFee } from './pricingService.js'
import { getNewStatusAfterUnlock } from './orderService.js'
import type { PricingTier, SimulateRequest, SimulateResult, OverdueCalculation } from '../../shared/types.js'

export function resolveLockedOrder(orderId: string, action: 'unlock' | 'force_settle' | 'notify'): void {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
  if (!order) throw new Error('Order not found')

  switch (action) {
    case 'unlock': {
      const newStatus = getNewStatusAfterUnlock(orderId)
      db.prepare(
        "UPDATE orders SET locked = 0, locked_reason = NULL, status = ?, updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(newStatus, orderId)
      break
    }
    case 'force_settle': {
      const unpickedBatches = db.prepare(
        "SELECT * FROM order_batches WHERE order_id = ? AND status != 'picked'"
      ).all(orderId) as any[]

      db.transaction(() => {
        for (const batch of unpickedBatches) {
          db.prepare(
            "UPDATE order_batches SET status = 'picked', picked_at = datetime('now','localtime') WHERE id = ?"
          ).run(batch.id)

          const items = db.prepare('SELECT * FROM order_batch_items WHERE batch_id = ?').all(batch.id) as any[]
          const goodsAmount = items.reduce((sum: number, item: any) => sum + item.subtotal, 0)
          const calc = calculateOverdueFee(batch.arrived_at)
          const overdueFee = calc.totalFee

          db.prepare(
            `INSERT INTO pickup_records (id, order_id, batch_id, picked_at, goods_amount, overdue_fee, total_amount)
             VALUES (?, ?, ?, datetime('now','localtime'), ?, ?, ?)`
          ).run(uuidv4(), orderId, batch.id, goodsAmount, overdueFee, goodsAmount + overdueFee)

          db.prepare(
            `INSERT INTO transactions (id, order_id, batch_id, type, amount, description, created_at)
             VALUES (?, ?, ?, 'pickup', ?, ?, datetime('now','localtime'))`
          ).run(uuidv4(), orderId, batch.id, goodsAmount, `强制结算商品款-批次${batch.batch_no}`)

          if (overdueFee > 0) {
            db.prepare(
              `INSERT INTO transactions (id, order_id, batch_id, type, amount, description, created_at)
               VALUES (?, ?, ?, 'overdue_fee', ?, ?, datetime('now','localtime'))`
            ).run(uuidv4(), orderId, batch.id, overdueFee, `强制结算逾期费-批次${batch.batch_no}`)
          }
        }

        db.prepare(
          "UPDATE orders SET locked = 0, locked_reason = NULL, status = 'completed', updated_at = datetime('now','localtime') WHERE id = ?"
        ).run(orderId)
      })()
      break
    }
    case 'notify': {
      db.prepare(
        "UPDATE orders SET locked_reason = '已通知客户-待处理', updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(orderId)
      break
    }
  }
}

export function updatePricingTiers(tiers: PricingTier[]): PricingTier[] {
  const db = getDb()

  db.transaction(() => {
    db.prepare('DELETE FROM pricing_tiers').run()
    const insert = db.prepare(
      'INSERT INTO pricing_tiers (id, max_hours, rate_per_hour, label, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    for (const tier of tiers) {
      insert.run(tier.id || uuidv4(), tier.max_hours, tier.rate_per_hour, tier.label, tier.sort_order)
    }
  })()

  return getPricingTiers()
}

export function simulateOverdue(data: SimulateRequest): SimulateResult {
  const arrivedDate = new Date(data.arrivedAt)
  const simulatedNow = new Date(arrivedDate.getTime() + data.hours * 3600 * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const simulatedNowStr = `${simulatedNow.getFullYear()}-${pad(simulatedNow.getMonth() + 1)}-${pad(simulatedNow.getDate())} ${pad(simulatedNow.getHours())}:${pad(simulatedNow.getMinutes())}:${pad(simulatedNow.getSeconds())}`
  const calc = calculateOverdueFee(data.arrivedAt, simulatedNowStr)
  const totalGoodsAmount = data.itemCount * data.pricePerItem
  const totalServiceFee = calc.totalFee

  let scenario = '正常范围'
  if (calc.overdueHours > 24) {
    scenario = '超24小时-双倍计费'
  } else if (calc.overdueHours > 12) {
    scenario = '12-24小时-一档计费'
  }

  const batches: OverdueCalculation[] = [{
    batchId: 'simulated',
    batchNo: 1,
    arrivedAt: data.arrivedAt,
    overdueHours: calc.overdueHours,
    tier1Hours: calc.tier1Hours,
    tier2Hours: calc.tier2Hours,
    tier3Hours: calc.tier3Hours,
    tier1Fee: calc.tier1Fee,
    tier2Fee: calc.tier2Fee,
    tier3Fee: calc.tier3Fee,
    totalFee: calc.totalFee
  }]

  return {
    scenario,
    batches,
    totalServiceFee,
    totalGoodsAmount,
    grandTotal: totalGoodsAmount + totalServiceFee
  }
}
