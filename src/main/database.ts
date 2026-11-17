import { createClient, type Client } from '@libsql/client'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import os from 'os'
import crypto from 'crypto'
import type {
  Autoescola,
  Instrutor,
  Veiculo,
  Aluno,
  Aula,
  Gasto,
  Pagamento,
  PagamentoComAluno,
  HorarioFuncionamento,
  Configuracao,
  Usuario,
  AuthResponse,
  PerfilUsuario,
  ResumoSaaS
} from '@shared/types'

let dbClient: Client | null = null

export function getUserDataPath(): string {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR
  }

  try {
    const { app } = require('electron')
    if (app && typeof app.getPath === 'function') {
      if (app.name === 'Electron' || !app.name) {
        app.setName('agenda-aulas-autoescola')
      }
      return app.getPath('userData')
    }
  } catch {}

  const home = os.homedir()
  const electronConfig =
    process.platform === 'linux'
      ? join(home, '.config', 'agenda-aulas-autoescola')
      : process.platform === 'win32'
        ? join(process.env.APPDATA || home, 'agenda-aulas-autoescola')
        : join(home, 'Library', 'Application Support', 'agenda-aulas-autoescola')

  if (existsSync(electronConfig)) {
    return electronConfig
  }
  return join(process.cwd(), 'data')
}

export function getDatabase(): Client {
  if (!dbClient) {
    const tursoUrl = process.env.TURSO_DATABASE_URL
    const tursoToken = process.env.TURSO_AUTH_TOKEN

    if (tursoUrl) {
      dbClient = createClient({
        url: tursoUrl,
        authToken: tursoToken
      })
    } else {
      const userDataPath = getUserDataPath()
      const dataDir = join(userDataPath, 'data')
      try {
        mkdirSync(dataDir, { recursive: true })
      } catch {}
      dbClient = createClient({
        url: 'file:' + join(dataDir, 'agenda.db')
      })
    }
  }
  return dbClient
}

// Helpers para consultas tipadas
async function query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const client = getDatabase()
  const res = await client.execute({ sql, args })
  return res.rows as unknown as T[]
}

async function queryOne<T = any>(sql: string, args: any[] = []): Promise<T | undefined> {
  const client = getDatabase()
  const res = await client.execute({ sql, args })
  return (res.rows[0] as unknown as T) || undefined
}

async function execute(
  sql: string,
  args: any[] = []
): Promise<{ lastInsertRowid: number; rowsAffected: number }> {
  const client = getDatabase()
  const res = await client.execute({ sql, args })
  return {
    lastInsertRowid: Number(res.lastInsertRowid || 0),
    rowsAffected: res.rowsAffected
  }
}

