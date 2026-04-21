from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime, timedelta
from config.db import mongo
from flask_cors import CORS, cross_origin

tea_coffee_bp = Blueprint("tea_coffee_bp", __name__)
CORS(tea_coffee_bp)

MORNING_CUTOFF_TIME = "10:30"  # 10:30 AM cutoff for morning slot
EVENING_CUTOFF_TIME = "14:30"  # 2:30 PM cutoff for evening slot


def get_approved_leave_for_date(employee_id, date):
    """Return an approved full-day leave record if the employee is on leave for the given date."""
    return mongo.db.leaves.find_one({
        "employee_id": ObjectId(employee_id),
        "status": "Approved",
        "leave_type": {"$ne": "Early Logout"},
        "$and": [
            {
                "$or": [
                    {"is_half_day": {"$exists": False}},
                    {"is_half_day": False}
                ]
            }
        ],
        "$or": [
            {
                "is_partial_approval": True,
                "approved_start_date": {"$lte": date},
                "approved_end_date": {"$gte": date}
            },
            {
                "$or": [
                    {"is_partial_approval": {"$exists": False}},
                    {"is_partial_approval": False}
                ],
                "start_date": {"$lte": date},
                "end_date": {"$gte": date}
            }
        ]
    })


# -------------------------------
# Get Blocked Dates
# -------------------------------
@tea_coffee_bp.route("/blocked_dates", methods=["GET"])
@cross_origin()
def get_blocked_dates():
    try:
        blocked = list(mongo.db.tea_coffee_blocked_dates.find({}, {
            "_id": 0, 
            "date": 1, 
            "reason": 1, 
            "auto_blocked": 1  # Include auto_blocked flag
        }))
        return jsonify(blocked), 200
    except Exception as e:
        print(f"❌ Error fetching blocked dates: {str(e)}")
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Block Date (Admin Only)
# -------------------------------
@tea_coffee_bp.route("/block_date", methods=["POST"])
@cross_origin()
def block_date():
    try:
        data = request.get_json()
        date = data.get("date")
        reason = data.get("reason", "Unavailable")
        
        if not date:
            return jsonify({"error": "Date is required"}), 400
        
        # Check if already blocked
        existing = mongo.db.tea_coffee_blocked_dates.find_one({"date": date})
        if existing:
            # If it's auto-blocked, allow admin to override with manual reason
            if existing.get("auto_blocked", False):
                mongo.db.tea_coffee_blocked_dates.update_one(
                    {"date": date},
                    {"$set": {
                        "reason": reason,
                        "auto_blocked": False,  # Now it's a manual block
                        "blocked_at": datetime.utcnow()
                    }}
                )
                return jsonify({"message": "Auto-blocked date updated with manual reason"}), 200
            else:
                return jsonify({"error": "Date is already manually blocked"}), 400
        
        # Add to blocked dates (manual block)
        mongo.db.tea_coffee_blocked_dates.insert_one({
            "date": date,
            "reason": reason,
            "blocked_at": datetime.utcnow(),
            "auto_blocked": False  # Manual block by admin
        })
        
        # Cancel all existing orders for this date
        result = mongo.db.tea_coffee_orders.delete_many({"date": date})
        
        return jsonify({
            "message": f"Date blocked successfully. {result.deleted_count} orders cancelled.",
            "cancelled_orders": result.deleted_count
        }), 200
        
    except Exception as e:
        print(f"❌ Error blocking date: {str(e)}")
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Unblock Date (Admin Only)
# -------------------------------
@tea_coffee_bp.route("/unblock_date", methods=["DELETE"])
@cross_origin()
def unblock_date():
    try:
        data = request.get_json()
        date = data.get("date")
        
        if not date:
            return jsonify({"error": "Date is required"}), 400
        
        blocked = mongo.db.tea_coffee_blocked_dates.find_one({"date": date})
        if not blocked:
            return jsonify({"error": "Date was not blocked"}), 404
        
        # Check if it's auto-blocked (from public holiday)
        if blocked.get("auto_blocked", False):
            return jsonify({
                "error": "Cannot unblock auto-blocked date. This date is blocked due to a public holiday. Remove the holiday from the calendar to unblock."
            }), 400
        
        # Delete manual block
        result = mongo.db.tea_coffee_blocked_dates.delete_one({"date": date})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Date was not blocked"}), 404
        
        return jsonify({"message": "Date unblocked successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error unblocking date: {str(e)}")
        return jsonify({"error": str(e)}), 500


# -------------------------------
# Get Orders for Employee (15 days)
# -------------------------------
@tea_coffee_bp.route("/my_orders/<user_id>", methods=["GET"])
@cross_origin()
def get_my_orders(user_id):
    try:
        print(f"📥 Fetching orders for employee: {user_id}")

        today = datetime.now().date()
        end_date = today + timedelta(days=14)

        # Fetch orders using string employee_id
        orders = list(mongo.db.tea_coffee_orders.find({
            "employee_id": user_id,
            "date": {
                "$gte": today.isoformat(),
                "$lte": end_date.isoformat()
            }
        }))

        print(f"✅ Found {len(orders)} orders")

        for order in orders:
            order["_id"] = str(order["_id"])
            order["employee_id"] = str(order["employee_id"])

        return jsonify(orders), 200

    except Exception as e:
        print(f"❌ Error fetching orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch orders: {str(e)}"}), 500


