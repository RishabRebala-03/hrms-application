from __future__ import annotations

import json
from typing import Any

from repositories.leave_repository import (
    fetch_leave_filter_options,
    fetch_leaves,
    get_previous_calendar_month_range,
)
from utils.query_cache import TTLCache


leave_query_cache = TTLCache(ttl_seconds=45, max_entries=128)


def list_leaves(filters: dict[str, Any]) -> dict[str, Any]:
    page = max(1, int(filters.get("page", 1) or 1))
    limit = min(100, max(1, int(filters.get("limit", 10) or 10)))

    if filters.get("filter") == "last_month":
        range_start, range_end = get_previous_calendar_month_range()
        filters["range_start"] = range_start
        filters["range_end"] = range_end
    else:
        filters["range_start"] = filters.get("start_date")
        filters["range_end"] = filters.get("end_date")

    cache_key = json.dumps(
        {
            "filters": {key: value for key, value in filters.items() if key != "requester_id"},
            "page": page,
            "limit": limit,
            "requester_id": filters.get("requester_id"),
        },
        sort_keys=True,
        default=str,
    )
    cached = leave_query_cache.get(cache_key)
    if cached is not None:
        return cached

    result = fetch_leaves(filters, page, limit)
    response = {
        "items": result["items"],
        "page": result["page"],
        "limit": result["limit"],
        "total": result["total"],
        "total_pages": result["total_pages"],
        "filter_options": (
            {"leave_types": [], "statuses": [], "employees": [], "projects": []}
            if result.get("restricted_empty_scope")
            else fetch_leave_filter_options(result["scoped_project_ids"])
        ),
        "applied_filters": {
            "filter": filters.get("filter"),
            "sort_by": filters.get("sort_by") or "date",
            "order": filters.get("order") or "desc",
            "project_id": filters.get("project_id"),
            "range_start": filters.get("range_start"),
            "range_end": filters.get("range_end"),
        },
    }
    leave_query_cache.set(cache_key, response)
    return response
