import sys
import asyncio
import ssl
from motor.motor_asyncio import AsyncIOMotorClient

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

uri = "mongodb+srv://zytrixpvt_db_user:buUJYgpnvQAXP9af@cluster0.auxdtp4.mongodb.net/?appName=Cluster0"

async def test_conn():
    print("Connecting to MongoDB Atlas Cluster with tlsAllowInvalidCertificates=True...")
    client = AsyncIOMotorClient(
        uri,
        tls=True,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=8000
    )
    try:
        res = await client.admin.command('ping')
        print("Ping successful! Response:", res)
        db = client["safe_hire_db"]
        collections = await db.list_collection_names()
        print("Active collections in safe_hire_db:", collections)
    except Exception as e:
        print("MongoDB Atlas connection error:", e)

if __name__ == "__main__":
    asyncio.run(test_conn())
