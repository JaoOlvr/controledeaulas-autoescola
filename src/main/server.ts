import express from 'express'
import cors from 'cors'
import os from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import type { Server } from 'http'
import {
  listInstrutores,
  createInstrutor,
  updateInstrutor,
  deleteInstrutor,
  listVeiculos,
  createVeiculo,
  updateVeiculo,
  deleteVeiculo,
  listAlunos,
  createAluno,
  getAluno,
  updateAluno,
  deleteAluno,
  registrarPagamento,
  listPagamentos,
  listAulas,
  createAula,
  updateAula,
  deleteAula,
  listGastos,
  createGasto,
  updateGasto,
  deleteGasto,
  resumoFinanceiro,
  listHorarios,
  updateHorario,
  getConfiguracoes,
  updateConfiguracoes,
  totalGastosPeriodo,
  autenticarUsuario,
  validarSessao,
  encerrarSessao,
  listUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  alterarMinhaSenha
} from './database'
import { makeBackup, listBackups } from './backup'

let serverInstance: Server | null = null
let currentPort = 3333

export interface ServerInfo {
  port: number
  ip: string
  url: string
  allIps: string[]
}

export function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces()
  const addresses: string[] = []

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address)
      }
    }
  }
  return addresses
}

export function getPrimaryLocalIp(): string {
  const ips = getLocalIpAddresses()
  const wifiOrLan = ips.find(
    (ip) => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')
  )
  return wifiOrLan || ips[0] || '127.0.0.1'
}

export function getServerInfo(): ServerInfo {
  const ip = getPrimaryLocalIp()
  const port = currentPort
  return {
    port,
    ip,
    url: `http://${ip}:${port}`,
    allIps: getLocalIpAddresses()
  }
}

