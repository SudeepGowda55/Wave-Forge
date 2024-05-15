package rabbitmq

import (
	"log"
	"os"

	amqp "github.com/rabbitmq/amqp091-go"
)

var RabbitMQChannel *amqp.Channel

func ConnectToRabbitMQ() {
	conn, err := amqp.Dial(os.Getenv("RABBITMQ_URL"))

	if err != nil {
		log.Fatalln(err.Error())
	}

	channel, err := conn.Channel()

	if err != nil {
		log.Fatalln(err.Error())
	}

	_, err = channel.QueueDeclare(
		"file_uploaded",
		false,
		false,
		false,
		false,
		nil,
	)

	if err != nil {
		log.Fatalln(err.Error())
	}

	RabbitMQChannel = channel
}
