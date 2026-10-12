import { describe, expect, it } from 'vitest'
import { SBI_TXNS } from '../data/statement'
import {
  analyseStatement,
  assessMonths,
  buildPassport,
  isYoungAccount,
  matchPlatform,
  tagCredit,
} from './income'

describe('platform matching', () => {
  it('matches known payers and leaves Instamart unmatched', () => {
    expect(matchPlatform('UPI/SWIGGY')).toBe('Swiggy')
    expect(matchPlatform('UPI/RAPIDO')).toBe('Rapido')
    expect(matchPlatform('UPI/SWIGGY INSTAMRT')).toBeNull()
  })
})

describe('Ravi statement', () => {
  const analysed = analyseStatement(SBI_TXNS, '2026-10-12')
  const passport = buildPassport(analysed.credits)

  it('reproduces the published passport figures', () => {
    expect(passport.median).toBe(26800)
    expect(passport.floor).toBe(24100)
    expect(passport.activeMonths).toBe(6)
    expect(passport.windowMonths).toBe(6)
    expect(passport.band).toBe('A')
    expect(passport.activeOk).toBe(true)
    expect(passport.floorOk).toBe(true)
    expect(passport.platforms).toEqual(['Swiggy', 'Rapido'])
    expect(passport.selfReportedTotal).toBe(0)
    expect(analysed.young).toBe(false)
  })

  it('keeps verified monthly totals and excludes tricks', () => {
    const byMonth = Object.fromEntries(passport.months.map((month) => [month.key, month.verified]))
    expect(byMonth).toEqual({
      '2026-04': 26100,
      '2026-05': 23800,
      '2026-06': 22400,
      '2026-07': 27500,
      '2026-08': 28100,
      '2026-09': 29400,
    })
    expect(passport.excluded).toEqual({ roundTrip: 5000, oneOff: 40000 })
    const june = passport.months.find((month) => month.key === '2026-06')
    expect(june?.unmatched.map((credit) => credit.amount)).toEqual([3150])
  })

  it('does not let a hand tag change verified income', () => {
    const tagged = buildPassport(tagCredit(analysed.credits, 'jun-instamart', 'Swiggy'))
    expect(tagged.median).toBe(26800)
    expect(tagged.floor).toBe(24100)
    expect(tagged.band).toBe('A')
    expect(tagged.selfReportedTotal).toBe(3150)
    expect(tagged.platforms).toEqual(['Swiggy', 'Rapido'])
    expect(tagged.months.find((month) => month.key === '2026-06')?.verified).toBe(22400)
  })
})

describe('stability band', () => {
  it('is B when the active-month test passes and the floor test fails', () => {
    const result = assessMonths([0, 10, 100, 100, 100, 100])
    expect(result.activeOk).toBe(true)
    expect(result.floorOk).toBe(false)
    expect(result.band).toBe('B')
  })

  it('is B when only the floor test passes', () => {
    const result = assessMonths([100, 100, 100, 100])
    expect(result.activeOk).toBe(false)
    expect(result.floorOk).toBe(true)
    expect(result.band).toBe('B')
  })

  it('is A when the floor is exactly 60% of the median', () => {
    const result = assessMonths([60, 60, 60, 140, 140, 140])
    expect(result.median).toBe(100)
    expect(result.floor).toBe(60)
    expect(result.band).toBe('A')
  })

  it('is C when neither test passes', () => {
    expect(assessMonths([0, 0, 0, 10, 20, 30]).band).toBe('C')
    expect(assessMonths([]).band).toBe('C')
  })
})

describe('account age', () => {
  it('flags an account younger than six months', () => {
    expect(isYoungAccount('2026-04-07', '2026-06-01')).toBe(true)
    expect(isYoungAccount('2026-04-07', '2026-10-12')).toBe(false)
  })
})
