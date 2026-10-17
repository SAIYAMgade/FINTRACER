import csv
import hashlib
import random
import os
from datetime import datetime, timedelta

random.seed(42)

COMPLAINTS_FILE = os.path.join("data", "sample", "sample_complaints.csv")
NARRATIVES_FILE = os.path.join("data", "sample", "sample_narratives.csv")

os.makedirs(os.path.join("data", "sample"), exist_ok=True)

COMPANIES = [
    "EQUIFAX, INC.",
    "TRANSUNION INTERMEDIATE HOLDINGS, INC.",
    "EXPERIAN INFORMATION SOLUTIONS INC.",
    "JPMORGAN CHASE & CO.",
    "CITIBANK, N.A.",
    "WELLS FARGO & COMPANY",
    "BANK OF AMERICA, NATIONAL ASSOCIATION",
    "CAPITAL ONE FINANCIAL CORPORATION",
    "DISCOVER BANK",
    "SYNCHRONY FINANCIAL",
    "PORTFOLIO RECOVERY ASSOCIATES, LLC",
    "MIDLAND CREDIT MANAGEMENT, INC.",
]

PRODUCTS_AND_ISSUES = [
    {
        "product": "Credit reporting, credit repair services, or other personal consumer reports",
        "sub_product": "Credit reporting",
        "issues": [
            ("Incorrect information on your report", "Information belongs to someone else"),
            ("Incorrect information on your report", "Account status incorrect"),
            ("Problem with a company's investigation into an existing problem", "Investigation took more than 30 days"),
            ("Improper use of your report", "Reporting company used your report improperly"),
        ],
    },
    {
        "product": "Debt collection",
        "sub_product": "Other debt",
        "issues": [
            ("Attempts to collect debt not owed", "Debt is not mine"),
            ("Attempts to collect debt not owed", "Debt was paid"),
            ("Written notification about debt", "Didn't receive enough information to verify debt"),
            ("Communication tactics", "Frequent or repeated calls"),
        ],
    },
    {
        "product": "Credit card or prepaid card",
        "sub_product": "General-purpose credit card or charge card",
        "issues": [
            ("Billing disputes", "Incorrect billing amount or transaction"),
            ("Trouble during payment process", "Payment not credited on time"),
            ("Problem when making payments", "Late fees assessed improperly"),
            ("Closing an account", "Company closed account without notification"),
        ],
    },
    {
        "product": "Checking or savings account",
        "sub_product": "Checking account",
        "issues": [
            ("Managing an account", "Deposits and withdrawals"),
            ("Problem caused by an error", "Overdraft fee charged in error"),
            ("Opening an account", "Account opening denial"),
            ("Closing an account", "Funds held after closing"),
        ],
    },
    {
        "product": "Mortgage",
        "sub_product": "Conventional home mortgage",
        "issues": [
            ("Struggling to pay mortgage", "Loan modification application"),
            ("Trouble during payment process", "Escrow balance calculation error"),
            ("Applying for a mortgage or refinancing an existing mortgage", "Application processing delays"),
        ],
    },
]

STATES = ["CA", "TX", "FL", "NY", "GA", "IL", "NC", "OH", "PA", "AZ", "WA", "MI"]
CHANNELS = ["Web", "Web", "Web", "Phone", "Postal mail", "Referral"]
RESPONSES = [
    ("Closed with explanation", 0.72),
    ("Closed with non-monetary relief", 0.18),
    ("Closed with monetary relief", 0.07),
    ("In progress", 0.02),
    ("Untimely", 0.01),
]

NARRATIVE_TEMPLATES = {
    "Credit reporting": [
        "I pulled my credit report on {date} and discovered multiple unauthorized accounts and incorrect late payment marks from {company}. I submitted a certified dispute letter under FCRA Section 611 with supporting bank statements, but the bureau failed to conduct a reasonable investigation within 30 days and simply verified the erroneous trade line. This false record has depressed my credit score by over 70 points and caused a mortgage loan denial.",
        "On {date}, I noticed an inquiry and collections account that does not belong to me on my file at {company}. I am a victim of identity theft and previously filed an FTC identity theft report. Despite sending this documentation twice, the company continues to report this fraudulent tradeline. I demand immediate deletion of this unverified information.",
        "I have repeatedly disputed an inaccurate derogatory account with {company}. The account was settled in full two years ago with zero balance, yet it continues to show as an open charge-off with an ongoing past-due balance. This violates federal credit reporting laws and is causing severe financial distress.",
    ],
    "Debt collection": [
        "I received aggressive collection letters and phone calls from {company} regarding a debt of ${amount} that I have never heard of. I sent a formal debt validation notice under FDCPA Section 809(b) requesting proof of contract and chain of title. The agency failed to provide any verification and instead reported a negative item to the credit bureaus.",
        "{company} has been calling my mobile phone multiple times daily, including early mornings and weekends, attempting to collect an alleged medical bill that was already fully settled by my health insurance carrier in 2024. They refuse to listen to my explanation and threaten legal action.",
        "A collector from {company} contacted my workplace and disclosed my alleged financial obligations to my supervisor. Furthermore, this debt is over 10 years old and well past the state statute of limitations. This is an unlawful attempt to resurrect zombie debt through harassment.",
    ],
    "Credit card": [
        "I was charged an unauthorized recurring fee of ${amount} on my credit card statement from {company}. When I promptly contacted customer service on {date} to dispute the charge, the representative promised a provisional credit within 48 hours. Instead, they billed me a late payment fee and interest on the disputed amount.",
        "My payment was submitted through the online portal on {date}, three days before the due date. {company} experienced a technical glitch, processed the payment late, and subsequently slapped my account with a $39 late fee and penalty APR. Customer support refused to reverse the penalty despite bank transaction receipts proving timely submission.",
        "Without any warning or explanation, {company} abruptly reduced my credit limit from $15,000 to $1,000, which drastically spiked my credit utilization ratio and damaged my credit score. When I inquired, I received generic canned responses.",
    ],
    "Checking or savings": [
        "On {date}, {company} debited an unexpected maintenance fee of ${amount} from my checking account, which triggered cascading overdraft charges totaling over $120. I maintain direct deposit that meets all fee waiver requirements. The branch manager admitted an internal system error but claimed they can only refund one fee per year.",
        "I requested {company} to wire funds to close on a real estate purchase. The wire was held for five business days with no fraud alert notification or explanation. The delay nearly caused me to breach my purchase contract and forfeit my earnest money deposit.",
    ],
    "Mortgage": [
        "My mortgage loan was transferred from my previous servicer to {company}. During the transfer, my monthly escrow payment was misapplied, resulting in a false notice of default and insurance cancellation threats. I have sent certified mail with proof of timely payments, but customer service has been completely unresponsive for 6 weeks.",
        "I submitted a complete loan modification application to {company} following a medical hardship. Over four months, they requested the same tax documents five separate times, claiming each time that the previous submission had expired, while simultaneously continuing foreclosure proceedings in dual-tracking violation.",
    ],
}

