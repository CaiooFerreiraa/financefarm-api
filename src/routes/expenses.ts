import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

export const expensesRouter = new Hono()

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// GET /expenses/summary?farmId=xxx&year=2026 — gastos agrupados por mês e semestre
expensesRouter.get('/summary', async (c) => {
  const farmId = c.req.query('farmId')
  const yearStr = c.req.query('year') || String(new Date().getFullYear())
  const year = parseInt(yearStr)

  if (!farmId) return c.json({ error: 'farmId required' }, 400)

  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year + 1, 0, 1)

  const expenses = await prisma.expense.findMany({
    where: { farmId, date: { gte: startDate, lt: endDate } },
    orderBy: { date: 'asc' },
  })

  // Agrupamento por mês (0-11)
  const byMonth: { month: number; label: string; total: number; count: number }[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: MONTHS_PT[i],
    total: 0,
    count: 0,
  }))

  for (const e of expenses) {
    const m = new Date(e.date).getMonth() // 0-11
    byMonth[m].total += e.amount
    byMonth[m].count += 1
  }

  // Agrupamento por semestre
  const semesters = [
    {
      label: '1º Semestre',
      months: MONTHS_PT.slice(0, 6).join(' – '),
      total: byMonth.slice(0, 6).reduce((s, m) => s + m.total, 0),
      count: byMonth.slice(0, 6).reduce((s, m) => s + m.count, 0),
    },
    {
      label: '2º Semestre',
      months: MONTHS_PT.slice(6).join(' – '),
      total: byMonth.slice(6).reduce((s, m) => s + m.total, 0),
      count: byMonth.slice(6).reduce((s, m) => s + m.count, 0),
    },
  ]

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)

  return c.json({ year, grandTotal, byMonth, semesters })
})

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
