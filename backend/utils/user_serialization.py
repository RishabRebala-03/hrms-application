from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from bson import ObjectId
from flask import request

from config.db import mongo


def serialize_all(obj: Any) -> Any:
    if isinstance(obj, list):
        return [serialize_all(item) for item in obj]

    if isinstance(obj, dict):
        return {key: serialize_all(value) for key, value in obj.items()}

    if isinstance(obj, ObjectId):
        return str(obj)

    if isinstance(obj, datetime):
        return obj.isoformat()

    return obj


def enrich_employee_record(emp: dict[str, Any]) -> dict[str, Any]:
    emp["is_active"] = emp.get("is_active", True)
    base = request.host_url.rstrip("/")
    emp_id_str = str(emp["_id"])
    photo_url = None

    for extension in [".png", ".jpg", ".jpeg", ".webp"]:
        filename = f"{emp_id_str}{extension}"
        photo_path = os.path.join("static", "profile_photos", filename)
        if os.path.exists(photo_path):
            photo_url = f"{base}/static/profile_photos/{filename}"
            break

    emp["photoUrl"] = photo_url

    if "reportsTo" in emp and isinstance(emp["reportsTo"], ObjectId):
        manager = mongo.db.users.find_one({"_id": emp["reportsTo"]})
        if manager:
            emp["reportsToEmail"] = manager.get("email")
            emp["reportsToName"] = manager.get("name")
        emp["reportsTo"] = str(emp["reportsTo"])

    project_names = []
    for project in emp.get("projects", []) or []:
        if project.get("projectName"):
            project_names.append(project["projectName"])
        if isinstance(project.get("projectId"), ObjectId):
            project["projectId"] = str(project["projectId"])

    emp["projectNames"] = project_names
    emp["primaryProject"] = project_names[0] if project_names else ""
    return emp
