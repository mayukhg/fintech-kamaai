export type Flag = 'round_trip' | 'one_off'

export type Credit = {
  id: string
  date: string
  amount: number
  narration: string
  matchedPlatform: string | null
  selfReportedPlatform: string | null
  flags: Flag[]
}

export type RawTxn = {
  id: string
  date: string
  amount: number
  narration: string
  counterparty: string
}

export type Payer = {
  name: string
  patterns: string[]
}

export const PAYERS: Payer[] = [
  { name: 'Swiggy', patterns: ['SWIGGY'] },
  { name: 'Rapido', patterns: ['RAPIDO'] },
  { name: 'Zomato', patterns: ['ZOMATO'] },
  { name: 'Uber', patterns: ['UBER'] },
  { name: 'Zepto', patterns: ['ZEPTO'] },
]

export const ONE_OFF_RUPEES = 20_000
export const ROUND_TRIP_DAYS = 3

export type Band = 'A' | 'B' | 'C'

export type Assessment = {
  median: number
  floor: number
  activeMonths: number
  windowMonths: number
  band: Band
  activeOk: boolean
  floorOk: boolean
}

export type MonthRollup = {
  key: string
  verified: number
  selfReported: number
  platforms: string[]
  unmatched: Credit[]
  flagged: Credit[]
}

export type PassportFigures = Assessment & {
  months: MonthRollup[]
  platforms: string[]
  selfReportedTotal: number
  excluded: { roundTrip: number; oneOff: number }
}

export function daysBetween(earlier: string, later: string): number {
  const [ay, am, ad] = earlier.split('-').map(Number)
  const [by, bm, bd] = later.split('-').map(Number)
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)
  return Math.round(ms / 86_400_000)
}

export function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function matchPlatform(narration: string, payers: Payer[] = PAYERS): string | null {
  if (/INSTAMRT/i.test(narration)) return null
  const upper = narration.toUpperCase()
  for (const payer of payers) {
    if (payer.patterns.some((pattern) => upper.includes(pattern))) return payer.name
  }
  return null
}

export function isYoungAccount(earliest: string, asOf: string): boolean {
  return daysBetween(earliest, asOf) < 182
}

export function medianOf(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
  return sorted[mid]
}

export function floorOf(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const lowest = sorted.slice(0, Math.min(3, sorted.length))
  return lowest.reduce((sum, value) => sum + value, 0) / lowest.length
}

export function assessMonths(values: number[]): Assessment {
  const windowMonths = values.length
  const activeMonths = values.filter((value) => value > 0).length
  const median = medianOf(values)
  const floor = floorOf(values)
  const activeOk = windowMonths >= 5 && activeMonths >= 5
  const floorOk = median > 0 && floor + 1e-6 >= median * 0.6
  const passed = Number(activeOk) + Number(floorOk)
  const band: Band = passed === 2 ? 'A' : passed === 1 ? 'B' : 'C'
  return { median, floor, activeMonths, windowMonths, band, activeOk, floorOk }
}

function excluded(credit: Credit): 'roundTrip' | 'oneOff' | null {
  if (credit.flags.includes('round_trip')) return 'roundTrip'
  if (credit.flags.includes('one_off')) return 'oneOff'
  return null
}

export function statementWindow(credits: Credit[]): string[] {
  if (credits.length === 0) return []
  const latest = credits.map((credit) => credit.date.slice(0, 7)).sort().at(-1)!
  return Array.from({ length: 6 }, (_, index) => addMonths(latest, index - 5))
}

export function buildPassport(credits: Credit[]): PassportFigures {
  const keys = statementWindow(credits)
  const months: MonthRollup[] = keys.map((key) => ({
    key,
    verified: 0,
    selfReported: 0,
    platforms: [],
    unmatched: [],
    flagged: [],
  }))
  const byKey = new Map(months.map((month) => [month.key, month]))
  const excludedTotals = { roundTrip: 0, oneOff: 0 }

  for (const credit of credits) {
    const month = byKey.get(credit.date.slice(0, 7))
    if (!month) continue
    const flag = excluded(credit)
    if (flag) {
      excludedTotals[flag] += credit.amount
      month.flagged.push(credit)
      continue
    }
    if (credit.selfReportedPlatform) {
      month.selfReported += credit.amount
      continue
    }
    if (credit.matchedPlatform) {
      month.verified += credit.amount
      if (!month.platforms.includes(credit.matchedPlatform)) month.platforms.push(credit.matchedPlatform)
      continue
    }
    month.unmatched.push(credit)
  }

  const assessment = assessMonths(months.map((month) => month.verified))
  const platforms = [...new Set(months.flatMap((month) => month.platforms))]
  const selfReportedTotal = months.reduce((sum, month) => sum + month.selfReported, 0)
  return { ...assessment, months, platforms, selfReportedTotal, excluded: excludedTotals }
}

export function tagCredit(credits: Credit[], id: string, platform: string | null): Credit[] {
  return credits.map((credit) => (credit.id === id ? { ...credit, selfReportedPlatform: platform } : credit))
}

export function analyseStatement(txns: RawTxn[], asOf: string, payers: Payer[] = PAYERS): { credits: Credit[]; young: boolean } {
  const credits: Credit[] = txns
    .filter((txn) => txn.amount > 0)
    .map((txn) => {
      const flags: Flag[] = []
      const roundTrip = txns.some(
        (other) =>
          other.amount === -txn.amount &&
          other.counterparty === txn.counterparty &&
          Math.abs(daysBetween(txn.date < other.date ? txn.date : other.date, txn.date < other.date ? other.date : txn.date)) <=
            ROUND_TRIP_DAYS,
      )
      const matchedPlatform = matchPlatform(txn.narration, payers)
      if (roundTrip) flags.push('round_trip')
      if (!matchedPlatform && txn.amount >= ONE_OFF_RUPEES) flags.push('one_off')
      return {
        id: txn.id,
        date: txn.date,
        amount: txn.amount,
        narration: txn.narration,
        matchedPlatform,
        selfReportedPlatform: null,
        flags,
      }
    })

  const dated = txns.map((txn) => txn.date).sort()
  const young = dated.length > 0 ? isYoungAccount(dated[0], asOf) : false
  return { credits, young }
}
