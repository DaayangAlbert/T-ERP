from decimal import Decimal
from typing import Any

from sqlalchemy import func

from app.extensions import db
from app.models.recruitment import CandidateMatch, CandidateProfile, JobApplication, JobOffer
from app.models.user import User


class RecruitmentError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _serialize_offer(row: JobOffer) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "title": row.title,
        "description": row.description,
        "contract_type": row.contract_type,
        "location": row.location,
        "salary_min": float(row.salary_min) if row.salary_min is not None else None,
        "salary_max": float(row.salary_max) if row.salary_max is not None else None,
        "status": row.status,
        "published_by_user_id": row.published_by_user_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_candidate(row: CandidateProfile) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "email": row.email,
        "first_name": row.first_name,
        "last_name": row.last_name,
        "phone": row.phone,
        "city": row.city,
        "years_experience": row.years_experience,
        "desired_position": row.desired_position,
        "skills_summary": row.skills_summary,
        "availability_status": row.availability_status,
        "cv_url": row.cv_url,
        "profile_score": compute_profile_score(row),
    }


def _serialize_candidate_summary(row: CandidateProfile | None) -> dict[str, Any] | None:
    if row is None:
        return None

    return {
        "id": row.id,
        "user_id": row.user_id,
        "first_name": row.first_name,
        "last_name": row.last_name,
        "email": row.email,
        "city": row.city,
        "desired_position": row.desired_position,
        "availability_status": row.availability_status,
        "profile_score": compute_profile_score(row),
    }


def _serialize_application(row: JobApplication) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "job_offer_id": row.job_offer_id,
        "candidate_id": row.candidate_id,
        "status": row.status,
        "score": float(row.score) if row.score is not None else None,
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_application_with_context(
    row: JobApplication,
    *,
    offer: JobOffer | None = None,
    candidate: CandidateProfile | None = None,
) -> dict[str, Any]:
    return {
        **_serialize_application(row),
        "job_offer": _serialize_offer(offer) if offer is not None else None,
        "candidate": _serialize_candidate_summary(candidate),
    }


def _serialize_match(row: CandidateMatch) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "job_offer_id": row.job_offer_id,
        "candidate_id": row.candidate_id,
        "match_score": float(row.match_score),
        "rationale": row.rationale,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_match_with_context(
    row: CandidateMatch,
    *,
    offer: JobOffer | None = None,
    candidate: CandidateProfile | None = None,
) -> dict[str, Any]:
    return {
        **_serialize_match(row),
        "job_offer": _serialize_offer(offer) if offer is not None else None,
        "candidate": _serialize_candidate_summary(candidate),
    }


def _require_company_user(company_id: int, user_id: int) -> User:
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None or user.deleted_at is not None or not user.is_active:
        raise RecruitmentError("User not found in company", status_code=404)
    return user


def _require_offer(company_id: int, offer_id: int) -> JobOffer:
    offer = JobOffer.query.filter_by(id=offer_id, company_id=company_id).first()
    if offer is None or offer.deleted_at is not None:
        raise RecruitmentError("Job offer not found", status_code=404)
    return offer


def _require_candidate(candidate_id: int) -> CandidateProfile:
    candidate = CandidateProfile.query.filter_by(id=candidate_id).first()
    if candidate is None or candidate.deleted_at is not None:
        raise RecruitmentError("Candidate profile not found", status_code=404)
    return candidate


def list_job_offers(company_id: int, status: str | None = None, include_archived: bool = False) -> list[dict[str, Any]]:
    query = JobOffer.query.filter(JobOffer.company_id == company_id)
    if not include_archived:
        query = query.filter(JobOffer.deleted_at.is_(None))
    if status:
        query = query.filter(JobOffer.status == status)

    rows = query.order_by(JobOffer.created_at.desc()).all()
    return [_serialize_offer(row) for row in rows]


