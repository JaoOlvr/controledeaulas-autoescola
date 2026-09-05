import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { makeBackup } from './backup'
import { getConfiguracoes } from './database'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupBackupAutomation(): void {
  const config = getConfiguracoes()
  if (!config.backup_automatico) return

  const intervaloDias = config.backup_intervalo_dias || 7
  const intervalo = intervaloDias * 24 * 60 * 60 * 1000

  setTimeout(() => {
    try {
      makeBackup()
    } catch (err) {
      console.error('Erro ao fazer backup automático:', err)
    }
  }, 60 * 1000)

  setInterval(() => {
    try {
      makeBackup()
    } catch (err) {
      console.error('Erro ao fazer backup automático:', err)
    }
  }, intervalo)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.agendaaulas.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  registerIpcHandlers()
  createWindow()
  setupBackupAutomation()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
