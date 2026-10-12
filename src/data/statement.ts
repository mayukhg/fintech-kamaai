import type { RawTxn } from '../lib/income'

export const WORKER_NAME = 'Ravi K.'
export const DEMO_OTP = '481063'

export const BANKS = {
  sbi: { id: 'sbi', label: 'SBI', mask: '··4521', full: '0000004521', name: 'State Bank of India' },
  hdfc: { id: 'hdfc', label: 'HDFC', mask: '··8890', full: '0000008890', name: 'HDFC Bank' },
  icici: { id: 'icici', label: 'ICICI', mask: '··2201', full: '0000002201', name: 'ICICI Bank' },
} as const

export type BankId = keyof typeof BANKS

export const SBI_TXNS: RawTxn[] = [
  { id: 'apr-swiggy', date: '2026-04-07', amount: 15900, narration: 'UPI/SWIGGY', counterparty: 'SWIGGY' },
  { id: 'apr-rapido', date: '2026-04-21', amount: 10200, narration: 'UPI/RAPIDO', counterparty: 'RAPIDO' },
  { id: 'may-rt-in', date: '2026-05-02', amount: 5000, narration: 'UPI/RAHUL SHARMA', counterparty: 'RAHUL SHARMA' },
  { id: 'may-rt-out', date: '2026-05-02', amount: -5000, narration: 'UPI/RAHUL SHARMA', counterparty: 'RAHUL SHARMA' },
  { id: 'may-swiggy', date: '2026-05-06', amount: 14500, narration: 'UPI/SWIGGY', counterparty: 'SWIGGY' },
  { id: 'may-rapido', date: '2026-05-20', amount: 9300, narration: 'UPI/RAPIDO', counterparty: 'RAPIDO' },
  { id: 'jun-swiggy', date: '2026-06-08', amount: 13800, narration: 'UPI/SWIGGY', counterparty: 'SWIGGY' },
  { id: 'jun-instamart', date: '2026-06-18', amount: 3150, narration: 'UPI/SWIGGY INSTAMRT', counterparty: 'SWIGGY INSTAMRT' },
  { id: 'jun-rapido', date: '2026-06-22', amount: 8600, narration: 'UPI/RAPIDO', counterparty: 'RAPIDO' },
  { id: 'jul-swiggy', date: '2026-07-05', amount: 16900, narration: 'UPI/SWIGGY', counterparty: 'SWIGGY' },
  { id: 'jul-rapido', date: '2026-07-19', amount: 10600, narration: 'UPI/RAPIDO', counterparty: 'RAPIDO' },
  { id: 'aug-swiggy', date: '2026-08-04', amount: 17400, narration: 'UPI/SWIGGY', counterparty: 'SWIGGY' },
  { id: 'aug-rapido', date: '2026-08-18', amount: 10700, narration: 'UPI/RAPIDO', counterparty: 'RAPIDO' },
  { id: 'aug-family', date: '2026-08-20', amount: 40000, narration: 'NEFT FAMILY', counterparty: 'FAMILY' },
  { id: 'sep-swiggy', date: '2026-09-03', amount: 18200, narration: 'UPI/SWIGGY', counterparty: 'SWIGGY' },
  { id: 'sep-rapido', date: '2026-09-17', amount: 11200, narration: 'UPI/RAPIDO', counterparty: 'RAPIDO' },
]
