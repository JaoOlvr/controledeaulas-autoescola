import { app } from 'electron'
import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'
import type { Instrutor, Veiculo, Aluno, Aula, Gasto, Pagamento, PagamentoComAluno, HorarioFuncionamento, Configuracao } from '@shared/types'

let db: Database.Database

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'data')
  mkdirSync(dataDir, { recursive: true })

  db = new Database(join(dataDir, 'agenda.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  migrateSchema()
  seedInitialData()
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS instrutores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      categoria TEXT,
      status TEXT DEFAULT 'ativo',
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      placa TEXT,
      categoria TEXT,
      status TEXT DEFAULT 'ativo',
      observacoes TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      criado_em TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
      FOREIGN KEY (instrutor_id) REFERENCES instrutores(id) ON DELETE SET NULL,
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      metodo TEXT,
      observacoes TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_semana INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `)
}

function migrateSchema(): void {
  const cols = db.prepare('PRAGMA table_info(aulas)').all() as { name: string }[]
  const hasVeiculo = cols.some((c) => c.name === 'veiculo_id')
  if (!hasVeiculo) {
    db.exec('ALTER TABLE aulas ADD COLUMN veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL')
  }
}

function seedInitialData(): void {
  const veiculoCount = db.prepare('SELECT COUNT(*) as count FROM veiculos').get() as { count: number }
  if (veiculoCount.count === 0) {
    const insert = db.prepare(
      'INSERT INTO veiculos (nome, placa, categoria, status) VALUES (?, ?, ?, ?)'
    )
    const cria = db.transaction(() => {
      insert.run('Carro', '', 'B', 'ativo')
      insert.run('Moto', '', 'A', 'ativo')
    })
    cria()
  }
  const horarioCount = db.prepare('SELECT COUNT(*) as count FROM horarios_funcionamento').get() as { count: number }
  if (horarioCount.count === 0) {
    const insert = db.prepare('INSERT INTO horarios_funcionamento (dia_semana, hora_inicio, hora_fim) VALUES (?, ?, ?)')
    const dias = [
      [1, '08:00', '18:00'],
      [2, '08:00', '18:00'],
      [3, '08:00', '18:00'],
      [4, '08:00', '18:00'],
      [5, '08:00', '18:00'],
      [6, '08:00', '12:00']
    ]
    const createAll = db.transaction(() => {
      for (const [dia, inicio, fim] of dias) {
        insert.run(dia, inicio, fim)
      }
    })
    createAll()
  }

  const configCount = db.prepare('SELECT COUNT(*) as count FROM configuracoes').get() as { count: number }
  if (configCount.count === 0) {
    const insert = db.prepare('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)')
    insert.run('nome_autoescola', 'Autoescola')
    insert.run('horario_padrao_inicio', '08:00')
    insert.run('duracao_padrao_minutos', '60')
    insert.run('backup_automatico', 'true')
    insert.run('backup_intervalo_dias', '7')
  }
}

export function getDatabase(): Database.Database {
  return db
}

// ---- INSTRUTORES ----
export function listInstrutores(filtro?: { status?: string }): Instrutor[] {
  if (filtro?.status) {
    return db.prepare('SELECT * FROM instrutores WHERE status = ? ORDER BY nome').all(filtro.status) as Instrutor[]
  }
  return db.prepare('SELECT * FROM instrutores ORDER BY nome').all() as Instrutor[]
}

export function createInstrutor(instrutor: Omit<Instrutor, 'id' | 'criado_em'>): Instrutor {
  const result = db
    .prepare('INSERT INTO instrutores (nome, telefone, categoria, status) VALUES (?, ?, ?, ?)')
    .run(instrutor.nome, instrutor.telefone, instrutor.categoria, instrutor.status ?? 'ativo')
  return getInstrutor(Number(result.lastInsertRowid))!
}

export function getInstrutor(id: number): Instrutor | undefined {
  return db.prepare('SELECT * FROM instrutores WHERE id = ?').get(id) as Instrutor | undefined
}

export function updateInstrutor(id: number, instrutor: Partial<Instrutor>): void {
  const current = getInstrutor(id)
  if (!current) return
  db.prepare('UPDATE instrutores SET nome = ?, telefone = ?, categoria = ?, status = ? WHERE id = ?').run(
    instrutor.nome ?? current.nome,
    instrutor.telefone ?? current.telefone,
    instrutor.categoria ?? current.categoria,
    instrutor.status ?? current.status,
    id
  )
}

export function deleteInstrutor(id: number): void {
  db.prepare('UPDATE instrutores SET status = ? WHERE id = ?').run('inativo', id)
}

// ---- VEÍCULOS ----
export function listVeiculos(filtro?: { status?: string }): Veiculo[] {
  const sql = filtro?.status
    ? 'SELECT * FROM veiculos WHERE status = ? ORDER BY nome'
    : 'SELECT * FROM veiculos ORDER BY nome'
  return (filtro?.status
    ? db.prepare(sql).all(filtro.status)
    : db.prepare(sql).all()) as Veiculo[]
}

export function createVeiculo(veiculo: Omit<Veiculo, 'id' | 'criado_em'>): Veiculo {
  const result = db
    .prepare('INSERT INTO veiculos (nome, placa, categoria, status, observacoes) VALUES (?, ?, ?, ?, ?)')
    .run(
      veiculo.nome,
      veiculo.placa ?? '',
      veiculo.categoria ?? '',
      veiculo.status ?? 'ativo',
      veiculo.observacoes ?? ''
    )
  return getVeiculo(Number(result.lastInsertRowid))!
}

export function getVeiculo(id: number): Veiculo | undefined {
  return db.prepare('SELECT * FROM veiculos WHERE id = ?').get(id) as Veiculo | undefined
}

export function updateVeiculo(id: number, veiculo: Partial<Veiculo>): void {
  const current = getVeiculo(id)
  if (!current) return
  db.prepare(
    'UPDATE veiculos SET nome = ?, placa = ?, categoria = ?, status = ?, observacoes = ? WHERE id = ?'
  ).run(
    veiculo.nome ?? current.nome,
    veiculo.placa ?? current.placa,
    veiculo.categoria ?? current.categoria,
    veiculo.status ?? current.status,
    veiculo.observacoes ?? current.observacoes,
    id
  )
}

export function deleteVeiculo(id: number): void {
  db.prepare('UPDATE veiculos SET status = ? WHERE id = ?').run('inativo', id)
}

// ---- ALUNOS ----
export function listAlunos(filtro?: { status?: string; busca?: string }): Aluno[] {
  let sql = 'SELECT a.*, (a.orcamento_total - a.orcamento_pago) as saldo_devedor FROM alunos a'
  const condicoes: string[] = []
  const params: unknown[] = []

  if (filtro?.status) {
    condicoes.push('a.status = ?')
    params.push(filtro.status)
  }
  if (filtro?.busca) {
    condicoes.push('(a.nome LIKE ? OR a.cpf LIKE ? OR a.telefone LIKE ?)')
    params.push(`%${filtro.busca}%`, `%${filtro.busca}%`, `%${filtro.busca}%`)
  }
  if (condicoes.length > 0) {
    sql += ' WHERE ' + condicoes.join(' AND ')
  }
  sql += ' ORDER BY a.nome'
  return db.prepare(sql).all(...params) as Aluno[]
}

export function createAluno(aluno: Omit<Aluno, 'id' | 'criado_em' | 'status'> & { status?: string }): Aluno {
  const result = db
    .prepare(
      'INSERT INTO alunos (nome, telefone, cpf, categoria, orcamento_total, orcamento_pago, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      aluno.nome,
      aluno.telefone,
      aluno.cpf,
      aluno.categoria,
      aluno.orcamento_total,
      aluno.orcamento_pago ?? 0,
      aluno.status ?? 'ativo'
    )
  return getAluno(Number(result.lastInsertRowid))!
}

export function getAluno(id: number): Aluno | undefined {
  return db
    .prepare('SELECT a.*, (a.orcamento_total - a.orcamento_pago) as saldo_devedor FROM alunos a WHERE a.id = ?')
    .get(id) as Aluno | undefined
}

export function updateAluno(id: number, aluno: Partial<Aluno>): void {
  const current = getAluno(id)
  if (!current) return
  db.prepare(
    'UPDATE alunos SET nome = ?, telefone = ?, cpf = ?, categoria = ?, orcamento_total = ?, orcamento_pago = ?, status = ? WHERE id = ?'
  ).run(
    aluno.nome ?? current.nome,
    aluno.telefone ?? current.telefone,
    aluno.cpf ?? current.cpf,
    aluno.categoria ?? current.categoria,
    aluno.orcamento_total ?? current.orcamento_total,
    aluno.orcamento_pago ?? current.orcamento_pago,
    aluno.status ?? current.status,
    id
  )
}

export function deleteAluno(id: number): void {
  db.prepare('DELETE FROM alunos WHERE id = ?').run(id)
}

export function registrarPagamento(pagamento: Omit<Pagamento, 'id' | 'criado_em'> & { valor: number }): Pagamento {
  const result = db
    .prepare('INSERT INTO pagamentos (aluno_id, valor, data, metodo, observacoes) VALUES (?, ?, ?, ?, ?)')
    .run(pagamento.aluno_id, pagamento.valor, pagamento.data, pagamento.metodo, pagamento.observacoes)

  db.prepare('UPDATE alunos SET orcamento_pago = orcamento_pago + ? WHERE id = ?').run(
    pagamento.valor,
    pagamento.aluno_id
  )

  return db
    .prepare('SELECT * FROM pagamentos WHERE id = ?')
    .get(result.lastInsertRowid) as Pagamento
}

export function listPagamentos(filtro?: {
  aluno_id?: number
  data_inicio?: string
  data_fim?: string
}): PagamentoComAluno[] {
  let sql =
    'SELECT p.*, al.nome as aluno_nome FROM pagamentos p LEFT JOIN alunos al ON p.aluno_id = al.id'
  const condicoes: string[] = []
  const params: unknown[] = []

  if (filtro?.aluno_id) {
    condicoes.push('p.aluno_id = ?')
    params.push(filtro.aluno_id)
  }
  if (filtro?.data_inicio) {
    condicoes.push('p.data >= ?')
    params.push(filtro.data_inicio)
  }
  if (filtro?.data_fim) {
    condicoes.push('p.data <= ?')
    params.push(filtro.data_fim)
  }
  if (condicoes.length > 0) {
    sql += ' WHERE ' + condicoes.join(' AND ')
  }
  sql += ' ORDER BY p.data DESC'
  return db.prepare(sql).all(...params) as PagamentoComAluno[]
}

// ---- AULAS ----
export function listAulas(filtro?: { data_inicio?: string; data_fim?: string; aluno_id?: number }): Aula[] {
  let sql = `
    SELECT a.*, al.nome as aluno_nome, i.nome as instrutor_nome, v.nome as veiculo_nome
    FROM aulas a
    LEFT JOIN alunos al ON a.aluno_id = al.id
    LEFT JOIN instrutores i ON a.instrutor_id = i.id
    LEFT JOIN veiculos v ON a.veiculo_id = v.id
  `
  const condicoes: string[] = []
  const params: unknown[] = []

  if (filtro?.data_inicio && filtro?.data_fim) {
    condicoes.push('a.data BETWEEN ? AND ?')
    params.push(filtro.data_inicio, filtro.data_fim)
  }
  if (filtro?.aluno_id) {
    condicoes.push('a.aluno_id = ?')
    params.push(filtro.aluno_id)
  }
  if (condicoes.length > 0) {
    sql += ' WHERE ' + condicoes.join(' AND ')
  }
  sql += ' ORDER BY a.data, a.hora_inicio'
  return db.prepare(sql).all(...params) as Aula[]
}

interface CampoAula {
  veiculo_id: number | null
  instrutor_id: number | null
  data: string
  hora_inicio: string
  hora_fim: string
}

function verificarConflito(aula: CampoAula, excluirId?: number): string | null {
  const conflitos: string[] = []

  const veiculoNomes = db
    .prepare(
      `SELECT v.nome AS nome
       FROM aulas a JOIN veiculos v ON a.veiculo_id = v.id
       WHERE a.veiculo_id = ? AND a.data = ? AND a.id != ?
         AND a.hora_inicio < ? AND a.hora_fim > ? AND a.status != 'cancelada'`
    )
    .all(aula.veiculo_id, aula.data, excluirId ?? 0, aula.hora_fim, aula.hora_inicio) as { nome: string }[]
  if (aula.veiculo_id != null && veiculoNomes.length > 0) {
    conflitos.push(`o veículo "${veiculoNomes[0].nome}"`)
  }

  const instrutorNomes = db
    .prepare(
      `SELECT i.nome AS nome
       FROM aulas a JOIN instrutores i ON a.instrutor_id = i.id
       WHERE a.instrutor_id = ? AND a.data = ? AND a.id != ?
         AND a.hora_inicio < ? AND a.hora_fim > ? AND a.status != 'cancelada'`
    )
    .all(aula.instrutor_id, aula.data, excluirId ?? 0, aula.hora_fim, aula.hora_inicio) as { nome: string }[]
  if (aula.instrutor_id != null && instrutorNomes.length > 0) {
    conflitos.push(`o instrutor "${instrutorNomes[0].nome}"`)
  }

  if (conflitos.length > 0) {
    return `Conflito de horário: ${conflitos.join(' e ')} já possui(em) aula agendada neste período (${aula.hora_inicio} às ${aula.hora_fim}).`
  }
  return null
}

export function createAula(aula: Omit<Aula, 'id' | 'criado_em'>): Aula {
  const campo: CampoAula = {
    veiculo_id: aula.veiculo_id ?? null,
    instrutor_id: aula.instrutor_id ?? null,
    data: aula.data,
    hora_inicio: aula.hora_inicio,
    hora_fim: aula.hora_fim
  }
  const conflito = verificarConflito(campo)
  if (conflito) {
    throw new Error(conflito)
  }

  const result = db
    .prepare(
      'INSERT INTO aulas (aluno_id, instrutor_id, veiculo_id, data, hora_inicio, hora_fim, categoria, tipo, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
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
    )
  return db.prepare('SELECT * FROM aulas WHERE id = ?').get(result.lastInsertRowid) as Aula
}

export function updateAula(id: number, aula: Partial<Aula>): void {
  const current = db.prepare('SELECT * FROM aulas WHERE id = ?').get(id) as Aula | undefined
  if (!current) return

  const campo: CampoAula = {
    veiculo_id: aula.veiculo_id === undefined ? (current.veiculo_id ?? null) : (aula.veiculo_id ?? null),
    instrutor_id: aula.instrutor_id === undefined ? (current.instrutor_id ?? null) : (aula.instrutor_id ?? null),
    data: aula.data ?? current.data,
    hora_inicio: aula.hora_inicio ?? current.hora_inicio,
    hora_fim: aula.hora_fim ?? current.hora_fim
  }
  const conflito = verificarConflito(campo, id)
  if (conflito) {
    throw new Error(conflito)
  }

  db.prepare(
    'UPDATE aulas SET aluno_id = ?, instrutor_id = ?, veiculo_id = ?, data = ?, hora_inicio = ?, hora_fim = ?, categoria = ?, tipo = ?, status = ?, observacoes = ? WHERE id = ?'
  ).run(
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
    id
  )
}

export function deleteAula(id: number): void {
  db.prepare('DELETE FROM aulas WHERE id = ?').run(id)
}

// ---- GASTOS ----
export function listGastos(filtro?: { data_inicio?: string; data_fim?: string }): Gasto[] {
  let sql = 'SELECT * FROM gastos'
  const params: unknown[] = []
  if (filtro?.data_inicio && filtro?.data_fim) {
    sql += ' WHERE data BETWEEN ? AND ?'
    params.push(filtro.data_inicio, filtro.data_fim)
  }
  sql += ' ORDER BY data DESC'
  return db.prepare(sql).all(...params) as Gasto[]
}

export function createGasto(gasto: Omit<Gasto, 'id' | 'criado_em'>): Gasto {
  const result = db
    .prepare('INSERT INTO gastos (descricao, categoria, valor, data) VALUES (?, ?, ?, ?)')
    .run(gasto.descricao, gasto.categoria, gasto.valor, gasto.data)
  return db.prepare('SELECT * FROM gastos WHERE id = ?').get(result.lastInsertRowid) as Gasto
}

export function updateGasto(id: number, gasto: Partial<Gasto>): void {
  const current = db.prepare('SELECT * FROM gastos WHERE id = ?').get(id) as Gasto | undefined
  if (!current) return
  db.prepare('UPDATE gastos SET descricao = ?, categoria = ?, valor = ?, data = ? WHERE id = ?').run(
    gasto.descricao ?? current.descricao,
    gasto.categoria ?? current.categoria,
    gasto.valor ?? current.valor,
    gasto.data ?? current.data,
    id
  )
}

export function deleteGasto(id: number): void {
  db.prepare('DELETE FROM gastos WHERE id = ?').run(id)
}

export function totalGastosPeriodo(data_inicio: string, data_fim: string): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(valor), 0) as total FROM gastos WHERE data BETWEEN ? AND ?')
    .get(data_inicio, data_fim) as { total: number }
  return row.total
}

// ---- RELATÓRIOS FINANCEIROS ----
export function resumoFinanceiro(data_inicio: string, data_fim: string): {
  total_recebido: number
  total_gastos: number
  lucro: number
  por_categoria: Record<string, number>
} {
  const recebido = db
    .prepare('SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE data BETWEEN ? AND ?')
    .get(data_inicio, data_fim) as { total: number }

  const gastos = totalGastosPeriodo(data_inicio, data_fim)

  const porCategoria = db
    .prepare('SELECT categoria, COALESCE(SUM(valor), 0) as total FROM gastos WHERE data BETWEEN ? AND ? GROUP BY categoria')
    .all(data_inicio, data_fim) as { categoria: string; total: number }[]

  const mapaCategorias: Record<string, number> = {}
  for (const c of porCategoria) {
    mapaCategorias[c.categoria] = c.total
  }

  return {
    total_recebido: recebido.total,
    total_gastos: gastos,
    lucro: recebido.total - gastos,
    por_categoria: mapaCategorias
  }
}

// ---- HORÁRIOS ----
export function listHorarios(): HorarioFuncionamento[] {
  return db.prepare('SELECT * FROM horarios_funcionamento ORDER BY dia_semana').all() as HorarioFuncionamento[]
}

export function updateHorario(id: number, horario: Partial<HorarioFuncionamento>): void {
  const current = db.prepare('SELECT * FROM horarios_funcionamento WHERE id = ?').get(id) as HorarioFuncionamento | undefined
  if (!current) return
  db.prepare('UPDATE horarios_funcionamento SET dia_semana = ?, hora_inicio = ?, hora_fim = ?, ativo = ? WHERE id = ?').run(
    horario.dia_semana ?? current.dia_semana,
    horario.hora_inicio ?? current.hora_inicio,
    horario.hora_fim ?? current.hora_fim,
    horario.ativo === undefined ? current.ativo : (horario.ativo ? 1 : 0),
    id
  )
}

// ---- CONFIGURAÇÕES ----
export function getConfiguracoes(): Configuracao {
  const rows = db.prepare('SELECT chave, valor FROM configuracoes').all() as { chave: string; valor: string }[]
  const config: Record<string, string> = {}
  for (const r of rows) {
    config[r.chave] = r.valor
  }
  return {
    nome_autoescola: config['nome_autoescola'] ?? 'Autoescola',
    horario_padrao_inicio: config['horario_padrao_inicio'] ?? '08:00',
    duracao_padrao_minutos: Number(config['duracao_padrao_minutos'] ?? 60),
    backup_automatico: config['backup_automatico'] === 'true',
    backup_intervalo_dias: Number(config['backup_intervalo_dias'] ?? 7),
    ultimo_backup: config['ultimo_backup'] ?? null
  }
}

export function updateConfiguracoes(config: Partial<Configuracao>): void {
  const update = db.prepare('UPDATE configuracoes SET valor = ? WHERE chave = ?')
  const insertIfNotExists = db.prepare('INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)')

  const set = (chave: string, valor: string) => {
    const result = update.run(valor, chave)
    if (result.changes === 0) {
      insertIfNotExists.run(chave, valor)
    }
  }

  if (config.nome_autoescola !== undefined) set('nome_autoescola', config.nome_autoescola)
  if (config.horario_padrao_inicio !== undefined) set('horario_padrao_inicio', config.horario_padrao_inicio)
  if (config.duracao_padrao_minutos !== undefined) set('duracao_padrao_minutos', String(config.duracao_padrao_minutos))
  if (config.backup_automatico !== undefined) set('backup_automatico', String(config.backup_automatico))
  if (config.backup_intervalo_dias !== undefined) set('backup_intervalo_dias', String(config.backup_intervalo_dias))
  if (config.ultimo_backup !== undefined && config.ultimo_backup !== null) set('ultimo_backup', config.ultimo_backup)
}
