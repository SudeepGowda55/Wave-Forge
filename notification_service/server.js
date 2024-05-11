const amqp = require("amqplib");

require("dotenv").config()

function sendMail(message){
    console.log(" [Notification Service] Received the message", message.content.toString())
}

async function connectToRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue("file_converted_notification", { durable: false });
        console.log(" [Notification Service] waiting for messages from the file_converted_notification queue");
        channel.consume("file_converted_notification", function(msg) {sendMail(msg)}, {noAck: true});
    } catch (error) {
        console.error(error)
    }
}

connectToRabbitMQ()