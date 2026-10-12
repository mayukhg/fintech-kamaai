import type { Lang } from '../i18n'

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function todayISO(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

export function formatRupeesPdf(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString('en-IN')}`
}

export function formatDate(iso: string, lang: Lang = 'en'): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (lang === 'en') return `${day} ${MONTHS_EN[month - 1]} ${year}`
  return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'mr-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatMonth(key: string, lang: Lang = 'en'): string {
  return formatDate(`${key}-01`, lang).replace(/^\d+\s/, '')
}

export function formatWhen(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
