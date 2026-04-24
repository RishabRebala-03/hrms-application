from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from bson import ObjectId

from config.db import mongo


LEAVE_SORT_FIELDS = {
    "date": "sort_date",
    "name": "employee_name_sort",
    "employee_name": "employee_name_sort",
    "type": "leave_type_sort",
    "leave_type": "leave_type_sort",
}


def parse_object_id(value: str | None) -> ObjectId | None:
    if not value:
        return None

    try:
        return ObjectId(value)
    except Exception:
        return None


def get_previous_calendar_month_range(reference: datetime | None = None) -> tuple[str, str]:
    reference = reference or datetime.utcnow()
    current_month_start = reference.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_month_end = current_month_start - timedelta(days=1)
    previous_month_start = previous_month_end.replace(day=1)
    return previous_month_start.strftime("%Y-%m-%d"), previous_month_end.strftime("%Y-%m-%d")


def get_requester(requester_id: str | None) -> dict[str, Any] | None:
    requester_object_id = parse_object_id(requester_id)
    if not requester_object_id:
        return None
    return mongo.db.users.find_one({"_id": requester_object_id})


def get_project_scope_for_user(user: dict[str, Any] | None) -> list[ObjectId]:
    if not user or user.get("role") == "Admin":
        return []

    project_ids: list[ObjectId] = []
    for project in user.get("projects", []) or []:
        project_id = project.get("projectId")
        if isinstance(project_id, ObjectId):
            project_ids.append(project_id)
    return project_ids


def build_leave_match(filters: dict[str, Any], scoped_project_ids: list[ObjectId]) -> dict[str, Any]:
    match: dict[str, Any] = {}
    and_clauses: list[dict[str, Any]] = []

    if filters.get("status"):
        match["status"] = filters["status"]

    if filters.get("leave_type"):
        match["leave_type"] = filters["leave_type"]

    employee_object_id = parse_object_id(filters.get("employee_id"))
    if filters.get("employee_id") and not employee_object_id:
        raise ValueError("Invalid employee_id")
    if employee_object_id:
        match["employee_id"] = employee_object_id

    range_start = filters.get("range_start")
    range_end = filters.get("range_end")
    if range_start and range_end:
        and_clauses.extend(
            [
                {"start_date": {"$lte": range_end}},
                {"end_date": {"$gte": range_start}},
            ]
        )

    requested_project_id = parse_object_id(filters.get("project_id"))
    if filters.get("project_id") and not requested_project_id:
        raise ValueError("Invalid project_id")

    if requested_project_id and scoped_project_ids and requested_project_id not in scoped_project_ids:
        raise PermissionError("You can only view leaves for your assigned project")

    effective_project_ids = [requested_project_id] if requested_project_id else scoped_project_ids
    if effective_project_ids:
        and_clauses.append({"employee.projects.projectId": {"$in": effective_project_ids}})

    search = (filters.get("search") or "").strip()
    if search:
        and_clauses.append(
            {
                "$or": [
                    {"employee.name": {"$regex": search, "$options": "i"}},
                    {"employee.email": {"$regex": search, "$options": "i"}},
                    {"leave_type": {"$regex": search, "$options": "i"}},
                    {"reason": {"$regex": search, "$options": "i"}},
                    {"employee.projects.projectName": {"$regex": search, "$options": "i"}},
                ]
            }
        )

    if and_clauses:
        match["$and"] = and_clauses

    return match


