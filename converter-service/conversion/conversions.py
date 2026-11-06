import os, tempfile, pydub
from bson.objectid import ObjectId
from connections import mongodb
import connections.cloudinary  # configures the cloudinary SDK from env
import cloudinary.uploader as uploader

gridfs_bucket = mongodb.connect_to_mongodb()


def convert(file_id, file_name, dest_format, sampling_rate=None):
    """Download the GridFS file, export it as dest_format (optionally re-sampled),
    upload to Cloudinary and return the https URL. Raises on any failure."""
    with tempfile.TemporaryDirectory() as workdir:
        source = os.path.join(workdir, "source")
        with open(source, "wb") as f:
            gridfs_bucket.download_to_stream(ObjectId(file_id), f)

        audio = pydub.AudioSegment.from_file(source)
        if sampling_rate:
            audio = audio.set_frame_rate(sampling_rate)

        output = os.path.join(workdir, f"output.{dest_format}")
        audio.export(output, format=dest_format)

        # the GridFS id in the public_id keeps two uploads named the same from overwriting each other
        response = uploader.upload(output, resource_type="video", public_id=f"{file_id}_{file_name}")
        return response["secure_url"]
