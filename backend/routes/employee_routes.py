from flask import Blueprint, jsonify, request

from services.employee_service import list_employees


employee_bp = Blueprint("employee_bp", __name__)


@employee_bp.route("", methods=["GET"])
@employee_bp.route("/", methods=["GET"])
def get_employees():
    try:
        payload = list_employees(
            {
                "search": request.args.get("search"),
                "project_id": request.args.get("project_id"),
                "joining_from": request.args.get("joining_from"),
                "joining_to": request.args.get("joining_to"),
                "page": request.args.get("page", 1),
                "limit": request.args.get("limit", request.args.get("page_size", 10)),
                "sort_by": request.args.get("sort_by", "name"),
                "order": request.args.get("order", request.args.get("sort_order", "asc")),
                "requester_id": request.args.get("requester_id"),
            }
        )
        return jsonify(payload), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
