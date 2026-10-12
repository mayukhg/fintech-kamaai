import { describe, expect, it } from 'vitest'
import { SBI_TXNS } from '../data/statement'
import { analyseStatement, buildPassport } from './income'
import { buildPdf } from './pdf'
import { addDays, isExpired, projectReport, reportLines, signatureFor } from './share'
import { formatDate, formatRupeesPdf } from './format'

const figures = buildPassport(analyseStatement(SBI_TXNS, '2026-10-12').credits)

function report(fields: { summary: boolean; months: boolean; platforms: boolean; fullAccount: boolean }) {
  return projectReport({
    figures,
    fields,
    workerName: 'Ravi K.',
    bankMasked: 'SBI ··4521',
    bankFull: '0000004521',
    consentAt: '2026-10-12',
    expiresAt: '2026-11-11',
    young: false,
  })
}

describe('share window', () => {
  it('expires 30 days after consent and stays valid on the expiry date', () => {
    expect(addDays('2026-10-12', 30)).toBe('2026-11-11')
    expect(isExpired('2026-11-11', '2026-11-11')).toBe(false)
    expect(isExpired('2026-11-11', '2026-11-12')).toBe(true)
  })
})

describe('verifier projection', () => {
  it('hides fields the worker did not share and always keeps the flags', () => {
    const hidden = report({ summary: false, months: false, platforms: false, fullAccount: false })
    expect(hidden.median).toBeNull()
    expect(hidden.months).toBeNull()
    expect(hidden.platforms).toBeNull()
    expect(hidden.bankFull).toBeNull()
    expect(hidden.excluded).toEqual({ roundTrip: 5000, oneOff: 40000 })
    expect(hidden.selfReported).toBe(0)
  })

  it('includes the account number only when that field is on', () => {
    const shared = report({ summary: true, months: true, platforms: true, fullAccount: true })
    expect(shared.median).toBe(26800)
    expect(shared.months?.[0].key).toBe('2026-09')
    expect(shared.bankFull).toBe('0000004521')
    expect(shared.platforms).toEqual(['Swiggy', 'Rapido'])
  })

  it('signs the same payload the same way', () => {
    const first = report({ summary: true, months: true, platforms: true, fullAccount: false })
    const second = report({ summary: true, months: true, platforms: true, fullAccount: false })
    expect(first.signature).toBe(second.signature)
    expect(first.signature).toBe(signatureFor(JSON.stringify({
      workerName: 'Ravi K.',
      consentAt: '2026-10-12',
      expiresAt: '2026-11-11',
      median: 26800,
      floor: 24100,
      months: figures.months.map((month) => [month.key, month.verified]),
      platforms: ['Swiggy', 'Rapido'],
    })))
  })
})

describe('pdf', () => {
  it('embeds the passport lines in a PDF document', () => {
    const lines = reportLines(
      report({ summary: true, months: true, platforms: true, fullAccount: false }),
      formatRupeesPdf,
      (iso) => formatDate(iso, 'en'),
    )
    const pdf = buildPdf(lines)
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf).toContain('Rs 26,800')
    expect(pdf).toContain('2026-09')
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
  })
})
