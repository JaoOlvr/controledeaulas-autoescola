import type { IncomingMessage, ServerResponse } from 'http'
import { createHttpApp } from '../src/main/server'
import { initDatabase } from '../src/main/database'

let initialized = false
let expressApp: any = null

async function getApp() {
  if (!initialized) {
    await initDatabase()
    expressApp = createHttpApp()
    initialized = true
  }
  return expressApp
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp()
  return app(req, res)
}

