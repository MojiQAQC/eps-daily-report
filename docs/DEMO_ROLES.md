# Demo Architecture & Role Personas

This document outlines the demonstration strategy for the **EPS Daily Report & Site Collaboration System**, where a single presenter showcases the complete end-to-end workflow across all three user tiers.

---

## 1. Single-Presenter Architecture: Demo Portal vs. Production RBAC

### Production Behavior (Future State)
- In production, users **do not choose their role**.
- All users log in via a single `/login` page using company-issued or invite-authenticated credentials.
- The system automatically evaluates the user's role and assigned project/contractor access in Postgres via **Row Level Security (RLS)**.
- Navigation, forms, and administrative tools dynamically adapt to the user's exact permissions.

### Demo / Presentation Architecture (Current State)
- For live demonstrations and pilot validation, a single presenter must demonstrate the perspectives of three separate stakeholders without the friction of repeated logouts or credential re-entries.
- **Recommended Interface:** Dedicated **Demo Portals** or a **1-Click Role Switcher** on the application navigation bar. This makes the presenter's active persona explicitly visible to the audience at all times.

---

## 2. Demo User Personas & Credentials

The following standardized demo accounts represent the three core tiers of the platform:

| Role Tier | Persona Name | Organization / Scope | Demo Email | Demo Password | Key Permissions & Responsibilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Contractor** <br>`contractor_user` | **Puntakan S.** <br>(Site Lead / Foreman) | **Fast Steel** <br>(หจก. ฟาสต์สตีล จำกัด) <br>Project: STS 9.9 MW | `contractor@faststeel.demo` | `DemoPassword2026!` | • Fill & submit Morning Plan / End-of-Day Actual <br>• Enter trade workforce headcounts & permits <br>• Attach progress & safety photos (6 slots) <br>• View own company's report history only |
| **2. Site Admin** <br>`site_admin` | **Somchai K.** <br>(EPS Resident Engineer) | **EPS Site Management** <br>Project: STS 9.9 MW | `site.admin@eps.demo` | `DemoPassword2026!` | • Review all contractor daily reports across the STS site <br>• Sign off / verify reports (`Checked by EPS`) <br>• Monitor site-wide manpower aggregation & safety records <br>• Track critical issues and delayed work items |
| **3. System Admin** <br>`head_office_admin` | **Supachai N.** <br>(Project Director) | **EPS Head Office** <br>Cross-project oversight | `admin@eps.demo` | `DemoPassword2026!` | • Full administrative access <br>• Manage Master Data (Contractors, Disciplines, Projects) <br>• Issue email invitations & assign project/contractor scopes <br>• High-level metrics across all 23 EPS sites |

---

## 3. Recommended Presentation Narrative (3-Step Walkthrough)

```
[Step 1: Contractor]              [Step 2: Site Admin]               [Step 3: Head Office Admin]
Fast Steel files Daily Report  -> EPS Site Engineer reviews/approves -> Executive checks Master Data & Metrics
```

1. **Act I — Contractor Experience (`contractor@faststeel.demo`):**
   - Open the web application on a mobile viewport / browser.
   - Show how the Daily Report form replaces the legacy Excel/PDF sheet.
   - Fill Today's Activities with Plan vs. Actual %, trade workforce numbers, work permits (Hotwork, Height), and 6 photos.
   - Submit the report.
2. **Act II — Site Engineer Review (`site.admin@eps.demo`):**
   - Switch to the Site Admin persona.
   - Open Report History / Today's Status to show the newly submitted report appear in real time.
   - Highlight the site weather widget and safety compliance alerts (e.g. wind speed < 14 mph rule).
   - Verify the contractor's numbers and sign off as `Checked by EPS`.
3. **Act III — Corporate Governance (`admin@eps.demo`):**
   - Switch to the Head Office Admin persona.
   - Navigate to **Master Data** (`/admin`).
   - Demonstrate adding a new contractor (e.g., Sinoma or L-TAB) and binding their assigned disciplines.
   - Explain how database-level Row Level Security guarantees data isolation between competing contractors.
