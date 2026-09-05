import { ipcMain, Notification } from 'electron'
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
  totalGastosPeriodo
} from './database'
import { makeBackup, backupToLocation, listBackups, exportAsJson } from './backup'

export function registerIpcHandlers(): void {
  // ---- Instrutores ----
  ipcMain.handle('instrutores:list', (_e, filtro) => listInstrutores(filtro))
  ipcMain.handle('instrutores:create', (_e, instrutor) => createInstrutor(instrutor))
  ipcMain.handle('instrutores:update', (_e, id, instrutor) => updateInstrutor(id, instrutor))
  ipcMain.handle('instrutores:delete', (_e, id) => deleteInstrutor(id))

  // ---- Veículos ----
  ipcMain.handle('veiculos:list', (_e, filtro) => listVeiculos(filtro))
  ipcMain.handle('veiculos:create', (_e, veiculo) => createVeiculo(veiculo))
  ipcMain.handle('veiculos:update', (_e, id, veiculo) => updateVeiculo(id, veiculo))
  ipcMain.handle('veiculos:delete', (_e, id) => deleteVeiculo(id))

  // ---- Alunos ----
  ipcMain.handle('alunos:list', (_e, filtro) => listAlunos(filtro))
  ipcMain.handle('alunos:create', (_e, aluno) => createAluno(aluno))
  ipcMain.handle('alunos:get', (_e, id) => getAluno(id))
  ipcMain.handle('alunos:update', (_e, id, aluno) => updateAluno(id, aluno))
  ipcMain.handle('alunos:delete', (_e, id) => deleteAluno(id))

  // ---- Pagamentos ----
  ipcMain.handle('pagamentos:create', (_e, pagamento) => registrarPagamento(pagamento))
  ipcMain.handle('pagamentos:list', (_e, filtro) => listPagamentos(filtro))

  // ---- Aulas ----
  ipcMain.handle('aulas:list', (_e, filtro) => listAulas(filtro))
  ipcMain.handle('aulas:create', (_e, aula) => createAula(aula))
  ipcMain.handle('aulas:update', (_e, id, aula) => updateAula(id, aula))
  ipcMain.handle('aulas:delete', (_e, id) => deleteAula(id))

  // ---- Gastos ----
  ipcMain.handle('gastos:list', (_e, filtro) => listGastos(filtro))
  ipcMain.handle('gastos:create', (_e, gasto) => createGasto(gasto))
  ipcMain.handle('gastos:update', (_e, id, gasto) => updateGasto(id, gasto))
  ipcMain.handle('gastos:delete', (_e, id) => deleteGasto(id))
  ipcMain.handle('gastos:totalPeriodo', (_e, inicio, fim) => totalGastosPeriodo(inicio, fim))

  // ---- Relatórios ----
  ipcMain.handle('financeiro:resumo', (_e, inicio, fim) => resumoFinanceiro(inicio, fim))

  // ---- Horários ----
  ipcMain.handle('horarios:list', () => listHorarios())
  ipcMain.handle('horarios:update', (_e, id, horario) => updateHorario(id, horario))

  // ---- Configurações ----
  ipcMain.handle('config:get', () => getConfiguracoes())
  ipcMain.handle('config:update', (_e, config) => updateConfiguracoes(config))

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
}
