from config.db import mongo
from flask import Flask

def init_tea_coffee_collection():
    """Initialize tea_coffee_orders collection with indexes"""
    
    app = Flask(__name__)
    from config.db import init_db
    init_db(app)
    
    with app.app_context():
        try:
            # Check if collection exists
            existing_collections = mongo.db.list_collection_names()
            
            if 'tea_coffee_orders' not in existing_collections:
                # Create collection
                mongo.db.create_collection('tea_coffee_orders')
                print("✅ Created 'tea_coffee_orders' collection")
            else:
                print("ℹ️  Collection 'tea_coffee_orders' already exists")
            
            # Create indexes for better query performance
            # Index on employee_id and date (for unique orders per employee per day)
            mongo.db.tea_coffee_orders.create_index(
                [("employee_id", 1), ("date", 1)],
                unique=True,
                name="employee_date_unique"
            )
            print("✅ Created unique index on (employee_id, date)")
            
            # Index on date (for admin queries by date range)
            mongo.db.tea_coffee_orders.create_index(
                [("date", 1)],
                name="date_index"
            )
            print("✅ Created index on date")
            
            # Index on employee_id (for fetching employee's orders)
            mongo.db.tea_coffee_orders.create_index(
                [("employee_id", 1)],
                name="employee_index"
            )
            print("✅ Created index on employee_id")
            
            print("\n✅ Tea/Coffee collection initialized successfully!")
            
        except Exception as e:
            print(f"❌ Error initializing collection: {str(e)}")

if __name__ == "__main__":
    init_tea_coffee_collection()