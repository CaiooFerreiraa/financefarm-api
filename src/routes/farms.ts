import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

export const farmsRouter = new Hono()

// GET /farms?userId=xxx
farmsRouter.get('/', async (c) => {
  const userId = c.req.query('userId')
  if (!userId) return c.json({ error: 'userId required' }, 400)

  const farms = await prisma.farm.findMany({
    where: { owner: { clerkId: userId } },
    include: { crops: { include: { crop: true } } },
  })
  return c.json(farms)
})

// POST /farms
farmsRouter.post('/', async (c) => {
  const body = await c.req.json()
  const { name, clerkId } = body

  let user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) {
    user = await prisma.user.create({ data: { clerkId, name } })
  }

  const farm = await prisma.farm.create({
    data: { name, ownerId: user.id },
  })
  return c.json(farm, 201)
})

// GET /farms/:id
farmsRouter.get('/:id', async (c) => {
  const farm = await prisma.farm.findUnique({
    where: { id: c.req.param('id') },
    include: {
      crops: { include: { crop: true } },
      expenses: true,
    },
  })
  if (!farm) return c.json({ error: 'Farm not found' }, 404)
  return c.json(farm)
})
