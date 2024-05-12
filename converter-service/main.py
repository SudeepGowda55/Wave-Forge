import io
import os
import pika
import json
from pydub import AudioSegment
from moviepy.editor import VideoFileClip
from pymongo import MongoClient
from gridfs import GridFS
from bson import ObjectId

# Establish connection to RabbitMQ server
connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBITMQ_URL")))
channel = connection.channel()

# Declare the queue
channel.queue_declare(queue='file_uploaded')

def connect_to_mongodb():
    client = MongoClient('mongodb_connection_url') 
    #this should be fetched from the dashboard of mongodb
    db = client['audio-conversion']
    fs = GridFS(db)
    return fs

def push_to_mongodb(audio_data, fs, file_id):
    fs.put(audio_data, filename=f"{file_id}.mp3")
    print("Output file pushed to MongoDB GridFS.")


def convert_video_to_audio(email, conversion_type , file_id):
    fs = connect_to_mongodb()
    video_file = fs.find_one({'_id':ObjectId(file_id)})
    
    if not video_file:
        print(f"Error:Video file with file_id {file_id} not found")
        return

    video_bytes =  video_file.read()
    if conversion_type.lower() == 'mp3_to_wav':
        audio_clip = video_bytes.audio()
        audio_data = audio_clip.write_to_memory(format="mp3")
        push_to_mongodb(audio_data,fs,file_id)
        #if this doesnt work we'll use video_file
        print("Conversion successful. Output file pushed to MongoDB GridFS.")
    elif conversion_type.lower() == 'wav_to_mp3':
        audio_clip = video_bytes.audio()
        audio_data = audio_clip.write_to_memory(format="wav")
        push_to_mongodb(audio_data,fs,file_id)
        #if this doesnt work we'll use video_file
        print("Conversion successful. Output file pushed to MongoDB GridFS.")
    else:
        print("Error: Unsupported output format. Please choose either 'mp3'  or 'wav'.")
        return
        #not returning anything now add email or file_id based on the requirements

def change_audio_sampling_rate(email,sampling_rate,file_id):
    fs = connect_to_mongodb()
    audio_file = fs.find_one({'_id':ObjectId(file_id)})

    if not audio_file:
        print("Error: Audio file not found")
        return
    
    audio_bytes = audio_file.read()
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes))

    if sampling_rate == 'custom':
        custom_sampling_rate = input("Enter the custom sampling rate in Hz: ")
        try:
            sampling_rate = int(custom_sampling_rate)
        except ValueError:
            print("Error: Invalid sampling rate. Please enter a valid number.")
            return
    elif sampling_rate == 'ai':
        sampling_rate = 22050  # Fixed 22.5KHz for AI use
    else:
        try:
            sampling_rate = int(sampling_rate)
        except ValueError:
            print("Error: Invalid sampling rate. Please enter a valid number or 'custom' or 'ai'.")
            return
        
    audio = audio.set_frame_rate(sampling_rate)
    output_file = io.BytesIO()
    audio.export(output_file, format="wav")
    new_file_id = ObjectId()

    fs.put(output_file.getvalue(), filename=f"{new_file_id}.wav")

    print(f"Conversion successful. Output file saved to the database with file_id {new_file_id}")
    return new_file_id

def convert_wav_to_mp3(email, file_id):
    fs = connect_to_mongodb()
    audio_file = fs.find_one({'_id':ObjectId(file_id)})

    if not audio_file:
        print("Error: Audio file not found")
        return
    
    audio_bytes = audio_file.read()
    audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    output_file_name = f"{file_id}.mp3"

    output_audio_bytes = io.BytesIO()
    audio.export(output_audio_bytes, format="mp3")

    new_file_id = ObjectId()

    fs.put(output_audio_bytes.getvalue(), filename=output_file_name)
    print(f"Conversion successful. Output file saved to the database with file_id {new_file_id}")
    return new_file_id

def convert_mp3_to_wav(email, file_id):
    fs = connect_to_mongodb()
    audio_file = fs.find_one({'_id':ObjectId(file_id)})

    if not audio_file:
        print("Error: Audio file not found")
        return
    
    audio_bytes = audio_file.read()
    audio = AudioSegment.from_wav(io.BytesIO(audio_bytes))
    output_file_name = f"{file_id}.wav"

    output_audio_bytes = io.BytesIO()
    audio.export(output_audio_bytes, format="wav")

    new_file_id = ObjectId()

    fs.put(output_audio_bytes.getvalue(), filename=output_file_name)
    print(f"Conversion successful. Output file saved to the database with file_id {new_file_id}")
    return new_file_id
    
    
def callback(ch, method, properties, body):
    # Process incoming messages
    data = json.loads(body)
    email = data.get('email')
    sampling_rate = data.get('sampling_rate')
    conversion_type = data.get('conversion_type')
    file_id = data.get('file_id')

    # Perform the conversion
    convert_video_to_audio(email, conversion_type, file_id)
    #Change the Sampling rate
    change_audio_sampling_rate(email, sampling_rate, file_id)
    # Acknowledge the message
    ch.basic_ack(delivery_tag=method.delivery_tag)

# Listen for messages
channel.basic_consume(queue='conversion_requests', on_message_callback=callback)

print("Waiting for conversion requests...")
channel.start_consuming()
