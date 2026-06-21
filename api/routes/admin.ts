import { Router, type Request, type Response } from 'express'
import { getLockedOrders } from '../services/transactionService.js'
import { resolveLockedOrder, updatePricingTiers } from '../services/adminService.js'
import { getPricingTiers } from '../services/pricingService.js'

const router = Router()

router.get('/locked-orders', (req: Request, res: Response): void => {
  try {
    const orders = getLockedOrders()
    res.json({ success: true, data: orders })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/locked-orders/:id/resolve', (req: Request, res: Response): void => {
  try {
    const { action } = req.body
    resolveLockedOrder(req.params.id, action)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/pricing', (req: Request, res: Response): void => {
  try {
    const tiers = getPricingTiers()
    res.json({ success: true, data: tiers })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/pricing', (req: Request, res: Response): void => {
  try {
    const { tiers } = req.body
    const updated = updatePricingTiers(tiers)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
