FROM golang:1.22 AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /main

# static binary on a ~2 MB base that still has CA certificates for TLS to Atlas and CloudAMQP
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /main /main

EXPOSE 8000

CMD ["/main"]
