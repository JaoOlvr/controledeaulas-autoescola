import express from 'express'
import cors from 'cors'
import os from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import type { Server } from 'http'
import {
  listAutoescolas,
  getAutoescola,
  createAutoescola,
  updateAutoescola,
  deleteAutoescola,
  obterResumoSaaS,
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

function getAutoescolaId(req: any): number {
  if (req.usuario?.perfil === 'superadmin' && req.query.autoescola_id) {
    return Number(req.query.autoescola_id) || 1
  }
  return req.usuario?.autoescola_id || 1
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
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { usuario, senha } = req.body
      if (!usuario || !senha) {
        res.status(400).json({ error: 'Informe o usuário e a senha.' })
        return
      }
      const resultado = await autenticarUsuario(usuario, senha)
      res.json(resultado)
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Credenciais inválidas.' })
    }
  })

  // Middleware de Autenticação para todas as demais rotas da API
  app.use('/api', async (req, res, next) => {
    if (req.path === '/auth/login' || req.path === '/server-info') {
      return next()
    }

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' })
      return
    }

    const usuario = await validarSessao(token)
    if (!usuario) {
      res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' })
      return
    }

    // Anexa dados do usuário na requisição
    ;(req as any).usuario = usuario
    ;(req as any).token = token

    // Controle de bloqueio financeiro da autoescola (SaaS R$ 40/mês)
    if (usuario.perfil !== 'superadmin' && usuario.autoescola_status === 'bloqueada') {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.path.startsWith('/auth/logout')) {
        res.status(402).json({
          error:
            'A assinatura desta autoescola está suspensa por pendência no pagamento da mensalidade de R$ 40,00. Realize o PIX para desbloquear todas as funções.',
          bloqueada: true,
          pix_chave: usuario.autoescola_pix || 'contato@agendaaulas.app',
          autoescola_nome: usuario.autoescola_nome
        })
        return
      }
    }

    // Controle de Acesso Baseado em Perfis (RBAC):
    // Rotas Master SaaS (apenas superadmin)
    if (req.path.startsWith('/master') && usuario.perfil !== 'superadmin') {
      res.status(403).json({ error: 'Acesso restrito ao Superadministrador da plataforma SaaS.' })
      return
    }

    // Se o perfil for 'instrutor', bloqueia seções financeiras e administrativas
    if (usuario.perfil === 'instrutor') {
      const rotasProibidas = ['/gastos', '/relatorios', '/usuarios', '/backups']
      if (rotasProibidas.some((r) => req.path.startsWith(r))) {
        res.status(403).json({ error: 'Acesso restrito a administradores.' })
        return
      }
      if (req.path.startsWith('/configuracoes') && req.method !== 'GET') {
        res.status(403).json({ error: 'Apenas administradores podem alterar configurações.' })
        return
      }
    }

    next()
  })

  app.get('/api/auth/me', (req, res) => {
    res.json((req as any).usuario)
  })

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const token = (req as any).token
      if (token) await encerrarSessao(token)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/auth/alterar-senha', async (req, res) => {
    try {
      const usuario = (req as any).usuario
      const { senhaAtual, novaSenha } = req.body
      if (!senhaAtual || !novaSenha) {
        res.status(400).json({ error: 'Informe a senha atual e a nova senha.' })
        return
      }
      await alterarMinhaSenha(usuario.id, senhaAtual, novaSenha)
      res.json({ ok: true, mensagem: 'Senha alterada com sucesso!' })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- ROTAS MASTER SAAS (SUPERADMIN) ----
  // ==========================================

  app.get('/api/master/resumo', async (_req, res) => {
    try {
      const resumo = await obterResumoSaaS()
      res.json(resumo)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.get('/api/master/autoescolas', async (_req, res) => {
    try {
      const lista = await listAutoescolas()
      res.json(lista)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.get('/api/master/autoescolas/:id', async (req, res) => {
    try {
      const ae = await getAutoescola(Number(req.params.id))
      if (!ae) {
        res.status(404).json({ error: 'Autoescola não encontrada' })
        return
      }
      res.json(ae)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/master/autoescolas', async (req, res) => {
    try {
      const nova = await createAutoescola(req.body)
      res.status(201).json(nova)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/master/autoescolas/:id', async (req, res) => {
    try {
      await updateAutoescola(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/master/autoescolas/:id', async (req, res) => {
    try {
      await deleteAutoescola(Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- USUÁRIOS ----
  // ==========================================

  app.get('/api/usuarios', async (req, res) => {
    try {
      const usuario = (req as any).usuario
      const autoescolaId = usuario.perfil === 'superadmin' ? null : usuario.autoescola_id || 1
      res.json(await listUsuarios(autoescolaId))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/usuarios', async (req, res) => {
    try {
      const usuario = (req as any).usuario
      const autoescolaId =
        usuario.perfil === 'superadmin'
          ? req.body.autoescola_id ?? null
          : usuario.autoescola_id || 1

      const novo = await createUsuario({
        ...req.body,
        autoescola_id: autoescolaId
      })
      res.status(201).json(novo)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/usuarios/:id', async (req, res) => {
    try {
      await updateUsuario(Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/usuarios/:id', async (req, res) => {
    try {
      await deleteUsuario(Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- INSTRUTORES ----
  // ==========================================

  app.get('/api/instrutores', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const filtro = req.query.status ? { status: String(req.query.status) } : undefined
      res.json(await listInstrutores(autoescolaId, filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/instrutores', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      res.status(201).json(await createInstrutor(autoescolaId, req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/instrutores/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await updateInstrutor(autoescolaId, Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/instrutores/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await deleteInstrutor(autoescolaId, Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- VEÍCULOS ----
  // ==========================================

  app.get('/api/veiculos', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const filtro = req.query.status ? { status: String(req.query.status) } : undefined
      res.json(await listVeiculos(autoescolaId, filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/veiculos', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      res.status(201).json(await createVeiculo(autoescolaId, req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/veiculos/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await updateVeiculo(autoescolaId, Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/veiculos/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await deleteVeiculo(autoescolaId, Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- ALUNOS ----
  // ==========================================

  app.get('/api/alunos', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const filtro: { status?: string; busca?: string } = {}
      if (req.query.status) filtro.status = String(req.query.status)
      if (req.query.busca) filtro.busca = String(req.query.busca)
      res.json(await listAlunos(autoescolaId, filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/alunos', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      res.status(201).json(await createAluno(autoescolaId, req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.get('/api/alunos/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const aluno = await getAluno(autoescolaId, Number(req.params.id))
      if (!aluno) {
        res.status(404).json({ error: 'Aluno não encontrado' })
        return
      }
      res.json(aluno)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.put('/api/alunos/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await updateAluno(autoescolaId, Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/alunos/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await deleteAluno(autoescolaId, Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- PAGAMENTOS ----
  // ==========================================

  app.post('/api/pagamentos', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      res.status(201).json(await registrarPagamento(autoescolaId, req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.get('/api/pagamentos', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const filtro: { aluno_id?: number; data_inicio?: string; data_fim?: string } = {}
      if (req.query.aluno_id) filtro.aluno_id = Number(req.query.aluno_id)
      if (req.query.data_inicio) filtro.data_inicio = String(req.query.data_inicio)
      if (req.query.data_fim) filtro.data_fim = String(req.query.data_fim)
      res.json(await listPagamentos(autoescolaId, filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- AULAS ----
  // ==========================================

  app.get('/api/aulas', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const usuario = (req as any).usuario
      const filtro: { data_inicio?: string; data_fim?: string; aluno_id?: number } = {}
      if (req.query.data_inicio) filtro.data_inicio = String(req.query.data_inicio)
      if (req.query.data_fim) filtro.data_fim = String(req.query.data_fim)
      if (req.query.aluno_id) filtro.aluno_id = Number(req.query.aluno_id)

      let aulas = await listAulas(autoescolaId, filtro)
      // Se for instrutor, filtra apenas as aulas atribuídas a ele
      if (usuario?.perfil === 'instrutor' && usuario?.instrutor_id) {
        aulas = aulas.filter((a) => a.instrutor_id === usuario.instrutor_id)
      }
      res.json(aulas)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/aulas', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const aula = await createAula(autoescolaId, req.body)
      res.status(201).json(aula)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/aulas/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await updateAula(autoescolaId, Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/aulas/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await deleteAula(autoescolaId, Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- GASTOS ----
  // ==========================================

  app.get('/api/gastos', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const filtro: { data_inicio?: string; data_fim?: string } = {}
      if (req.query.data_inicio) filtro.data_inicio = String(req.query.data_inicio)
      if (req.query.data_fim) filtro.data_fim = String(req.query.data_fim)
      res.json(await listGastos(autoescolaId, filtro))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/gastos', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      res.status(201).json(await createGasto(autoescolaId, req.body))
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.put('/api/gastos/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await updateGasto(autoescolaId, Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.delete('/api/gastos/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await deleteGasto(autoescolaId, Number(req.params.id))
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  app.get('/api/gastos/total', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const inicio = String(req.query.inicio || '')
      const fim = String(req.query.fim || '')
      res.json(await totalGastosPeriodo(autoescolaId, inicio, fim))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- RELATÓRIOS / FINANCEIRO ----
  // ==========================================

  app.get('/api/financeiro/resumo', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      const inicio = String(req.query.inicio || '')
      const fim = String(req.query.fim || '')
      res.json(await resumoFinanceiro(autoescolaId, inicio, fim))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- HORÁRIOS ----
  // ==========================================

  app.get('/api/horarios', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      res.json(await listHorarios(autoescolaId))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.put('/api/horarios/:id', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await updateHorario(autoescolaId, Number(req.params.id), req.body)
      res.json({ ok: true })
    } catch (err: any) {
      res.status(400).json({ error: err.message })
    }
  })

  // ==========================================
  // ---- CONFIGURAÇÕES ----
  // ==========================================

  app.get('/api/config', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      res.json(await getConfiguracoes(autoescolaId))
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  app.put('/api/config', async (req, res) => {
    try {
      const autoescolaId = getAutoescolaId(req)
      await updateConfiguracoes(autoescolaId, req.body)
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
            <head><meta charset="utf-8"><title>Servidor SaaS Ativo</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 40px; line-height: 1.6;">
              <h2>🚗 Plataforma SaaS de Autoescolas Online!</h2>
              <p>O backend e as rotas de dados estão respondendo normalmente.</p>
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

    const server = app.listen(port, () => {
      serverInstance = server
      const info = getServerInfo()
      console.log(`\n======================================================`)
      console.log(`🚗 SERVIDOR SAAS DA AUTOESCOLA ONLINE`)
      console.log(`📡 Local:      http://127.0.0.1:${port}`)
      console.log(`📶 Wi-Fi:      http://${info.ip}:${port}`)
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
