from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv("MONGO_URI"))
db = client.get_database()

# Update all users without dateOfBirth field
result = db.users.update_many(
    {"dateOfBirth": {"$exists": False}},
    {"$set": {"dateOfBirth": None}}
)

print(f"✅ Updated {result.modified_count} user documents with dateOfBirth field")

client.close()