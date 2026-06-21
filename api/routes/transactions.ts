import { Router, type Request, type Response } from 'express'
import { getTransactions } from '../services/transactionService.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const filters = {
      orderId: req.query.orderId as string | undefined,
      batchId: req.query.batchId as string | undefined,
      type: req.query.type as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined
    }
    const transactions = getTransactions(filters)
    res.json({ success: true, data: transactions })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
