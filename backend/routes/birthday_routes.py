# routes/birthday_routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from config.db import mongo
from bson import ObjectId

birthday_bp = Blueprint("birthday_bp", __name__)

@birthday_bp.get("/check/<user_id>")
def check_birthday_leave_eligibility(user_id):
    """
    Check if user is eligible for birthday leave on a given date
    """
    try:
        date_str = request.args.get("date")  # Expected format: YYYY-MM-DD
        
        if not date_str:
            return jsonify({"error": "Date parameter required"}), 400
        
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        dob = user.get("dateOfBirth")
        if not dob:
            return jsonify({
                "eligible": False,
                "reason": "No date of birth on record"
            }), 200
        
        # Parse DOB
        if isinstance(dob, dict) and "$date" in dob:
            dob = datetime.fromisoformat(dob["$date"].replace("Z", "+00:00"))
        elif isinstance(dob, str):
            dob = datetime.fromisoformat(dob.replace("Z", "+00:00"))
        
        # Parse requested date
        requested_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        # Check if month and day match
        is_birthday = (dob.month == requested_date.month and 
                      dob.day == requested_date.day)
        
        if not is_birthday:
            return jsonify({
                "eligible": False,
                "reason": "Selected date is not your birthday"
            }), 200
        
        # Check if already used birthday leave this year
        year = requested_date.year
        start_of_year = datetime(year, 1, 1)
        end_of_year = datetime(year, 12, 31, 23, 59, 59)
        
        existing_leave = mongo.db.leaves.find_one({
            "employeeId": user_id,
            "leaveType": "birthday",
            "startDate": {
                "$gte": start_of_year.isoformat(),
                "$lte": end_of_year.isoformat()
            }
        })
        
        if existing_leave:
            return jsonify({
                "eligible": False,
                "reason": "Birthday leave already taken this year",
                "used_on": existing_leave.get("startDate")
            }), 200
        
        return jsonify({
            "eligible": True,
            "message": "Eligible for birthday leave",
            "birthday": dob.strftime("%B %d")
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@birthday_bp.get("/upcoming")
def get_upcoming_birthdays():
    """
    Get upcoming birthdays for managers/admins (next 30 days)
    Optional: ?manager_email=xxx to filter by team
    """
    try:
        manager_email = request.args.get("manager_email")
        days_ahead = int(request.args.get("days", 30))
        
        # Build query
        query = {"dateOfBirth": {"$exists": True, "$ne": None}}
        
        if manager_email:
            manager = mongo.db.users.find_one({"email": manager_email})
            if manager:
                query["reportsTo"] = manager["_id"]
        
        users = list(mongo.db.users.find(query))
        
        today = datetime.now()
        upcoming = []
        
        for user in users:
            dob = user.get("dateOfBirth")
            if not dob:
                continue
            
            # Parse DOB
            if isinstance(dob, dict) and "$date" in dob:
                dob = datetime.fromisoformat(dob["$date"].replace("Z", "+00:00"))
            elif isinstance(dob, str):
                dob = datetime.fromisoformat(dob.replace("Z", "+00:00"))
            
            # Calculate next birthday
            this_year_birthday = datetime(today.year, dob.month, dob.day)
            next_birthday = this_year_birthday if this_year_birthday >= today else datetime(today.year + 1, dob.month, dob.day)
            
            days_until = (next_birthday - today).days
            
            if 0 <= days_until <= days_ahead:
                # Check if birthday leave already taken
                year = next_birthday.year
                existing_leave = mongo.db.leaves.find_one({
                    "employeeId": str(user["_id"]),
                    "leaveType": "birthday",
                    "startDate": {
                        "$gte": datetime(year, 1, 1).isoformat(),
                        "$lte": datetime(year, 12, 31).isoformat()
                    }
                })
                
                upcoming.append({
                    "employeeId": str(user["_id"]),
                    "name": user.get("name"),
                    "email": user.get("email"),
                    "department": user.get("department"),
                    "birthday": next_birthday.strftime("%Y-%m-%d"),
                    "daysUntil": days_until,
                    "birthdayLeaveUsed": bool(existing_leave),
                    "age": today.year - dob.year
                })
        
        # Sort by days until birthday
        upcoming.sort(key=lambda x: x["daysUntil"])
        
        return jsonify(upcoming), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@birthday_bp.post("/apply")
def apply_birthday_leave():
    """
    Apply for birthday leave - validates eligibility automatically
    """
    try:
        data = request.get_json()
        user_id = data.get("employeeId")
        date_str = data.get("date")  # YYYY-MM-DD
        
        if not user_id or not date_str:
            return jsonify({"error": "employeeId and date required"}), 400
        
        # Check eligibility
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        dob = user.get("dateOfBirth")
        if not dob:
            return jsonify({"error": "No date of birth on record"}), 400
        
        # Parse DOB
        if isinstance(dob, dict) and "$date" in dob:
            dob = datetime.fromisoformat(dob["$date"].replace("Z", "+00:00"))
        elif isinstance(dob, str):
            dob = datetime.fromisoformat(dob.replace("Z", "+00:00"))
        
        requested_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        # Validate it's their birthday
        if not (dob.month == requested_date.month and dob.day == requested_date.day):
            return jsonify({"error": "Selected date is not your birthday"}), 400
        
        # Check if already used this year
        year = requested_date.year
        existing = mongo.db.leaves.find_one({
            "employeeId": user_id,
            "leaveType": "birthday",
            "startDate": {
                "$gte": datetime(year, 1, 1).isoformat(),
                "$lte": datetime(year, 12, 31).isoformat()
            }
        })
        
        if existing:
            return jsonify({"error": "Birthday leave already taken this year"}), 400
        
        # Create leave request
        leave_doc = {
            "employeeId": user_id,
            "employeeName": user.get("name"),
            "employeeEmail": user.get("email"),
            "leaveType": "birthday",
            "startDate": requested_date.isoformat(),
            "endDate": requested_date.isoformat(),
            "totalDays": 1,
            "reason": f"Birthday Leave - {dob.strftime('%B %d')}",
            "status": "Pending",
            "appliedOn": datetime.utcnow().isoformat(),
            "managerId": str(user.get("reportsTo")) if user.get("reportsTo") else None,
            "isBirthdayLeave": True  # Special flag
        }
        
        result = mongo.db.leaves.insert_one(leave_doc)
        leave_doc["_id"] = str(result.inserted_id)
        
        return jsonify({
            "message": "Birthday leave applied successfully",
            "leave": leave_doc
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500