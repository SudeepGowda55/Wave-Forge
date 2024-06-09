FROM python:latest

RUN apt update
RUN apt install -y ffmpeg

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt

CMD ["python", "-u", "main.py"]