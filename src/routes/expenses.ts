import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

export const expensesRouter = new Hono()

// GET /expenses?farmId=xxx&month=yyyy-mm
expensesRouter.get('/', async (c) => {
  const farmId = c.req.query('farmId')
  const month = c.req.query('month') // format: 2026-03

  if (!farmId) return c.json({ error: 'farmId required' }, 400)

  let dateFilter = {}
  if (month) {
    const [year, m] = month.split('-').map(Number)
    dateFilter = {
      date: {
        gte: new Date(year, m - 1, 1),
        lt: new Date(year, m, 1),
      },
    }
  }

  const expenses = await prisma.expense.findMany({
    where: { farmId, ...dateFilter },
    orderBy: { date: 'desc' },
  })

  const total = expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0)

  return c.json({ expenses, total })
})

// POST /expenses
expensesRouter.post('/', async (c) => {
  const body = await c.req.json()
  const { amount, category, description, farmId, date } = body

  const expense = await prisma.expense.create({
    data: {
      amount: parseFloat(amount),
      category,
      description,
      farmId,
      date: date ? new Date(date) : new Date(),
    },
  })
  return c.json(expense, 201)
})

// DELETE /expenses/:id
expensesRouter.delete('/:id', async (c) => {
  await prisma.expense.delete({ where: { id: c.req.param('id') } })
  return c.json({ success: true })
})
