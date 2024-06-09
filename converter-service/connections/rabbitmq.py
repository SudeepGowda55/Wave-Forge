import pika, os, dotenv

dotenv.load_dotenv()


def connect_to_rabbitmq():
    connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBITMQ_URL")))
    channel = connection.channel()
    return connection, channel
