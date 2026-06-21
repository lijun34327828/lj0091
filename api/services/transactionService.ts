import { getDb } from '../database.js'
import type { Transaction, Order } from '../../shared/types.js'

export function getTransactions(filters?: {
  orderId?: string
  batchId?: string
  type?: string
  startDate?: string
  endDate?: string
}): Transaction[] {
  const db = getDb()
  let sql = 'SELECT * FROM transactions WHERE 1=1'
  const params: any[] = []

  if (filters?.orderId) {
    sql += ' AND order_id = ?'
    params.push(filters.orderId)
  }
  if (filters?.batchId) {
    sql += ' AND batch_id = ?'
    params.push(filters.batchId)
  }
  if (filters?.type) {
    sql += ' AND type = ?'
    params.push(filters.type)
  }
  if (filters?.startDate) {
    sql += ' AND created_at >= ?'
    params.push(filters.startDate)
  }
  if (filters?.endDate) {
    sql += ' AND created_at <= ?'
    params.push(filters.endDate)
  }

  sql += ' ORDER BY created_at DESC'

  return db.prepare(sql).all(...params) as Transaction[]
}

export function getLockedOrders(): Order[] {
  const db = getDb()
  return db.prepare('SELECT * FROM orders WHERE locked = 1 ORDER BY updated_at DESC').all() as Order[]
}
