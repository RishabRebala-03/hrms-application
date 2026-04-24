from flask_pymongo import PyMongo
from dotenv import load_dotenv
import os
from pymongo import ASCENDING, DESCENDING

load_dotenv()

mongo = PyMongo()

def init_db(app):
    app.config["MONGO_URI"] = os.getenv("MONGO_URI")
    mongo.init_app(app)
    ensure_indexes()


def ensure_indexes():
    try:
        mongo.db.leaves.create_index([("employee_id", ASCENDING), ("start_date", DESCENDING)])
        mongo.db.leaves.create_index([("status", ASCENDING), ("start_date", DESCENDING)])
        mongo.db.leaves.create_index([("leave_type", ASCENDING), ("start_date", DESCENDING)])
        mongo.db.leaves.create_index([("employee_id", ASCENDING), ("status", ASCENDING), ("start_date", DESCENDING)])
        mongo.db.leaves.create_index([("start_date", DESCENDING), ("end_date", DESCENDING)])
        mongo.db.leaves.create_index([("applied_on", DESCENDING)])
        mongo.db.users.create_index([("employeeId", ASCENDING)], unique=True, sparse=True)
        mongo.db.users.create_index([("department", ASCENDING), ("dateOfJoining", DESCENDING)])
        mongo.db.users.create_index([("role", ASCENDING), ("is_active", ASCENDING)])
        mongo.db.users.create_index([("reportsTo", ASCENDING), ("dateOfJoining", DESCENDING)])
        mongo.db.users.create_index([("email", ASCENDING)], unique=True, sparse=True)
        mongo.db.users.create_index([("projects.projectId", ASCENDING)])
        mongo.db.users.create_index([("projects.projectName", ASCENDING)])
        mongo.db.projects.create_index([("title", ASCENDING)])
        mongo.db.tea_coffee_orders.create_index([("employee_id", ASCENDING), ("date", DESCENDING)])
        mongo.db.tea_coffee_orders.create_index([("date", DESCENDING)])
        mongo.db.tea_coffee_orders.create_index([("guest_count", ASCENDING)])
        mongo.db.policies.create_index([("policyId", ASCENDING)], unique=True, sparse=True)
        mongo.db.policies.create_index([("category", ASCENDING), ("status", ASCENDING)])
        mongo.db.policy_versions.create_index([("policy_id", ASCENDING), ("version", DESCENDING)])
    except Exception as exc:
        print(f"⚠️ Index creation skipped: {exc}")