export async function initDatabase(): Promise<void> {
  const client = getDatabase()

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS autoescolas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      responsavel TEXT,
      telefone TEXT,
      email TEXT,
      status TEXT DEFAULT 'ativa',
      plano_valor REAL DEFAULT 40.0,
      data_vencimento TEXT,
      pix_chave TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS instrutores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autoescola_id INTEGER NOT NULL DEFAULT 1,
      nome TEXT NOT NULL,
      telefone TEXT,
      categoria TEXT,
      status TEXT DEFAULT 'ativo',
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autoescola_id INTEGER NOT NULL DEFAULT 1,
      nome TEXT NOT NULL,
      placa TEXT,
      categoria TEXT,
      status TEXT DEFAULT 'ativo',
      observacoes TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autoescola_id INTEGER NOT NULL DEFAULT 1,
      nome TEXT NOT NULL,
      telefone TEXT,
      cpf TEXT,
      categoria TEXT,
      orcamento_total REAL DEFAULT 0,
      orcamento_pago REAL DEFAULT 0,
      status TEXT DEFAULT 'ativo',
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS aulas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autoescola_id INTEGER NOT NULL DEFAULT 1,
      aluno_id INTEGER NOT NULL,
      instrutor_id INTEGER,
      veiculo_id INTEGER,
      data TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      categoria TEXT,
      tipo TEXT,
      status TEXT DEFAULT 'agendada',
      observacoes TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autoescola_id INTEGER NOT NULL DEFAULT 1,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autoescola_id INTEGER NOT NULL DEFAULT 1,
      aluno_id INTEGER NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      metodo TEXT,
      observacoes TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autoescola_id INTEGER NOT NULL DEFAULT 1,
      dia_semana INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      autoescola_id INTEGER NOT NULL DEFAULT 1,
      chave TEXT NOT NULL,
      valor TEXT NOT NULL,
      PRIMARY KEY (autoescola_id, chave)
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autoescola_id INTEGER,
      nome TEXT NOT NULL,
      usuario TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'instrutor',
      instrutor_id INTEGER,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS sessoes (
      token TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      expira_em TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `)

  await migrateSchema()
  await seedInitialData()
  await sincronizarPagamentosIniciais()
}

async function migrateSchema(): Promise<void> {
  const client = getDatabase()

  // Tabelas que precisam da coluna autoescola_id
  const tabelas = [
    'instrutores',
    'veiculos',
    'alunos',
    'aulas',
    'gastos',
    'pagamentos',
    'horarios_funcionamento',
    'usuarios'
  ]

  for (const tab of tabelas) {
    try {
      const res = await client.execute(`PRAGMA table_info(${tab})`)
      const cols = res.rows as unknown as { name: string }[]
      const hasAutoescolaId = cols.some((c) => c.name === 'autoescola_id')
      if (!hasAutoescolaId) {
        await client.execute(`ALTER TABLE ${tab} ADD COLUMN autoescola_id INTEGER DEFAULT 1`)
      }
    } catch {}
  }

  // Verifica veiculo_id em aulas
  try {
    const resAulas = await client.execute('PRAGMA table_info(aulas)')
    const colsAulas = resAulas.rows as unknown as { name: string }[]
    if (!colsAulas.some((c) => c.name === 'veiculo_id')) {
      await client.execute('ALTER TABLE aulas ADD COLUMN veiculo_id INTEGER')
    }
  } catch {}
}

async function seedInitialData(): Promise<void> {
  // 1. Autoescola Piloto (Tenant padrão)
  const countAe = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM autoescolas')
  let autoescolaId = 1
  if (!countAe || countAe.count === 0) {
    const dataVenc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const res = await execute(
      `INSERT INTO autoescolas (nome, responsavel, telefone, email, status, plano_valor, data_vencimento, pix_chave)
       VALUES (?, ?, ?, ?, 'ativa', 40.0, ?, ?)`,
      [
        'Autoescola Piloto',
        'Carlos Diretor',
        '(11) 98765-4321',
        'contato@autoescolapiloto.com',
        dataVenc,
        'contato@agendaaulas.app'
      ]
    )
    autoescolaId = res.lastInsertRowid || 1
  }

  // 2. Usuário SuperAdmin (Dono do SaaS)
  const masterUser = await queryOne('SELECT id FROM usuarios WHERE perfil = ?', ['superadmin'])
  if (!masterUser) {
    await execute(
      `INSERT INTO usuarios (nome, usuario, senha_hash, perfil, autoescola_id, ativo)
       VALUES (?, ?, ?, 'superadmin', NULL, 1)`,
      ['Master SaaS', 'master', hashPassword('master40')]
    )
  }

  // 3. Usuário Admin da Autoescola Piloto
  const adminUser = await queryOne('SELECT id FROM usuarios WHERE usuario = ?', ['admin'])
  if (!adminUser) {
    await execute(
      `INSERT INTO usuarios (nome, usuario, senha_hash, perfil, autoescola_id, ativo)
       VALUES (?, ?, ?, 'admin', ?, 1)`,
      ['Administrador', 'admin', hashPassword('admin'), autoescolaId]
    )
  } else {
    // Garante que o admin existente pertença à autoescola 1
    await execute('UPDATE usuarios SET autoescola_id = ? WHERE usuario = ? AND autoescola_id IS NULL', [
      autoescolaId,
      'admin'
    ])
  }

  // 4. Veículos padrão da Autoescola 1
  const countVeic = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM veiculos WHERE autoescola_id = ?',
    [autoescolaId]
  )
  if (!countVeic || countVeic.count === 0) {
    await execute(
      'INSERT INTO veiculos (autoescola_id, nome, placa, categoria, status) VALUES (?, ?, ?, ?, ?)',
      [autoescolaId, 'Carro', '', 'B', 'ativo']
    )
    await execute(
      'INSERT INTO veiculos (autoescola_id, nome, placa, categoria, status) VALUES (?, ?, ?, ?, ?)',
      [autoescolaId, 'Moto', '', 'A', 'ativo']
    )
  }

  // 5. Horários padrão
  const countHor = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM horarios_funcionamento WHERE autoescola_id = ?',
    [autoescolaId]
  )
  if (!countHor || countHor.count === 0) {
    const dias = [
      [1, '08:00', '18:00'],
      [2, '08:00', '18:00'],
      [3, '08:00', '18:00'],
      [4, '08:00', '18:00'],
      [5, '08:00', '18:00'],
      [6, '08:00', '12:00']
    ]
    for (const [dia, inicio, fim] of dias) {
      await execute(
        'INSERT INTO horarios_funcionamento (autoescola_id, dia_semana, hora_inicio, hora_fim) VALUES (?, ?, ?, ?)',
        [autoescolaId, dia, inicio, fim]
      )
    }
  }

  // 6. Configurações padrão
  const countCfg = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM configuracoes WHERE autoescola_id = ?',
    [autoescolaId]
  )
  if (!countCfg || countCfg.count === 0) {
    const defaults = [
      ['nome_autoescola', 'Autoescola Piloto'],
      ['horario_padrao_inicio', '08:00'],
      ['duracao_padrao_minutos', '50'],
      ['backup_automatico', 'true'],
      ['backup_intervalo_dias', '7'],
      ['modo_agenda', 'grade'],
      ['grade_horarios_manha', '08:00, 08:50, 09:40, 10:30, 11:20'],
      ['grade_horarios_tarde', '14:00, 14:50, 15:40, 16:30, 17:20']
    ]
    for (const [chave, valor] of defaults) {
      await execute(
        'INSERT OR REPLACE INTO configuracoes (autoescola_id, chave, valor) VALUES (?, ?, ?)',
        [autoescolaId, chave, valor]
      )
    }
  }
}

async function sincronizarPagamentosIniciais(): Promise<void> {
  const alunosIncompletos = await query<{
    id: number
    autoescola_id: number
    nome: string
    orcamento_pago: number
    criado_em: string
    total_pago_registrado: number
  }>(`
    SELECT a.id, a.autoescola_id, a.nome, a.orcamento_pago, a.criado_em,
           COALESCE(SUM(p.valor), 0) as total_pago_registrado
    FROM alunos a
    LEFT JOIN pagamentos p ON a.id = p.aluno_id
    GROUP BY a.id
    HAVING a.orcamento_pago > total_pago_registrado
  `)

  for (const aluno of alunosIncompletos) {
    const diferenca = aluno.orcamento_pago - aluno.total_pago_registrado
    if (diferenca > 0) {
      const dataPagamento = aluno.criado_em
        ? aluno.criado_em.split(' ')[0]
        : new Date().toISOString().split('T')[0]
      await execute(
        `INSERT INTO pagamentos (autoescola_id, aluno_id, valor, data, metodo, observacoes)
         VALUES (?, ?, ?, ?, 'Adiantamento', 'Pagamento adiantado no cadastro do aluno')`,
        [aluno.autoescola_id || 1, aluno.id, diferenca, dataPagamento]
      )
    }
  }
}

// ==========================================
// ---- SUPERADMIN / GESTÃO SAAS (R$ 40/MÊS) ----
// ==========================================

export async function listAutoescolas(): Promise<Autoescola[]> {
  return query<Autoescola>(`
    SELECT ae.*,
           (SELECT COUNT(*) FROM alunos WHERE autoescola_id = ae.id) as total_alunos,
           (SELECT COUNT(*) FROM aulas WHERE autoescola_id = ae.id) as total_aulas
    FROM autoescolas ae
    ORDER BY ae.id ASC
  `)
}

export async function getAutoescola(id: number): Promise<Autoescola | undefined> {
  return queryOne<Autoescola>(
    `SELECT ae.*,
            (SELECT COUNT(*) FROM alunos WHERE autoescola_id = ae.id) as total_alunos,
            (SELECT COUNT(*) FROM aulas WHERE autoescola_id = ae.id) as total_aulas
     FROM autoescolas ae WHERE ae.id = ?`,
    [id]
  )
}

export async function createAutoescola(dados: {
  nome: string
  responsavel?: string
  telefone?: string
  email?: string
  status?: 'ativa' | 'bloqueada' | 'teste'
  plano_valor?: number
  data_vencimento?: string
  pix_chave?: string
  usuario_admin?: string
  senha_admin?: string
}): Promise<Autoescola> {
  const dataVenc =
    dados.data_vencimento ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const res = await execute(
    `INSERT INTO autoescolas (nome, responsavel, telefone, email, status, plano_valor, data_vencimento, pix_chave)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dados.nome.trim(),
      dados.responsavel?.trim() || '',
      dados.telefone?.trim() || '',
      dados.email?.trim() || '',
      dados.status || 'ativa',
      dados.plano_valor ?? 40.0,
      dataVenc,
      dados.pix_chave?.trim() || 'contato@agendaaulas.app'
    ]
  )

  const novoId = res.lastInsertRowid

  // Cria admin da autoescola
  const usuarioAdmin =
    dados.usuario_admin?.trim().toLowerCase() ||
    `admin_${dados.nome.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  const senhaAdmin = dados.senha_admin || '123456'

  await execute(
    `INSERT INTO usuarios (autoescola_id, nome, usuario, senha_hash, perfil, ativo)
     VALUES (?, ?, ?, ?, 'admin', 1)`,
    [novoId, dados.responsavel?.trim() || dados.nome, usuarioAdmin, hashPassword(senhaAdmin)]
  )

  // Cria veículos padrão (Carro Cat B e Moto Cat A)
  await execute(
    'INSERT INTO veiculos (autoescola_id, nome, placa, categoria, status) VALUES (?, ?, ?, ?, ?)',
    [novoId, 'Carro', '', 'B', 'ativo']
  )
  await execute(
    'INSERT INTO veiculos (autoescola_id, nome, placa, categoria, status) VALUES (?, ?, ?, ?, ?)',
    [novoId, 'Moto', '', 'A', 'ativo']
  )

  // Cria horários padrão
  const dias = [
    [1, '08:00', '18:00'],
    [2, '08:00', '18:00'],
    [3, '08:00', '18:00'],
    [4, '08:00', '18:00'],
    [5, '08:00', '18:00'],
    [6, '08:00', '12:00']
  ]
  for (const [dia, inicio, fim] of dias) {
    await execute(
      'INSERT INTO horarios_funcionamento (autoescola_id, dia_semana, hora_inicio, hora_fim) VALUES (?, ?, ?, ?)',
      [novoId, dia, inicio, fim]
    )
  }

  // Configurações padrão
  const defaults = [
    ['nome_autoescola', dados.nome],
    ['horario_padrao_inicio', '08:00'],
    ['duracao_padrao_minutos', '50'],
    ['backup_automatico', 'true'],
    ['backup_intervalo_dias', '7'],
    ['modo_agenda', 'grade'],
    ['grade_horarios_manha', '08:00, 08:50, 09:40, 10:30, 11:20'],
    ['grade_horarios_tarde', '14:00, 14:50, 15:40, 16:30, 17:20']
  ]
  for (const [chave, valor] of defaults) {
    await execute(
      'INSERT OR REPLACE INTO configuracoes (autoescola_id, chave, valor) VALUES (?, ?, ?)',
      [novoId, chave, valor]
    )
  }

  return (await getAutoescola(novoId))!
}

export async function updateAutoescola(id: number, dados: Partial<Autoescola>): Promise<void> {
  const current = await getAutoescola(id)
  if (!current) return

  await execute(
    `UPDATE autoescolas SET
       nome = ?,
       responsavel = ?,
       telefone = ?,
       email = ?,
       status = ?,
       plano_valor = ?,
       data_vencimento = ?,
       pix_chave = ?
     WHERE id = ?`,
    [
      dados.nome ?? current.nome,
      dados.responsavel ?? current.responsavel,
      dados.telefone ?? current.telefone,
      dados.email ?? current.email,
      dados.status ?? current.status,
      dados.plano_valor ?? current.plano_valor,
      dados.data_vencimento ?? current.data_vencimento,
      dados.pix_chave ?? current.pix_chave,
      id
    ]
  )
}

export async function deleteAutoescola(id: number): Promise<void> {
  await execute('DELETE FROM sessoes WHERE usuario_id IN (SELECT id FROM usuarios WHERE autoescola_id = ?)', [id])
  await execute('DELETE FROM usuarios WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM aulas WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM pagamentos WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM alunos WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM gastos WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM instrutores WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM veiculos WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM horarios_funcionamento WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM configuracoes WHERE autoescola_id = ?', [id])
  await execute('DELETE FROM autoescolas WHERE id = ?', [id])
}

export async function obterResumoSaaS(): Promise<ResumoSaaS> {
  const todas = await listAutoescolas()
  const ativas = todas.filter((a) => a.status === 'ativa')
  const bloqueadas = todas.filter((a) => a.status === 'bloqueada')
  const teste = todas.filter((a) => a.status === 'teste')

  const faturamento = ativas.reduce((acc, a) => acc + (Number(a.plano_valor) || 40.0), 0)

  return {
    total_autoescolas: todas.length,
    total_ativas: ativas.length,
    total_bloqueadas: bloqueadas.length,
    total_teste: teste.length,
    faturamento_mensal_estimado: faturamento,
    autoescolas: todas
  }
}

// ==========================================
// ---- INSTRUTORES ----
// ==========================================

export async function listInstrutores(
  autoescolaId: number,
  filtro?: { status?: string }
): Promise<Instrutor[]> {
  if (filtro?.status) {
    return query<Instrutor>(
      'SELECT * FROM instrutores WHERE autoescola_id = ? AND status = ? ORDER BY nome',
      [autoescolaId, filtro.status]
    )
  }
  return query<Instrutor>(
    'SELECT * FROM instrutores WHERE autoescola_id = ? ORDER BY nome',
    [autoescolaId]
  )
}

export async function createInstrutor(
  autoescolaId: number,
  instrutor: Omit<Instrutor, 'id' | 'criado_em'>
): Promise<Instrutor> {
  const result = await execute(
    'INSERT INTO instrutores (autoescola_id, nome, telefone, categoria, status) VALUES (?, ?, ?, ?, ?)',
    [
      autoescolaId,
      instrutor.nome,
      instrutor.telefone,
      instrutor.categoria,
      instrutor.status ?? 'ativo'
    ]
  )
  return (await getInstrutor(autoescolaId, result.lastInsertRowid))!
}

export async function getInstrutor(
  autoescolaId: number,
  id: number
): Promise<Instrutor | undefined> {
  return queryOne<Instrutor>(
    'SELECT * FROM instrutores WHERE autoescola_id = ? AND id = ?',
    [autoescolaId, id]
  )
}

export async function updateInstrutor(
  autoescolaId: number,
  id: number,
  instrutor: Partial<Instrutor>
): Promise<void> {
  const current = await getInstrutor(autoescolaId, id)
  if (!current) return
  await execute(
    'UPDATE instrutores SET nome = ?, telefone = ?, categoria = ?, status = ? WHERE autoescola_id = ? AND id = ?',
    [
      instrutor.nome ?? current.nome,
      instrutor.telefone ?? current.telefone,
      instrutor.categoria ?? current.categoria,
      instrutor.status ?? current.status,
      autoescolaId,
      id
    ]
  )
}

export async function deleteInstrutor(autoescolaId: number, id: number): Promise<void> {
  await execute('UPDATE instrutores SET status = ? WHERE autoescola_id = ? AND id = ?', [
    'inativo',
    autoescolaId,
    id
  ])
}

// ==========================================
// ---- VEÍCULOS ----
// ==========================================

export async function listVeiculos(
  autoescolaId: number,
  filtro?: { status?: string }
): Promise<Veiculo[]> {
  if (filtro?.status) {
    return query<Veiculo>(
      'SELECT * FROM veiculos WHERE autoescola_id = ? AND status = ? ORDER BY nome',
      [autoescolaId, filtro.status]
    )
  }
  return query<Veiculo>('SELECT * FROM veiculos WHERE autoescola_id = ? ORDER BY nome', [
    autoescolaId
  ])
}

export async function createVeiculo(
  autoescolaId: number,
  veiculo: Omit<Veiculo, 'id' | 'criado_em'>
): Promise<Veiculo> {
  const result = await execute(
    'INSERT INTO veiculos (autoescola_id, nome, placa, categoria, status, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
    [
      autoescolaId,
      veiculo.nome,
      veiculo.placa ?? '',
      veiculo.categoria ?? '',
      veiculo.status ?? 'ativo',
      veiculo.observacoes ?? ''
    ]
  )
  return (await getVeiculo(autoescolaId, result.lastInsertRowid))!
}

export async function getVeiculo(autoescolaId: number, id: number): Promise<Veiculo | undefined> {
  return queryOne<Veiculo>('SELECT * FROM veiculos WHERE autoescola_id = ? AND id = ?', [
    autoescolaId,
    id
  ])
}

export async function updateVeiculo(
  autoescolaId: number,
  id: number,
  veiculo: Partial<Veiculo>
): Promise<void> {
  const current = await getVeiculo(autoescolaId, id)
  if (!current) return
  await execute(
    'UPDATE veiculos SET nome = ?, placa = ?, categoria = ?, status = ?, observacoes = ? WHERE autoescola_id = ? AND id = ?',
    [
      veiculo.nome ?? current.nome,
      veiculo.placa ?? current.placa,
      veiculo.categoria ?? current.categoria,
      veiculo.status ?? current.status,
      veiculo.observacoes ?? current.observacoes,
      autoescolaId,
      id
    ]
  )
}

export async function deleteVeiculo(autoescolaId: number, id: number): Promise<void> {
  await execute('UPDATE veiculos SET status = ? WHERE autoescola_id = ? AND id = ?', [
    'inativo',
    autoescolaId,
    id
  ])
}

// ==========================================
// ---- ALUNOS ----
// ==========================================

export async function listAlunos(
  autoescolaId: number,
  filtro?: { status?: string; busca?: string }
): Promise<Aluno[]> {
  let sql =
    'SELECT a.*, (a.orcamento_total - a.orcamento_pago) as saldo_devedor FROM alunos a WHERE a.autoescola_id = ?'
  const params: unknown[] = [autoescolaId]

  if (filtro?.status) {
    sql += ' AND a.status = ?'
    params.push(filtro.status)
  }
  if (filtro?.busca) {
    sql += ' AND (a.nome LIKE ? OR a.cpf LIKE ? OR a.telefone LIKE ?)'
    params.push(`%${filtro.busca}%`, `%${filtro.busca}%`, `%${filtro.busca}%`)
  }
  sql += ' ORDER BY a.nome'
  return query<Aluno>(sql, params)
}

export async function createAluno(
  autoescolaId: number,
  aluno: Omit<Aluno, 'id' | 'criado_em' | 'status'> & { status?: string }
): Promise<Aluno> {
  const valorPago = Number(aluno.orcamento_pago) || 0

  const result = await execute(
    'INSERT INTO alunos (autoescola_id, nome, telefone, cpf, categoria, orcamento_total, orcamento_pago, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      autoescolaId,
      aluno.nome,
      aluno.telefone,
      aluno.cpf,
      aluno.categoria,
      aluno.orcamento_total,
      valorPago,
      aluno.status ?? 'ativo'
    ]
  )

  const novoAlunoId = result.lastInsertRowid

  if (valorPago > 0) {
    const hoje = new Date().toISOString().split('T')[0]
    await execute(
      'INSERT INTO pagamentos (autoescola_id, aluno_id, valor, data, metodo, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
      [novoAlunoId, valorPago, hoje, 'Adiantamento', 'Pagamento adiantado no cadastro do aluno']
    )
  }

  return (await getAluno(autoescolaId, novoAlunoId))!
}

export async function getAluno(autoescolaId: number, id: number): Promise<Aluno | undefined> {
  return queryOne<Aluno>(
    'SELECT a.*, (a.orcamento_total - a.orcamento_pago) as saldo_devedor FROM alunos a WHERE a.autoescola_id = ? AND a.id = ?',
    [autoescolaId, id]
  )
}

export async function updateAluno(
  autoescolaId: number,
  id: number,
  aluno: Partial<Aluno>
): Promise<void> {
  const current = await getAluno(autoescolaId, id)
  if (!current) return

  const novoPago =
    aluno.orcamento_pago !== undefined ? Number(aluno.orcamento_pago) : current.orcamento_pago
  const diferenca = novoPago - current.orcamento_pago

  if (diferenca > 0) {
    const hoje = new Date().toISOString().split('T')[0]
    await execute(
      'INSERT INTO pagamentos (autoescola_id, aluno_id, valor, data, metodo, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
      [autoescolaId, id, diferenca, hoje, 'Adiantamento', 'Acréscimo de pagamento na edição do aluno']
    )
  }

  await execute(
    'UPDATE alunos SET nome = ?, telefone = ?, cpf = ?, categoria = ?, orcamento_total = ?, orcamento_pago = ?, status = ? WHERE autoescola_id = ? AND id = ?',
    [
      aluno.nome ?? current.nome,
      aluno.telefone ?? current.telefone,
      aluno.cpf ?? current.cpf,
      aluno.categoria ?? current.categoria,
      aluno.orcamento_total ?? current.orcamento_total,
      novoPago,
      aluno.status ?? current.status,
      autoescolaId,
      id
    ]
  )
}

export async function deleteAluno(autoescolaId: number, id: number): Promise<void> {
  await execute('DELETE FROM pagamentos WHERE autoescola_id = ? AND aluno_id = ?', [autoescolaId, id])
  await execute('DELETE FROM aulas WHERE autoescola_id = ? AND aluno_id = ?', [autoescolaId, id])
  await execute('DELETE FROM alunos WHERE autoescola_id = ? AND id = ?', [autoescolaId, id])
}

// ==========================================
// ---- PAGAMENTOS ----
// ==========================================

export async function registrarPagamento(
  autoescolaId: number,
  pagamento: Omit<Pagamento, 'id' | 'criado_em'> & { valor: number }
): Promise<Pagamento> {
  const result = await execute(
    'INSERT INTO pagamentos (autoescola_id, aluno_id, valor, data, metodo, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
    [
      autoescolaId,
      pagamento.aluno_id,
      pagamento.valor,
      pagamento.data,
      pagamento.metodo,
      pagamento.observacoes
    ]
  )

  await execute(
    'UPDATE alunos SET orcamento_pago = orcamento_pago + ? WHERE autoescola_id = ? AND id = ?',
    [pagamento.valor, autoescolaId, pagamento.aluno_id]
  )

  return (await queryOne<Pagamento>(
    'SELECT * FROM pagamentos WHERE autoescola_id = ? AND id = ?',
    [autoescolaId, result.lastInsertRowid]
  ))!
}

export async function listPagamentos(
  autoescolaId: number,
  filtro?: {
    aluno_id?: number
    data_inicio?: string
    data_fim?: string
  }
): Promise<PagamentoComAluno[]> {
  let sql = `
    SELECT p.*, al.nome as aluno_nome
    FROM pagamentos p
    LEFT JOIN alunos al ON p.aluno_id = al.id
    WHERE p.autoescola_id = ?
  `
  const params: unknown[] = [autoescolaId]

  if (filtro?.aluno_id) {
    sql += ' AND p.aluno_id = ?'
    params.push(filtro.aluno_id)
  }
  if (filtro?.data_inicio) {
    sql += ' AND p.data >= ?'
    params.push(filtro.data_inicio)
  }
  if (filtro?.data_fim) {
    sql += ' AND p.data <= ?'
    params.push(filtro.data_fim)
  }
  sql += ' ORDER BY p.data DESC'
  return query<PagamentoComAluno>(sql, params)
}

// ==========================================
// ---- AULAS ----
// ==========================================

export async function listAulas(
  autoescolaId: number,
  filtro?: { data_inicio?: string; data_fim?: string; aluno_id?: number }
): Promise<Aula[]> {
  let sql = `
    SELECT a.*, al.nome as aluno_nome, i.nome as instrutor_nome, v.nome as veiculo_nome
    FROM aulas a
    LEFT JOIN alunos al ON a.aluno_id = al.id
    LEFT JOIN instrutores i ON a.instrutor_id = i.id
    LEFT JOIN veiculos v ON a.veiculo_id = v.id
    WHERE a.autoescola_id = ?
  `
  const params: unknown[] = [autoescolaId]

  if (filtro?.data_inicio && filtro?.data_fim) {
    sql += ' AND a.data BETWEEN ? AND ?'
    params.push(filtro.data_inicio, filtro.data_fim)
  }
  if (filtro?.aluno_id) {
    sql += ' AND a.aluno_id = ?'
    params.push(filtro.aluno_id)
  }
  sql += ' ORDER BY a.data, a.hora_inicio'
  return query<Aula>(sql, params)
}

interface CampoAula {
  veiculo_id: number | null
  instrutor_id: number | null
  data: string
  hora_inicio: string
  hora_fim: string
}

async function verificarConflito(
  autoescolaId: number,
  aula: CampoAula,
  excluirId?: number
): Promise<string | null> {
  const conflitos: string[] = []

  if (aula.veiculo_id != null) {
    const veiculoNomes = await query<{ nome: string }>(
      `SELECT v.nome AS nome
       FROM aulas a JOIN veiculos v ON a.veiculo_id = v.id
       WHERE a.autoescola_id = ? AND a.veiculo_id = ? AND a.data = ? AND a.id != ?
         AND a.hora_inicio < ? AND a.hora_fim > ? AND a.status != 'cancelada'`,
      [autoescolaId, aula.veiculo_id, aula.data, excluirId ?? 0, aula.hora_fim, aula.hora_inicio]
    )
    if (veiculoNomes.length > 0) {
      conflitos.push(`o veículo "${veiculoNomes[0].nome}"`)
    }
  }

  if (aula.instrutor_id != null) {
    const instrutorNomes = await query<{ nome: string }>(
      `SELECT i.nome AS nome
       FROM aulas a JOIN instrutores i ON a.instrutor_id = i.id
       WHERE a.autoescola_id = ? AND a.instrutor_id = ? AND a.data = ? AND a.id != ?
         AND a.hora_inicio < ? AND a.hora_fim > ? AND a.status != 'cancelada'`,
      [autoescolaId, aula.instrutor_id, aula.data, excluirId ?? 0, aula.hora_fim, aula.hora_inicio]
    )
    if (instrutorNomes.length > 0) {
      conflitos.push(`o instrutor "${instrutorNomes[0].nome}"`)
    }
  }

  if (conflitos.length > 0) {
    return `Conflito de horário: ${conflitos.join(' e ')} já possui(em) aula agendada neste período (${aula.hora_inicio} às ${aula.hora_fim}).`
  }
  return null
}

export async function createAula(
  autoescolaId: number,
  aula: Omit<Aula, 'id' | 'criado_em'>
): Promise<Aula> {
  const campo: CampoAula = {
    veiculo_id: aula.veiculo_id ?? null,
    instrutor_id: aula.instrutor_id ?? null,
    data: aula.data,
    hora_inicio: aula.hora_inicio,
    hora_fim: aula.hora_fim
  }
  const conflito = await verificarConflito(autoescolaId, campo)
  if (conflito) {
    throw new Error(conflito)
  }

  const result = await execute(
    'INSERT INTO aulas (autoescola_id, aluno_id, instrutor_id, veiculo_id, data, hora_inicio, hora_fim, categoria, tipo, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      autoescolaId,
      aula.aluno_id,
      aula.instrutor_id ?? null,
      aula.veiculo_id ?? null,
      aula.data,
      aula.hora_inicio,
      aula.hora_fim,
      aula.categoria,
      aula.tipo,
      aula.status ?? 'agendada',
      aula.observacoes
    ]
  )
  return (await queryOne<Aula>('SELECT * FROM aulas WHERE autoescola_id = ? AND id = ?', [
    autoescolaId,
    result.lastInsertRowid
  ]))!
}

export async function updateAula(
  autoescolaId: number,
  id: number,
  aula: Partial<Aula>
): Promise<void> {
  const current = await queryOne<Aula>('SELECT * FROM aulas WHERE autoescola_id = ? AND id = ?', [
    autoescolaId,
    id
  ])
  if (!current) return

  const campo: CampoAula = {
    veiculo_id:
      aula.veiculo_id === undefined ? (current.veiculo_id ?? null) : (aula.veiculo_id ?? null),
    instrutor_id:
      aula.instrutor_id === undefined
        ? (current.instrutor_id ?? null)
        : (aula.instrutor_id ?? null),
    data: aula.data ?? current.data,
    hora_inicio: aula.hora_inicio ?? current.hora_inicio,
    hora_fim: aula.hora_fim ?? current.hora_fim
  }
  const conflito = await verificarConflito(autoescolaId, campo, id)
  if (conflito) {
    throw new Error(conflito)
  }

  await execute(
    'UPDATE aulas SET aluno_id = ?, instrutor_id = ?, veiculo_id = ?, data = ?, hora_inicio = ?, hora_fim = ?, categoria = ?, tipo = ?, status = ?, observacoes = ? WHERE autoescola_id = ? AND id = ?',
    [
      aula.aluno_id ?? current.aluno_id,
      aula.instrutor_id === undefined ? current.instrutor_id : (aula.instrutor_id ?? null),
      aula.veiculo_id === undefined ? current.veiculo_id : (aula.veiculo_id ?? null),
      aula.data ?? current.data,
      aula.hora_inicio ?? current.hora_inicio,
      aula.hora_fim ?? current.hora_fim,
      aula.categoria ?? current.categoria,
      aula.tipo ?? current.tipo,
      aula.status ?? current.status,
      aula.observacoes ?? current.observacoes,
      autoescolaId,
      id
    ]
  )
}

export async function deleteAula(autoescolaId: number, id: number): Promise<void> {
  await execute('DELETE FROM aulas WHERE autoescola_id = ? AND id = ?', [autoescolaId, id])
}

// ==========================================
// ---- GASTOS ----
// ==========================================

export async function listGastos(
  autoescolaId: number,
  filtro?: { data_inicio?: string; data_fim?: string }
): Promise<Gasto[]> {
  let sql = 'SELECT * FROM gastos WHERE autoescola_id = ?'
  const params: unknown[] = [autoescolaId]
  if (filtro?.data_inicio && filtro?.data_fim) {
    sql += ' AND data BETWEEN ? AND ?'
    params.push(filtro.data_inicio, filtro.data_fim)
  }
  sql += ' ORDER BY data DESC'
  return query<Gasto>(sql, params)
}

export async function createGasto(
  autoescolaId: number,
  gasto: Omit<Gasto, 'id' | 'criado_em'>
): Promise<Gasto> {
  const result = await execute(
    'INSERT INTO gastos (autoescola_id, descricao, categoria, valor, data) VALUES (?, ?, ?, ?, ?)',
    [autoescolaId, gasto.descricao, gasto.categoria, gasto.valor, gasto.data]
  )
  return (await queryOne<Gasto>('SELECT * FROM gastos WHERE autoescola_id = ? AND id = ?', [
    autoescolaId,
    result.lastInsertRowid
  ]))!
}

export async function updateGasto(
  autoescolaId: number,
  id: number,
  gasto: Partial<Gasto>
): Promise<void> {
  const current = await queryOne<Gasto>('SELECT * FROM gastos WHERE autoescola_id = ? AND id = ?', [
    autoescolaId,
    id
  ])
  if (!current) return
  await execute(
    'UPDATE gastos SET descricao = ?, categoria = ?, valor = ?, data = ? WHERE autoescola_id = ? AND id = ?',
    [
      gasto.descricao ?? current.descricao,
      gasto.categoria ?? current.categoria,
      gasto.valor ?? current.valor,
      gasto.data ?? current.data,
      autoescolaId,
      id
    ]
  )
}

export async function deleteGasto(autoescolaId: number, id: number): Promise<void> {
  await execute('DELETE FROM gastos WHERE autoescola_id = ? AND id = ?', [autoescolaId, id])
}

export async function totalGastosPeriodo(
  autoescolaId: number,
  data_inicio: string,
  data_fim: string
): Promise<number> {
  const row = await queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(valor), 0) as total FROM gastos WHERE autoescola_id = ? AND data BETWEEN ? AND ?',
    [autoescolaId, data_inicio, data_fim]
  )
  return row?.total || 0
}

// ==========================================
// ---- RELATÓRIOS FINANCEIROS ----
// ==========================================

export async function resumoFinanceiro(
  autoescolaId: number,
  data_inicio: string,
  data_fim: string
): Promise<{
  total_recebido: number
  total_gastos: number
  lucro: number
  por_categoria: Record<string, number>
}> {
  const recebido = await queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE autoescola_id = ? AND data BETWEEN ? AND ?',
    [autoescolaId, data_inicio, data_fim]
  )

  const gastos = await totalGastosPeriodo(autoescolaId, data_inicio, data_fim)

  const porCategoria = await query<{ categoria: string; total: number }>(
    'SELECT categoria, COALESCE(SUM(valor), 0) as total FROM gastos WHERE autoescola_id = ? AND data BETWEEN ? AND ? GROUP BY categoria',
    [autoescolaId, data_inicio, data_fim]
  )

  const mapaCategorias: Record<string, number> = {}
  for (const c of porCategoria) {
    mapaCategorias[c.categoria] = c.total
  }

  const totalRec = recebido?.total || 0
  return {
    total_recebido: totalRec,
    total_gastos: gastos,
    lucro: totalRec - gastos,
    por_categoria: mapaCategorias
  }
}

// ==========================================
// ---- HORÁRIOS ----
// ==========================================

export async function listHorarios(autoescolaId: number): Promise<HorarioFuncionamento[]> {
  return query<HorarioFuncionamento>(
    'SELECT * FROM horarios_funcionamento WHERE autoescola_id = ? ORDER BY dia_semana',
    [autoescolaId]
  )
}

export async function updateHorario(
  autoescolaId: number,
  id: number,
  horario: Partial<HorarioFuncionamento>
): Promise<void> {
  const current = await queryOne<HorarioFuncionamento>(
    'SELECT * FROM horarios_funcionamento WHERE autoescola_id = ? AND id = ?',
    [autoescolaId, id]
  )
  if (!current) return
  await execute(
    'UPDATE horarios_funcionamento SET dia_semana = ?, hora_inicio = ?, hora_fim = ?, ativo = ? WHERE autoescola_id = ? AND id = ?',
    [
      horario.dia_semana ?? current.dia_semana,
      horario.hora_inicio ?? current.hora_inicio,
      horario.hora_fim ?? current.hora_fim,
      horario.ativo === undefined ? current.ativo : horario.ativo ? 1 : 0,
      autoescolaId,
      id
    ]
  )
}

// ==========================================
// ---- CONFIGURAÇÕES ----
// ==========================================

export async function getConfiguracoes(autoescolaId: number): Promise<Configuracao> {
  const rows = await query<{ chave: string; valor: string }>(
    'SELECT chave, valor FROM configuracoes WHERE autoescola_id = ?',
    [autoescolaId]
  )
  const config: Record<string, string> = {}
  for (const r of rows) {
    config[r.chave] = r.valor
  }
  return {
    autoescola_id: autoescolaId,
    nome_autoescola: config['nome_autoescola'] ?? 'Autoescola',
    horario_padrao_inicio: config['horario_padrao_inicio'] ?? '08:00',
    duracao_padrao_minutos: Number(config['duracao_padrao_minutos'] ?? 50),
    backup_automatico: config['backup_automatico'] === 'true',
    backup_intervalo_dias: Number(config['backup_intervalo_dias'] ?? 7),
    ultimo_backup: config['ultimo_backup'] ?? null,
    modo_agenda: (config['modo_agenda'] as 'grade' | 'calendario') ?? 'grade',
    grade_horarios_manha:
      config['grade_horarios_manha'] ?? '08:00, 08:50, 09:40, 10:30, 11:20',
    grade_horarios_tarde:
      config['grade_horarios_tarde'] ?? '14:00, 14:50, 15:40, 16:30, 17:20'
  }
}

export async function updateConfiguracoes(
  autoescolaId: number,
  config: Partial<Configuracao>
): Promise<void> {
  const set = async (chave: string, valor: string) => {
    await execute(
      'INSERT INTO configuracoes (autoescola_id, chave, valor) VALUES (?, ?, ?) ON CONFLICT(autoescola_id, chave) DO UPDATE SET valor = excluded.valor',
      [autoescolaId, chave, valor]
    )
  }

  if (config.nome_autoescola !== undefined) await set('nome_autoescola', config.nome_autoescola)
  if (config.horario_padrao_inicio !== undefined)
    await set('horario_padrao_inicio', config.horario_padrao_inicio)
  if (config.duracao_padrao_minutos !== undefined)
    await set('duracao_padrao_minutos', String(config.duracao_padrao_minutos))
  if (config.backup_automatico !== undefined)
    await set('backup_automatico', String(config.backup_automatico))
  if (config.backup_intervalo_dias !== undefined)
    await set('backup_intervalo_dias', String(config.backup_intervalo_dias))
  if (config.ultimo_backup !== undefined && config.ultimo_backup !== null)
    await set('ultimo_backup', config.ultimo_backup)
  if (config.modo_agenda !== undefined) await set('modo_agenda', config.modo_agenda)
  if (config.grade_horarios_manha !== undefined)
    await set('grade_horarios_manha', config.grade_horarios_manha)
  if (config.grade_horarios_tarde !== undefined)
    await set('grade_horarios_tarde', config.grade_horarios_tarde)
}

// ==========================================
// ---- AUTENTICAÇÃO E USUÁRIOS ----
// ==========================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':')
    if (!salt || !key) return false
    const keyBuffer = Buffer.from(key, 'hex')
    const derivedKey = crypto.scryptSync(password, salt, 64)
    return crypto.timingSafeEqual(keyBuffer, derivedKey)
  } catch {
    return false
  }
}

export async function autenticarUsuario(
  usuarioOuEmail: string,
  senha: string
): Promise<AuthResponse> {
  const user = await queryOne<any>(
    `SELECT u.*, i.nome as instrutor_nome,
            ae.nome as autoescola_nome,
            ae.status as autoescola_status,
            ae.pix_chave as autoescola_pix,
            ae.data_vencimento as autoescola_vencimento
     FROM usuarios u
     LEFT JOIN instrutores i ON u.instrutor_id = i.id
     LEFT JOIN autoescolas ae ON u.autoescola_id = ae.id
     WHERE LOWER(u.usuario) = LOWER(?) AND u.ativo = 1`,
    [usuarioOuEmail.trim()]
  )

  if (!user || !verifyPassword(senha, user.senha_hash)) {
    throw new Error('Usuário ou senha incorretos')
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiraEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await execute('INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)', [
    token,
    user.id,
    expiraEm
  ])

  const usuarioObj: Usuario = {
    id: user.id,
    autoescola_id: user.autoescola_id,
    nome: user.nome,
    usuario: user.usuario,
    perfil: user.perfil,
    instrutor_id: user.instrutor_id,
    ativo: user.ativo,
    criado_em: user.criado_em,
    instrutor_nome: user.instrutor_nome,
    autoescola_nome:
      user.autoescola_nome ||
      (user.perfil === 'superadmin' ? 'Plataforma SaaS Master' : 'Autoescola'),
    autoescola_status: user.autoescola_status || 'ativa',
    autoescola_pix: user.autoescola_pix || 'contato@agendaaulas.app',
    autoescola_vencimento: user.autoescola_vencimento
  }

  return { token, usuario: usuarioObj }
}

export async function validarSessao(token: string): Promise<Usuario | null> {
  if (!token) return null
  const sessao = await queryOne<any>(
    `SELECT u.id, u.autoescola_id, u.nome, u.usuario, u.perfil, u.instrutor_id, u.ativo, u.criado_em,
            i.nome as instrutor_nome,
            ae.nome as autoescola_nome,
            ae.status as autoescola_status,
            ae.pix_chave as autoescola_pix,
            ae.data_vencimento as autoescola_vencimento
     FROM sessoes s
     JOIN usuarios u ON s.usuario_id = u.id
     LEFT JOIN instrutores i ON u.instrutor_id = i.id
     LEFT JOIN autoescolas ae ON u.autoescola_id = ae.id
     WHERE s.token = ? AND u.ativo = 1 AND s.expira_em > datetime('now', 'localtime')`,
    [token]
  )

  if (!sessao) return null

  return {
    id: sessao.id,
    autoescola_id: sessao.autoescola_id,
    nome: sessao.nome,
    usuario: sessao.usuario,
    perfil: sessao.perfil,
    instrutor_id: sessao.instrutor_id,
    ativo: sessao.ativo,
    criado_em: sessao.criado_em,
    instrutor_nome: sessao.instrutor_nome,
    autoescola_nome:
      sessao.autoescola_nome ||
      (sessao.perfil === 'superadmin' ? 'Plataforma SaaS Master' : 'Autoescola'),
    autoescola_status: sessao.autoescola_status || 'ativa',
    autoescola_pix: sessao.autoescola_pix || 'contato@agendaaulas.app',
    autoescola_vencimento: sessao.autoescola_vencimento
  }
}

export async function encerrarSessao(token: string): Promise<void> {
  await execute('DELETE FROM sessoes WHERE token = ?', [token])
}

export async function listUsuarios(autoescolaId?: number | null): Promise<Usuario[]> {
  let sql = `
    SELECT u.id, u.autoescola_id, u.nome, u.usuario, u.perfil, u.instrutor_id, u.ativo, u.criado_em,
           i.nome as instrutor_nome,
           ae.nome as autoescola_nome
    FROM usuarios u
    LEFT JOIN instrutores i ON u.instrutor_id = i.id
    LEFT JOIN autoescolas ae ON u.autoescola_id = ae.id
  `
  const params: any[] = []
  if (autoescolaId != null) {
    sql += ' WHERE u.autoescola_id = ?'
    params.push(autoescolaId)
  }
  sql += ' ORDER BY u.nome ASC'
  return query<Usuario>(sql, params)
}

export async function createUsuario(dados: {
  autoescola_id?: number | null
  nome: string
  usuario: string
  senha: string
  perfil: PerfilUsuario
  instrutor_id?: number | null
}): Promise<Usuario> {
  const existente = await queryOne('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?)', [
    dados.usuario.trim()
  ])
  if (existente) {
    throw new Error('Já existe um usuário cadastrado com este nome de acesso.')
  }

  const senhaHash = hashPassword(dados.senha)
  const result = await execute(
    'INSERT INTO usuarios (autoescola_id, nome, usuario, senha_hash, perfil, instrutor_id, ativo) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [
      dados.autoescola_id ?? null,
      dados.nome.trim(),
      dados.usuario.trim().toLowerCase(),
      senhaHash,
      dados.perfil,
      dados.instrutor_id || null
    ]
  )

  return (await queryOne<Usuario>(
    `SELECT u.id, u.autoescola_id, u.nome, u.usuario, u.perfil, u.instrutor_id, u.ativo, u.criado_em, i.nome as instrutor_nome
     FROM usuarios u
     LEFT JOIN instrutores i ON u.instrutor_id = i.id
     WHERE u.id = ?`,
    [result.lastInsertRowid]
  ))!
}

export async function updateUsuario(
  id: number,
  dados: {
    nome?: string
    usuario?: string
    senha?: string
    perfil?: PerfilUsuario
    instrutor_id?: number | null
    ativo?: number
  }
): Promise<void> {
  if (dados.usuario !== undefined) {
    const outro = await queryOne(
      'SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?) AND id != ?',
      [dados.usuario.trim(), id]
    )
    if (outro) {
      throw new Error('Este nome de usuário já está em uso por outra conta.')
    }
    await execute('UPDATE usuarios SET usuario = ? WHERE id = ?', [
      dados.usuario.trim().toLowerCase(),
      id
    ])
  }
  if (dados.senha) {
    const senhaHash = hashPassword(dados.senha)
    await execute('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [senhaHash, id])
  }
  if (dados.nome !== undefined) {
    await execute('UPDATE usuarios SET nome = ? WHERE id = ?', [dados.nome.trim(), id])
  }
  if (dados.perfil !== undefined) {
    await execute('UPDATE usuarios SET perfil = ? WHERE id = ?', [dados.perfil, id])
  }
  if (dados.instrutor_id !== undefined) {
    await execute('UPDATE usuarios SET instrutor_id = ? WHERE id = ?', [
      dados.instrutor_id || null,
      id
    ])
  }
  if (dados.ativo !== undefined) {
    await execute('UPDATE usuarios SET ativo = ? WHERE id = ?', [dados.ativo, id])
  }
}

export async function deleteUsuario(id: number): Promise<void> {
  const user = await queryOne<{ perfil: string; autoescola_id: number | null }>(
    'SELECT perfil, autoescola_id FROM usuarios WHERE id = ?',
    [id]
  )
  if (user?.perfil === 'superadmin') {
    const count = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM usuarios WHERE perfil = 'superadmin' AND ativo = 1"
    )
    if ((count?.count || 0) <= 1) {
      throw new Error('Não é possível excluir o único superadministrador do SaaS.')
    }
  } else if (user?.perfil === 'admin') {
    const count = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM usuarios WHERE autoescola_id = ? AND perfil = 'admin' AND ativo = 1",
      [user.autoescola_id]
    )
    if ((count?.count || 0) <= 1) {
      throw new Error('Não é possível excluir o único administrador desta autoescola.')
    }
  }
  await execute('DELETE FROM sessoes WHERE usuario_id = ?', [id])
  await execute('DELETE FROM usuarios WHERE id = ?', [id])
}

export async function alterarMinhaSenha(
  usuarioId: number,
  senhaAtual: string,
  novaSenha: string
): Promise<void> {
  const user = await queryOne<{ senha_hash: string }>(
    'SELECT senha_hash FROM usuarios WHERE id = ?',
    [usuarioId]
  )
  if (!user || !verifyPassword(senhaAtual, user.senha_hash)) {
    throw new Error('A senha atual está incorreta.')
  }
  if (novaSenha.length < 4) {
    throw new Error('A nova senha deve ter no mínimo 4 caracteres.')
  }
  const novoHash = hashPassword(novaSenha)
  await execute('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [novoHash, usuarioId])
}
