import { ipcMain, Notification } from 'electron'
import {
  listAutoescolas,
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
import { makeBackup, backupToLocation, listBackups, exportAsJson } from './backup'
import { getServerInfo } from './server'

export function registerIpcHandlers(): void {
  // ---- Instrutores ----
  ipcMain.handle('instrutores:list', (_e, filtro) => listInstrutores(1, filtro))
  ipcMain.handle('instrutores:create', (_e, instrutor) => createInstrutor(1, instrutor))
  ipcMain.handle('instrutores:update', (_e, id, instrutor) => updateInstrutor(1, id, instrutor))
  ipcMain.handle('instrutores:delete', (_e, id) => deleteInstrutor(1, id))

  // ---- Veículos ----
  ipcMain.handle('veiculos:list', (_e, filtro) => listVeiculos(1, filtro))
  ipcMain.handle('veiculos:create', (_e, veiculo) => createVeiculo(1, veiculo))
  ipcMain.handle('veiculos:update', (_e, id, veiculo) => updateVeiculo(1, id, veiculo))
  ipcMain.handle('veiculos:delete', (_e, id) => deleteVeiculo(1, id))

  // ---- Alunos ----
  ipcMain.handle('alunos:list', (_e, filtro) => listAlunos(1, filtro))
  ipcMain.handle('alunos:create', (_e, aluno) => createAluno(1, aluno))
  ipcMain.handle('alunos:get', (_e, id) => getAluno(1, id))
  ipcMain.handle('alunos:update', (_e, id, aluno) => updateAluno(1, id, aluno))
  ipcMain.handle('alunos:delete', (_e, id) => deleteAluno(1, id))

  // ---- Pagamentos ----
  ipcMain.handle('pagamentos:create', (_e, pagamento) => registrarPagamento(1, pagamento))
  ipcMain.handle('pagamentos:list', (_e, filtro) => listPagamentos(1, filtro))

  // ---- Aulas ----
  ipcMain.handle('aulas:list', (_e, filtro) => listAulas(1, filtro))
  ipcMain.handle('aulas:create', (_e, aula) => createAula(1, aula))
  ipcMain.handle('aulas:update', (_e, id, aula) => updateAula(1, id, aula))
  ipcMain.handle('aulas:delete', (_e, id) => deleteAula(1, id))

  // ---- Gastos ----
  ipcMain.handle('gastos:list', (_e, filtro) => listGastos(1, filtro))
  ipcMain.handle('gastos:create', (_e, gasto) => createGasto(1, gasto))
  ipcMain.handle('gastos:update', (_e, id, gasto) => updateGasto(1, id, gasto))
  ipcMain.handle('gastos:delete', (_e, id) => deleteGasto(1, id))
  ipcMain.handle('gastos:totalPeriodo', (_e, inicio, fim) => totalGastosPeriodo(1, inicio, fim))

  // ---- Relatórios ----
  ipcMain.handle('financeiro:resumo', (_e, inicio, fim) => resumoFinanceiro(1, inicio, fim))

  // ---- Horários ----
  ipcMain.handle('horarios:list', () => listHorarios(1))
  ipcMain.handle('horarios:update', (_e, id, horario) => updateHorario(1, id, horario))

  // ---- Configurações ----
  ipcMain.handle('config:get', () => getConfiguracoes(1))
  ipcMain.handle('config:update', (_e, config) => updateConfiguracoes(1, config))

  // ---- Backup ----
  ipcMain.handle('backup:make', () => makeBackup())
  ipcMain.handle('backup:toLocation', () => backupToLocation())
  ipcMain.handle('backup:list', () => listBackups())
  ipcMain.handle('backup:exportJson', (_e, filePath) => exportAsJson(filePath))

  // ---- Notificações ----
  ipcMain.handle('notify:send', (_e, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
    return true
  })

  // ---- Servidor Web Local (Tablet) ----
  ipcMain.handle('server:info', () => getServerInfo())

  // ---- Autenticação e Usuários ----
  ipcMain.handle('auth:login', (_e, { usuario, senha }) => autenticarUsuario(usuario, senha))
  ipcMain.handle('auth:me', (_e, token) => validarSessao(token))
  ipcMain.handle('auth:logout', (_e, token) => encerrarSessao(token))
  ipcMain.handle('auth:alterarSenha', (_e, { usuarioId, senhaAtual, novaSenha }) =>
    alterarMinhaSenha(usuarioId, senhaAtual, novaSenha)
  )
  ipcMain.handle('usuarios:list', () => listUsuarios(1))
  ipcMain.handle('usuarios:create', (_e, dados) => createUsuario({ ...dados, autoescola_id: 1 }))
  ipcMain.handle('usuarios:update', (_e, id, dados) => updateUsuario(id, dados))
  ipcMain.handle('usuarios:delete', (_e, id) => deleteUsuario(id))

  // ---- Master SaaS ----
  ipcMain.handle('master:resumo', () => obterResumoSaaS())
  ipcMain.handle('master:autoescolas:list', () => listAutoescolas())
  ipcMain.handle('master:autoescolas:create', (_e, dados) => createAutoescola(dados))
  ipcMain.handle('master:autoescolas:update', (_e, id, dados) => updateAutoescola(id, dados))
  ipcMain.handle('master:autoescolas:delete', (_e, id) => deleteAutoescola(id))
}
