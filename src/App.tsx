import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { BANKS, WORKER_NAME, type BankId } from './data/statement'
import { bandLabel, t, type Lang } from './i18n'
import { formatDate, formatInr, formatMonth, formatRupeesPdf, formatWhen, todayISO } from './lib/format'
import { buildPassport, type Credit } from './lib/income'
import { buildPdf } from './lib/pdf'
import { isExpired, projectReport, reportLines, type PublicReport, type ShareFields } from './lib/share'
import {
  acceptOtp,
  applyTag,
  createShare,
  DEFAULT_FIELDS,
  fetchStatements,
  getState,
  recordView,
  resetFlow,
  revokeConsent,
  setState,
  subscribe,
  type Persisted,
  type Purpose,
  type VerifierId,
} from './store'

function useAppState(): Persisted {
  return useSyncExternalStore(subscribe, getState, getState)
}

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function go(hash: string): void {
  if (window.location.hash !== hash) window.location.hash = hash
}

function pathFromHash(hash: string): string {
  const raw = hash.replace(/^#/, '')
  if (raw === '' || raw === '/') return '/'
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function App() {
  const hash = useHash()
  const verifier = hash.match(/^#\/v\/([^/]+)$/)
  if (verifier) return <Verifier token={decodeURIComponent(verifier[1])} />
  return <Worker path={pathFromHash(hash)} />
}

function Worker({ path }: { path: string }) {
  const state = useAppState()
  useEffect(() => {
    document.documentElement.lang = state.lang
  }, [state.lang])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  let screen: ReactNode
  const tag = path.match(/^\/tag\/([^/]+)$/)
  if (path === '/') screen = <Welcome />
  else if (path === '/language') screen = <Language />
  else if (path === '/purpose') screen = <Purpose />
  else if (path === '/bank') screen = <Bank />
  else if (path === '/consent') screen = state.bankId ? <Consent /> : <Redirect to="#/bank" />
  else if (path === '/otp') screen = state.bankId ? <Otp /> : <Redirect to="#/bank" />
  else if (path === '/reading') screen = state.bankId ? <Reading /> : <Redirect to="#/bank" />
  else if (path === '/payouts') screen = state.fetched ? <Payouts /> : <Redirect to="#/bank" />
  else if (tag) screen = state.fetched ? <Tag id={tag[1]} /> : <Redirect to="#/bank" />
  else if (path === '/passport') screen = state.fetched ? <Passport /> : <Redirect to="#/bank" />
  else if (path === '/share') screen = state.fetched ? <Share /> : <Redirect to="#/bank" />
  else if (path === '/shared')
    screen = state.share && !state.share.revoked ? <Shared /> : <Redirect to={state.fetched ? '#/share' : '#/settings'} />
  else if (path === '/views') screen = state.share ? <Views /> : <Redirect to="#/passport" />
  else if (path === '/settings') screen = <Settings />
  else screen = <Redirect to="#/" />

  return (
    <div className="phone">
      <header className="top">
        <p className="brand">{t(state.lang, 'appName')}</p>
        {state.fetched && path !== '/settings' ? (
          <button type="button" className="text-btn" onClick={() => go('#/settings')}>
            {t(state.lang, 'settingsLink')}
          </button>
        ) : (
          <span />
        )}
      </header>
      {screen}
    </div>
  )
}

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    go(to)
  }, [to])
  return null
}

function Welcome() {
  const state = useAppState()
  const lang = state.lang
  const ready = state.fetched && state.credits.length > 0
  return (
    <section className="screen" data-screen="welcome">
      <div className="body center">
        <div className="logo" aria-hidden="true">
          K
        </div>
        <h1>{t(lang, 'welcomeTitle')}</h1>
        <p className="lede">{t(lang, 'welcomeBody')}</p>
        <p className="hint">{t(lang, 'welcomeSub')}</p>
      </div>
      <div className="dock">
        {ready ? (
          <>
            <button type="button" className="cta" onClick={() => go('#/passport')}>
              {t(lang, 'openPassport')}
            </button>
            <button type="button" className="ghost" onClick={() => resetFlow()}>
              {t(lang, 'startAgain')}
            </button>
          </>
        ) : (
          <button type="button" className="cta" onClick={() => go('#/language')}>
            {t(lang, 'getStarted')}
          </button>
        )}
      </div>
    </section>
  )
}

