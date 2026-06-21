import { Router, type Request, type Response } from 'express'
import { markPrepared, pickupBatch } from '../services/batchService.js'

const router = Router()

router.post('/:id/prepare', (req: Request, res: Response): void => {
  try {
    const batch = markPrepared(req.params.id)
    res.json({ success: true, data: batch })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/:id/pickup', (req: Request, res: Response): void => {
  try {
    const result = pickupBatch(req.params.id)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
