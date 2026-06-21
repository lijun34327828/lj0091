import { getDb } from '../database.js'
import type { PricingTier, OverdueCalculation } from '../../shared/types.js'

interface TierRow {
  id: string
  max_hours: number
  rate_per_hour: number
  label: string
  sort_order: number
}

export function getPricingTiers(): PricingTier[] {
  const db = getDb()
  return db.prepare('SELECT * FROM pricing_tiers ORDER BY sort_order ASC').all() as PricingTier[]
}

function getTiersSorted(): TierRow[] {
  const db = getDb()
  return db.prepare('SELECT * FROM pricing_tiers ORDER BY sort_order ASC').all() as TierRow[]
}

export function calculateOverdueFee(arrivedAt: string, now?: string): {
  tier1Hours: number
  tier2Hours: number
  tier3Hours: number
  tier1Fee: number
  tier2Fee: number
  tier3Fee: number
  totalFee: number
  overdueHours: number
} {
  const tiers = getTiersSorted()
  const nowDate = now ? new Date(now) : new Date()
  const arrivedDate = new Date(arrivedAt)
  const diffMs = nowDate.getTime() - arrivedDate.getTime()
  const totalHours = Math.max(0, diffMs / (1000 * 3600))

  if (totalHours <= 0 || tiers.length === 0) {
    return { tier1Hours: 0, tier2Hours: 0, tier3Hours: 0, tier1Fee: 0, tier2Fee: 0, tier3Fee: 0, totalFee: 0, overdueHours: 0 }
  }

  let prevMax = 0
  let tier1Hours = 0
  let tier2Hours = 0
  let tier3Hours = 0
  let tier1Fee = 0
  let tier2Fee = 0
  let tier3Fee = 0

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]
    const tierMax = tier.max_hours
    const rate = tier.rate_per_hour

    if (totalHours <= prevMax) break

    const hoursInTier = Math.min(totalHours, tierMax) - prevMax

    if (i === 0) {
      tier1Hours = hoursInTier
      tier1Fee = hoursInTier * rate
    } else if (i === 1) {
      tier2Hours = hoursInTier
      tier2Fee = hoursInTier * rate
    } else if (i === 2) {
      tier3Hours = hoursInTier
      tier3Fee = hoursInTier * rate
    }

    prevMax = tierMax
  }

  return {
    tier1Hours,
    tier2Hours,
    tier3Hours,
    tier1Fee,
    tier2Fee,
    tier3Fee,
    totalFee: tier1Fee + tier2Fee + tier3Fee,
    overdueHours: totalHours
  }
}

export function calculateBatchOverdue(batchId: string): OverdueCalculation {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM order_batches WHERE id = ?').get(batchId) as any
  if (!batch) throw new Error('Batch not found')

  const calc = calculateOverdueFee(batch.arrived_at)

  return {
    batchId: batch.id,
    batchNo: batch.batch_no,
    arrivedAt: batch.arrived_at,
    overdueHours: calc.overdueHours,
    tier1Hours: calc.tier1Hours,
    tier2Hours: calc.tier2Hours,
    tier3Hours: calc.tier3Hours,
    tier1Fee: calc.tier1Fee,
    tier2Fee: calc.tier2Fee,
    tier3Fee: calc.tier3Fee,
    totalFee: calc.totalFee
  }
}

export function calculateOrderOverdue(orderId: string): OverdueCalculation[] {
  const db = getDb()
  const batches = db.prepare(
    "SELECT * FROM order_batches WHERE order_id = ? ORDER BY batch_no ASC"
  ).all(orderId) as any[]

  return batches.map(batch => {
    const calcTime = batch.picked_at || undefined
    const calc = calculateOverdueFee(batch.arrived_at, calcTime)
    return {
      batchId: batch.id,
      batchNo: batch.batch_no,
      arrivedAt: batch.arrived_at,
      overdueHours: calc.overdueHours,
      tier1Hours: calc.tier1Hours,
      tier2Hours: calc.tier2Hours,
      tier3Hours: calc.tier3Hours,
      tier1Fee: calc.tier1Fee,
      tier2Fee: calc.tier2Fee,
      tier3Fee: calc.tier3Fee,
      totalFee: calc.totalFee
    }
  })
}

export function checkAndLockOverdueOrders(): void {
  const db = getDb()
  const tiers = getTiersSorted()
  const maxLockHours = 168

  const unpickedBatches = db.prepare(
    "SELECT ob.* FROM order_batches ob JOIN orders o ON ob.order_id = o.id WHERE ob.status != 'picked' AND o.locked = 0"
  ).all() as any[]

  const orderIdsToLock = new Set<string>()

  for (const batch of unpickedBatches) {
    const arrivedDate = new Date(batch.arrived_at)
    const now = new Date()
    const diffHours = (now.getTime() - arrivedDate.getTime()) / (1000 * 3600)

    if (diffHours >= maxLockHours) {
      orderIdsToLock.add(batch.order_id)
    }
  }

  const updateStmt = db.prepare(
    "UPDATE orders SET locked = 1, locked_reason = '超过7天未取货，系统自动锁定', status = 'locked', updated_at = datetime('now','localtime') WHERE id = ? AND locked = 0"
  )

  for (const orderId of orderIdsToLock) {
    updateStmt.run(orderId)
  }
}
