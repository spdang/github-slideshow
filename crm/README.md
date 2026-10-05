# CordCare CRM

A small, dependency-free CRM for a cord blood / cord tissue stem cell banking company.
Open `crm/index.html` in a browser (or visit `/crm/` on the GitHub Pages site). No build step and no server are needed.

## What it tracks

| Area | Purpose |
| --- | --- |
| **Dashboard** | Open leads, enrolled pre-birth families, units in storage, conversion rate, overdue billing, open prescriptions, late tasks; doctor visits coming up; upcoming births with kit-shipped warnings; samples in the lab; storage renewals due. |
| **Pipeline** | Kanban board of expectant families: Inquiry → Info Sent → Consultation → Enrolled → Kit Shipped → Collected → Stored (or Lost). Drag cards to change stage. |
| **Families** | Parents, contact info, due date, service (cord blood / tissue), storage plan, hospital / birth place, the doctor who recommended banking, lead source, billing status, next renewal date. |
| **Samples** | Sample ID, linked family, type, collection date, lab status (In transit → Received → Processing → Cryopreserved / Failed QC / Released), courier tracking, volume, TNC count, viability, tank / rack / box location. |
| **Tasks** | Calls, emails, consultations, kit shipments, follow-ups and billing chores, linked to a family and given a due date. |
| **Prescriptions** | Doctors' orders: collection orders before a birth, and requests to release a stored unit for transplant or regenerative therapy. Records the prescribing doctor, family, unit to release, recipient, indication, issue and needed-by dates, status (Received → Verifying → Approved → Fulfilled / Rejected / Cancelled) and whether a signed copy is on file. Open orders also appear on the dashboard. |
| **Visits** | Plan sales visits to doctors and clinics: date, time, purpose (introduction, brochure / kit drop-off, lunch & learn, follow-up, agreement), the rep, the outcome and the next step. Visits in the next 14 days, and planned visits nobody logged, appear on the dashboard. |
| **Partners** | Hospitals, OB/GYNs, pediatricians, hematologists / oncologists, transplant centers, midwives, doulas and birth centers, with license numbers, how many families each doctor recommended, the prescriptions they issued, and their last and next visit dates. |

Every list can be searched, filtered and sorted. Click any row or card to edit it.

## Data

Records are saved in the browser's `localStorage`, so each browser keeps its own copy. Demo data loads the first time the app opens.
The **Data ▾** menu can:

- export and import a full JSON backup
- export the current list as CSV
- reload the demo data, or erase everything

> **Privacy note:** this is a lightweight, single-user tool. Browser storage is not encrypted, access-controlled or audited, so it is **not** suitable for real patient health information under HIPAA / GDPR as-is. Before using it with real client data, move storage to a secured backend with authentication, encryption and audit logging.

## Files

- `index.html`: page shell and navigation
- `crm.css`: styles, with light and dark mode
- `crm.js`: data model (schema-driven forms and tables), views, persistence and demo data