def create_job_offer(company_id: int, publisher_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _require_company_user(company_id=company_id, user_id=publisher_user_id)

    required = ["title", "description", "contract_type"]
    for field in required:
        if not str(payload.get(field) or "").strip():
            raise RecruitmentError(f"Missing field: {field}", status_code=400)

    status = str(payload.get("status") or "draft").strip().lower()
    if status not in ("draft", "published", "closed"):
        raise RecruitmentError("Invalid offer status", status_code=400)

    salary_min = payload.get("salary_min")
    salary_max = payload.get("salary_max")

    parsed_salary_min = None
    parsed_salary_max = None
    if salary_min not in (None, ""):
        parsed_salary_min = Decimal(str(salary_min))
    if salary_max not in (None, ""):
        parsed_salary_max = Decimal(str(salary_max))

    if parsed_salary_min is not None and parsed_salary_max is not None and parsed_salary_max < parsed_salary_min:
        raise RecruitmentError("salary_max cannot be lower than salary_min", status_code=400)

    row = JobOffer(
        company_id=company_id,
        title=str(payload["title"]).strip(),
        description=str(payload["description"]).strip(),
        contract_type=str(payload["contract_type"]).strip(),
        location=(payload.get("location") or "").strip() or None,
        salary_min=parsed_salary_min,
        salary_max=parsed_salary_max,
        status=status,
        published_by_user_id=publisher_user_id,
    )
    db.session.add(row)
    db.session.commit()

    return _serialize_offer(row)


def update_job_offer(company_id: int, offer_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _require_offer(company_id=company_id, offer_id=offer_id)

    if "title" in payload:
        title = str(payload["title"]).strip()
        if not title:
            raise RecruitmentError("title cannot be empty", status_code=400)
        row.title = title

    if "description" in payload:
        description = str(payload["description"]).strip()
        if not description:
            raise RecruitmentError("description cannot be empty", status_code=400)
        row.description = description

    if "contract_type" in payload:
        contract_type = str(payload["contract_type"]).strip()
        if not contract_type:
            raise RecruitmentError("contract_type cannot be empty", status_code=400)
        row.contract_type = contract_type

    if "location" in payload:
        row.location = (payload["location"] or "").strip() or None

    if "status" in payload:
        status = str(payload["status"]).strip().lower()
        if status not in ("draft", "published", "closed"):
            raise RecruitmentError("Invalid offer status", status_code=400)
        row.status = status

    salary_min = row.salary_min
    salary_max = row.salary_max
    if "salary_min" in payload:
        salary_min = None if payload["salary_min"] in (None, "") else Decimal(str(payload["salary_min"]))
        row.salary_min = salary_min
    if "salary_max" in payload:
        salary_max = None if payload["salary_max"] in (None, "") else Decimal(str(payload["salary_max"]))
        row.salary_max = salary_max

    if salary_min is not None and salary_max is not None and salary_max < salary_min:
        raise RecruitmentError("salary_max cannot be lower than salary_min", status_code=400)

    db.session.commit()
    return _serialize_offer(row)


def list_candidate_profiles(search: str | None = None) -> list[dict[str, Any]]:
    query = CandidateProfile.query.filter(CandidateProfile.deleted_at.is_(None))
    if search:
        q = f"%{search.strip()}%"
        query = query.filter(
            CandidateProfile.first_name.ilike(q)
            | CandidateProfile.last_name.ilike(q)
            | CandidateProfile.email.ilike(q)
            | CandidateProfile.desired_position.ilike(q)
        )

    rows = query.order_by(CandidateProfile.created_at.desc()).all()
    return [_serialize_candidate(row) for row in rows]


def get_my_candidate_profile(user_id: int) -> dict[str, Any] | None:
    row = CandidateProfile.query.filter_by(user_id=user_id).first()
    if row is None or row.deleted_at is not None:
        return None
    return _serialize_candidate(row)


def create_candidate_profile(payload: dict[str, Any], user_id: int | None = None) -> dict[str, Any]:
    required = ["email", "first_name", "last_name"]
    for field in required:
        if not str(payload.get(field) or "").strip():
            raise RecruitmentError(f"Missing field: {field}", status_code=400)

    email = str(payload["email"]).strip().lower()
    existing = CandidateProfile.query.filter(func.lower(CandidateProfile.email) == email).first()
    if existing and existing.deleted_at is None:
        raise RecruitmentError("Candidate email already exists", status_code=409)

    years_experience = payload.get("years_experience")
    if years_experience in (None, ""):
        parsed_years = None
    else:
        parsed_years = int(years_experience)
        if parsed_years < 0:
            raise RecruitmentError("years_experience cannot be negative", status_code=400)

    availability_status = str(payload.get("availability_status") or "immediate").strip().lower()
    if availability_status not in {"immediate", "short_notice", "not_available"}:
        raise RecruitmentError("Invalid availability_status", status_code=400)

    row = CandidateProfile(
        user_id=user_id,
        email=email,
        first_name=str(payload["first_name"]).strip(),
        last_name=str(payload["last_name"]).strip(),
        phone=(payload.get("phone") or "").strip() or None,
        city=(payload.get("city") or "").strip() or None,
        years_experience=parsed_years,
        desired_position=(payload.get("desired_position") or "").strip() or None,
        skills_summary=(payload.get("skills_summary") or "").strip() or None,
        availability_status=availability_status,
        cv_url=(payload.get("cv_url") or "").strip() or None,
    )
    db.session.add(row)
    db.session.commit()

    return _serialize_candidate(row)


def upsert_my_candidate_profile(user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id).first()
    if user is None or user.deleted_at is not None or not user.is_active:
        raise RecruitmentError("User not found", status_code=404)

    existing = CandidateProfile.query.filter_by(user_id=user_id).first()
    if existing and existing.deleted_at is None:
        if "email" in payload:
            email = str(payload["email"]).strip().lower()
            duplicate = CandidateProfile.query.filter(
                func.lower(CandidateProfile.email) == email,
                CandidateProfile.id != existing.id,
            ).first()
            if duplicate and duplicate.deleted_at is None:
                raise RecruitmentError("Candidate email already exists", status_code=409)
            existing.email = email

        if "first_name" in payload:
            first_name = str(payload["first_name"]).strip()
            if not first_name:
                raise RecruitmentError("first_name cannot be empty", status_code=400)
            existing.first_name = first_name

        if "last_name" in payload:
            last_name = str(payload["last_name"]).strip()
            if not last_name:
                raise RecruitmentError("last_name cannot be empty", status_code=400)
            existing.last_name = last_name

        if "phone" in payload:
            existing.phone = (payload["phone"] or "").strip() or None
        if "city" in payload:
            existing.city = (payload["city"] or "").strip() or None
        if "desired_position" in payload:
            existing.desired_position = (payload["desired_position"] or "").strip() or None
        if "skills_summary" in payload:
            existing.skills_summary = (payload["skills_summary"] or "").strip() or None
        if "availability_status" in payload:
            availability_status = str(payload.get("availability_status") or "").strip().lower()
            if availability_status not in {"immediate", "short_notice", "not_available"}:
                raise RecruitmentError("Invalid availability_status", status_code=400)
            existing.availability_status = availability_status
        if "cv_url" in payload:
            existing.cv_url = (payload["cv_url"] or "").strip() or None
        if "years_experience" in payload:
            years = payload.get("years_experience")
            if years in (None, ""):
                existing.years_experience = None
            else:
                parsed_years = int(years)
                if parsed_years < 0:
                    raise RecruitmentError("years_experience cannot be negative", status_code=400)
                existing.years_experience = parsed_years

        db.session.commit()
        return _serialize_candidate(existing)

    seed_payload = {
        "email": str(payload.get("email") or user.email).strip().lower(),
        "first_name": str(payload.get("first_name") or user.first_name).strip(),
        "last_name": str(payload.get("last_name") or user.last_name).strip(),
        "phone": payload.get("phone") or user.phone,
        "city": payload.get("city"),
        "years_experience": payload.get("years_experience"),
        "desired_position": payload.get("desired_position"),
        "skills_summary": payload.get("skills_summary"),
        "availability_status": payload.get("availability_status"),
        "cv_url": payload.get("cv_url"),
    }
    return create_candidate_profile(seed_payload, user_id=user_id)


def compute_profile_score(candidate: CandidateProfile) -> float:
    score = 0
    if candidate.first_name and candidate.last_name:
        score += 20
    if candidate.email:
        score += 20
    if candidate.phone:
        score += 10
    if candidate.desired_position:
        score += 15
    if candidate.years_experience is not None:
        score += 15
    if candidate.skills_summary:
        score += 10
    if candidate.cv_url:
        score += 10
    return float(min(score, 100))


def apply_to_job_offer(
    company_id: int,
    offer_id: int,
    applicant_user_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    offer = _require_offer(company_id=company_id, offer_id=offer_id)
    if offer.status != "published":
        raise RecruitmentError("Cannot apply to a non-published offer", status_code=400)

    candidate_id = payload.get("candidate_id")
    if candidate_id is None:
        candidate = CandidateProfile.query.filter_by(user_id=applicant_user_id).first()
        if candidate is None or candidate.deleted_at is not None:
            raise RecruitmentError("No candidate profile found for user; provide candidate_id or create profile", status_code=400)
    else:
        candidate = _require_candidate(int(candidate_id))

    existing = JobApplication.query.filter_by(job_offer_id=offer.id, candidate_id=candidate.id).first()
    if existing:
        raise RecruitmentError("Candidate already applied to this offer", status_code=409)

    score, rationale = compute_match_score(offer=offer, candidate=candidate)

    application = JobApplication(
        company_id=company_id,
        job_offer_id=offer.id,
        candidate_id=candidate.id,
        status="submitted",
        score=score,
        notes=(payload.get("notes") or "").strip() or None,
    )
    db.session.add(application)
    db.session.flush()

    match = CandidateMatch.query.filter_by(company_id=company_id, job_offer_id=offer.id, candidate_id=candidate.id).first()
    if match:
        match.match_score = score
        match.rationale = rationale
    else:
        db.session.add(
            CandidateMatch(
                company_id=company_id,
                job_offer_id=offer.id,
                candidate_id=candidate.id,
                match_score=score,
                rationale=rationale,
            )
        )

    db.session.commit()
    return _serialize_application(application)


def list_applications(company_id: int, job_offer_id: int | None = None, status: str | None = None) -> list[dict[str, Any]]:
    query = (
        db.session.query(JobApplication, JobOffer, CandidateProfile)
        .join(JobOffer, JobOffer.id == JobApplication.job_offer_id)
        .join(CandidateProfile, CandidateProfile.id == JobApplication.candidate_id)
        .filter(
            JobApplication.company_id == company_id,
            JobOffer.deleted_at.is_(None),
            CandidateProfile.deleted_at.is_(None),
        )
    )
    if job_offer_id is not None:
        query = query.filter(JobApplication.job_offer_id == job_offer_id)
    if status:
        query = query.filter(JobApplication.status == status)

    rows = query.order_by(JobApplication.created_at.desc()).all()
    return [
        _serialize_application_with_context(application, offer=offer, candidate=candidate)
        for application, offer, candidate in rows
    ]


def list_my_applications(user_id: int, company_id: int | None = None) -> list[dict[str, Any]]:
    candidate = CandidateProfile.query.filter_by(user_id=user_id).first()
    if candidate is None or candidate.deleted_at is not None:
        return []

    query = (
        db.session.query(JobApplication, JobOffer)
        .join(JobOffer, JobOffer.id == JobApplication.job_offer_id)
        .filter(
            JobApplication.candidate_id == candidate.id,
            JobOffer.deleted_at.is_(None),
        )
    )

    if company_id is not None:
        query = query.filter(JobApplication.company_id == company_id)

    rows = query.order_by(JobApplication.created_at.desc()).all()
    return [_serialize_application_with_context(application, offer=offer, candidate=candidate) for application, offer in rows]


def update_application_status(company_id: int, application_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = JobApplication.query.filter_by(id=application_id, company_id=company_id).first()
    if row is None:
        raise RecruitmentError("Application not found", status_code=404)

    if "status" in payload:
        status = str(payload["status"]).strip().lower()
        allowed = {"submitted", "screening", "interview", "shortlisted", "rejected", "hired"}
        if status not in allowed:
            raise RecruitmentError("Invalid application status", status_code=400)
        row.status = status

    if "notes" in payload:
        row.notes = (payload["notes"] or "").strip() or None

    if "score" in payload:
        score = payload.get("score")
        if score in (None, ""):
            row.score = None
        else:
            parsed = Decimal(str(score))
            if parsed < 0 or parsed > 100:
                raise RecruitmentError("score must be between 0 and 100", status_code=400)
            row.score = parsed

    db.session.commit()
    return _serialize_application(row)


def compute_match_score(offer: JobOffer, candidate: CandidateProfile) -> tuple[Decimal, str]:
    score = Decimal("0")
    reasons: list[str] = []

    title = (offer.title or "").lower()
    desired = (candidate.desired_position or "").lower()
    if title and desired and (title in desired or desired in title):
        score += Decimal("35")
        reasons.append("position_alignment")

    if candidate.years_experience is not None:
        exp = candidate.years_experience
        if exp >= 8:
            score += Decimal("30")
            reasons.append("experience_senior")
        elif exp >= 4:
            score += Decimal("22")
            reasons.append("experience_mid")
        elif exp >= 1:
            score += Decimal("12")
            reasons.append("experience_junior")

    if offer.location and candidate.city and offer.location.lower() == candidate.city.lower():
        score += Decimal("20")
        reasons.append("location_match")

    if candidate.cv_url:
        score += Decimal("10")
        reasons.append("cv_present")

    if candidate.phone:
        score += Decimal("5")
        reasons.append("contact_complete")

    if candidate.skills_summary:
        score += Decimal("5")
        reasons.append("skills_documented")

    if score > Decimal("100"):
        score = Decimal("100")

    rationale = ",".join(reasons) if reasons else "baseline_profile"
    return score.quantize(Decimal("0.01")), rationale


def generate_matches(company_id: int, offer_id: int, limit: int = 20) -> list[dict[str, Any]]:
    offer = _require_offer(company_id=company_id, offer_id=offer_id)

    safe_limit = max(1, min(int(limit), 100))
    candidates = CandidateProfile.query.filter(CandidateProfile.deleted_at.is_(None)).limit(safe_limit).all()

    output: list[dict[str, Any]] = []
    for candidate in candidates:
        score, rationale = compute_match_score(offer=offer, candidate=candidate)

        match = CandidateMatch.query.filter_by(
            company_id=company_id,
            job_offer_id=offer.id,
            candidate_id=candidate.id,
        ).first()
        if match:
            match.match_score = score
            match.rationale = rationale
        else:
            match = CandidateMatch(
                company_id=company_id,
                job_offer_id=offer.id,
                candidate_id=candidate.id,
                match_score=score,
                rationale=rationale,
            )
            db.session.add(match)

        output.append(_serialize_match_with_context(match, offer=offer, candidate=candidate))

    db.session.commit()

    output.sort(key=lambda row: row["match_score"], reverse=True)
    return output


def list_matches(company_id: int, offer_id: int | None = None) -> list[dict[str, Any]]:
    query = (
        db.session.query(CandidateMatch, JobOffer, CandidateProfile)
        .join(JobOffer, JobOffer.id == CandidateMatch.job_offer_id)
        .join(CandidateProfile, CandidateProfile.id == CandidateMatch.candidate_id)
        .filter(
            CandidateMatch.company_id == company_id,
            JobOffer.deleted_at.is_(None),
            CandidateProfile.deleted_at.is_(None),
        )
    )
    if offer_id is not None:
        query = query.filter(CandidateMatch.job_offer_id == offer_id)

    rows = query.order_by(CandidateMatch.match_score.desc(), CandidateMatch.created_at.desc()).all()
    return [
        _serialize_match_with_context(match, offer=offer, candidate=candidate)
        for match, offer, candidate in rows
    ]
