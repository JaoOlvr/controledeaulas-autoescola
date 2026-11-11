import { initDatabase } from './database'
import { startHttpServer } from './server'

async function bootstrap(): Promise<void> {
  try {
    const electron = require('electron')
    if (electron?.app) {
      electron.app.setName('agenda-aulas-autoescola')
      await electron.app.whenReady()
    }
  } catch {
    // Executando em ambiente Node puro (Docker, VPS ou Nuvem)
  }

  console.log('Iniciando banco de dados SQLite...')
  initDatabase()

  const port = Number(process.env.PORT) || 3333
  await startHttpServer(port)
}

bootstrap().catch((err) => {
  console.error('Falha crítica ao iniciar servidor:', err)
  process.exit(1)
})


