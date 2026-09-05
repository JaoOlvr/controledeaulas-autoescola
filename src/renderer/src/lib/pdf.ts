import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './format'
import type { Aluno, Gasto, PagamentoComAluno, Aula } from '@shared/types'

interface ResumoFinanceiroPDF {
  total_recebido: number
  total_gastos: number
  lucro: number
  por_categoria: Record<string, number>
}

interface ResumoPDF {
  nomeAutoescola?: string
}

type RGB = [number, number, number]

const COR_PRIMARIA: RGB = [79, 70, 229]
const COR_LINHA: RGB = [229, 231, 235]
const COR_TEXTO: RGB = [55, 65, 81]
const COR_ALTERNADA: RGB = [249, 250, 251]
const COR_CINZA: RGB = [155, 163, 175]

function cabecalho(doc: jsPDF, titulo: string, subtitulo: string, resumo?: ResumoPDF): void {
  const nome = resumo?.nomeAutoescola ?? 'Autoescola'

  doc.setFillColor(...COR_PRIMARIA)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 34, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(nome, 14, 16)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório de Gestão de Aulas', 14, 24)

  doc.setFontSize(18)
  doc.text(titulo, 14, 44)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...COR_TEXTO)
  doc.text(subtitulo, 14, 51)
}

function blocoResumo(doc: jsPDF, linhas: { label: string; valor: string; destaque?: boolean }[], y: number): number {
  const largura = 180
  let cursorY = y
  doc.setDrawColor(...COR_LINHA)
  doc.setLineWidth(0.5)
  doc.line(14, cursorY, 14 + largura, cursorY)
  cursorY += 6

  for (const linha of linhas) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COR_TEXTO)
    doc.text(linha.label, 18, cursorY)

    doc.setFont('helvetica', linha.destaque ? 'bold' : 'normal')
    if (linha.destaque) {
      doc.setTextColor(...COR_PRIMARIA)
    } else if (linha.valor.startsWith('-')) {
      doc.setTextColor(239, 68, 68)
    }
    doc.text(linha.valor, 14 + largura, cursorY, { align: 'right' })
    cursorY += 7
  }
  doc.setDrawColor(...COR_LINHA)
  doc.line(14, cursorY + 1, 14 + largura, cursorY + 1)
  return cursorY + 8
}

export async function gerarRelatorioFinanceiro(opts: {
  resumo: ResumoFinanceiroPDF
  pagamentos: PagamentoComAluno[]
  dataInicio: string
  dataFim: string
}): Promise<void> {
  const { resumo, pagamentos, dataInicio, dataFim } = opts
  const config = await window.api.obterConfiguracoes()
  const doc = new jsPDF()

  cabecalho(doc, 'Relatório Financeiro', `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`, {
    nomeAutoescola: config.nome_autoescola
  })

  let y = 58
  y = blocoResumo(
    doc,
    [
      { label: 'Total Recebido', valor: formatCurrency(resumo.total_recebido) },
      { label: 'Total de Gastos', valor: formatCurrency(resumo.total_gastos) },
      { label: 'Lucro no período', valor: formatCurrency(resumo.lucro), destaque: true }
    ],
    y
  )

  const categorias = Object.entries(resumo.por_categoria).map(([c, v]) => [c, formatCurrency(v)])
  if (categorias.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COR_TEXTO)
    doc.text('Gastos por Categoria', 14, y)
    y += 3
    y = addTabelaSimples(doc, categorias, ['Categoria', 'Total'], y)
  }

  if (pagamentos.length > 0) {
    y += 4
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COR_TEXTO)
    doc.text('Pagamentos Recebidos', 14, y)
    y += 4
    const linhas = pagamentos.map((p) => [
      formatDate(p.data),
      p.aluno_nome?.trim() || '',
      p.metodo || '—',
      formatCurrency(p.valor)
    ])
    addTabelaSimples(doc, linhas, ['Data', 'Aluno', 'Método', 'Valor'], y)
  } else {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...COR_CINZA)
    doc.text('Nenhum pagamento registrado no período.', 14, y)
  }

  rodapeComTabelas(doc)
  doc.save(`relatorio-financeiro-${dataInicio}-a-${dataFim}.pdf`)
}

export async function gerarRelatorioAlunos(opts: { alunos: Aluno[] }): Promise<void> {
  const { alunos } = opts
  const config = await window.api.obterConfiguracoes()
  const doc = new jsPDF()

  cabecalho(doc, 'Relatório de Alunos', 'Cadastro e situação financeira', {
    nomeAutoescola: config.nome_autoescola
  })

  const comSaldo = alunos as Array<Aluno & { saldo_devedor?: number }>
  const totalOrcamento = comSaldo.reduce((acc, a) => acc + (a.orcamento_total ?? 0), 0)
  const totalPago = comSaldo.reduce((acc, a) => acc + (a.orcamento_pago ?? 0), 0)
  const ativos = comSaldo.filter((a) => a.status === 'ativo').length
  const concluidos = comSaldo.filter((a) => a.status === 'concluido').length

  let y = 58
  y = blocoResumo(
    doc,
    [
      { label: `Total de alunos (${comSaldo.length})`, valor: `${ativos} ativos · ${concluidos} concluídos` },
      { label: 'Orçamento contratado', valor: formatCurrency(totalOrcamento) },
      { label: 'Total recebido', valor: formatCurrency(totalPago), destaque: true }
    ],
    y
  )

  const linhas = comSaldo.map((a) => [
    a.nome?.trim() || '',
    a.categoria || '—',
    a.cpf || '—',
    a.status || 'ativo',
    formatCurrency(a.orcamento_total ?? 0),
    formatCurrency(a.orcamento_pago ?? 0),
    formatCurrency((a.orcamento_total ?? 0) - (a.orcamento_pago ?? 0))
  ])
  y += 4
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR_TEXTO)
  doc.text('Lista de Alunos', 14, y)
  y += 4
  addTabelaSimples(doc, linhas, ['Nome', 'Cat.', 'CPF', 'Status', 'Orçamento', 'Pago', 'Saldo'], y)

  rodapeComTabelas(doc)
  const hoje = new Date().toISOString().split('T')[0]
  doc.save(`relatorio-alunos-${hoje}.pdf`)
}

