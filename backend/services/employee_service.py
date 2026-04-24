from __future__ import annotations

from typing import Any

from repositories.employee_repository import fetch_employee_filter_options, fetch_employees
from utils.report_utils import parse_iso_date
from utils.user_serialization import enrich_employee_record, serialize_all


def list_employees(filters: dict[str, Any]) -> dict[str, Any]:
    page = max(1, int(filters.get("page", 1) or 1))
    limit = min(100, max(1, int(filters.get("limit", 10) or 10)))
    filters["joining_from"] = parse_iso_date(filters.get("joining_from"))
    filters["joining_to"] = parse_iso_date(filters.get("joining_to"), end_of_day=True)

    result = fetch_employees(filters, page, limit)
    items = [serialize_all(enrich_employee_record(item)) for item in result["items"]]

    return {
        "items": items,
        "page": result["page"],
        "limit": result["limit"],
        "total": result["total"],
        "total_pages": result["total_pages"],
        "filter_options": fetch_employee_filter_options(result["query"]),
    }
