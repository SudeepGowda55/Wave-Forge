import json, os, sys, requests, dotenv
from connections import rabbitmq
from conversion import conversions


dotenv.load_dotenv()
connection, channel = rabbitmq.connect_to_rabbitmq()


def process(data):
    """Convert one upload and record the result; returns the file URL or None."""
    file_id = data["fileid"]
    rate = data.get("samplingrate")
    rate = int(rate) if rate and rate != "n/a" else None
    file_name = os.path.splitext(data["filename"])[0]

    try:
        url = conversions.convert(file_id, file_name, data["destaudioformat"], rate)
        print(f"Converted {file_id}: {url}")
    except Exception as e:
        print(f"Conversion failed for {file_id}: {e}")
        url = None

    response = requests.post(
        os.environ["UPDATE_FILE_URL"],
        data={"usermail": data["usermail"], "fileid": file_id, "fileurl": url or "conversion failed"},
        timeout=30,
    )
    print(f"/updatefileurl: {response.status_code} {response.text.strip()}")
    return url


def on_message(ch, method, properties, body):
    # shortcut: every message is acked, even on failure, so a bad file can't block the queue;
    # add a retry/dead-letter queue if lost results ever matter
    try:
        data = json.loads(body)
        print("Received " + str(data))
        url = process(data)
        if url:
            publish_to_notification_queue({
                "usermail": data["usermail"],
                "username": data.get("username"),
                "fileurl": url,
                "filename": data["filename"],
            })
    except Exception as e:
        print(f"Dropping message: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def publish_to_notification_queue(data):
    notification_data = json.dumps(data)
    channel.queue_declare(queue="file_converted_notification")
    channel.basic_publish(exchange="", routing_key="file_converted_notification", body=notification_data)
    print("[Notification Service] Sent " + notification_data)


if __name__ == "__main__":
    channel.queue_declare(queue="file_uploaded")
    channel.basic_consume(queue="file_uploaded", on_message_callback=on_message)
    print("Waiting for messages:")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        sys.exit(0)
