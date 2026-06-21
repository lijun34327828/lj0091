import { Router, type Request, type Response } from 'express'
import { getOrders, getOrderDetail, createOrder, lockOrder } from '../services/orderService.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      orderNo: req.query.orderNo as string | undefined,
      phone: req.query.phone as string | undefined
    }
    let orders = getOrders(filters)
    if (filters.orderNo && filters.phone && filters.orderNo === filters.phone) {
      const search = filters.orderNo
      orders = getOrders({ status: filters.status })
      orders = orders.filter(o =>
        o.order_no.includes(search) ||
        o.customer_name.includes(search) ||
        o.customer_phone.includes(search)
      )
    }
    res.json({ success: true, data: orders })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const order = createOrder(req.body)
    res.json({ success: true, data: order })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const detail = getOrderDetail(req.params.id)
    res.json({ success: true, data: detail })
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message })
  }
})

router.patch('/:id/lock', (req: Request, res: Response): void => {
  try {
    const { locked, reason } = req.body
    const order = lockOrder(req.params.id, locked, reason)
    res.json({ success: true, data: order })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