def fetch_leaves(filters: dict[str, Any], page: int, limit: int) -> dict[str, Any]:
    requester = get_requester(filters.get("requester_id"))
    scoped_project_ids = get_project_scope_for_user(requester)
    if requester and requester.get("role") != "Admin" and not scoped_project_ids:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 1,
            "requester": requester,
            "scoped_project_ids": scoped_project_ids,
            "restricted_empty_scope": True,
        }
    match = build_leave_match(filters, scoped_project_ids)

    sort_field = LEAVE_SORT_FIELDS.get((filters.get("sort_by") or "date").lower(), "sort_date")
    sort_order = 1 if (filters.get("order") or "desc").lower() == "asc" else -1

    pipeline = [
        {
            "$lookup": {
                "from": "users",
                "localField": "employee_id",
                "foreignField": "_id",
                "as": "employee",
            }
        },
        {"$unwind": {"path": "$employee", "preserveNullAndEmptyArrays": True}},
        {
            "$addFields": {
                "employee_name": {"$ifNull": ["$employee.name", "$employee_name"]},
                "employee_email": {"$ifNull": ["$employee.email", "$employee_email"]},
                "employee_department": {"$ifNull": ["$employee.department", "$employee_department"]},
                "employee_projects": {"$ifNull": ["$employee.projects", []]},
                "primary_project": {
                    "$ifNull": [{"$arrayElemAt": ["$employee.projects.projectName", 0]}, ""]
                },
                "primary_project_id": {"$arrayElemAt": ["$employee.projects.projectId", 0]},
                "sort_date": {"$ifNull": ["$approved_start_date", "$start_date"]},
                "employee_name_sort": {"$toLower": {"$ifNull": ["$employee.name", "$employee_name"]}},
                "leave_type_sort": {"$toLower": {"$ifNull": ["$leave_type", ""]}},
            }
        },
        {"$match": match},
        {
            "$facet": {
                "items": [
                    {"$sort": {sort_field: sort_order, "_id": -1}},
                    {"$skip": (page - 1) * limit},
                    {"$limit": limit},
                    {
                        "$project": {
                            "_id": {"$toString": "$_id"},
                            "employee_id": {"$toString": "$employee_id"},
                            "employee_name": 1,
                            "employee_email": 1,
                            "employee_department": 1,
                            "leave_type": 1,
                            "status": 1,
                            "reason": 1,
                            "start_date": 1,
                            "end_date": 1,
                            "approved_start_date": 1,
                            "approved_end_date": 1,
                            "days": 1,
                            "approved_days": 1,
                            "created_at": {"$ifNull": ["$created_at", "$applied_on"]},
                            "applied_on": 1,
                            "primary_project": 1,
                            "primary_project_id": {
                                "$cond": [
                                    {"$ifNull": ["$primary_project_id", False]},
                                    {"$toString": "$primary_project_id"},
                                    None,
                                ]
                            },
                            "employee_projects": {
                                "$map": {
                                    "input": "$employee_projects",
                                    "as": "project",
                                    "in": {
                                        "project_id": {
                                            "$cond": [
                                                {"$ifNull": ["$$project.projectId", False]},
                                                {"$toString": "$$project.projectId"},
                                                None,
                                            ]
                                        },
                                        "project_name": "$$project.projectName",
                                    },
                                }
                            },
                        }
                    },
                ],
                "meta": [{"$count": "total"}],
            }
        },
    ]

    result = list(mongo.db.leaves.aggregate(pipeline))
    payload = result[0] if result else {"items": [], "meta": []}
    total = payload["meta"][0]["total"] if payload.get("meta") else 0

    return {
        "items": payload.get("items", []),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
        "requester": requester,
        "scoped_project_ids": scoped_project_ids,
        "restricted_empty_scope": False,
    }


def fetch_leave_filter_options(scoped_project_ids: list[ObjectId]) -> dict[str, Any]:
    user_query = {"role": {"$ne": "Admin"}}
    if scoped_project_ids:
        user_query["projects.projectId"] = {"$in": scoped_project_ids}

    project_query = {"_id": {"$in": scoped_project_ids}} if scoped_project_ids else {}

    employees = list(mongo.db.users.find(user_query, {"name": 1}).sort("name", 1))
    projects = list(mongo.db.projects.find(project_query, {"title": 1}).sort("title", 1))

    leave_query = {}
    if scoped_project_ids:
        employee_ids = [employee["_id"] for employee in mongo.db.users.find(user_query, {"_id": 1})]
        leave_query["employee_id"] = {"$in": employee_ids} if employee_ids else {"$in": []}

    return {
        "leave_types": sorted(filter(None, mongo.db.leaves.distinct("leave_type", leave_query))),
        "statuses": sorted(filter(None, mongo.db.leaves.distinct("status", leave_query))),
        "employees": [{"label": employee.get("name"), "value": str(employee["_id"])} for employee in employees if employee.get("name")],
        "projects": [{"label": project.get("title"), "value": str(project["_id"])} for project in projects if project.get("title")],
    }
