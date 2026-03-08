import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

export const cropsRouter = new Hono()

// GET /crops
cropsRouter.get('/', async (c) => {
  const crops = await prisma.crop.findMany({ orderBy: { name: 'asc' } })
  return c.json(crops)
})

// POST /crops — cria um novo produto
cropsRouter.post('/', async (c) => {
  const { name, unit, latestPrice } = await c.req.json()
  if (!name || !unit) return c.json({ error: 'name and unit required' }, 400)

  try {
    const crop = await prisma.crop.create({
      data: { name, unit, latestPrice: latestPrice ? parseFloat(latestPrice) : null }
    })
    return c.json(crop, 201)
  } catch (error) {
    return c.json({ error: 'Product already exists or database error' }, 400)
  }
})

// GET /crops/watchlist?clerkId=xxx — retorna a watchlist do usuário
cropsRouter.get('/watchlist', async (c) => {
  const clerkId = c.req.query('clerkId')
  if (!clerkId) return c.json({ error: 'clerkId required' }, 400)

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { watchlist: { include: { crop: true } } },
  })

  if (!user) return c.json([])

  return c.json(user.watchlist.map((w) => w.crop))
})

// POST /crops/watchlist/toggle — adiciona ou remove um crop da watchlist
cropsRouter.post('/watchlist/toggle', async (c) => {
  const { clerkId, cropId } = await c.req.json()
  if (!clerkId || !cropId) return c.json({ error: 'clerkId and cropId required' }, 400)

  let user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) return c.json({ error: 'User not found' }, 404)

  const existing = await prisma.marketWatchlist.findUnique({
    where: { userId_cropId: { userId: user.id, cropId } },
  })

  if (existing) {
    await prisma.marketWatchlist.delete({
      where: { userId_cropId: { userId: user.id, cropId } },
    })
    return c.json({ action: 'removed' })
  } else {
    await prisma.marketWatchlist.create({
      data: { userId: user.id, cropId },
    })
    return c.json({ action: 'added' })
  }
})

// POST /crops/seed — cria produtos padrão se não existirem
cropsRouter.post('/seed', async (c) => {
  const defaultCrops = [
    { name: 'Soja', unit: 'saca (60kg)', latestPrice: 132.50 },
    { name: 'Milho', unit: 'saca (60kg)', latestPrice: 65.20 },
    { name: 'Trigo', unit: 'saca (60kg)', latestPrice: 78.40 },
    { name: 'Algodão', unit: 'arroba (15kg)', latestPrice: 135.10 },
    { name: 'Café Arábica', unit: 'saca (60kg)', latestPrice: 1140.00 },
    { name: 'Cana-de-Açúcar', unit: 'tonelada', latestPrice: 165.50 },
    { name: 'Arroz', unit: 'saca (50kg)', latestPrice: 115.00 },
    { name: 'Feijão', unit: 'saca (60kg)', latestPrice: 295.00 },
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
