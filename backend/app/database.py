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

    def _matches_cond(self, doc, k, v):
        from bson import ObjectId
        doc_val = doc.get(k)
        if isinstance(v, ObjectId) or isinstance(doc_val, ObjectId):
            return str(doc_val) == str(v)
        return doc_val == v

    def _matches_query(self, doc, query):
        if not query:
            return True
        for k, v in query.items():
            if k == "$or" and isinstance(v, list):
                or_match = False
                for cond in v:
                    if self._matches_query(doc, cond):
                        or_match = True
                        break
                if not or_match:
                    return False
            else:
                if not self._matches_cond(doc, k, v):
                    return False
        return True

    async def find_one(self, query):
        for doc in self._data.values():
            if self._matches_query(doc, query):
                return doc
        return None

    def find(self, query):
        class Cursor:
            def __init__(self, data, query, matches_fn):
                self.results = []
                for doc in data.values():
                    if matches_fn(doc, query):
                        self.results.append(doc)

            def sort(self, field, direction=-1):
                reverse = (direction == -1)
                self.results.sort(key=lambda x: x.get(field, ''), reverse=reverse)
                return self

            async def to_list(self, length=100):
                return self.results[:length]

        return Cursor(self._data, query, self._matches_query)

    async def delete_one(self, query):
        to_delete = None
        for doc_id, doc in self._data.items():
            if self._matches_query(doc, query):
                to_delete = doc_id
                break
        if to_delete:
            del self._data[to_delete]
            class DeleteResult:
                deleted_count = 1
            return DeleteResult()
        class DeleteResult:
            deleted_count = 0
        return DeleteResult()

    async def delete_many(self, query):
        to_delete = [doc_id for doc_id, doc in self._data.items() if self._matches_query(doc, query)]
        for doc_id in to_delete:
            del self._data[doc_id]
        class DeleteResult:
            def __init__(self, count):
                self.deleted_count = count
        return DeleteResult(len(to_delete))

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

