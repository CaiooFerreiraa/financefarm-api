import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { farmsRouter } from './routes/farms.js'
import { expensesRouter } from './routes/expenses.js'
import { cropsRouter } from './routes/crops.js'
import { forecastRouter } from './routes/forecasts.js'
import { harvestsRouter } from './routes/harvests.js'

const app = new Hono()

app.use('*', cors())
app.use('*', logger())

app.get('/', (c) => c.json({ status: 'Finance Farm API running 🌾' }))

app.route('/farms', farmsRouter)
app.route('/expenses', expensesRouter)
app.route('/crops', cropsRouter)
app.route('/forecasts', forecastRouter)
app.route('/harvests', harvestsRouter)

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`🌾 Server running on http://localhost:${info.port}`)
})
