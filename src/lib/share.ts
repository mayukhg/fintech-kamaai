import type { PassportFigures } from './income'

export type ShareFields = {
  summary: boolean
  months: boolean
  platforms: boolean
  fullAccount: boolean
}

export type PublicMonth = {
  key: string
  verified: number
  payers: number
}

export type PublicReport = {
  workerName: string
  bankMasked: string
  bankFull: string | null
  consentAt: string
  expiresAt: string
  signature: string
  median: number | null
  floor: number | null
  activeMonths: number | null
  windowMonths: number | null
  band: PassportFigures['band'] | null
  activeOk: boolean | null
  floorOk: boolean | null
  platforms: string[] | null
  months: PublicMonth[] | null
  selfReported: number
  excluded: { roundTrip: number; oneOff: number }
  young: boolean
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

export function isExpired(expiresAt: string, asOf: string): boolean {
  return asOf > expiresAt
}

export function signatureFor(payload: string): string {
  let hash = 5381
  for (let i = 0; i < payload.length; i += 1) hash = (hash * 33) ^ payload.charCodeAt(i)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function projectReport(input: {
  figures: PassportFigures
  fields: ShareFields
  workerName: string
  bankMasked: string
  bankFull: string
  consentAt: string
  expiresAt: string
  young: boolean
}): PublicReport {
  const { figures, fields } = input
  const body = JSON.stringify({
    workerName: input.workerName,
    consentAt: input.consentAt,
    expiresAt: input.expiresAt,
    median: fields.summary ? figures.median : null,
    floor: fields.summary ? figures.floor : null,
    months: fields.months ? figures.months.map((month) => [month.key, month.verified]) : null,
    platforms: fields.platforms ? figures.platforms : null,
  })
  return {
    workerName: input.workerName,
    bankMasked: input.bankMasked,
    bankFull: fields.fullAccount ? input.bankFull : null,
    consentAt: input.consentAt,
    expiresAt: input.expiresAt,
    signature: signatureFor(body),
    median: fields.summary ? figures.median : null,
    floor: fields.summary ? figures.floor : null,
    activeMonths: fields.summary ? figures.activeMonths : null,
    windowMonths: fields.summary ? figures.windowMonths : null,
    band: fields.summary ? figures.band : null,
    activeOk: fields.summary ? figures.activeOk : null,
    floorOk: fields.summary ? figures.floorOk : null,
    platforms: fields.platforms ? figures.platforms : null,
    months: fields.months
      ? [...figures.months].reverse().map((month) => ({
          key: month.key,
          verified: month.verified,
          payers: month.platforms.length,
        }))
      : null,
    selfReported: figures.selfReportedTotal,
    excluded: figures.excluded,
    young: input.young,
  }
}

export function reportLines(report: PublicReport, formatInr: (value: number) => string, formatDate: (iso: string) => string): string[] {
  const lines = [
    'Kamai Passport',
    report.workerName,
    `Consent ${formatDate(report.consentAt)}`,
    `Expires ${formatDate(report.expiresAt)}`,
    `Signature ${report.signature}`,
  ]
  if (report.median != null && report.floor != null && report.band) {
    lines.push(`Median ${formatInr(report.median)}`, `Floor ${formatInr(report.floor)}`, `Band ${report.band}`)
  }
  if (report.months) {
    for (const month of report.months) lines.push(`${month.key} ${formatInr(month.verified)} ${month.payers} payers`)
  }
  if (report.platforms) lines.push(`Platforms ${report.platforms.join(', ')}`)
  if (report.bankFull) lines.push(`Account ${report.bankFull}`)
  lines.push(`Self-reported ${formatInr(report.selfReported)} excluded`)
  return lines
}
