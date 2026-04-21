# routes/timesheet_routes.py
from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime, timedelta
from config.db import mongo

timesheet_bp = Blueprint("timesheet_bp", __name__)


# ========================================
# SERIALIZATION HELPERS
# ========================================

def serialize_all(obj):
    """Fully recursive serializer - converts ALL ObjectIds and datetimes."""
    if isinstance(obj, list):
        return [serialize_all(item) for item in obj]
    if isinstance(obj, dict):
        return {k: serialize_all(v) for k, v in obj.items()}
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def create_notification(user_id, notification_type, message, related_timesheet_id=None):
    """Create a notification for timesheet actions."""
    try:
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        notification = {
            "user_id": user_id,
            "type": notification_type,
            "message": message,
            "read": False,
            "createdAt": datetime.utcnow(),
        }

        if related_timesheet_id:
            if isinstance(related_timesheet_id, str):
                related_timesheet_id = ObjectId(related_timesheet_id)
            notification["related_timesheet_id"] = related_timesheet_id

        mongo.db.notifications.insert_one(notification)
        print(f"✅ Timesheet notification created: {notification_type}")
    except Exception as e:
        print(f"❌ Error creating timesheet notification: {str(e)}")


# ========================================
# CREATE / SUBMIT TIMESHEET
# ========================================

