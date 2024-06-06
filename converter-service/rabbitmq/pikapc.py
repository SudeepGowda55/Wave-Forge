import pika, os, time
from dotenv import load_dotenv

load_dotenv()

connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBITMQ_URL")))

channel = connection.channel()

def consume_from_file_uploaded_queue():
    channel.queue_declare(queue="file_uploaded")
    channel.basic_consume(queue="file_uploaded", on_message_callback=publish_to_notification_queue)
    print(" [*] Waiting for messages:")
    channel.start_consuming()


def publish_to_notification_queue(ch, method, properties, body):
    print(" [Converted Service] Received " + str(body))
    channel.queue_declare(queue="file_converted_notification")
    # channel.basic_publish(exchange="", routing_key="file_converted_notification", body=str(body))
    print(" [Notification Service] Sent " + str(body))
    time.sleep(2)