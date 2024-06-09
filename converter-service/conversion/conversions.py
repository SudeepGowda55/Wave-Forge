from connections import mongodb, cloudinary
import tempfile, dotenv, pydub
import cloudinary.uploader as uploader
from bson.objectid import ObjectId

dotenv.load_dotenv()

gridfs_bucket = mongodb.connect_to_mongodb()
cloudinary = cloudinary.cloudinary_connection

def convert_video_to_audio(conversion_type, file_name, file_id):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
        try:
            data = gridfs_bucket.download_to_stream(ObjectId(file_id), temp_file)
            temp_file.seek(0) 

            if conversion_type.lower() == "mp4_to_wav":
                audio_clip = pydub.AudioSegment.from_file_using_temporary_files(
                    temp_file
                )
                audio_clip.export(temp_file.name, format="wav")

                with open(temp_file.name, "rb") as f:
                    response = uploader.upload(
                        f, resource_type="auto", public_id=file_name
                    )
                    url = response["url"]
                    print(f"Uploaded audio URL: {url}")
                    return url

            if conversion_type.lower() == "mp4_to_mp3":
                audio_clip = pydub.AudioSegment.from_file_using_temporary_files(
                    temp_file
                )
                audio_clip.export(temp_file.name, format="mp3")

                with open(temp_file.name, "rb") as f:
                    response = uploader.upload(
                        f, resource_type="auto", public_id=file_name
                    )
                    url = response["url"]
                    print(f"Uploaded audio URL: {url}")
                    return url

        except Exception as e:
            print(f"Error converting or uploading audio: {e}")
            return None
        finally:
            temp_file.close()


def change_audio_sampling_rate_wav(sampling_rate, file_name, file_id):
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        try:
            data = gridfs_bucket.download_to_stream(ObjectId(file_id), temp_file)
            temp_file.seek(0)

            audio_clip = pydub.AudioSegment.from_file_using_temporary_files(temp_file)
            audio = audio_clip.set_frame_rate(sampling_rate)

            with tempfile.NamedTemporaryFile(delete=False) as temp_upload_file:
                audio.export(temp_upload_file, format="wav")
                response = uploader.upload(
                    temp_upload_file, resource_type="auto", public_id=file_name
                )
                url = response["url"]
                print(f"Uploaded audio url with changed sampling rate(wav): {url}")
                return url

        except Exception as e:
            print(f"Error converting or uploading audio: {e}")
            return None

        finally:
            temp_file.close()


def change_audio_sampling_rate_mp3(sampling_rate, file_name, file_id):
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        try:
            data = gridfs_bucket.download_to_stream(ObjectId(file_id), temp_file)
            temp_file.seek(0)

            audio_clip = pydub.AudioSegment.from_file_using_temporary_files(temp_file)
            audio = audio_clip.set_frame_rate(sampling_rate)

            with tempfile.NamedTemporaryFile(delete=False) as temp_upload_file:
                audio.export(temp_upload_file, format="mp3")
                response = uploader.upload(
                    temp_upload_file, resource_type="auto", public_id=file_name
                )
                url = response["url"]
                print(f"Uploaded audio url with changed sampling rate(mp3): {url}")
                return url

        except Exception as e:
            print(f"Error converting or uploading audio: {e}")
            return None

        finally:
            temp_file.close()
            temp_upload_file.close()


def change_audio_sampling_rate(sampling_rate, file_id, file_name):
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        try:
            data = gridfs_bucket.download_to_stream(ObjectId(file_id), temp_file)
            temp_file.seek(0)

            audio_clip = pydub.AudioSegment.from_file_using_temporary_files(temp_file)
            audio = audio_clip.set_frame_rate(sampling_rate)

            if file_name.lower == "wav":
                with tempfile.NamedTemporaryFile(delete=False) as temp_upload_file:
                    audio.export(temp_upload_file, format="wav")
                    response = uploader.upload(
                        temp_upload_file, resource_type="auto", public_id=file_name
                    )
                    url = response["url"]
                    print(f"Audio url with changed sampling rate: {url}")
                    return url

            elif file_name.lower == "mp3":
                with tempfile.NamedTemporaryFile(delete=False) as temp_upload_file:
                    audio.export(temp_upload_file.name, format="mp3")
                    response = uploader.upload(
                        temp_upload_file, resource_type="auto", public_id=file_name
                    )
                    url = response["url"]
                    print(f"Audio url with changed samplin rate: {url}")
                    return url

            else:
                print("Invalid format chosen")

        except Exception as e:
            print(f"An error occurred during conversion: {e}")
            return None

        finally:
            temp_file.close()
            temp_upload_file.close()


def convert_wav_to_mp3(file_name, file_id):
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        try:
            data = gridfs_bucket.download_to_stream(ObjectId(file_id), temp_file)
            temp_file.seek(0)

            audio_clip = pydub.AudioSegment.from_file_using_temporary_files(temp_file)
            audio_clip.export(temp_file, format="mp3")
            response = uploader.upload(
                temp_file, resource_type="auto", public_id=file_name
            )
            url = response["url"]
            print(f"Converted url from wav to mp3: {url}")
            return url

        except Exception as e:
            print(f"An error occurred during conversion: {e}")
            return None

        finally:
            temp_file.close()


def convert_mp3_to_wav(file_name, file_id):
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        try:
            data = gridfs_bucket.download_to_stream(ObjectId(file_id), temp_file)
            temp_file.seek(0)

            audio_clip = pydub.AudioSegment.from_file_using_temporary_files(temp_file)
            audio_clip.export(temp_file, format="wav")
            response = uploader.upload(
                temp_file, resource_type="auto", public_id=file_name
            )
            url = response["url"]
            print(f"Converted url from mp3 to wav: {url}")
            return url

        except Exception as e:
            print(f"An error occurred during conversion: {e}")
            return None

        finally:
            temp_file.close()
