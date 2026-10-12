# Kamai Passport validation report

12 October 2026. All automated checks passed, and the worker-to-verifier path was walked in the browser.

**App:** http://127.0.0.1:4317  
**Sample account:** SBI ··4521  
**Demo OTP:** 481063

## Result

| Suite | Tests | Result |
| --- | --- | --- |
| Unit (`npm test`) | 14 | Passed |
| Functional (`e2e/functional.spec.ts`) | 7 | Passed |
| Regression (`e2e/regression.spec.ts`) | 7 | Passed |
| **Total** | **28** | **0 failed** |

## What was validated

- Median ₹26,800, floor ₹24,100, 6 of 6 active months, Band A for the published Apr–Sep 2026 statement.
- Round-trip ₹5,000 and one-off ₹40,000 are excluded from verified income.
- A hand-tagged payout stays self-reported and does not change the median or the platform list.
- The verifier sees only the fields the worker shares. Flags and self-reported totals always remain.
- A wrong or incomplete OTP does not leave the consent step.
- An account with no platform credits asks the worker to choose another bank.
- Revoke closes the share link. A reload keeps the Passport.
- PDF and JSON downloads use the shared report.
- At 360px: no horizontal overflow, text contrast at least 4.5:1, controls at least 44px, and a visible focus ring.
- Hindi covers the flow through the Passport. Marathi is available from the language step. Settings can switch language.
- On a 1280px window the verifier’s three figures sit in one row.

## Browser walkthrough

Welcome, language, loan purpose, SBI consent, OTP `481063`, payout review, Passport, share, and the verifier page. The link expires 11 Nov 2026. The verifier page showed the median, floor, band, six monthly rows, Swiggy and Rapido, and the excluded amounts. The full account number was not on the report.

## Limits

Bank consent is simulated. The share link lives in this browser’s storage. The PDF is a plain text document, not a legally signed file. The verifier report is English.
