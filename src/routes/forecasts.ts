import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

export const forecastRouter = new Hono()

// GET /forecasts?farmId=xxx
forecastRouter.get('/', async (c) => {
  const farmId = c.req.query('farmId')
  if (!farmId) return c.json({ error: 'farmId required' }, 400)

  const forecasts = await prisma.productionForecast.findMany({
    where: { farmId },
    include: { crop: true },
  })

  const summary = forecasts.map((f: any) => ({
    ...f,
    estimatedRevenue: f.predictedYield * f.unitPrice,
    estimatedProfit: f.predictedYield * f.unitPrice - f.estimatedCost,
  }))

  const totalRevenue = summary.reduce((s: number, f: any) => s + f.estimatedRevenue, 0)
  const totalProfit = summary.reduce((s: number, f: any) => s + f.estimatedProfit, 0)

  return c.json({ forecasts: summary, totalRevenue, totalProfit })
})

// POST /forecasts
forecastRouter.post('/', async (c: any) => {
  const body = await c.req.json()
  const { farmId, cropId, predictedYield, unitPrice, estimatedCost } = body

  const forecast = await prisma.productionForecast.create({
    data: {
      farmId,
      cropId,
      predictedYield: parseFloat(predictedYield),
      unitPrice: parseFloat(unitPrice),
      estimatedCost: parseFloat(estimatedCost),
    },
  })
  return c.json(forecast, 201)
})
