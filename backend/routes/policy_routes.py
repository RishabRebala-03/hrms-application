from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify, request

from config.db import mongo
from utils.report_utils import safe_int, serialize_document

policy_bp = Blueprint("policy_bp", __name__)


DEFAULT_POLICIES = [
    {
        "policyId": "1001",
        "title": "Leave Policy Guidelines",
        "description": "Guidelines for employee leave planning, approvals, balance usage, and compliance expectations.",
        "category": "HR",
        "status": "Active",
        "content": "<p>Leave policy baseline document.</p>",
        "version": 1,
        "updatedAt": datetime.utcnow(),
        "createdAt": datetime.utcnow(),
    }
]


def ensure_policy_seed():
    if mongo.db.policies.count_documents({}) == 0:
        mongo.db.policies.insert_many(DEFAULT_POLICIES)


@policy_bp.route("/", methods=["GET"])
def get_policies():
    try:
        ensure_policy_seed()

        page = safe_int(request.args.get("page"), 1, 1)
        page_size = safe_int(request.args.get("page_size"), 10, 1, 100)
        search = (request.args.get("search") or "").strip()
        category = (request.args.get("category") or "").strip()
        status = (request.args.get("status") or "").strip()
        sort_by = request.args.get("sort_by") or "updatedAt"
        sort_order = -1 if (request.args.get("sort_order") or "desc").lower() == "desc" else 1

        query = {}
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"policyId": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]
        if category and category.lower() != "all":
            query["category"] = category
        if status and status.lower() != "all":
            query["status"] = status

        total = mongo.db.policies.count_documents(query)
        items = list(
            mongo.db.policies.find(query)
            .sort(sort_by, sort_order)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )

        categories = sorted(mongo.db.policies.distinct("category"))
        statuses = sorted(mongo.db.policies.distinct("status"))

        return jsonify(
            {
                "items": serialize_document(items),
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max(1, (total + page_size - 1) // page_size),
                "filter_options": {
                    "categories": categories,
                    "statuses": statuses,
                },
            }
        ), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@policy_bp.route("/<policy_id>", methods=["PUT"])
def update_policy(policy_id):
    try:
        data = request.get_json() or {}
        existing = mongo.db.policies.find_one({"_id": ObjectId(policy_id)})
        if not existing:
            return jsonify({"error": "Policy not found"}), 404

        next_version = int(existing.get("version", 1)) + 1
        mongo.db.policy_versions.insert_one(
            {
                "policy_id": existing["_id"],
                "version": existing.get("version", 1),
                "title": existing.get("title"),
                "description": existing.get("description"),
                "category": existing.get("category"),
                "status": existing.get("status"),
                "content": existing.get("content"),
                "savedAt": datetime.utcnow(),
            }
        )

        update_doc = {
            "title": data.get("title", existing.get("title")),
            "description": data.get("description", existing.get("description")),
            "category": data.get("category", existing.get("category")),
            "status": data.get("status", existing.get("status")),
            "content": data.get("content", existing.get("content")),
            "version": next_version,
            "updatedAt": datetime.utcnow(),
        }

        mongo.db.policies.update_one({"_id": existing["_id"]}, {"$set": update_doc})
        updated = mongo.db.policies.find_one({"_id": existing["_id"]})
        return jsonify({"message": "Policy updated successfully", "policy": serialize_document(updated)}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@policy_bp.route("/", methods=["POST"])
def create_policy():
    try:
        data = request.get_json() or {}
        required_fields = ["policyId", "title", "category"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400

        if mongo.db.policies.find_one({"policyId": data["policyId"]}):
            return jsonify({"error": "Policy ID already exists"}), 400

        document = {
            "policyId": data["policyId"],
            "title": data["title"],
            "description": data.get("description", ""),
            "category": data["category"],
            "status": data.get("status", "Draft"),
            "content": data.get("content", ""),
            "version": 1,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        inserted_id = mongo.db.policies.insert_one(document).inserted_id
        created = mongo.db.policies.find_one({"_id": inserted_id})
        return jsonify({"message": "Policy created successfully", "policy": serialize_document(created)}), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@policy_bp.route("/<policy_id>/versions", methods=["GET"])
def get_policy_versions(policy_id):
    try:
        versions = list(
            mongo.db.policy_versions.find({"policy_id": ObjectId(policy_id)}).sort("version", -1)
        )
        current = mongo.db.policies.find_one({"_id": ObjectId(policy_id)})
        items = serialize_document(versions)
        if current:
            items.insert(
                0,
                {
                    "_id": str(current["_id"]),
                    "policy_id": str(current["_id"]),
                    "version": current.get("version", 1),
                    "title": current.get("title"),
                    "description": current.get("description"),
                    "category": current.get("category"),
                    "status": current.get("status"),
                    "content": current.get("content"),
                    "savedAt": current.get("updatedAt"),
                    "isCurrent": True,
                },
            )
        return jsonify(items), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