export async function gerarRelatorioGastos(opts: {
  gastos: Gasto[]
  dataInicio: string
  dataFim: string
}): Promise<void> {
  const { gastos, dataInicio, dataFim } = opts
  const config = await window.api.obterConfiguracoes()
  const doc = new jsPDF()

  cabecalho(doc, 'Relatório de Gastos', `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`, {
    nomeAutoescola: config.nome_autoescola
  })

  const total = gastos.reduce((acc, g) => acc + g.valor, 0)
  const porCat = gastos.reduce<Record<string, number>>((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] ?? 0) + g.valor
    return acc
  }, {})

  let y = 58
  y = blocoResumo(
    doc,
    [
      { label: 'Número de lançamentos', valor: String(gastos.length) },
      { label: 'Total do período', valor: formatCurrency(total), destaque: true }
    ],
    y
  )

  if (Object.keys(porCat).length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COR_TEXTO)
    doc.text('Gastos por Categoria', 14, y)
    y += 3
    y = addTabelaSimples(
      doc,
      Object.entries(porCat).map(([c, v]) => [c, formatCurrency(v)]),
      ['Categoria', 'Total'],
      y
    )
  }

  if (gastos.length > 0) {
    y += 4
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COR_TEXTO)
    doc.text('Lançamentos Detalhados', 14, y)
    y += 4
    const linhas = gastos.map((g) => [
      formatDate(g.data),
      g.descricao?.trim() || '',
      g.categoria,
      formatCurrency(g.valor)
    ])
    addTabelaSimples(doc, linhas, ['Data', 'Descrição', 'Categoria', 'Valor'], y)
  }

  rodapeComTabelas(doc)
  doc.save(`relatorio-gastos-${dataInicio}-a-${dataFim}.pdf`)
}

export async function gerarRelatorioAulas(opts: {
  aulas: Array<Aula & { aluno_nome?: string; instrutor_nome?: string }>
  dataInicio: string
  dataFim: string
}): Promise<void> {
  const { aulas, dataInicio, dataFim } = opts
  const config = await window.api.obterConfiguracoes()
  const doc = new jsPDF()

  cabecalho(doc, 'Agenda de Aulas', `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`, {
    nomeAutoescola: config.nome_autoescola
  })

  const agendadas = aulas.filter((a) => a.status === 'agendada').length
  const realizadas = aulas.filter((a) => a.status === 'realizada').length
  const canceladas = aulas.filter((a) => a.status === 'cancelada').length

  let y = 58
  y = blocoResumo(
    doc,
    [
      { label: `Total de aulas (${aulas.length})`, valor: `${agendadas} agendadas · ${realizadas} realizadas` },
      { label: 'Canceladas', valor: String(canceladas) }
    ],
    y
  )

  if (aulas.length > 0) {
    const linhas = aulas
      .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio))
      .map((a) => [
        formatDate(a.data),
        `${a.hora_inicio} - ${a.hora_fim}`,
        a.aluno_nome?.trim() || '',
        a.instrutor_nome?.trim() || '—',
        a.veiculo_nome?.trim() || '—',
        a.tipo || '—',
        a.status === 'agendada'
          ? 'Agendada'
          : a.status === 'realizada'
            ? 'Realizada'
            : 'Cancelada'
      ])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COR_TEXTO)
    doc.text('Agenda de Aulas', 14, y)
    y += 4
    addTabelaSimples(doc, linhas, ['Data', 'Horário', 'Aluno', 'Instrutor', 'Veículo', 'Tipo', 'Status'], y)
  }

  rodapeComTabelas(doc)
  doc.save(`agenda-aulas-${dataInicio}-a-${dataFim}.pdf`)
}

function addTabelaSimples(doc: jsPDF, linhas: string[][], colunas: string[], startY: number): number {
  autoTable(doc, {
    head: [colunas],
    body: linhas,
    startY,
    margin: { top: 40, right: 14, bottom: 18, left: 14 },
    styles: {
      fontSize: 8.5,
      textColor: COR_TEXTO,
      cellPadding: 2.5
    },
    headStyles: {
      fillColor: COR_PRIMARIA,
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: COR_ALTERNADA
    }
  })
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

function rodapeComTabelas(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  const hoje = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(155, 163, 175)
    doc.text(`Gerado em ${hoje}`, 14, doc.internal.pageSize.getHeight() - 8)
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, {
      align: 'right'
    })
  }
}