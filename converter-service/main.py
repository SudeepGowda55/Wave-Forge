import json, re, os, sys, requests, dotenv
from connections import rabbitmq
from conversion import conversions


dotenv.load_dotenv()
connection, channel = rabbitmq.connect_to_rabbitmq()


def send_post_request(url, data):
    try:
        response = requests.post(url, data=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}


def extract_object_id(oid_string):
    match = re.search(r'ObjectID\("([0-9a-fA-F]{24})"\)', oid_string)
    if match:
        return match.group(1)
    else:
        raise ValueError(f"Invalid ObjectID string: {oid_string}")


def process_and_get_url(data):
    email = data.get("usermail")
    file_name = data.get("filename")
    Objfile_id = data.get("fileid")
    destformat = data.get("destaudioformat")
    sampling_rate = data.get("samplingrate")

    fname, extension = os.path.splitext(file_name)
    initformat = extension.lstrip(".")

    conversion_type = f"{initformat}_to_{destformat}"
    converted_file_url = None

    try:
        file_id = extract_object_id(Objfile_id)
    except ValueError as e:
        print(f"Error extracting ObjectID: {e}")
        return None

    if conversion_type.lower() == "mp4_to_wav":
        converted_file_url = conversions.convert_video_to_audio(
            conversion_type, file_name, file_id
        )
        sampling_rate = data.get(sampling_rate)
        if sampling_rate != "n/a":
            converted_file_url = conversions.change_audio_sampling_rate_wav(
                sampling_rate, file_name, file_id
            )

    elif conversion_type.lower() == "mp4_to_mp3":
        converted_file_url = conversions.convert_video_to_audio(
            conversion_type, file_name, file_id
        )
        sampling_rate = data.get(sampling_rate)
        if sampling_rate != "n/a":
            converted_file_url = conversions.change_audio_sampling_rate_mp3(
                sampling_rate, file_name, file_id
            )

    elif conversion_type.lower() == "mp3_to_wav":
        converted_file_url = conversions.convert_mp3_to_wav(file_name, file_id)
        sampling_rate = data.get(sampling_rate)
        if sampling_rate != "n/a":
            converted_file_url = conversions.change_audio_sampling_rate_wav(
                sampling_rate, file_name, file_id
            )

    elif conversion_type.lower() == "wav_to_mp3":
        converted_file_url = conversions.convert_wav_to_mp3(file_name, file_id)
        sampling_rate = data.get(sampling_rate)
        if sampling_rate != "n/a":
            converted_file_url = conversions.change_audio_sampling_rate_mp3(
                sampling_rate, file_name, file_id
            )

    elif conversion_type.lower() == "mp3_to_mp3":
        form_data = {
            "fileurl": "conversion to same format not possible",
            "usermail": email,
            "fileid": file_id,
        }

        url = os.getenv("POST_URL")
        response_data = send_post_request(url, data=form_data)

        if response_data:
            print(f"/updatefileurl: {response_data}")
        else:
            print("Error sending POST request")

    elif conversion_type.lower() == "wav_to_wav":
        form_data = {
            "fileurl": "conversion to same format not possible",
            "usermail": email,
            "fileid": file_id,
        }

        url = os.getenv("POST_URL")
        response_data = send_post_request(url, data=form_data)

        if response_data:
            print(f"/updatefileurl: {response_data}")
        else:
            print("Error sending POST request")

    elif conversion_type.lower() == "change_sampling_rate":
        if sampling_rate != "n/a":
            converted_file_url = conversions.change_audio_sampling_rate(
                sampling_rate, file_name, file_id
            )

    if converted_file_url:
        form_data = {
            "fileurl": converted_file_url,
            "usermail": email,
            "fileid": file_id,
        }

        url = os.getenv("POST_URL")
        response_data = send_post_request(url, data=form_data)

        if response_data:
            print(f"/updatefileurl: {response_data}")
        else:
            print("Error sending POST request")
    else:
        print("Error in conversion, retrying conversion")
    return converted_file_url


def consume_from_file_uploaded_queue():
    channel.queue_declare(queue="file_uploaded")

    def on_message_callback(ch, method, properties, body):
        try:
            data = json.loads(body.decode().lstrip("\n\r"))
            print("Received " + str(data))

            conurl = process_and_get_url(data)

            print("check point 2")

            if conurl:
                notification_data = {
                    "usermail": data.get("usermail"),
                    "username": data.get("username"),
                    "fileurl": conurl,
                    "filename": data.get("filename"),
                }

                publish_to_notification_queue(notification_data)

                channel.basic_ack(delivery_tag=method.delivery_tag)
                print(
                    f"[Converted Service] Processed and acknowledged: {data.get('fileid')}"
                )
                print()
                print()

        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")

    channel.basic_consume(
        queue="file_uploaded", on_message_callback=on_message_callback
    )

    print("Waiting for messages:")
    print()

    channel.start_consuming()


def publish_to_notification_queue(data):
    notification_data = json.dumps(data)
    channel.queue_declare(queue="file_converted_notification")
    channel.basic_publish(
        exchange="", routing_key="file_converted_notification", body=notification_data
    )
    print("[Notification Service] Sent " + notification_data)


if __name__ == "__main__":
    try:
        consume_from_file_uploaded_queue()
    except KeyboardInterrupt:
        print("Keyboard Interrupted")
        try:
            sys.exit(0)
        except SystemExit:
            sys.exit(0)
