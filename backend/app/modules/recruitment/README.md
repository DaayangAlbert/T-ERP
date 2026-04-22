# STEP 10 - Recruitment Module

Implemented capabilities:

- job offer lifecycle (create, list, update)
- candidate profile management
- job applications workflow
- candidate matching generation and ranking

Endpoints:

- `GET /api/v1/recruitment/job-offers`
- `POST /api/v1/recruitment/job-offers`
- `PATCH /api/v1/recruitment/job-offers/{offer_id}`
- `GET /api/v1/recruitment/candidate-profiles`
- `POST /api/v1/recruitment/candidate-profiles`
- `PUT /api/v1/recruitment/candidate-profiles/me`
- `POST /api/v1/recruitment/job-offers/{offer_id}/apply`
- `GET /api/v1/recruitment/applications`
- `PATCH /api/v1/recruitment/applications/{application_id}`
- `POST /api/v1/recruitment/job-offers/{offer_id}/matches/generate`
- `GET /api/v1/recruitment/matches`

Matching logic:

- deterministic score based on role alignment, years of experience, location alignment, and profile completeness
- scores are normalized to 0-100
- rationale tags are persisted for explainability

Security:

- read endpoints require `recruitment.read`
- management endpoints require `recruitment.manage`
- self candidate profile and apply endpoints are authenticated for job seekers and employees
