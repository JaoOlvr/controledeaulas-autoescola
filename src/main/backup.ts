import { app, dialog } from 'electron'
import { copyFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'

function getDataDir(): string {
  return join(app.getPath('userData'), 'data')
}

function getBackupDir(): string {
  const dir = join(app.getPath('userData'), 'backups')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function makeBackup(): string {
  const backupDir = getBackupDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = join(backupDir, `backup-${timestamp}.db`)

  const srcDb = join(getDataDir(), 'agenda.db')
  if (existsSync(srcDb)) {
    copyFileSync(srcDb, backupFile)
  }

  cleanupOldBackups(backupDir)
  return backupFile
}

function cleanupOldBackups(dir: string, keep = 20): void {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.db'))
    .map((f) => ({
      name: f,
      time: statSync(join(dir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time)

  for (const file of files.slice(keep)) {
    const { unlinkSync } = require('fs')
    unlinkSync(join(dir, file.name))
  }
}

export async function backupToLocation(): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: 'Salvar backup',
    defaultPath: `backup-agenda-${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'Banco de dados', extensions: ['db'] }]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  const srcDb = join(getDataDir(), 'agenda.db')
  copyFileSync(srcDb, result.filePath)
  return result.filePath
}

export function listBackups(): { arquivo: string; tamanho: number; data: string }[] {
  const dir = getBackupDir()
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const stats = statSync(join(dir, f))
      return {
        arquivo: f,
        tamanho: stats.size,
        data: stats.mtime.toISOString()
      }
    })
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
}

export function exportAsJson(filePath: string): void | never {
  const { getDatabase } = require('./database')
  const db = getDatabase()

  const data: Record<string, unknown> = {}
  for (const tabela of ['alunos', 'aulas', 'gastos', 'pagamentos', 'instrutores']) {
    data[tabela] = db.prepare(`SELECT * FROM ${tabela}`).all()
  }

  const { writeFileSync } = require('fs')
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