function Language() {
  const state = useAppState()
  const choose = (lang: Lang) => {
    setState({ lang })
    go('#/purpose')
  }
  return (
    <section className="screen" data-screen="language">
      <div className="body">
        <Back to="#/" />
        <h1>{t(state.lang, 'chooseLanguage')}</h1>
        <p className="hint">{t(state.lang, 'languageHint')}</p>
        <div className="stack">
          <button type="button" className={state.lang === 'hi' ? 'choice on' : 'choice'} aria-pressed={state.lang === 'hi'} onClick={() => choose('hi')}>
            <span>हिंदी</span>
            <span className="sub">{state.lang === 'hi' ? t('hi', 'selected') : 'Hindi'}</span>
          </button>
          <button type="button" className={state.lang === 'mr' ? 'choice on' : 'choice'} aria-pressed={state.lang === 'mr'} onClick={() => choose('mr')}>
            <span>मराठी</span>
            <span className="sub">{state.lang === 'mr' ? t('mr', 'selected') : 'Marathi'}</span>
          </button>
          <button type="button" className={state.lang === 'en' ? 'choice on' : 'choice'} aria-pressed={state.lang === 'en'} onClick={() => choose('en')}>
            <span>English</span>
            <span className="sub">{state.lang === 'en' ? t('en', 'selected') : 'English'}</span>
          </button>
        </div>
      </div>
    </section>
  )
}

function Purpose() {
  const state = useAppState()
  const lang = state.lang
  const pick = (purpose: Purpose) => {
    setState({ purpose })
    go('#/bank')
  }
  return (
    <section className="screen" data-screen="purpose">
      <div className="body">
        <Back to="#/language" />
        <h1>{t(lang, 'whyProof')}</h1>
        <p className="hint">{t(lang, 'purposeHint')}</p>
        <div className="stack">
          <button type="button" className="choice" onClick={() => pick('loan')}>
            <span>{t(lang, 'loan')}</span>
            <span className="sub">{t(lang, 'loanSub')}</span>
          </button>
          <button type="button" className="choice" onClick={() => pick('rent')}>
            <span>{t(lang, 'rent')}</span>
            <span className="sub">{t(lang, 'rentSub')}</span>
          </button>
          <button type="button" className="choice" onClick={() => pick('other')}>
            <span>{t(lang, 'other')}</span>
            <span className="sub">{t(lang, 'otherSub')}</span>
          </button>
        </div>
      </div>
    </section>
  )
}

