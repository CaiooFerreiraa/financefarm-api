import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

export const cropsRouter = new Hono()

// GET /crops — lista todos os produtos disponíveis
cropsRouter.get('/', async (c) => {
  const crops = await prisma.crop.findMany({ orderBy: { name: 'asc' } })
  return c.json(crops)
})

// POST /crops/seed — cria produtos padrão se não existirem
cropsRouter.post('/seed', async (c) => {
  const defaultCrops = [
    { name: 'Soja', unit: 'saca (60kg)', latestPrice: 135.50 },
    { name: 'Milho', unit: 'saca (60kg)', latestPrice: 58.20 },
    { name: 'Trigo', unit: 'saca (60kg)', latestPrice: 72.40 },
    { name: 'Algodão', unit: 'arroba (15kg)', latestPrice: 142.10 },
    { name: 'Café Arábica', unit: 'saca (60kg)', latestPrice: 1120.00 },
    { name: 'Cana-de-Açúcar', unit: 'tonelada', latestPrice: 180.50 },
    { name: 'Arroz', unit: 'saca (50kg)', latestPrice: 125.00 },
    { name: 'Feijão', unit: 'saca (60kg)', latestPrice: 280.00 },
  ]

  const results = await Promise.all(
    defaultCrops.map((crop) =>
      prisma.crop.upsert({
        where: { name: crop.name },
        update: { latestPrice: crop.latestPrice },
        create: crop,
      })
    )
  )

  return c.json(results)
})

// POST /crops/:farmId/link — adiciona um crop à fazenda
cropsRouter.post('/:farmId/link', async (c) => {
  const { cropId } = await c.req.json()
  const farmCrop = await prisma.farmCrop.upsert({
    where: { farmId_cropId: { farmId: c.req.param('farmId'), cropId } },
    update: {},
    create: { farmId: c.req.param('farmId'), cropId },
  })
  return c.json(farmCrop, 201)
})
