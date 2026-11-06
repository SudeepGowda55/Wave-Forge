FROM python:3.12-slim

# same first layers as converter-service, so Docker reuses the cached ffmpeg install
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8002

CMD ["python", "-u", "main.py"]
