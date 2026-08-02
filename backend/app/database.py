import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("safe_hire.database")

class InMemoryCollection:
    """Fallback in-memory collection store if MongoDB instance is unreachable."""
    def __init__(self, name):
        self.name = name
        self._data = {}

    async def insert_one(self, doc):
        from bson import ObjectId
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        doc_id = str(doc["_id"])
        self._data[doc_id] = doc
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc["_id"])

    async def find_one(self, query):
        from bson import ObjectId
        for doc in self._data.values():
            match = True
            for k, v in query.items():
                if k == "_id" and isinstance(v, ObjectId):
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                return doc
        return None

    def find(self, query):
        class Cursor:
            def __init__(self, data, query):
                self.results = []
                from bson import ObjectId
                for doc in data.values():
                    match = True
                    for k, v in query.items():
                        if k == "_id" and isinstance(v, ObjectId):
                            if str(doc.get("_id")) != str(v):
                                match = False
                                break
                        elif doc.get(k) != v:
                            match = False
                            break
                    if match:
                        self.results.append(doc)

            def sort(self, field, direction=-1):
                reverse = (direction == -1)
                self.results.sort(key=lambda x: x.get(field, ''), reverse=reverse)
                return self

            async def to_list(self, length=100):
                return self.results[:length]

        return Cursor(self._data, query)

class FallbackDatabase:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, item):
        if item not in self.collections:
            self.collections[item] = InMemoryCollection(item)
        return self.collections[item]

db_client = None
db = None
is_mongo_connected = False

async def init_db():
    global db_client, db, is_mongo_connected
    try:
        kwargs = {"serverSelectionTimeoutMS": 5000}
        if "mongodb+srv://" in settings.MONGO_URI:
            try:
                import certifi
                kwargs["tlsCAFile"] = certifi.where()
            except ImportError:
                pass

        db_client = AsyncIOMotorClient(settings.MONGO_URI, **kwargs)
        # Verify connection to MongoDB Atlas or local server
        await db_client.admin.command('ping')
        db = db_client[settings.MONGO_DB_NAME]
        is_mongo_connected = True
        logger.info(f"Successfully connected to MongoDB Cluster ({settings.MONGO_DB_NAME})!")
    except Exception as e:
        logger.warning(f"MongoDB connection notice ({e}). Using resilient In-Memory Database store.")
        db = FallbackDatabase()
        is_mongo_connected = False

def get_db():
    global db, db_client, is_mongo_connected
    if db is None:
        try:
            kwargs = {"serverSelectionTimeoutMS": 5000}
            if "mongodb+srv://" in settings.MONGO_URI:
                try:
                    import certifi
                    kwargs["tlsCAFile"] = certifi.where()
                except ImportError:
                    pass

            db_client = AsyncIOMotorClient(settings.MONGO_URI, **kwargs)
            db = db_client[settings.MONGO_DB_NAME]
            is_mongo_connected = True
            logger.info(f"Initialized Motor database client for {settings.MONGO_DB_NAME}")
        except Exception as e:
            logger.warning(f"MongoDB Motor init notice ({e}). Using FallbackDatabase.")
            db = FallbackDatabase()
            is_mongo_connected = False
    return db

