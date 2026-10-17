# RESOLVEX Data Governance, Limitations & Analytical Caveats

Analytical honesty is a core design philosophy of RESOLVEX. Analysts and reviewers must interpret findings in accordance with the following data constraints:

## 1. Observational Nature vs. Causation
- **Complaint Volume Is Not Causation:** A high complaint count or surge in complaint volume does not prove institutional malfeasance, predatory intent, or customer dissatisfaction rates.
- **Absence of a Denominator:** The CFPB Consumer Complaint Database does not contain market-wide transaction volumes, customer counts, or active account totals. An institution with 50 million active credit cards will naturally accumulate more raw complaints than an institution with 100,000 cards, even with a far superior operational quality rate.

## 2. Narrative Selection Bias
- **Voluntary Opt-In:** Narrative publication is voluntary. Consumers who elect to publish a narrative represent an opt-in self-selected subpopulation.
- **Unmatched Narratives:** Historical narrative archives released under FOIA are distinct from live database tables. Narratives lacking valid join keys are explicitly labeled and reported under data quality metrics.

## 3. Statistical Testing Limitations
- **Observational Assumptions:** Pearson's Chi-Square tests evaluate homogeneity across observed categorical distributions. A statistically significant shift ($p < 0.05$) signifies that the observed categorical mix changed more than would be expected under random multinomial sampling; it does not indicate the business root cause behind the shift.
- **Category Granularity:** Discrepancies in sub-product or sub-issue reporting may reflect changing consumer submission channels or portal layout redesigns rather than genuine product shifts.