@timesheet_bp.route("/create", methods=["POST"])
def create_timesheet():
    try:
        data = request.get_json()
        employee_id  = data.get("employee_id")
        period_start = data.get("period_start")
        period_end   = data.get("period_end")
        entries      = data.get("entries", [])

        if not all([employee_id, period_start, period_end]):
            return jsonify({"error": "Missing required fields: employee_id, period_start, period_end"}), 400

        try:
            emp_obj_id = ObjectId(employee_id)
        except Exception:
            return jsonify({"error": "Invalid employee_id format"}), 400

        employee = mongo.db.users.find_one({"_id": emp_obj_id})
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        existing = mongo.db.timesheets.find_one({
            "employee_id": emp_obj_id,
            "period_start": period_start,
            "period_end":   period_end,
        })
        if existing and existing.get("status") == "approved":
            return jsonify({
                "error": "This timesheet has already been approved and is locked."
            }), 400

        reporting_lead_id = employee.get("reportsTo")
        if not reporting_lead_id:
            return jsonify({"error": "No reporting lead found for employee"}), 404

        validated_entries = []

        for entry in entries:
            entry_date  = entry.get("date")
            entry_type  = entry.get("entry_type", "work")
            hours       = float(entry.get("hours", 0))
            description = entry.get("description", "")

            if entry_type == "leave":
                leave_type = entry.get("leave_type")
                if not leave_type:
                    return jsonify({"error": f"Leave type required for leave entry on {entry_date}"}), 400

                approved_leave = mongo.db.leaves.find_one({
                    "employee_id": emp_obj_id,
                    "status":      "Approved",
                    "start_date":  {"$lte": entry_date},
                    "end_date":    {"$gte": entry_date},
                })
                if not approved_leave:
                    return jsonify({"error": f"No approved leave found for {entry_date}"}), 400

                validated_entries.append({
                    "_id":        ObjectId(),
                    "date":       entry_date,
                    "entry_type": "leave",
                    "leave_type": leave_type,
                    "hours":      hours or 8.0,
                    "description": description,
                    "leave_id":   approved_leave["_id"],
                })

            elif entry_type == "holiday":
                holiday = mongo.db.holidays.find_one({
                    "date": entry_date,
                    "type": {"$in": ["public", "company"]},
                })
                if not holiday:
                    return jsonify({"error": f"No public holiday found for {entry_date}"}), 400

                validated_entries.append({
                    "_id":          ObjectId(),
                    "date":         entry_date,
                    "entry_type":   "holiday",
                    "holiday_name": holiday.get("name"),
                    "hours":        hours or 8.0,
                    "description":  description,
                })

            else:  # work
                charge_code_id = entry.get("charge_code_id")
                if not charge_code_id:
                    return jsonify({"error": f"Charge code required for work entry on {entry_date}"}), 400

                try:
                    cc_obj_id = ObjectId(charge_code_id)
                except Exception:
                    return jsonify({"error": f"Invalid charge_code_id on {entry_date}"}), 400

                assignment = mongo.db.charge_code_assignments.find_one({
                    "employee_id":    emp_obj_id,
                    "charge_code_id": cc_obj_id,
                    "is_active":      True,
                })
                if not assignment:
                    return jsonify({"error": f"You don't have access to charge code {charge_code_id}"}), 400

                charge_code = mongo.db.charge_codes.find_one({"_id": cc_obj_id})

                # FIX: store charge_code_name so the lead view can display "CODE – Name"
                validated_entries.append({
                    "_id":              ObjectId(),
                    "date":             entry_date,
                    "entry_type":       "work",
                    "charge_code_id":   cc_obj_id,
                    "charge_code":      charge_code.get("code") if charge_code else "Unknown",
                    "charge_code_name": charge_code.get("name") if charge_code else "",
                    "hours":            hours,
                    "description":      description,
                })

        total_hours = sum(e.get("hours", 0) for e in validated_entries)

        now = datetime.utcnow()
        timesheet = {
            "employee_id":         emp_obj_id,
            "employee_name":       employee.get("name"),
            "employee_email":      employee.get("email"),
            "employee_department": employee.get("department", ""),
            "period_start":        period_start,
            "period_end":          period_end,
            "entries":             validated_entries,
            "total_hours":         total_hours,
            "status":              "pending_lead",
            "reporting_lead_id":   reporting_lead_id,
            "manager_id":          employee.get("peopleLead"),
            "created_at":          now,
            "updated_at":          now,
            "submitted_at":        now,
            "approval_history":    [],
        }

        if existing:
            mongo.db.timesheets.update_one({"_id": existing["_id"]}, {"$set": timesheet})
            timesheet_id = existing["_id"]
        else:
            result = mongo.db.timesheets.insert_one(timesheet)
            timesheet_id = result.inserted_id

        # Notify the reporting lead
        reporting_lead = mongo.db.users.find_one({"_id": reporting_lead_id})
        if reporting_lead:
            msg = (
                f"{employee.get('name')} submitted a timesheet for "
                f"{period_start} to {period_end} ({total_hours}h)"
            )
            create_notification(
                user_id=reporting_lead_id,
                notification_type="timesheet_submitted",
                message=msg,
                related_timesheet_id=timesheet_id,
            )

        return jsonify({
            "message": "Timesheet submitted successfully",
            "timesheet_id": str(timesheet_id),
            "total_hours": total_hours,
        }), 201

    except Exception as e:
        print(f"❌ Error creating timesheet: {str(e)}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# UPDATE TIMESHEET ENTRIES (draft / recalled)
# ========================================

@timesheet_bp.route("/update/<timesheet_id>", methods=["PUT"])
def update_timesheet(timesheet_id):
    """Update entries on a draft or recalled timesheet before re-submitting."""
    try:
        data = request.get_json()
        entries = data.get("entries", [])

        ts = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404
        if ts.get("status") not in ("draft", "rejected_by_lead", "rejected_by_manager"):
            return jsonify({"error": "Only draft or rejected timesheets can be updated"}), 400

        # FIX: re-hydrate charge_code_name on every work entry during update too
        validated_entries = []
        for entry in entries:
            if entry.get("entry_type") == "work" and entry.get("charge_code_id"):
                try:
                    cc_obj_id = ObjectId(entry["charge_code_id"])
                    charge_code = mongo.db.charge_codes.find_one({"_id": cc_obj_id})
                    if charge_code:
                        entry = dict(entry)
                        entry["charge_code"]      = charge_code.get("code", entry.get("charge_code", ""))
                        entry["charge_code_name"] = charge_code.get("name", "")
                except Exception:
                    pass
            validated_entries.append(entry)

        total_hours = sum(float(e.get("hours", 0)) for e in validated_entries)

        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {"$set": {
                "entries":     validated_entries,
                "total_hours": total_hours,
                "updated_at":  datetime.utcnow(),
            }}
        )
        return jsonify({"message": "Timesheet updated", "total_hours": total_hours}), 200

    except Exception as e:
        print(f"❌ Error updating timesheet: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# SUBMIT EXISTING TIMESHEET
# ========================================

@timesheet_bp.route("/submit/<timesheet_id>", methods=["PUT"])
def submit_timesheet(timesheet_id):
    """Submit a draft/rejected timesheet into the approval queue."""
    try:
        ts = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404
        if ts.get("status") == "approved":
            return jsonify({"error": "Timesheet is already approved"}), 400

        now = datetime.utcnow()
        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {"$set": {
                "status":       "pending_lead",
                "submitted_at": now,
                "updated_at":   now,
            }}
        )

        # Notify reporting lead
        if ts.get("reporting_lead_id"):
            employee_name = ts.get("employee_name", "An employee")
            create_notification(
                user_id=ts["reporting_lead_id"],
                notification_type="timesheet_submitted",
                message=(
                    f"{employee_name} submitted a timesheet for "
                    f"{ts.get('period_start')} to {ts.get('period_end')}"
                ),
                related_timesheet_id=timesheet_id,
            )

        return jsonify({
            "message":     "Timesheet submitted",
            "total_hours": ts.get("total_hours", 0),
        }), 200

    except Exception as e:
        print(f"❌ Error submitting timesheet: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# RECALL TIMESHEET (Employee retracts for editing)
# ========================================

@timesheet_bp.route("/recall/<timesheet_id>", methods=["PUT"])
def recall_timesheet(timesheet_id):
    try:
        ts = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404

        if ts.get("status") == "approved":
            return jsonify({"error": "Cannot recall an approved timesheet"}), 400

        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {"$set": {
                "status":     "draft",
                "updated_at": datetime.utcnow(),
            }}
        )
        print(f"✅ Timesheet {timesheet_id} recalled to draft")
        return jsonify({"message": "Timesheet recalled to draft"}), 200

    except Exception as e:
        print(f"❌ Error recalling timesheet: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# GET EMPLOYEE'S TIMESHEETS
# ========================================

@timesheet_bp.route("/employee/<employee_id>", methods=["GET"])
def get_employee_timesheets(employee_id):
    try:
        if not employee_id or len(employee_id) != 24:
            return jsonify({"error": "Invalid employee_id format"}), 400

        timesheets = list(
            mongo.db.timesheets.find({"employee_id": ObjectId(employee_id)}).sort("period_start", -1)
        )
        return jsonify(serialize_all(timesheets)), 200

    except Exception as e:
        print(f"❌ Error fetching employee timesheets: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# GET PENDING TIMESHEETS FOR LEAD
# ========================================

@timesheet_bp.route("/pending/lead/<user_id>", methods=["GET"])
def get_pending_for_lead(user_id):
    try:
        timesheets = list(
            mongo.db.timesheets.find({
                "reporting_lead_id": ObjectId(user_id),
                "status": "pending_lead",
            }).sort("submitted_at", -1)
        )
        return jsonify(serialize_all(timesheets)), 200

    except Exception as e:
        print(f"❌ Error fetching pending timesheets for lead: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# GET PENDING TIMESHEETS FOR MANAGER
# KEPT for backwards compatibility — always returns empty list now
# ========================================

@timesheet_bp.route("/pending/manager/<user_id>", methods=["GET"])
def get_pending_for_manager(user_id):
    return jsonify([]), 200


# ========================================
# LEAD APPROVAL — grants full approval
# ========================================

@timesheet_bp.route("/approve/lead/<timesheet_id>", methods=["PUT"])
def lead_approve_timesheet(timesheet_id):
    try:
        data        = request.get_json()
        approved_by = data.get("approved_by")
        comments    = data.get("comments", "")

        if not approved_by:
            return jsonify({"error": "approved_by is required"}), 400

        timesheet = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not timesheet:
            return jsonify({"error": "Timesheet not found"}), 404
        if timesheet.get("status") != "pending_lead":
            return jsonify({"error": "Timesheet is not pending lead approval"}), 400

        approver = mongo.db.users.find_one({"_id": ObjectId(approved_by)})
        if not approver:
            return jsonify({"error": "Approver not found"}), 404

        approval_entry = {
            "stage":         "lead",
            "action":        "approved",
            "approver_id":   ObjectId(approved_by),
            "approver_name": approver.get("name"),
            "comments":      comments,
            "timestamp":     datetime.utcnow(),
        }

        now = datetime.utcnow()
        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {
                "$set": {
                    "status":             "approved",
                    "lead_approved_at":   now,
                    "lead_approved_by":   approver.get("name"),
                    "is_locked":          True,
                    "updated_at":         now,
                },
                "$push": {"approval_history": approval_entry},
            },
        )

        create_notification(
            user_id=timesheet["employee_id"],
            notification_type="timesheet_approved",
            message=(
                f"Your timesheet ({timesheet.get('period_start')} to {timesheet.get('period_end')}) "
                f"has been approved by your lead and is now locked"
            ),
            related_timesheet_id=timesheet_id,
        )

        print(f"✅ Timesheet {timesheet_id} fully approved by lead {approver.get('name')}")
        return jsonify({"message": "Timesheet approved"}), 200

    except Exception as e:
        print(f"❌ Error in lead approval: {str(e)}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# LEAD REJECTION
# ========================================

@timesheet_bp.route("/reject/lead/<timesheet_id>", methods=["PUT"])
def lead_reject_timesheet(timesheet_id):
    try:
        data             = request.get_json()
        rejected_by      = data.get("rejected_by")
        rejection_reason = data.get("rejection_reason", "").strip()

        if not rejection_reason:
            return jsonify({"error": "Rejection reason is required"}), 400
        if not rejected_by:
            return jsonify({"error": "rejected_by is required"}), 400

        timesheet = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not timesheet:
            return jsonify({"error": "Timesheet not found"}), 404
        if timesheet.get("status") != "pending_lead":
            return jsonify({"error": "Timesheet is not pending lead approval"}), 400

        rejector = mongo.db.users.find_one({"_id": ObjectId(rejected_by)})
        if not rejector:
            return jsonify({"error": "Rejector not found"}), 404

        rejection_entry = {
            "stage":         "lead",
            "action":        "rejected",
            "approver_id":   ObjectId(rejected_by),
            "approver_name": rejector.get("name"),
            "comments":      rejection_reason,
            "timestamp":     datetime.utcnow(),
        }

        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {
                "$set": {
                    "status":           "rejected_by_lead",
                    "lead_rejected_at": datetime.utcnow(),
                    "lead_rejected_by": rejector.get("name"),
                    "rejection_reason": rejection_reason,
                    "updated_at":       datetime.utcnow(),
                },
                "$push": {"approval_history": rejection_entry},
            },
        )

        create_notification(
            user_id=timesheet["employee_id"],
            notification_type="timesheet_rejected",
            message=(
                f"Your timesheet ({timesheet.get('period_start')} to {timesheet.get('period_end')}) "
                f"was rejected by your lead. Reason: {rejection_reason}"
            ),
            related_timesheet_id=timesheet_id,
        )

        return jsonify({"message": "Timesheet rejected by lead"}), 200

    except Exception as e:
        print(f"❌ Error in lead rejection: {str(e)}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# MANAGER APPROVAL — KEPT for backwards compatibility only
# ========================================

@timesheet_bp.route("/approve/manager/<timesheet_id>", methods=["PUT"])
def manager_approve_timesheet(timesheet_id):
    try:
        data        = request.get_json()
        approved_by = data.get("approved_by")
        comments    = data.get("comments", "")

        if not approved_by:
            return jsonify({"error": "approved_by is required"}), 400

        timesheet = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not timesheet:
            return jsonify({"error": "Timesheet not found"}), 404
        if timesheet.get("status") != "pending_manager":
            return jsonify({"error": "Timesheet is not pending manager approval"}), 400

        approver = mongo.db.users.find_one({"_id": ObjectId(approved_by)})
        if not approver:
            return jsonify({"error": "Approver not found"}), 404

        approval_entry = {
            "stage":         "manager",
            "action":        "approved",
            "approver_id":   ObjectId(approved_by),
            "approver_name": approver.get("name"),
            "comments":      comments,
            "timestamp":     datetime.utcnow(),
        }

        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {
                "$set": {
                    "status":              "approved",
                    "manager_approved_at": datetime.utcnow(),
                    "manager_approved_by": approver.get("name"),
                    "updated_at":          datetime.utcnow(),
                    "is_locked":           True,
                },
                "$push": {"approval_history": approval_entry},
            },
        )

        create_notification(
            user_id=timesheet["employee_id"],
            notification_type="timesheet_approved",
            message=(
                f"Your timesheet ({timesheet.get('period_start')} to {timesheet.get('period_end')}) "
                f"has been fully approved and is now locked"
            ),
            related_timesheet_id=timesheet_id,
        )

        return jsonify({"message": "Timesheet fully approved"}), 200

    except Exception as e:
        print(f"❌ Error in manager approval: {str(e)}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# MANAGER REJECTION — KEPT for backwards compatibility only
# ========================================

@timesheet_bp.route("/reject/manager/<timesheet_id>", methods=["PUT"])
def manager_reject_timesheet(timesheet_id):
    try:
        data             = request.get_json()
        rejected_by      = data.get("rejected_by")
        rejection_reason = data.get("rejection_reason", "").strip()

        if not rejection_reason:
            return jsonify({"error": "Rejection reason is required"}), 400
        if not rejected_by:
            return jsonify({"error": "rejected_by is required"}), 400

        timesheet = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not timesheet:
            return jsonify({"error": "Timesheet not found"}), 404
        if timesheet.get("status") != "pending_manager":
            return jsonify({"error": "Timesheet is not pending manager approval"}), 400

        rejector = mongo.db.users.find_one({"_id": ObjectId(rejected_by)})
        if not rejector:
            return jsonify({"error": "Rejector not found"}), 404

        rejection_entry = {
            "stage":         "manager",
            "action":        "rejected",
            "approver_id":   ObjectId(rejected_by),
            "approver_name": rejector.get("name"),
            "comments":      rejection_reason,
            "timestamp":     datetime.utcnow(),
        }

        mongo.db.timesheets.update_one(
            {"_id": ObjectId(timesheet_id)},
            {
                "$set": {
                    "status":              "rejected_by_manager",
                    "manager_rejected_at": datetime.utcnow(),
                    "manager_rejected_by": rejector.get("name"),
                    "rejection_reason":    rejection_reason,
                    "updated_at":          datetime.utcnow(),
                },
                "$push": {"approval_history": rejection_entry},
            },
        )

        create_notification(
            user_id=timesheet["employee_id"],
            notification_type="timesheet_rejected",
            message=(
                f"Your timesheet ({timesheet.get('period_start')} to {timesheet.get('period_end')}) "
                f"was rejected by manager. Reason: {rejection_reason}"
            ),
            related_timesheet_id=timesheet_id,
        )

        return jsonify({"message": "Timesheet rejected by manager"}), 200

    except Exception as e:
        print(f"❌ Error in manager rejection: {str(e)}")
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========================================
# GET ALL TIMESHEETS (ADMIN)
# ========================================

@timesheet_bp.route("/all", methods=["GET"])
def get_all_timesheets():
    try:
        timesheets = list(mongo.db.timesheets.find().sort("submitted_at", -1))

        result = []
        for ts in timesheets:
            ts = serialize_all(ts)
            employee_id = ts.get("employee_id")
            if employee_id and (not ts.get("employee_name") or not ts.get("employee_department")):
                try:
                    emp = mongo.db.users.find_one({"_id": ObjectId(employee_id)})
                    if emp:
                        ts["employee_name"]       = ts.get("employee_name") or emp.get("name", "")
                        ts["employee_email"]      = ts.get("employee_email") or emp.get("email", "")
                        ts["employee_department"] = emp.get("department", "")
                except Exception:
                    pass
            result.append(ts)

        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Error in /all: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# AUTO-POPULATE HOLIDAYS FOR PERIOD
# ========================================

@timesheet_bp.route("/populate_holidays", methods=["POST"])
def populate_holidays():
    try:
        data         = request.get_json()
        period_start = data.get("period_start")
        period_end   = data.get("period_end")

        if not period_start or not period_end:
            return jsonify({"error": "period_start and period_end are required"}), 400

        holidays = list(mongo.db.holidays.find({
            "date": {"$gte": period_start, "$lte": period_end},
            "type": {"$in": ["public", "company"]},
        }))

        holiday_entries = [
            {
                "date":         h["date"],
                "entry_type":   "holiday",
                "holiday_name": h.get("name"),
                "hours":        8.0,
                "description":  f"Public Holiday: {h.get('name')}",
            }
            for h in holidays
        ]

        return jsonify({"holidays": holiday_entries, "count": len(holiday_entries)}), 200

    except Exception as e:
        print(f"❌ Error populating holidays: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# GET TEAM TIMESHEETS
# ========================================

@timesheet_bp.route("/team/<manager_email>", methods=["GET"])
def get_team_timesheets(manager_email):
    try:
        manager = mongo.db.users.find_one({"email": manager_email})
        if not manager:
            return jsonify([]), 200

        employees = list(mongo.db.users.find({
            "reportsTo": manager["_id"],
            "role":      {"$ne": "Admin"},
        }))

        all_ts = []
        for emp in employees:
            ts_list = list(mongo.db.timesheets.find({"employee_id": emp["_id"]}).sort("period_start", -1))
            all_ts.extend(ts_list)

        return jsonify(serialize_all(all_ts)), 200

    except Exception as e:
        print(f"❌ Error fetching team timesheets: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ========================================
# GET SINGLE TIMESHEET BY ID
# ========================================

@timesheet_bp.route("/<timesheet_id>", methods=["GET"])
def get_timesheet(timesheet_id):
    try:
        ts = mongo.db.timesheets.find_one({"_id": ObjectId(timesheet_id)})
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404
        return jsonify(serialize_all(ts)), 200

    except Exception as e:
        print(f"❌ Error fetching timesheet: {str(e)}")
        return jsonify({"error": str(e)}), 500