@tea_coffee_bp.route("/place_order", methods=["POST"])
@cross_origin()
def place_order():
    try:
        data = request.get_json()
        print("\n☕ Received tea/coffee order:", data)

        employee_id = data.get("employee_id")
        date = data.get("date")
        morning = data.get("morning")
        evening = data.get("evening")

        if not employee_id or not date:
            return jsonify({"error": "Employee ID and date are required"}), 400

        if not morning and not evening:
            return jsonify({"error": "Please select at least one item"}), 400

        # Validate beverage choices (removed "black coffee")
        valid_choices = ["tea", "coffee", "milk"]
        if morning and morning not in valid_choices:
            return jsonify({"error": f"Invalid morning choice: {morning}"}), 400
        if evening and evening not in valid_choices:
            return jsonify({"error": f"Invalid evening choice: {evening}"}), 400

        # Check if date is blocked
        blocked = mongo.db.tea_coffee_blocked_dates.find_one({"date": date})
        if blocked:
            reason = blocked.get("reason", "Unavailable")
            is_auto = blocked.get("auto_blocked", False)
            if is_auto:
                return jsonify({"error": f"Tea/Coffee unavailable - Public Holiday: {reason}"}), 400
            else:
                return jsonify({"error": f"Tea/Coffee unavailable on this date: {reason}"}), 400

        order_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = datetime.now().date()
        current_time = datetime.now().time()
        
        # Parse cutoff times
        morning_cutoff = datetime.strptime(MORNING_CUTOFF_TIME, "%H:%M").time()
        evening_cutoff = datetime.strptime(EVENING_CUTOFF_TIME, "%H:%M").time()

        # Check if ordering for today
        if order_date == today:
            # Check morning slot cutoff
            if morning and current_time >= morning_cutoff:
                return jsonify({"error": f"Cannot place morning order after {MORNING_CUTOFF_TIME}"}), 400
            
            # Check evening slot cutoff
            if evening and current_time >= evening_cutoff:
                return jsonify({"error": f"Cannot place evening order after {EVENING_CUTOFF_TIME}"}), 400

        if order_date < today:
            return jsonify({"error": "Cannot place order for past dates"}), 400

        # employee_id stays STRING
        try:
            emp_obj_id = ObjectId(employee_id)  # Only for user lookup
        except:
            return jsonify({"error": "Invalid employee ID"}), 400

        employee = mongo.db.users.find_one({"_id": emp_obj_id})

        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        approved_leave = get_approved_leave_for_date(employee_id, date)
        if approved_leave:
            leave_type = approved_leave.get("leave_type", "leave")
            return jsonify({
                "error": f"Tea/Coffee order not allowed on {date}. {employee.get('name', 'Employee')} is on approved {leave_type}."
            }), 400

        # Check for existing order
        existing = mongo.db.tea_coffee_orders.find_one({
            "employee_id": employee_id,
            "date": date
        })

        # Build order data
        order_data = {
            "employee_id": employee_id,
            "employee_name": employee.get("name"),
            "employee_email": employee.get("email"),
            "date": date,
            "morning": morning,
            "evening": evening,
            "updated_at": datetime.utcnow()
        }

        if existing:
            # If updating an existing order, check cutoff for each slot being modified
            if order_date == today:
                if morning != existing.get("morning") and current_time >= morning_cutoff:
                    return jsonify({"error": f"Cannot modify morning order after {MORNING_CUTOFF_TIME}"}), 400
                if evening != existing.get("evening") and current_time >= evening_cutoff:
                    return jsonify({"error": f"Cannot modify evening order after {EVENING_CUTOFF_TIME}"}), 400
            
            mongo.db.tea_coffee_orders.update_one(
                {"_id": existing["_id"]},
                {"$set": order_data}
            )
            message = "Order updated successfully"
        else:
            order_data["created_at"] = datetime.utcnow()
            mongo.db.tea_coffee_orders.insert_one(order_data)
            message = "Order placed successfully"

        return jsonify({"message": message}), 200

    except Exception as e:
        print("❌ Error placing order:", str(e))
        return jsonify({"error": str(e)}), 500



