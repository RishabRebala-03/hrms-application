from datetime import datetime
from config.db import mongo

# In year_end_reset.py, update the function:
def reset_sick_leaves_new_year():
    try:
        print("🔄 Running year-end leave reset...")
        
        users = list(mongo.db.users.find())
        
        reset_count = 0
        for user in users:
            if "leaveBalance" in user:
                balance = user["leaveBalance"]
                
                # Reset sick leave to total
                sick_total = balance.get("sickTotal", 6)
                
                # ⭐ NEW: Reset optional leaves to 2
                optional_total = balance.get("optionalTotal", 2)
                
                # Keep planned leave but cap at 12
                planned = balance.get("planned", 0)
                capped_planned = min(planned, 12)  # ⭐ Cap at 12
                
                mongo.db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {
                        "leaveBalance.sick": sick_total,
                        "leaveBalance.optional": optional_total,  # ⭐ Reset optional
                        "leaveBalance.planned": capped_planned,   # ⭐ Cap planned at 12
                        "leaveBalance.lastResetDate": datetime.utcnow()
                    }}
                )
                reset_count += 1
                print(f"✅ Reset leaves for {user.get('name', 'Unknown')} - Sick: {sick_total}, Optional: {optional_total}, Planned: {capped_planned}")
        
        print(f"✅ Year-end reset complete! Reset {reset_count} users")
        return {"success": True, "reset_count": reset_count}
        
    except Exception as e:
        print(f"❌ Error during year-end reset: {str(e)}")
        return {"success": False, "error": str(e)}