function Bank() {
  const state = useAppState()
  const lang = state.lang
  const [bankId, setBankId] = useState<BankId>(state.bankId ?? 'sbi')
  return (
    <section className="screen" data-screen="bank">
      <div className="body">
        <Back to="#/purpose" />
        <h1>{t(lang, 'whichAccount')}</h1>
        <p className="hint">{t(lang, 'whichAccountHint')}</p>
        <div className="stack" role="radiogroup" aria-label={t(lang, 'whichAccount')}>
          {(Object.keys(BANKS) as BankId[]).map((id) => (
            <label key={id} className={bankId === id ? 'choice on' : 'choice'}>
              <input type="radio" name="bank" value={id} checked={bankId === id} onChange={() => setBankId(id)} />
              <span>
                {BANKS[id].label} {BANKS[id].mask}
              </span>
              <span className="sub">{BANKS[id].name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="dock">
        <button
          type="button"
          className="cta"
          onClick={() => {
            setState({ bankId, consentAt: null, fetched: false, credits: [], young: false })
            go('#/consent')
          }}
        >
          {t(lang, 'continue')}
        </button>
      </div>
    </section>
  )
}

function Consent() {
  const state = useAppState()
  const lang = state.lang
  const bank = BANKS[state.bankId!]
  return (
    <section className="screen" data-screen="consent">
      <div className="body">
        <Back to="#/bank" />
        <h1>{t(lang, 'linkBank')}</h1>
        <p className="lede">{t(lang, 'linkBody', { bank: `${bank.label} ${bank.mask}` })}</p>
        <ul className="checks">
          <li>
            <Mark />
            {t(lang, 'checkOnce')}
          </li>
          <li>
            <Mark />
            {t(lang, 'checkPurpose')}
          </li>
          <li>
            <Mark />
            {t(lang, 'checkRevoke')}
          </li>
          <li>
            <Mark kind="lock" />
            {t(lang, 'checkPassword')}
          </li>
        </ul>
      </div>
      <div className="dock">
        <button type="button" className="cta" onClick={() => go('#/otp')}>
          {t(lang, 'approveOtp')}
        </button>
        <p className="fine">{t(lang, 'aaNote')}</p>
      </div>
    </section>
  )
}

function Otp() {
  const state = useAppState()
  const lang = state.lang
  const bank = BANKS[state.bankId!]
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function submit() {
    const result = acceptOtp(digits.join(''))
    if (result === 'ok') {
      setState({ consentAt: todayISO(), revokedNotice: false })
      go('#/reading')
      return
    }
    setError(t(lang, result === 'incomplete' ? 'otpIncomplete' : 'otpRejected'))
  }

  return (
    <section className="screen" data-screen="otp">
      <div className="body">
        <Back to="#/consent" />
        <h1>{t(lang, 'enterOtp')}</h1>
        <p className="hint">{t(lang, 'otpHint', { bank: bank.name, otp: '481063' })}</p>
        <div className="otp" role="group" aria-label={t(lang, 'enterOtp')}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                refs.current[index] = node
              }}
              className="otp-box"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              aria-invalid={error ? true : undefined}
              value={digit}
              onChange={(event) => {
                const char = event.target.value.replace(/\D/g, '').slice(-1)
                setDigits((current) => {
                  const next = [...current]
                  next[index] = char
                  return next
                })
                setError('')
                if (char && index < 5) refs.current[index + 1]?.focus()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus()
                if (event.key === 'Enter') submit()
              }}
              onPaste={(event) => {
                const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                if (text.length < 2) return
                event.preventDefault()
                setDigits(Array.from({ length: 6 }, (_, i) => text[i] ?? ''))
                setError('')
                refs.current[Math.min(text.length, 5)]?.focus()
              }}
            />
          ))}
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="dock">
        <button type="button" className="cta" onClick={submit}>
          {t(lang, 'confirmConsent')}
        </button>
      </div>
    </section>
  )
}

function Reading() {
  const state = useAppState()
  const lang = state.lang
  useEffect(() => {
    if (!state.fetched) fetchStatements()
  }, [state.fetched])
  return (
    <section className="screen" data-screen="reading">
      <div className="body center">
        <h1>{t(lang, 'finding')}</h1>
        <p className="lede">{t(lang, 'findingBody')}</p>
        <div
          className="meter"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={state.fetched ? 100 : 24}
          aria-label={t(lang, 'finding')}
        >
          <span style={{ width: state.fetched ? '100%' : '24%' }} />
        </div>
        <p className="fine">{t(lang, 'usually')}</p>
      </div>
      <div className="dock">
        <button
          type="button"
          className="cta"
          onClick={() => {
            if (!getState().fetched) fetchStatements()
            go('#/payouts')
          }}
        >
          {t(lang, 'showPayouts')}
        </button>
      </div>
    </section>
  )
}

