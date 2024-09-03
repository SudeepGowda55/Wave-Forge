FROM golang:latest

WORKDIR /app

COPY . .

RUN go mod download
RUN go build -o main

EXPOSE 8001

CMD [ "./main", "&", "sleep", "infinity" ]