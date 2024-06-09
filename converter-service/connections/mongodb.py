import os, dotenv
from pymongo.mongo_client import MongoClient
from gridfs import GridFSBucket

dotenv.load_dotenv()


def connect_to_mongodb():
    connection_string = os.getenv("MONGODB_CONNECTION_STRING")

    if not connection_string:
        raise ValueError("MONGODB_CONNECTION_STRING is not set")

    mongoClient = MongoClient(connection_string)

    fs = GridFSBucket(
        mongoClient.get_database("audioconversion"), bucket_name="gridfsbucket"
    )

    return fs