def generate_data(num_complaints=1200):
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 6, 30)
    total_days = (end_date - start_date).days

    complaints = []
    narratives = []
    base_id = 3500000

    for i in range(num_complaints):
        cid = str(base_id + i)
        # Weight dates towards late 2025 and early 2026 to show volume growth
        day_offset = int(random.triangular(0, total_days, total_days * 0.75))
        rec_date = start_date + timedelta(days=day_offset)
        sent_date = rec_date + timedelta(days=random.randint(1, 5))

        prod_cfg = random.choice(PRODUCTS_AND_ISSUES)
        product = prod_cfg["product"]
        sub_product = prod_cfg["sub_product"]
        issue, sub_issue = random.choice(prod_cfg["issues"])
        company = random.choice(COMPANIES)
        state = random.choice(STATES)
        zip_code = f"{random.randint(10000, 99999)}"
        channel = random.choice(CHANNELS)

        # Company response weighted choice
        r_weights = [r[1] for r in RESPONSES]
        company_response = random.choices([r[0] for r in RESPONSES], weights=r_weights)[0]
        timely_response = False if company_response == "Untimely" or random.random() < 0.02 else True
        consumer_disputed = random.choice([True, False, None])
        tags = random.choice(["Older American", "Servicemember", None, None, None, None])

        # ~45% of complaints have narratives
        has_narrative = random.random() < 0.45

        complaint_row = {
            "complaint_id": cid,
            "date_received": rec_date.strftime("%Y-%m-%d"),
            "product": product,
            "sub_product": sub_product,
            "issue": issue,
            "sub_issue": sub_issue,
            "company": company,
            "state": state,
            "zip_code": zip_code,
            "submitted_via": channel,
            "date_sent_to_company": sent_date.strftime("%Y-%m-%d"),
            "company_response_to_consumer": company_response,
            "timely_response": "Yes" if timely_response else "No",
            "consumer_disputed": "Yes" if consumer_disputed is True else ("No" if consumer_disputed is False else ""),
            "tags": tags or "",
            "has_narrative": "Yes" if has_narrative else "No"
        }
        complaints.append(complaint_row)

        if has_narrative:
            # Pick narrative template matching product group
            key = "Credit reporting"
            if "Debt collection" in product:
                key = "Debt collection"
            elif "Credit card" in product:
                key = "Credit card"
            elif "Checking" in product:
                key = "Checking or savings"
            elif "Mortgage" in product:
                key = "Mortgage"

            tmpl = random.choice(NARRATIVE_TEMPLATES[key])
            text = tmpl.format(
                date=rec_date.strftime("%B %d, %Y"),
                company=company,
                amount=random.choice([150, 480, 1250, 3200, 89, 45, 620]),
            )
            text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
            word_count = len(text.split())

            narratives.append({
                "complaint_source_id": cid,
                "narrative_text": text,
                "text_hash": text_hash,
                "word_count": word_count,
                "language_code": "en",
                "preprocessing_version": "v1.0"
            })

    # Add deliberate Data Quality test cases
    # 1. Duplicate row
    dup_row = dict(complaints[10])
    complaints.append(dup_row)

    # 2. Row with missing required issue
    missing_issue_row = dict(complaints[20])
    missing_issue_row["complaint_id"] = str(base_id + num_complaints + 1)
    missing_issue_row["issue"] = ""
    complaints.append(missing_issue_row)

    # 3. Unmatched narratives (narrative whose complaint_source_id does not exist in complaints)
    for j in range(5):
        unmatched_id = f"999999{j}"
        narratives.append({
            "complaint_source_id": unmatched_id,
            "narrative_text": "I submitted a dispute regarding an unauthorized bank charge but never received a complaint tracking number.",
            "text_hash": hashlib.sha256(b"unmatched_test").hexdigest(),
            "word_count": 18,
            "language_code": "en",
            "preprocessing_version": "v1.0"
        })

    # Write complaints CSV
    fieldnames = list(complaints[0].keys())
    with open(COMPLAINTS_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(complaints)

    # Write narratives CSV
    narrative_fields = ["complaint_source_id", "narrative_text", "text_hash", "word_count", "language_code", "preprocessing_version"]
    with open(NARRATIVES_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=narrative_fields)
        writer.writeheader()
        writer.writerows(narratives)

    print(f"Generated {len(complaints)} complaint rows -> {COMPLAINTS_FILE}")
    print(f"Generated {len(narratives)} narrative rows -> {NARRATIVES_FILE}")

if __name__ == "__main__":
    generate_data()
