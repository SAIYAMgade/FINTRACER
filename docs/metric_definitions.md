# RESOLVEX Metric Definitions & Statistical Methodology

Every analytical figure in RESOLVEX is derived from explicit mathematical formulas and documented database aggregations.

## 1. Descriptive Metrics

### Total Complaints ($C$)
- **Definition:** Count of distinct valid complaint records loaded into the system within the specified date boundaries and filter scope.
- **Formula:**
  $$\text{Total Complaints} = \sum_{r \in \text{Records}} 1$$
- **SQL Implementation:**
  ```sql
  SELECT COUNT(*) FROM complaints WHERE date_received BETWEEN :start AND :end;
  ```

### Timely Response Rate ($R_{\text{timely}}$)
- **Definition:** Proportion of complaints where the financial company provided a response within the statutory response window (typically 15 days or 60 days with justification).
- **Formula:**
  $$R_{\text{timely}} = \frac{\sum \mathbb{I}(\text{timely\_response} = \text{TRUE})}{\sum \mathbb{I}(\text{timely\_response} \text{ IS NOT NULL})} \times 100$$
- **Denominator Rule:** Missing/null timeliness values are excluded from the rate denominator and reported separately as unknown.

### Narrative Availability Rate ($R_{\text{narrative}}$)
- **Definition:** Proportion of structured complaints that possess a matched consumer narrative in the historical narrative archive.
- **Formula:**
  $$R_{\text{narrative}} = \frac{\sum \mathbb{I}(\text{has\_narrative} = \text{TRUE})}{\text{Total Complaints}} \times 100$$

## 2. Diagnostic & Contribution Analysis

### Period-over-Period Absolute Change ($\Delta$)
- **Definition:** Absolute volume shift between the evaluated current period and baseline period.
- **Formula:**
  $$\Delta = C_{\text{current}} - C_{\text{baseline}}$$

### Category Contribution ($\Delta_i$)
- **Definition:** The volume difference within category $i$ between current and baseline periods.
- **Formula:**
  $$\Delta_i = C_{i,\text{current}} - C_{i,\text{baseline}}$$
- **Contribution Percentage:**
  $$\text{Contribution } \% = \frac{\Delta_i}{\Delta} \times 100 \quad (\text{defined when } \Delta \neq 0)$$
- **Reconciliation Constraint:**
  $$\sum_{i=1}^K \Delta_i = \Delta$$
  Any discrepancy $\delta = \Delta - \sum \Delta_i$ is explicitly audited and flagged in the UI.

## 3. Statistical Hypothesis Testing

### Pearson's Chi-Square Test of Homogeneity ($\chi^2$)
- **Question Tested:** Did the relative categorical distribution of complaints shift significantly between baseline and current periods?
- **Formula:**
  $$\chi^2 = \sum_{i} \sum_{j} \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$$
  where $O_{ij}$ is observed count in category $i$ and period $j$, and $E_{ij} = \frac{(R_i)(C_j)}{N}$.
- **Effect Size (Cramér's $V$):**
  $$V = \sqrt{\frac{\chi^2}{N \cdot (\min(r, c) - 1)}}$$
- **Assumptions:** Expected cell frequencies $E_{ij} \geq 5$; independent complaint events.
- **Interpretation:** $p < 0.05$ indicates a statistically significant shift in category distribution.
