# RESOLVEX NLP Methodology & Narrative Intelligence Specification

## 1. Qualitative Data Preprocessing
The text preprocessing engine executes deterministic cleaning on historical consumer narratives:
1. **Regex Noise Reduction:** Strips URLs, email addresses, and uninformative punctuation while preserving currency amounts (`$150`), percentages (`24%`), and statutory references (`FCRA 611`, `FDCPA 809b`).
2. **Financial-Aware Stopword Removal:** Standard NLP stopword dictionaries often strip crucial negations and domain words. RESOLVEX preserves negation markers (`not`, `no`, `never`, `without`, `dispute`, `denied`, `fee`, `interest`).
3. **Hashing & Deduplication:** Computes SHA-256 hashes of normalized narratives to detect exact story duplicates.

## 2. Unsupervised Thematic Discovery
- **Vectorization:** Scikit-Learn `TfidfVectorizer` configured with:
  - Sublinear term frequency scaling (`sublinear_tf=True`)
  - $n$-gram range (1, 2)
  - Minimum document frequency (`min_df=2`)
  - Maximum features: 1,000 terms
- **Clustering:** `MiniBatchKMeans` with reproducible seed (`random_state=42`) and batch size 200.
- **Top Keyword Attribution:** Cluster centroids are sorted descending to identify the highest weighted feature terms for each cluster.

## 3. Financial Domain Mapping & Labelling
Centroid keyword vectors are cross-matched against an approved regulatory domain taxonomy:
1. **Credit Reporting & Tradeline Accuracy Disputes (FCRA):** Terms: *credit, dispute, tradeline, bureaus, inquiry, report, identity*.
2. **Unverified & Zombie Debt Collection Practices (FDCPA):** Terms: *debt, validation, collector, calls, harassment, zombie, medical*.
3. **Credit Card Billing Discrepancies & Fee Disputes:** Terms: *card, fee, late, payment, limit, apr, charge, unauthorized*.
4. **Deposit Account Overdrafts & Funds Availability:** Terms: *checking, overdraft, account, wire, funds, hold, maintenance*.
5. **Mortgage Servicing & Escrow Accounting Issues:** Terms: *mortgage, escrow, servicer, payment, loan, transfer, modification*.

## 4. Structured-to-Text Concordance
To bridge qualitative stories and relational dimensions, RESOLVEX executes SQL joins across `complaints`, `complaint_narratives`, and `narrative_theme_assignments`. This surfaces:
- Thematic distribution within individual product categories.
- Frequency of unverified debt themes across untimely response outcomes.
- Concordance between structured regulatory issue codes and consumer-reported root causes.
