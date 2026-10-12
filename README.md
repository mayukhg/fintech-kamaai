# Kamai Passport

Kamai Passport turns a gig worker’s scattered platform payouts into one verified, shareable income record that lenders and landlords can accept in place of a salary slip.

The source of truth is the worker’s own bank account, fetched with consent through RBI’s Account Aggregator network. No platform cooperation is required. We report facts, not a score: verified median and floor income, active months, and platforms. The verifier makes the decision.

**Workers:** *Your earnings are real. Prove them in 10 minutes, no salary slip needed.*  
**Verifiers:** *Bank-verified gig income, on one page.*

## Why this exists

Delivery riders and cab drivers in Indian metros often work 2–3 platforms at once. Each app shows earnings in its own format, and no employer issues a salary slip. When they apply for a loan, a lease, or a credit card, verifiers ask for salary certificates and “clean” bank statements. Their statement shows dozens of small, irregular credits that a credit officer cannot read quickly.

The result is rejection, a higher interest rate, or a much larger rental deposit — despite steady earnings.

Lenders want income verified at source, recent, with a floor they can underwrite against. Landlords want to know rent will arrive every month. Lenders turn away this segment because they cannot assess it, not because it is inherently risky.

## Who it is for

| Persona | Need |
| --- | --- |
| **Ravi**, 27, Pune. Rides for Swiggy and Rapido, ~₹27k/month net. Android, Hindi/Marathi first. | Hits the wall 1–2 times a year (new room, EV loan): rejected, or asked for 6 months’ deposit. |
| **Priya**, NBFC credit officer. Reviews ~40 gig-worker applications a week. | Has to judge irregular statements and app screenshots. Defaults to decline or a higher rate. |
| **Anil**, landlord. Owns 4 rental flats in Pune. | Screens tenants a few times a year. No salary slip means a bigger deposit, or he passes. |

v1 wedge: two-wheeler / EV loans and rentals for delivery and ride-hailing workers in Pune — workers on 2+ platforms, active 6+ months.

## How it works

1. **Bank data first.** With consent through an RBI-licensed Account Aggregator, we fetch 6 months of statements from the account the platforms pay into.
2. **Match payouts to payers.** Credits are matched to a maintained list of platform payer names and UPI handles (Swiggy, Zomato, Uber, Rapido, Zepto, and others). Each match counts as verified.
3. **Label the gaps.** Credits the worker tags by hand (and, from a later phase, earnings screenshots) show as self-reported and never count toward verified income.
4. **Check for tricks.** Flag round-tripping, one-off large credits, and accounts younger than 6 months.
5. **Share a Passport.** Signed PDF, link, and QR. Valid 30 days. The worker picks the verifier and the fields they see, is notified of every view, and can revoke.

### What “stable” means (v1)

This definition is published to every verifier so they all read the same report the same way:

- Verified platform income in at least 5 of the last 6 months
- Floor income (average of the 3 lowest months) at least 60% of the median month
- **Band A** = both tests pass, **B** = one, **C** = none
- The band is always shown with the raw numbers, never alone

### Trust signals on every report

- Each figure traces to a dated bank credit
- Digitally signed; QR checks it against our server
- Expires after 30 days; consent date printed
- Public methodology page for verifiers

## Product surfaces

| Screen | Worker / verifier does | What happens next |
| --- | --- | --- |
| **Link your bank** | Picks the payout account and approves consent with an OTP | 6 months of statements fetched; platform payouts detected |
| **Your payouts** | Confirms matches; tags any payout we missed | Median, floor, active months, and stability band calculated |
| **Your Passport** | Taps Share; picks the verifier and which fields they see | Signed PDF, link, and QR created; valid 30 days |
| **Verifier view** | Lender or landlord opens the link or scans the QR | Verifier decides; worker is notified of every view |

Constraints we design for: ₹8k Android phones, patchy 4G, Hindi and Marathi.

## Scope

### In

| Feature | Why | Priority |
| --- | --- | --- |
| Bank connect and payout detection via Account Aggregator | Works with zero platform cooperation; bank data is what lenders already trust | P0 |
| Income Passport with sharing controls | Puts raw credits into the verifier’s language, on one page, with every figure traceable | P0 |
| Lender API (JSON into partner NBFC systems, with consent) | Lenders won’t re-key data; an API cuts time to decision | P1 |
| Self-reported evidence upload (screenshots / PDFs, labelled self-reported) | Covers workers paid into a second account without diluting verified figures | P2 |

### Out (for now)

- **Our own credit score or lending decision.** We are the evidence layer, not the lender.
- **Platform API integrations, or logging into platform apps for the worker.** Platforms won’t share data today; using worker logins breaks terms and creates a security risk.
- **Cash income and non-platform freelancers.** v1 covers platform payouts that can be matched to a bank credit.
- **Automatic monthly refresh.** v1 is one fetch per Passport; standing consent is harder to explain under data-minimisation rules.

## Success

**Outcome metric:** approval rate on standard terms for Passport-backed loan and rental applications at partner verifiers. Target: **+15 points vs. a randomised control group by week 8** of the pilot.

Guardrails:

- 30+ days past due at 90 days, Passport loans vs. the partner’s comparable book: no more than **+1 pt** over baseline
- Passport median vs. the lender’s own bank-statement analysis: within **±10% on at least 95%** of reports
- Fields shared outside consent: **zero**; consent complaints under **0.5%** of users

### Pune pilot (Nov–Dec 2026)

- 500 delivery and ride-hailing workers, recruited at 3 rider hubs and through one EV dealer network
- Verifiers: 1 NBFC (EV two-wheeler loans) and 1 rental platform
- Randomised at the NBFC: half of eligible applicants share a Passport, half use today’s documents
- Leading signals: consent → Passport completion, bank-match rate, verifier acceptance with no extra docs, time to decision, share rate within 7 days

## Privacy and consent

Purpose-bound, time-limited, and revocable by the worker (DPDP Act and RBI Account Aggregator rules).

- Read once, for the Passport only
- Worker can revoke in Settings
- We never see the bank password
- v1 does not keep a standing pull on the account

## Go-to-market

Free for workers. Verifiers pay per verified report.

Launch through rider hubs and an EV dealer network in Pune, with the Passport built into a partner NBFC desk and a rental platform. Later: Hindi and Marathi as first-class UI, more lenders, more cities, evidence upload, and Passport refresh.

| Phase | What ships | When |
| --- | --- | --- |
| Phase 1 | Bank connect, payout detection, Passport, verifier view; Pune pilot | Nov–Dec 2026 |
| Phase 2 | Lender API, Hindi and Marathi, more lenders and rentals, 5 cities | Q1 2027 |
| Later | Evidence upload, platform partnerships, Passport refresh | H2 2027 |

## Company bet

Become the trusted income layer for India’s new-to-credit workforce. The gig workforce is scaling fast (NITI Aayog: 7.7M workers in 2020–21, projected 23.5M by 2029–30). Account Aggregator rails are live across major banks, so consented bank data is available today without platform deals.
