import math
from typing import Dict, Any, List, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from scipy import stats
import numpy as np

from app.models.entities import Complaint, ComplaintNarrative

class AnalyticsService:
    @staticmethod
    def get_overview_summary(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        product: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Calculates core overview KPIs with filters and documented metrics."""
        query = db.query(Complaint)
        if start_date:
            query = query.filter(Complaint.date_received >= start_date)
        if end_date:
            query = query.filter(Complaint.date_received <= end_date)
        if product:
            query = query.filter(Complaint.product == product)

        total_complaints = query.count()
        if total_complaints == 0:
            return {
                "total_complaints": 0,
                "timely_response_rate": 0.0,
                "timely_numerator": 0,
                "timely_denominator": 0,
                "narrative_availability_rate": 0.0,
                "narratives_count": 0,
                "disputed_rate": 0.0,
                "period_start": start_date.isoformat() if start_date else None,
                "period_end": end_date.isoformat() if end_date else None,
            }

        timely_counts = query.with_entities(
            func.sum(case((Complaint.timely_response == True, 1), else_=0)),
            func.sum(case((Complaint.timely_response.isnot(None), 1), else_=0)),
            func.sum(case((Complaint.has_narrative == True, 1), else_=0)),
            func.sum(case((Complaint.consumer_disputed == True, 1), else_=0)),
            func.sum(case((Complaint.consumer_disputed.isnot(None), 1), else_=0)),
        ).first()

        timely_num = timely_counts[0] or 0
        timely_den = timely_counts[1] or 0
        timely_rate = round((timely_num / timely_den * 100), 2) if timely_den > 0 else 0.0

        narrative_count = timely_counts[2] or 0
        narrative_rate = round((narrative_count / total_complaints * 100), 2)

        disputed_num = timely_counts[3] or 0
        disputed_den = timely_counts[4] or 0
        disputed_rate = round((disputed_num / disputed_den * 100), 2) if disputed_den > 0 else 0.0

        return {
            "total_complaints": total_complaints,
            "timely_response_rate": timely_rate,
            "timely_numerator": timely_num,
            "timely_denominator": timely_den,
            "narrative_availability_rate": narrative_rate,
            "narratives_count": narrative_count,
            "disputed_rate": disputed_rate,
            "period_start": start_date.isoformat() if start_date else None,
            "period_end": end_date.isoformat() if end_date else None,
        }

    @staticmethod
    def get_monthly_trends(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        product: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Returns complaint volume aggregated by month."""
        # Using string formatting for year-month across Postgres and SQLite
        query = db.query(
            func.to_char(Complaint.date_received, 'YYYY-MM').label("month"),
            func.count(Complaint.id).label("count")
        )
        if start_date:
            query = query.filter(Complaint.date_received >= start_date)
        if end_date:
            query = query.filter(Complaint.date_received <= end_date)
        if product:
            query = query.filter(Complaint.product == product)

        results = query.group_by("month").order_by("month").all()
        
        trend = []
        prev_count = None
        for month, count in results:
            mom_pct = None
            if prev_count is not None and prev_count > 0:
                mom_pct = round(((count - prev_count) / prev_count) * 100, 1)
            trend.append({
                "period": month,
                "count": count,
                "mom_pct_change": mom_pct
            })
            prev_count = count
        return trend

    @staticmethod
    def get_category_breakdowns(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Provides category distributions for products, top issues, and companies."""
        query = db.query(Complaint)
        if start_date:
            query = query.filter(Complaint.date_received >= start_date)
        if end_date:
            query = query.filter(Complaint.date_received <= end_date)

        total = query.count() or 1

        # Products
        products = query.with_entities(
            Complaint.product,
            func.count(Complaint.id).label("count")
        ).group_by(Complaint.product).order_by(func.count(Complaint.id).desc()).all()

        product_list = [
            {"name": p, "count": c, "share_pct": round((c / total) * 100, 2)}
            for p, c in products
        ]

        # Issues
        issues = query.with_entities(
            Complaint.issue,
            func.count(Complaint.id).label("count")
        ).group_by(Complaint.issue).order_by(func.count(Complaint.id).desc()).limit(10).all()

        issue_list = [
            {"name": i, "count": c, "share_pct": round((c / total) * 100, 2)}
            for i, c in issues
        ]

        # Companies
        companies = query.with_entities(
            Complaint.company,
            func.count(Complaint.id).label("count")
        ).group_by(Complaint.company).order_by(func.count(Complaint.id).desc()).limit(10).all()

        company_list = [
            {"name": comp, "count": c, "share_pct": round((c / total) * 100, 2)}
            for comp, c in companies
        ]

        # States
        states = query.filter(Complaint.state.isnot(None)).with_entities(
            Complaint.state,
            func.count(Complaint.id).label("count")
        ).group_by(Complaint.state).order_by(func.count(Complaint.id).desc()).limit(12).all()

        state_list = [
            {"name": s, "count": c, "share_pct": round((c / total) * 100, 2)}
            for s, c in states
        ]

        return {
            "products": product_list,
            "issues": issue_list,
            "companies": company_list,
            "states": state_list,
        }

    @staticmethod
    def run_period_comparison(
        db: Session,
        current_start: date,
        current_end: date,
        baseline_start: date,
        baseline_end: date,
        breakdown_by: str = "product", # "product" or "issue"
    ) -> Dict[str, Any]:
        """
        Executes period comparison, contribution analysis, and chi-square statistical test.
        Contribution formula: Delta_i = C_curr,i - C_base,i
        Reconciles: sum(Delta_i) == Total_Delta
        """
        # Baseline query
        base_query = db.query(Complaint).filter(
            Complaint.date_received >= baseline_start,
            Complaint.date_received <= baseline_end
        )
        base_total = base_query.count()

        # Current query
        curr_query = db.query(Complaint).filter(
            Complaint.date_received >= current_start,
            Complaint.date_received <= current_end
        )
        curr_total = curr_query.count()

        abs_change = curr_total - base_total
        pct_change = round((abs_change / base_total * 100), 2) if base_total > 0 else None

        # Breakdown aggregation
        group_col = Complaint.product if breakdown_by == "product" else Complaint.issue

        base_grouped = dict(
            base_query.with_entities(group_col, func.count(Complaint.id)).group_by(group_col).all()
        )
        curr_grouped = dict(
            curr_query.with_entities(group_col, func.count(Complaint.id)).group_by(group_col).all()
        )

        all_categories = sorted(set(list(base_grouped.keys()) + list(curr_grouped.keys())))
        
        contributions = []
        observed_contingency = []
        categories_for_test = []

        sum_category_deltas = 0

        for cat in all_categories:
            c_base = base_grouped.get(cat, 0)
            c_curr = curr_grouped.get(cat, 0)
            delta = c_curr - c_base
            sum_category_deltas += delta

            contrib_pct = round((delta / abs_change * 100), 2) if abs_change != 0 else 0.0

            contributions.append({
                "category": cat,
                "baseline_count": c_base,
                "current_count": c_curr,
                "absolute_change": delta,
                "contribution_pct": contrib_pct,
                "baseline_share_pct": round((c_base / max(base_total, 1)) * 100, 2),
                "current_share_pct": round((c_curr / max(curr_total, 1)) * 100, 2),
            })

            # For contingency table if counts are meaningful
            if c_base + c_curr >= 5:
                observed_contingency.append([c_base, c_curr])
                categories_for_test.append(cat)

        # Sort by absolute change descending (largest contributors to increase or decrease)
        contributions.sort(key=lambda x: abs(x["absolute_change"]), reverse=True)

        # Build waterfall chart data
        # Step 1: Baseline
        # Steps 2..N: Top category deltas (group others)
        waterfall_data = [{"name": "Baseline Total", "value": base_total, "is_total": True}]
        top_contributions = contributions[:6]
        top_cats = {c["category"] for c in top_contributions}
        other_delta = sum(c["absolute_change"] for c in contributions if c["category"] not in top_cats)

        for c in top_contributions:
            waterfall_data.append({
                "name": c["category"][:28] + ("..." if len(c["category"]) > 28 else ""),
                "value": c["absolute_change"],
                "is_total": False
            })

        if other_delta != 0:
            waterfall_data.append({
                "name": "All Other Categories",
                "value": other_delta,
                "is_total": False
            })

        waterfall_data.append({
            "name": "Current Total",
            "value": curr_total,
            "is_total": True
        })

        # Statistical Hypothesis Testing: Chi-Square Test of Independence
        stats_result = None
        if len(observed_contingency) >= 2 and base_total > 20 and curr_total > 20:
            obs = np.array(observed_contingency)
            try:
                chi2, p_val, dof, expected = stats.chi2_contingency(obs)
                n = obs.sum()
                min_dim = min(obs.shape) - 1
                cramers_v = math.sqrt(chi2 / (n * min_dim)) if min_dim > 0 and n > 0 else 0.0

                stats_result = {
                    "test_name": "Pearson's Chi-Square Test of Homogeneity",
                    "tested_question": f"Did the relative distribution of complaints across {breakdown_by} categories change significantly between the baseline and current period?",
                    "sample_size_baseline": base_total,
                    "sample_size_current": curr_total,
                    "chi2_statistic": round(float(chi2), 3),
                    "degrees_of_freedom": int(dof),
                    "p_value": float(f"{p_val:.4e}"),
                    "cramers_v_effect_size": round(float(cramers_v), 3),
                    "is_statistically_significant": bool(p_val < 0.05),
                    "interpretation": (
                        "The change in categorical distribution across periods is statistically significant (p < 0.05)."
                        if p_val < 0.05 else
                        "There is insufficient statistical evidence to reject the null hypothesis of identical distributions (p >= 0.05)."
                    ),
                    "assumptions": "Expected cell counts generally >= 5; independent complaint events.",
                    "limitations": "Observational CFPB complaint data. A significant shift may reflect changes in consumer submission behavior or reporting practices rather than underlying customer dissatisfaction.",
                }
            except Exception as e:
                stats_result = {"error": f"Chi-square computation failed: {str(e)}"}

        reconciliation_discrepancy = abs_change - sum_category_deltas

        return {
            "baseline_period": {"start": baseline_start.isoformat(), "end": baseline_end.isoformat(), "total": base_total},
            "current_period": {"start": current_start.isoformat(), "end": current_end.isoformat(), "total": curr_total},
            "absolute_change": abs_change,
            "percentage_change": pct_change,
            "breakdown_by": breakdown_by,
            "contributions": contributions,
            "waterfall_chart": waterfall_data,
            "reconciliation": {
                "sum_of_category_deltas": sum_category_deltas,
                "total_delta": abs_change,
                "discrepancy": reconciliation_discrepancy,
                "is_reconciled": reconciliation_discrepancy == 0
            },
            "statistical_test": stats_result,
            "caveats": [
                "Decomposition reflects additive changes in recorded complaints within the selected filter context.",
                "Zero baseline categories prevent percentage change calculation and are reported with absolute counts only.",
                "CFPB complaints do not represent a market-wide census of all financial transactions."
            ]
        }
