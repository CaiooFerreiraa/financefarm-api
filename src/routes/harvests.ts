import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

export const harvestsRouter = new Hono()

// GET /harvests?farmId=xxx — lista todas as safras de uma fazenda
harvestsRouter.get('/', async (c) => {
  const farmId = c.req.query('farmId')
  if (!farmId) return c.json({ error: 'farmId required' }, 400)

  const harvests = await prisma.harvest.findMany({
    where: { farmId },
    include: { crop: true },
    orderBy: { year: 'desc' },
  })

  return c.json(harvests)
})

// POST /harvests — cria/fecha uma safra manualmente
harvestsRouter.post('/', async (c) => {
  const body = await c.req.json()
  const { farmId, cropId, cropName, year, totalYield, production, totalExpenses, totalRevenue, totalProfit } = body

  if (!farmId || !year) return c.json({ error: 'farmId and year are required' }, 400)

  let finalCropId = cropId;

  if (!finalCropId && cropName) {
    const crop = await prisma.crop.findFirst({
      where: { name: { contains: cropName, mode: 'insensitive' } }
    })
    if (crop) finalCropId = crop.id;
  }

  const harvest = await prisma.harvest.create({
    data: {
      farmId,
      cropId: finalCropId || null,
      year: String(year),
      totalYield: parseFloat(production ?? totalYield ?? 0),
      totalExpenses: parseFloat(totalExpenses ?? 0),
      totalRevenue: parseFloat(totalRevenue ?? 0),
      totalProfit: parseFloat(totalProfit ?? 0),
    },
    include: { crop: true },
  })

  return c.json(harvest, 201)
})

// POST /harvests/close-year?farmId=xxx&year=2024 — fecha o ano automaticamente
// Agrega gastos reais e previsões de produção do ano e salva como safra
harvestsRouter.post('/close-year', async (c) => {
  const farmId = c.req.query('farmId')
  const yearStr = c.req.query('year') || String(new Date().getFullYear() - 1)

  if (!farmId) return c.json({ error: 'farmId required' }, 400)

  const year = parseInt(yearStr)
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year + 1, 0, 1)

  // Busca gastos reais do ano
  const expenses = await prisma.expense.findMany({
    where: {
      farmId,
      date: { gte: startDate, lt: endDate },
    },
  })
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Busca previsões de produção
  const forecasts = await prisma.productionForecast.findMany({
    where: { farmId },
    include: { crop: true },
  })

  const totalYield = forecasts.reduce((sum, f) => sum + f.predictedYield, 0)
  const totalRevenue = forecasts.reduce((sum, f) => sum + f.predictedYield * f.unitPrice, 0)
  const totalProfit = totalRevenue - totalExpenses

  // Verifica se já existe safra para este ano (evita duplicata)
  const existing = await prisma.harvest.findFirst({ where: { farmId, year: yearStr } })
  if (existing) {
    return c.json({ error: `Uma safra para o ano ${yearStr} já foi registrada.` }, 409)
  }

  const harvest = await prisma.harvest.create({
    data: {
      farmId,
      year: yearStr,
      totalYield,
      totalExpenses,
      totalRevenue,
      totalProfit,
    },
    include: { crop: true },
  })

  return c.json(harvest, 201)
})

// DELETE /harvests/:id
harvestsRouter.delete('/:id', async (c) => {
  await prisma.harvest.delete({ where: { id: c.req.param('id') } })
  return c.json({ success: true })
})