export function createHttpApp(): express.Express {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Logger de requisições para fácil depuração em tempo real
  app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      if (!req.path.startsWith('/assets/')) {
        console.log(`[HTTP ${res.statusCode}] ${req.method} ${req.path} (${Date.now() - start}ms)`)
      }
    })
    next()
  })

  // Server Info
  app.get('/api/server-info', (_req, res) => {
    res.json(getServerInfo())
  })

  // ---- AUTENTICAÇÃO ----
  app.post('/api/auth/login', (req, res) => {
    try {
      const { usuario, senha } = req.body
      if (!usuario || !senha) {
        res.status(400).json({ error: 'Informe o usuário e a senha.' })
        return
      }
      const resultado = autenticarUsuario(usuario, senha)
      res.json(resultado)
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Credenciais inválidas.' })
    }
  })

  // Middleware de Autenticação para todas as demais rotas da API
  app.use('/api', (req, res, next) => {
    // Rotas públicas que não precisam de login
    if (req.path === '/auth/login' || req.path === '/server-info') {
      return next()
    }

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' })
    }

    const usuario = validarSessao(token)
    if (!usuario) {
      return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' })
    }

    // Anexa dados do usuário na requisição
    ;(req as any).usuario = usuario
    ;(req as any).token = token

    // Controle de Acesso Baseado em Perfis (RBAC):
    // Se o perfil for 'instrutor', bloqueia seções financeiras e administrativas
    if (usuario.perfil === 'instrutor') {
      const rotasProibidas = ['/gastos', '/relatorios', '/usuarios', '/backups']
      if (rotasProibidas.some((r) => req.path.startsWith(r))) {
        return res.status(403).json({ error: 'Acesso restrito a administradores.' })
      }
      // Instrutor não pode alterar configurações gerais da autoescola
      if (req.path.startsWith('/configuracoes') && req.method !== 'GET') {
        return res.status(403).json({ error: 'Apenas administradores podem alterar configurações.' })
      }
    }

    next()
  })

  app.get('/api/auth/me', (req, res) => {
    res.json((req as any).usuario)
  })

  app.post('/api/auth/logout', (req, res) => {
    try {
      const token = (req as any).token
      if (token) encerrarSessao(token)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/auth/alterar-senha', (req, res) => {
    try {
      const usuario = (req as any).usuario
      const { senhaAtual, novaSenha } = req.body
      if (!senhaAtual || !novaSenha) {
        res.status(400).json({ error: 'Informe a senha atual e a nova senha.' })
        return
      }
      alterarMinhaSenha(usuario.id, senhaAtual, novaSenha)
      res.json({ ok: true, mensagem: 'Senha alterada com sucesso!' })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ---- USUÁRIOS ----
  app.get('/api/usuarios', (_req, res) => {
    try {
      res.json(listUsuarios())
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/usuarios', (req, res) => {
    try {
      res.status(201).json(createUsuario(req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/usuarios/:id', (req, res) => {
    try {
      updateUsuario(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/usuarios/:id', (req, res) => {
    try {
      deleteUsuario(Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ---- Instrutores ----
  app.get('/api/instrutores', (req, res) => {
    try {
      const filtro = req.query.status ? { status: String(req.query.status) } : undefined
      res.json(listInstrutores(filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/instrutores', (req, res) => {
    try {
      res.status(201).json(createInstrutor(req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/instrutores/:id', (req, res) => {
    try {
      updateInstrutor(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/instrutores/:id', (req, res) => {
    try {
      deleteInstrutor(Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ---- Veículos ----
  app.get('/api/veiculos', (req, res) => {
    try {
      const filtro = req.query.status ? { status: String(req.query.status) } : undefined
      res.json(listVeiculos(filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/veiculos', (req, res) => {
    try {
      res.status(201).json(createVeiculo(req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/veiculos/:id', (req, res) => {
    try {
      updateVeiculo(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/veiculos/:id', (req, res) => {
    try {
      deleteVeiculo(Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ---- Alunos ----
  app.get('/api/alunos', (req, res) => {
    try {
      const filtro: { status?: string; busca?: string } = {}
      if (req.query.status) filtro.status = String(req.query.status)
      if (req.query.busca) filtro.busca = String(req.query.busca)
      res.json(listAlunos(filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/alunos', (req, res) => {
    try {
      res.status(201).json(createAluno(req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.get('/api/alunos/:id', (req, res) => {
    try {
      const aluno = getAluno(Number(req.params.id))
      if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' })
      return res.json(aluno)
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  })

  app.put('/api/alunos/:id', (req, res) => {
    try {
      updateAluno(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/alunos/:id', (req, res) => {
    try {
      deleteAluno(Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ---- Pagamentos ----
  app.post('/api/pagamentos', (req, res) => {
    try {
      res.status(201).json(registrarPagamento(req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.get('/api/pagamentos', (req, res) => {
    try {
      const filtro: { aluno_id?: number; data_inicio?: string; data_fim?: string } = {}
      if (req.query.aluno_id) filtro.aluno_id = Number(req.query.aluno_id)
      if (req.query.data_inicio) filtro.data_inicio = String(req.query.data_inicio)
      if (req.query.data_fim) filtro.data_fim = String(req.query.data_fim)
      res.json(listPagamentos(filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ---- Aulas ----
  app.get('/api/aulas', (req, res) => {
    try {
      const usuario = (req as any).usuario
      const filtro: { data_inicio?: string; data_fim?: string; aluno_id?: number } = {}
      if (req.query.data_inicio) filtro.data_inicio = String(req.query.data_inicio)
      if (req.query.data_fim) filtro.data_fim = String(req.query.data_fim)
      if (req.query.aluno_id) filtro.aluno_id = Number(req.query.aluno_id)

      let aulas = listAulas(filtro)
      // Se for instrutor, filtra apenas as aulas atribuídas a ele
      if (usuario?.perfil === 'instrutor' && usuario?.instrutor_id) {
        aulas = aulas.filter((a) => a.instrutor_id === usuario.instrutor_id)
      }
      res.json(aulas)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/aulas', (req, res) => {
    try {
      const aula = createAula(req.body)
      res.status(201).json(aula)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/aulas/:id', (req, res) => {
    try {
      updateAula(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/aulas/:id', (req, res) => {
    try {
      deleteAula(Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ---- Gastos ----
  app.get('/api/gastos', (req, res) => {
    try {
      const filtro: { data_inicio?: string; data_fim?: string } = {}
      if (req.query.data_inicio) filtro.data_inicio = String(req.query.data_inicio)
      if (req.query.data_fim) filtro.data_fim = String(req.query.data_fim)
      res.json(listGastos(filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/gastos', (req, res) => {
    try {
      res.status(201).json(createGasto(req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/gastos/:id', (req, res) => {
    try {
      updateGasto(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/gastos/:id', (req, res) => {
    try {
      deleteGasto(Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.get('/api/gastos/total', (req, res) => {
    try {
      const inicio = String(req.query.inicio || '')
      const fim = String(req.query.fim || '')
      res.json(totalGastosPeriodo(inicio, fim))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ---- Relatórios / Financeiro ----
  app.get('/api/financeiro/resumo', (req, res) => {
    try {
      const inicio = String(req.query.inicio || '')
      const fim = String(req.query.fim || '')
      res.json(resumoFinanceiro(inicio, fim))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ---- Horários ----
  app.get('/api/horarios', (_req, res) => {
    try {
      res.json(listHorarios())
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.put('/api/horarios/:id', (req, res) => {
    try {
      updateHorario(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ---- Configurações ----
  app.get('/api/config', (_req, res) => {
    try {
      res.json(getConfiguracoes())
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.put('/api/config', (req, res) => {
    try {
      updateConfiguracoes(req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ---- Backup ----
  app.post('/api/backup/make', (_req, res) => {
    try {
      const arquivo = makeBackup()
      res.json({ arquivo })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.get('/api/backup/list', (_req, res) => {
    try {
      res.json(listBackups())
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ---- Servir Frontend Estático para Tablet/Web ----
  function getRendererPath(): string | null {
    const candidates = [
      join(__dirname, '../renderer'),
      join(process.cwd(), 'out/renderer'),
      join(process.cwd(), 'dist/renderer'),
      join(__dirname, '../../out/renderer')
    ]
    for (const cand of candidates) {
      if (existsSync(cand) && existsSync(join(cand, 'index.html'))) {
        return cand
      }
    }
    return null
  }

  const rendererPath = getRendererPath()
  if (rendererPath) {
    app.use(express.static(rendererPath))
    // Fallback SPA para Express 5 e 4 (sem wildcard incompatível)
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(join(rendererPath, 'index.html'))
        return
      }
      next()
    })
  } else {
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Servidor Ativo</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 40px; line-height: 1.6;">
              <h2>🚗 Servidor da Autoescola Ativo!</h2>
              <p>O backend e as rotas de dados estão respondendo normalmente.</p>
              <p>Para gerar os arquivos visuais para o tablet, execute no terminal do computador:</p>
              <pre style="background: #eee; padding: 10px; border-radius: 6px; display: inline-block;">npm run build</pre>
            </body>
          </html>
        `)
        return
      }
      next()
    })
  }

  return app
}

export function startHttpServer(port = 3333): Promise<ServerInfo> {
  return new Promise((resolve, reject) => {
    if (serverInstance) {
      return resolve(getServerInfo())
    }

    const app = createHttpApp()
    currentPort = port

    // Ouvir sem especificar 0.0.0.0 fixo para suportar dual-stack (IPv4 e IPv6)
    const server = app.listen(port, () => {
      serverInstance = server
      const info = getServerInfo()
      console.log(`\n======================================================`)
      console.log(`🚗 SERVIDOR DA AUTOESCOLA ONLINE`)
      console.log(`📡 Local:      http://127.0.0.1:${port}`)
      console.log(`📶 Wi-Fi:      http://${info.ip}:${port}`)
      console.log(`🌐 Cloudflare: cloudflared tunnel --url http://127.0.0.1:${port}`)
      console.log(`======================================================\n`)
      resolve(info)
    })

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[HTTP Server] Porta ${port} em uso, tentando porta ${port + 1}...`)
        resolve(startHttpServer(port + 1))
      } else {
        console.error('[HTTP Server] Erro ao iniciar servidor:', err)
        reject(err)
      }
    })
  })
}

export function stopHttpServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverInstance) return resolve()
    serverInstance.close(() => {
      serverInstance = null
      resolve()
    })
  })
}

