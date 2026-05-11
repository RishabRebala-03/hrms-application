from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from config.db import mongo

expense_bp = Blueprint("expense_bp", __name__)


def serialize_all(obj):
    if isinstance(obj, list):
        return [serialize_all(item) for item in obj]
    if isinstance(obj, dict):
        return {k: serialize_all(v) for k, v in obj.items()}
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


@expense_bp.route("", methods=["GET"])
def list_expenses():
    try:
        employee_id = request.args.get("employee_id")
        role = request.args.get("role", "")
        query = {}

        if employee_id and role.lower() != "admin":
            query["employee_id"] = ObjectId(employee_id)

        expenses = list(mongo.db.expenses.find(query).sort("expense_date", -1))
        return jsonify(serialize_all(expenses)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@expense_bp.route("", methods=["POST"])
def create_expense():
    try:
        data = request.get_json() or {}
        employee_id = data.get("employee_id")
        expense_date = data.get("expense_date")
        category = (data.get("category") or "").strip()
        description = (data.get("description") or "").strip()

        try:
            amount = float(data.get("amount") or 0)
        except (TypeError, ValueError):
            return jsonify({"error": "Amount must be a valid number"}), 400

        if not employee_id or not expense_date or not category or amount <= 0:
            return jsonify({"error": "employee_id, expense_date, category, and positive amount are required"}), 400

        employee = mongo.db.users.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        now = datetime.utcnow()
        expense = {
            "employee_id": ObjectId(employee_id),
            "employee_name": employee.get("name", ""),
            "employee_email": employee.get("email", ""),
            "expense_date": expense_date,
            "category": category,
            "description": description,
            "amount": round(amount, 2),
            "status": "saved",
            "created_at": now,
            "updated_at": now,
        }
        result = mongo.db.expenses.insert_one(expense)
        expense["_id"] = result.inserted_id
        return jsonify(serialize_all(expense)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@expense_bp.route("/<expense_id>", methods=["PUT"])
def update_expense(expense_id):
    try:
        data = request.get_json() or {}
        update_data = {"updated_at": datetime.utcnow()}

        if "expense_date" in data:
            update_data["expense_date"] = data["expense_date"]
        if "category" in data:
            update_data["category"] = (data.get("category") or "").strip()
        if "description" in data:
            update_data["description"] = (data.get("description") or "").strip()
        if "amount" in data:
            try:
                amount = float(data.get("amount") or 0)
            except (TypeError, ValueError):
                return jsonify({"error": "Amount must be a valid number"}), 400
            if amount <= 0:
                return jsonify({"error": "Amount must be greater than zero"}), 400
            update_data["amount"] = round(amount, 2)

        result = mongo.db.expenses.update_one(
            {"_id": ObjectId(expense_id)},
            {"$set": update_data},
        )
        if result.matched_count == 0:
            return jsonify({"error": "Expense not found"}), 404

        expense = mongo.db.expenses.find_one({"_id": ObjectId(expense_id)})
        return jsonify(serialize_all(expense)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@expense_bp.route("/<expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    try:
        result = mongo.db.expenses.delete_one({"_id": ObjectId(expense_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Expense not found"}), 404
        return jsonify({"message": "Expense deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
