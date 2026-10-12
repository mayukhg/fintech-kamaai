import { DEMO_OTP, SBI_TXNS, type BankId } from './data/statement'
import type { Lang } from './i18n'
import { analyseStatement, tagCredit, type Credit } from './lib/income'
import { addDays, type ShareFields } from './lib/share'
import { todayISO } from './lib/format'

export type Purpose = 'loan' | 'rent' | 'other'
export type VerifierId = 'nbfc' | 'link'

export type ShareRecord = {
  token: string
  verifierId: VerifierId
  verifierName: string
  fields: ShareFields
  createdAt: string
  expiresAt: string
  revoked: boolean
  views: { at: string; verifierName: string }[]
}

export type Persisted = {
  lang: Lang
  purpose: Purpose | null
  bankId: BankId | null
  consentAt: string | null
  fetched: boolean
  young: boolean
  credits: Credit[]
  share: ShareRecord | null
  revokedNotice: boolean
}

const KEY = 'kamai.passport.v1'

export const DEFAULT_FIELDS: ShareFields = {
  summary: true,
  months: true,
  platforms: true,
  fullAccount: false,
}

function initialState(): Persisted {
  return {
    lang: 'en',
    purpose: null,
    bankId: null,
    consentAt: null,
    fetched: false,
    young: false,
    credits: [],
    share: null,
    revokedNotice: false,
  }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    return { ...initialState(), ...(JSON.parse(raw) as Partial<Persisted>) }
  } catch {
    return initialState()
  }
}

let state = load()
const listeners = new Set<() => void>()

export function getState(): Persisted {
  return state
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setState(patch: Partial<Persisted> | ((current: Persisted) => Persisted)): void {
  state = typeof patch === 'function' ? patch(state) : { ...state, ...patch }
  localStorage.setItem(KEY, JSON.stringify(state))
  listeners.forEach((listener) => listener())
}

export function resetFlow(): void {
  const lang = state.lang
  localStorage.removeItem(KEY)
  state = { ...initialState(), lang }
  localStorage.setItem(KEY, JSON.stringify(state))
  listeners.forEach((listener) => listener())
}

export function acceptOtp(code: string): 'ok' | 'incomplete' | 'rejected' {
  if (!/^\d{6}$/.test(code)) return 'incomplete'
  if (code !== DEMO_OTP) return 'rejected'
  return 'ok'
}

export function fetchStatements(): void {
  const current = getState()
  const today = todayISO()
  const result = current.bankId === 'sbi' ? analyseStatement(SBI_TXNS, today) : { credits: [], young: false }
  setState({ credits: result.credits, young: result.young, fetched: true, consentAt: current.consentAt ?? today })
}

export function applyTag(id: string, platform: string | null): void {
  setState((current) => ({ ...current, credits: tagCredit(current.credits, id, platform) }))
}

export function createShare(verifierId: VerifierId, verifierName: string, fields: ShareFields): void {
  const createdAt = todayISO()
  const token = `ravi-${Math.random().toString(36).slice(2, 6)}`
  setState({
    share: {
      token,
      verifierId,
      verifierName,
      fields,
      createdAt,
      expiresAt: addDays(createdAt, 30),
      revoked: false,
      views: [],
    },
    revokedNotice: false,
  })
}

export function revokeConsent(): void {
  setState((current) => ({
    ...current,
    consentAt: null,
    fetched: false,
    credits: [],
    young: false,
    bankId: null,
    revokedNotice: true,
    share: current.share ? { ...current.share, revoked: true } : null,
  }))
}

export function recordView(token: string): void {
  const mark = `kamai.view.${token}`
  if (sessionStorage.getItem(mark)) return
  const current = getState()
  if (!current.share || current.share.token !== token || current.share.revoked) return
  if (todayISO() > current.share.expiresAt) return
  sessionStorage.setItem(mark, '1')
  setState({
    share: {
      ...current.share,
      views: [...current.share.views, { at: new Date().toISOString(), verifierName: current.share.verifierName }],
    },
  })
}
