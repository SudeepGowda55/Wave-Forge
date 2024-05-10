import pika, os

connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBITMQ_URL")))

channel = connection.channel()

channel.queue_declare(queue="file_uploaded")


def callback(ch, method, properties, body):
    print(" [x] Received " + str(body))


channel.basic_consume("hello", callback, auto_ack=True)

print(" [*] Waiting for messages:")
channel.start_consuming()
# connection.close()

def consume_from_file_uploaded_queue():
    print("Converter service queue here")

def publish_to_notification_queue():
    print("Notification service queue here")