function Payouts() {
  const state = useAppState()
  const lang = state.lang
  const figures = useMemo(() => buildPassport(state.credits), [state.credits])
  const months = [...figures.months].reverse()
  return (
    <section className="screen" data-screen="payouts">
      <div className="body">
        <Back to="#/reading" />
        <h1>{t(lang, 'yourPayouts')}</h1>
        {state.credits.length === 0 ? (
          <p className="lede">{t(lang, 'emptyPayouts')}</p>
        ) : (
          <>
            <p className="hint">{t(lang, 'payoutsHint')}</p>
            <ol className="months">
              {months.map((month) => (
                <li key={month.key} className={month.unmatched.length || month.flagged.length ? 'flagged' : undefined}>
                  <div className="month-head">
                    <span>{formatMonth(month.key, lang)}</span>
                    <strong>{formatInr(month.verified)}</strong>
                  </div>
                  <p>
                    {month.platforms.join(' · ') || '—'} · {t(lang, 'payersVerified', { n: String(month.platforms.length) })}
                  </p>
                  {month.unmatched.map((credit) => (
                    <button key={credit.id} type="button" className="inline" onClick={() => go(`#/tag/${credit.id}`)}>
                      {t(lang, 'unmatchedCta', { amount: formatInr(credit.amount), date: formatDate(credit.date, lang) })}
                    </button>
                  ))}
                  {month.selfReported > 0 ? <p>{selfReportedCopy(state.credits, month.key, lang)}</p> : null}
                  {month.flagged.map((credit) => (
                    <p key={credit.id}>
                      {credit.flags.includes('round_trip')
                        ? t(lang, 'roundTripLine', { amount: formatInr(credit.amount) })
                        : t(lang, 'oneOffLine', { amount: formatInr(credit.amount) })}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
      <div className="dock">
        {state.credits.length === 0 ? (
          <button type="button" className="cta" onClick={() => go('#/bank')}>
            {t(lang, 'pickAnother')}
          </button>
        ) : (
          <button type="button" className="cta" onClick={() => go('#/passport')}>
            {t(lang, 'looksRight')}
          </button>
        )}
      </div>
    </section>
  )
}

function selfReportedCopy(credits: Credit[], monthKey: string, lang: Lang): string {
  const tagged = credits.filter((credit) => credit.date.startsWith(monthKey) && credit.selfReportedPlatform)
  const amount = tagged.reduce((sum, credit) => sum + credit.amount, 0)
  const platform = tagged.map((credit) => credit.selfReportedPlatform).filter(Boolean).join(', ')
  return t(lang, 'selfReportedLine', { amount: formatInr(amount), platform })
}

function Tag({ id }: { id: string }) {
  const state = useAppState()
  const lang = state.lang
  const credit = state.credits.find((item) => item.id === id)
  const [choice, setChoice] = useState<'Swiggy' | 'other' | 'none'>('Swiggy')
  const [other, setOther] = useState('Zomato')
  if (!credit) return <Redirect to="#/payouts" />
  return (
    <section className="screen" data-screen="tag">
      <div className="body">
        <Back to="#/payouts" />
        <h1>{t(lang, 'tagTitle')}</h1>
        <p className="lede">
          {formatInr(credit.amount)} · {formatDate(credit.date, lang)} · {credit.narration}
        </p>
        <p className="hint">{t(lang, 'selfReportNote')}</p>
        <div className="stack" role="radiogroup" aria-label={t(lang, 'tagTitle')}>
          <label className={choice === 'Swiggy' ? 'choice on' : 'choice'}>
            <input type="radio" name="tag" checked={choice === 'Swiggy'} onChange={() => setChoice('Swiggy')} />
            <span>Swiggy</span>
            <span className="sub">{t(lang, 'missed')}</span>
          </label>
          <label className={choice === 'other' ? 'choice on' : 'choice'}>
            <input type="radio" name="tag" checked={choice === 'other'} onChange={() => setChoice('other')} />
            <span>{t(lang, 'otherPlatform')}</span>
            <span className="sub">{t(lang, 'otherPlatformSub')}</span>
          </label>
          <label className={choice === 'none' ? 'choice on' : 'choice'}>
            <input type="radio" name="tag" checked={choice === 'none'} onChange={() => setChoice('none')} />
            <span>{t(lang, 'notPayout')}</span>
            <span className="sub">{t(lang, 'notPayoutSub')}</span>
          </label>
        </div>
        {choice === 'other' ? (
          <label className="field">
            {t(lang, 'otherPlatform')}
            <select className="select" value={other} onChange={(event) => setOther(event.target.value)}>
              {['Zomato', 'Uber', 'Zepto', 'Rapido'].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="dock">
        <button
          type="button"
          className="cta"
          onClick={() => {
            applyTag(id, choice === 'none' ? null : choice === 'Swiggy' ? 'Swiggy' : other)
            go('#/payouts')
          }}
        >
          {t(lang, 'saveSelf')}
        </button>
      </div>
    </section>
  )
}

function Passport() {
  const state = useAppState()
  const lang = state.lang
  const figures = useMemo(() => buildPassport(state.credits), [state.credits])
  if (state.credits.length === 0) {
    return (
      <section className="screen" data-screen="passport">
        <div className="body">
          <h1>{t(lang, 'yourPassport')}</h1>
          <p className="lede">{t(lang, 'buildFirst')}</p>
        </div>
        <div className="dock">
          <button type="button" className="cta" onClick={() => go('#/bank')}>
            {t(lang, 'linkAccount')}
          </button>
        </div>
      </section>
    )
  }
  const max = Math.max(...figures.months.map((month) => month.verified), 1)
  const pct = figures.median > 0 ? Math.round((figures.floor / figures.median) * 100) : 0
  return (
    <section className="screen" data-screen="passport">
      <div className="body">
        <h1>{t(lang, 'yourPassport')}</h1>
        <p className="meta">
          {WORKER_NAME} · {t(lang, 'verifiedOn', { date: formatDate(state.consentAt ?? todayISO(), lang) })}
        </p>
        <p className="quiet">{t(lang, 'medianLabel')}</p>
        <p className="hero">{formatInr(figures.median)}</p>
        <div className="stats">
          <div className="stat">
            <span>{t(lang, 'floorLabel')}</span>
            <strong>{formatInr(figures.floor)}</strong>
          </div>
          <div className="stat">
            <span>{t(lang, 'activeLabel')}</span>
            <strong>
              {figures.activeMonths} / {figures.windowMonths}
            </strong>
          </div>
        </div>
        <div className="bars" aria-hidden="true">
          {figures.months.map((month) => (
            <span key={month.key} style={{ height: `${Math.max(8, (month.verified / max) * 100)}%` }}>
              <i>{formatMonth(month.key, 'en').slice(0, 3)}</i>
            </span>
          ))}
        </div>
        <p className="band">
          {t(lang, 'bandLine', {
            band: figures.band,
            label: bandLabel(lang, figures.band),
            platforms: figures.platforms.join(', ') || '—',
          })}
        </p>
        <p className="hint">
          {t(lang, 'activeTest', { active: String(figures.activeMonths), window: String(figures.windowMonths) })}{' '}
          {figures.activeOk ? t(lang, 'pass') : t(lang, 'fail')}
          {' · '}
          {t(lang, 'floorTest', { pct: String(pct) })} {figures.floorOk ? t(lang, 'pass') : t(lang, 'fail')}
        </p>
        {state.young ? <p className="hint">{t(lang, 'youngFlag')}</p> : null}
        {figures.selfReportedTotal > 0 ? (
          <p className="hint">{t(lang, 'selfReportedTotal', { amount: formatInr(figures.selfReportedTotal) })}</p>
        ) : null}
      </div>
      <div className="dock">
        <button type="button" className="cta" onClick={() => go('#/share')}>
          {t(lang, 'shareCta')}
        </button>
      </div>
    </section>
  )
}

function Share() {
  const state = useAppState()
  const lang = state.lang
  const [verifierId, setVerifierId] = useState<VerifierId>(state.purpose === 'loan' || !state.purpose ? 'nbfc' : 'link')
  const [fields, setFields] = useState<ShareFields>(DEFAULT_FIELDS)
  const toggle = (key: keyof ShareFields) => setFields((current) => ({ ...current, [key]: !current[key] }))
  return (
    <section className="screen" data-screen="share">
      <div className="body">
        <Back to="#/passport" />
        <h1>{t(lang, 'shareTitle')}</h1>
        <p className="hint">{t(lang, 'shareHint')}</p>
        <p className="label">{t(lang, 'who')}</p>
        <div className="stack" role="radiogroup" aria-label={t(lang, 'who')}>
          <label className={verifierId === 'nbfc' ? 'choice on' : 'choice'}>
            <input type="radio" name="who" checked={verifierId === 'nbfc'} onChange={() => setVerifierId('nbfc')} />
            <span>{t(lang, 'nbfc')}</span>
            <span className="sub">{t(lang, 'nbfcSub')}</span>
          </label>
          <label className={verifierId === 'link' ? 'choice on' : 'choice'}>
            <input type="radio" name="who" checked={verifierId === 'link'} onChange={() => setVerifierId('link')} />
            <span>{t(lang, 'sendLink')}</span>
            <span className="sub">{t(lang, 'sendLinkSub')}</span>
          </label>
        </div>
        <p className="label">{t(lang, 'fields')}</p>
        <div className="checks">
          {(
            [
              ['summary', 'fieldSummary'],
              ['months', 'fieldMonths'],
              ['platforms', 'fieldPlatforms'],
              ['fullAccount', 'fieldAccount'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="check-row">
              <input type="checkbox" checked={fields[key]} onChange={() => toggle(key)} />
              {t(lang, label)}
            </label>
          ))}
        </div>
        <p className="hint">{t(lang, 'alwaysShared')}</p>
      </div>
      <div className="dock">
        <button
          type="button"
          className="cta"
          onClick={() => {
            createShare(verifierId, verifierId === 'nbfc' ? t(lang, 'nbfc') : t(lang, 'sendLink'), fields)
            go('#/shared')
          }}
        >
          {t(lang, 'createLink')}
        </button>
      </div>
    </section>
  )
}

function Shared() {
  const state = useAppState()
  const lang = state.lang
  const share = state.share!
  const url = `${window.location.origin}${window.location.pathname}#/v/${share.token}`
  const [copied, setCopied] = useState(false)
  return (
    <section className="screen" data-screen="shared">
      <div className="body">
        <Back to="#/share" />
        <h1>{t(lang, 'ready')}</h1>
        <p className="lede">{t(lang, 'readyBody', { name: share.verifierName, date: formatDate(share.expiresAt, lang) })}</p>
        <Qr value={url} />
        <p className="linkline">{url}</p>
        <div className="split">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              navigator.clipboard.writeText(url).then(
                () => setCopied(true),
                () => setCopied(false),
              )
            }}
          >
            {t(lang, 'copyLink')}
          </button>
          <button type="button" className="ghost" onClick={() => downloadReport(state)}>
            {t(lang, 'downloadPdf')}
          </button>
        </div>
        {copied ? (
          <p className="fine" role="status">
            {t(lang, 'copied')}
          </p>
        ) : (
          <p className="fine">{t(lang, 'noStatement')}</p>
        )}
      </div>
      <div className="dock">
        <button type="button" className="cta" onClick={() => go(`#/v/${share.token}`)}>
          {t(lang, 'previewVerifier')}
        </button>
        <button type="button" className="ghost" onClick={() => go('#/views')}>
          {t(lang, 'seeViews')}
        </button>
      </div>
    </section>
  )
}

function Views() {
  const state = useAppState()
  const lang = state.lang
  const share = state.share!
  return (
    <section className="screen" data-screen="views">
      <div className="body">
        <Back to="#/shared" />
        <h1>{t(lang, 'viewsTitle')}</h1>
        {share.views.length === 0 ? (
          <p className="lede">{t(lang, 'viewsEmpty')}</p>
        ) : (
          <ol className="months">
            {share.views.map((view) => (
              <li key={view.at}>
                <div className="month-head">
                  <span>{view.verifierName}</span>
                  <strong>{formatWhen(view.at)}</strong>
                </div>
                <p>
                  {t(lang, 'signatureChecked')} · {t(lang, 'expires', { date: formatDate(share.expiresAt, lang) })}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="hint">{t(lang, 'viewsHint')}</p>
      </div>
      <div className="dock">
        <button type="button" className="cta" onClick={() => go('#/settings')}>
          {t(lang, 'openSettings')}
        </button>
      </div>
    </section>
  )
}

function Settings() {
  const state = useAppState()
  const lang = state.lang
  const [confirming, setConfirming] = useState(false)
  const bank = state.bankId ? BANKS[state.bankId] : null
  return (
    <section className="screen" data-screen="settings">
      <div className="body">
        <Back to={state.fetched ? '#/passport' : '#/'} />
        <h1>{t(lang, 'settings')}</h1>
        {state.revokedNotice ? (
          <p className="error" role="status">
            {t(lang, 'revoked')}
          </p>
        ) : null}
        <div className="profile">
          <span className="avatar" aria-hidden="true">
            RK
          </span>
          <div>
            <strong>{WORKER_NAME}</strong>
            <p>{bank ? `${bank.label} ${bank.mask}` : t(lang, 'pickAnother')}</p>
          </div>
        </div>
        <ul className="rows">
          <li>
            <span>{t(lang, 'consentGiven')}</span>
            <span>{state.consentAt ? formatDate(state.consentAt, lang) : '—'}</span>
          </li>
          <li>
            <span>{t(lang, 'passportExpires')}</span>
            <span>{state.share ? formatDate(state.share.expiresAt, lang) : '—'}</span>
          </li>
          <li>
            <span>{t(lang, 'language')}</span>
            <label className="sr-only" htmlFor="language">
              {t(lang, 'language')}
            </label>
            <select
              id="language"
              className="select"
              value={lang}
              onChange={(event) => setState({ lang: event.target.value as Lang })}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          </li>
          <li>
            <span>{t(lang, 'sharedWith')}</span>
            <span>{state.share && !state.share.revoked ? state.share.verifierName : t(lang, 'notShared')}</span>
          </li>
        </ul>
        <p className="hint">{t(lang, 'revokeHint')}</p>
      </div>
      <div className="dock">
        {confirming ? (
          <>
            <button type="button" className="cta warn" onClick={() => revokeConsent()}>
              {t(lang, 'confirmRevoke')}
            </button>
            <button type="button" className="ghost" onClick={() => setConfirming(false)}>
              {t(lang, 'keepConsent')}
            </button>
          </>
        ) : (
          <button type="button" className="cta warn" onClick={() => setConfirming(true)} disabled={!state.consentAt && !state.share}>
            {t(lang, 'revoke')}
          </button>
        )}
      </div>
    </section>
  )
}

function Verifier({ token }: { token: string }) {
  const state = useAppState()
  useEffect(() => {
    document.documentElement.lang = 'en'
  }, [])
  useEffect(() => {
    recordView(token)
  }, [token])
  const share = state.share
  let body: React.ReactNode
  if (!share || share.token !== token) body = <h1>{t('en', 'notFound')}</h1>
  else if (share.revoked) body = <h1>{t('en', 'revokedPage')}</h1>
  else if (isExpired(share.expiresAt, todayISO()))
    body = <h1>{t('en', 'expiredPage', { date: formatDate(share.expiresAt, 'en') })}</h1>
  else body = <Report report={makeReport(state)} />
  return (
    <main className="report-page" data-screen="verifier">
      <p className="kicker">{t('en', 'incomeVerification')}</p>
      {body}
    </main>
  )
}

function Report({ report }: { report: PublicReport }) {
  const pct = report.median && report.floor != null ? Math.round((report.floor / report.median) * 100) : 0
  return (
    <>
      <h1>{t('en', 'appName')}</h1>
      <p className="meta">
        {report.workerName} · {t('en', 'consentLine', { date: formatDate(report.consentAt, 'en') })} · {report.bankMasked}
      </p>
      <p className="signature">
        {t('en', 'signatureValid')} · {report.signature} · {t('en', 'expires', { date: formatDate(report.expiresAt, 'en') })}
      </p>
      {report.median == null || report.floor == null || report.band == null ? (
        <p className="lede">{t('en', 'noFigures')}</p>
      ) : (
        <div className="stats report-stats">
          <div className="stat">
            <span>{t('en', 'medianLabel')}</span>
            <strong>{formatInr(report.median)}</strong>
            <em>{t('en', 'bankVerified')}</em>
          </div>
          <div className="stat">
            <span>{t('en', 'floorLabel')}</span>
            <strong>{formatInr(report.floor)}</strong>
            <em>{t('en', 'floorNote')}</em>
          </div>
          <div className="stat">
            <span>{t('en', 'activeLabel')}</span>
            <strong>
              {report.activeMonths} / {report.windowMonths}
            </strong>
            <em>
              Band {report.band} · {bandLabel('en', report.band)}
            </em>
          </div>
        </div>
      )}
      <p className="hint">{t('en', 'method')}</p>
      {report.activeOk != null && report.floorOk != null ? (
        <ul className="rows">
          <li>
            <span>{t('en', 'activeTest', { active: String(report.activeMonths), window: String(report.windowMonths) })}</span>
            <span>{report.activeOk ? t('en', 'pass') : t('en', 'fail')}</span>
          </li>
          <li>
            <span>{t('en', 'floorTest', { pct: String(pct) })}</span>
            <span>{report.floorOk ? t('en', 'pass') : t('en', 'fail')}</span>
          </li>
        </ul>
      ) : null}
      {report.months ? (
        <table className="sheet">
          <thead>
            <tr>
              <th>{t('en', 'month')}</th>
              <th>{t('en', 'verified')}</th>
              <th>{t('en', 'source')}</th>
              <th>Check</th>
            </tr>
          </thead>
          <tbody>
            {report.months.map((month) => (
              <tr key={month.key}>
                <td>{formatMonth(month.key, 'en')}</td>
                <td>{formatInr(month.verified)}</td>
                <td>{t('en', 'payers', { n: String(month.payers) })}</td>
                <td>{t('en', 'matched')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {report.platforms ? <p>Platforms: {report.platforms.join(', ') || '—'}</p> : null}
      {report.bankFull ? <p>Account {report.bankFull}</p> : null}
      <p>{t('en', 'selfReportedTotal', { amount: formatInr(report.selfReported) })}</p>
      <p>
        {t('en', 'excludedFlags', {
          round: formatInr(report.excluded.roundTrip),
          one: formatInr(report.excluded.oneOff),
        })}
      </p>
      {report.young ? <p>{t('en', 'youngReport')}</p> : null}
      <div className="split">
        <button type="button" className="cta inline" onClick={() => downloadReport(getState())}>
          {t('en', 'downloadPdf')}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => downloadBlob('kamai-passport.json', new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))}
        >
          {t('en', 'downloadJson')}
        </button>
      </div>
    </>
  )
}

function makeReport(state: Persisted): PublicReport {
  const share = state.share!
  const bank = BANKS[state.bankId ?? 'sbi']
  return projectReport({
    figures: buildPassport(state.credits),
    fields: share.fields,
    workerName: WORKER_NAME,
    bankMasked: `${bank.label} ${bank.mask}`,
    bankFull: bank.full,
    consentAt: state.consentAt ?? share.createdAt,
    expiresAt: share.expiresAt,
    young: state.young,
  })
}

function downloadReport(state: Persisted): void {
  if (!state.share || state.share.revoked) return
  const report = makeReport(state)
  const pdf = buildPdf(reportLines(report, formatRupeesPdf, (iso) => formatDate(iso, 'en')))
  downloadBlob('kamai-passport.pdf', new Blob([pdf], { type: 'application/pdf' }))
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function Qr({ value }: { value: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let live = true
    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      width: 168,
      color: { dark: '#1C1914', light: '#F4EFE4' },
    }).then((markup) => {
      if (live) setSvg(markup)
    })
    return () => {
      live = false
    }
  }, [value])
  return <div className="qr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
}

function Back({ to }: { to: string }) {
  const state = useAppState()
  return (
    <button type="button" className="back" aria-label={t(state.lang, 'back')} onClick={() => go(to)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function Mark({ kind = 'check' }: { kind?: 'check' | 'lock' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mark">
      {kind === 'lock' ? (
        <path d="M8 11V8a4 4 0 0 1 8 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      ) : (
        <path d="M5 12.5 9.2 17 19 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}
