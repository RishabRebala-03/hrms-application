"""
Migration: old leaveBalance {casual, sick, earned, lwp}
        -> new leaveBalance {sick: 6, sickTotal: 6, planned: 12, plannedTotal: 12, lwp: 0}

Run once:
  python migrate_leave_balance.py
"""

import os
from pymongo import MongoClient
from datetime import datetime

# --- CONFIG ---
# Prefer env var if set; otherwise use your provided Atlas URI
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://main-user:Rishab123@cluster0.ziyzbpz.mongodb.net/company_leave_system"
)
DB_NAME = "company_leave_system"
COLLECTION = "users"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db[COLLECTION]

def migrate_leave_balances():
    print("🔄 Starting leave balance migration...")
    users = users_collection.find({}, {"name": 1, "email": 1, "leaveBalance": 1})
    updated = 0

    for user in users:
        user_id = user["_id"]
        old_balance = user.get("leaveBalance", {}) or {}

        # New structure (keep it simple; only preserve LWP per your spec)
        new_balance = {
            "sick": 6,
            "sickTotal": 6,
            "planned": 12,
            "plannedTotal": 12,
            "lop": old_balance.get("lwp", old_balance.get("lop", 0))  # preserve if present
        }

        # Optional: keep a backup of the old structure for traceability
        update_doc = {
            "$set": {"leaveBalance": new_balance, "leaveBalance_migratedOn": datetime.utcnow()},
            "$setOnInsert": {}
        }

        # Print helpful line
        print(f"  -> {user.get('name','Unknown')} ({user.get('email','N/A')}): {old_balance}  =>  {new_balance}")

        users_collection.update_one({"_id": user_id}, update_doc)
        updated += 1

    print(f"\n✅ Migration complete! Updated {updated} users.")
    print("New leave structure defaults:")
    print("  • Sick: 6 (Total 6)")
    print("  • Planned: 12 (Total 12)")
    print("  • LWP: preserved from old if present, else 0")

if __name__ == "__main__":
    try:
        migrate_leave_balances()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback; traceback.print_exc()