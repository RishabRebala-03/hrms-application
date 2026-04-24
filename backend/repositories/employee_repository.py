from __future__ import annotations

from typing import Any

from bson import ObjectId

from config.db import mongo


EMPLOYEE_SORT_FIELDS = {
    "name": "name",
    "email": "email",
    "joining_date": "dateOfJoining",
    "dateOfJoining": "dateOfJoining",
}


def parse_object_id(value: str | None) -> ObjectId | None:
    if not value:
        return None

    try:
        return ObjectId(value)
    except Exception:
        return None


def get_requester(requester_id: str | None) -> dict[str, Any] | None:
    requester_object_id = parse_object_id(requester_id)
    if not requester_object_id:
        return None
    return mongo.db.users.find_one({"_id": requester_object_id})


def build_employee_query(filters: dict[str, Any], requester: dict[str, Any] | None) -> dict[str, Any]:
    query: dict[str, Any] = {"role": {"$ne": "Admin"}}

    requester_role = requester.get("role") if requester else None
    if requester_role == "Manager":
        query["reportsTo"] = requester["_id"]
    elif requester_role and requester_role != "Admin":
        query["_id"] = requester["_id"]

    requested_project_id = parse_object_id(filters.get("project_id"))
    if filters.get("project_id") and not requested_project_id:
        raise ValueError("Invalid project_id")
    if requested_project_id:
        query["projects.projectId"] = requested_project_id

    if filters.get("joining_from") or filters.get("joining_to"):
        query["dateOfJoining"] = {}
        if filters.get("joining_from"):
            query["dateOfJoining"]["$gte"] = filters["joining_from"]
        if filters.get("joining_to"):
            query["dateOfJoining"]["$lte"] = filters["joining_to"]

    search = (filters.get("search") or "").strip()
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    return query


def fetch_employees(filters: dict[str, Any], page: int, limit: int) -> dict[str, Any]:
    requester = get_requester(filters.get("requester_id"))
    query = build_employee_query(filters, requester)
    sort_field = EMPLOYEE_SORT_FIELDS.get(filters.get("sort_by") or "name", "name")
    sort_order = 1 if (filters.get("order") or "asc").lower() == "asc" else -1

    projection = {
        "name": 1,
        "email": 1,
        "designation": 1,
        "department": 1,
        "projects": 1,
        "dateOfJoining": 1,
        "role": 1,
        "is_active": 1,
        "reportsTo": 1,
    }

    total = mongo.db.users.count_documents(query)
    items = list(
        mongo.db.users.find(query, projection)
        .sort(sort_field, sort_order)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
        "requester": requester,
        "query": query,
    }


def fetch_employee_filter_options(query: dict[str, Any]) -> dict[str, Any]:
    base_query = dict(query)
    base_query.pop("$or", None)

    employee_project_ids: list[ObjectId] = []
    matching_employees = mongo.db.users.find(base_query, {"projects.projectId": 1})
    for employee in matching_employees:
        for project in employee.get("projects", []) or []:
            project_id = project.get("projectId")
            if isinstance(project_id, ObjectId) and project_id not in employee_project_ids:
                employee_project_ids.append(project_id)

    project_query = {"_id": {"$in": employee_project_ids}} if employee_project_ids else {"_id": {"$in": []}}
    projects = list(mongo.db.projects.find(project_query, {"title": 1}).sort("title", 1))
    return {
        "projects": [{"label": project.get("title"), "value": str(project["_id"])} for project in projects if project.get("title")],
        "departments": sorted(filter(None, mongo.db.users.distinct("department", base_query))),
    }