# ------------------------------------------
# ADMIN – GET ORDERS IN DATE RANGE WITH EMPLOYEE DETAILS
# ------------------------------------------
@tea_coffee_bp.route("/admin/orders", methods=["GET"])
@cross_origin()
def get_admin_orders():
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")

        if not start_date or not end_date:
            return jsonify({"error": "start_date and end_date are required"}), 400

        orders = list(mongo.db.tea_coffee_orders.find({
            "date": {"$gte": start_date, "$lte": end_date}
        }).sort("date", 1))

        for order in orders:
            order["_id"] = str(order["_id"])

        return jsonify(orders), 200

    except Exception as e:
        print("❌ Error fetching admin orders:", str(e))
        return jsonify({"error": str(e)}), 500


# ------------------------------------------
# CANCEL ORDER WITH SLOT-SPECIFIC CUTOFF
# ------------------------------------------
@tea_coffee_bp.route("/cancel_order", methods=["DELETE"])
@cross_origin()
def cancel_order():
    try:
        data = request.get_json()
        employee_id = data.get("employee_id")
        date = data.get("date")

        if not employee_id or not date:
            return jsonify({"error": "Employee ID and date required"}), 400

        # Check cutoff times
        order_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = datetime.now().date()
        current_time = datetime.now().time()
        
        morning_cutoff = datetime.strptime(MORNING_CUTOFF_TIME, "%H:%M").time()
        evening_cutoff = datetime.strptime(EVENING_CUTOFF_TIME, "%H:%M").time()

        # If cancelling today's order, check if both slots are past cutoff
        if order_date == today:
            if current_time >= evening_cutoff:
                return jsonify({"error": f"Cannot cancel order after {EVENING_CUTOFF_TIME}"}), 400

        result = mongo.db.tea_coffee_orders.delete_one({
            "employee_id": employee_id,
            "date": date
        })

        if result.deleted_count == 0:
            return jsonify({"error": "No order found"}), 404

        return jsonify({"message": "Order cancelled successfully"}), 200

    except Exception as e:
        print("❌ Error cancelling order:", str(e))
        return jsonify({"error": str(e)}), 500


# ------------------------------------------
# TEST ENDPOINT
# ------------------------------------------
@tea_coffee_bp.route("/test", methods=["GET"])
def test_connection():
    try:
        count = mongo.db.tea_coffee_orders.count_documents({})
        return jsonify({
            "status": "OK",
            "total_orders": count,
            "morning_cutoff": MORNING_CUTOFF_TIME,
            "evening_cutoff": EVENING_CUTOFF_TIME,
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
