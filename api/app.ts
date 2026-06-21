import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDb } from './database.js'
import { checkAndLockOverdueOrders } from './services/pricingService.js'
import { simulateOverdue } from './services/adminService.js'
import orderRoutes from './routes/orders.js'
import batchRoutes from './routes/batches.js'
import transactionRoutes from './routes/transactions.js'
import adminRoutes from './routes/admin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

initDb()
checkAndLockOverdueOrders()

setInterval(() => {
  checkAndLockOverdueOrders()
}, 60 * 60 * 1000)

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/orders', orderRoutes)
app.use('/api/batches', batchRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/admin', adminRoutes)

app.post('/api/simulate', (req: Request, res: Response): void => {
  try {
    const result = simulateOverdue(req.body)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
