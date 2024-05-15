const amqp = require("amqplib");
const mailGun = require("mailgun.js");
const formData = require("form-data");

require("dotenv").config()

const mg = new mailGun(formData);

const mailgunClient = mg.client({ username: "api", key: process.env.MAILGUN_API_KEY });

async function sendMail(message) {
    try {
        const response = await mailgunClient.messages.create(process.env.MAILGUN_DOMAIN_NAME, {
            from: "Matcrypt <noreply@matcrypt.live>",
            to: [message.usermail],
            subject: "Audio Conversion Successful!",
            text: `Your File ${message.filename} has been successfully converted ${message.username}! You can download it using this File URL ${message.fileurl} or by Login into your account`,
            // html: "<h1>Testing some Mailgun awesomeness!</h1>"
        })
        return response.status
    } catch (error) {
        console.error(error)
    }
}

async function connectToRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue("file_converted_notification", { durable: false });
        console.log(" [Notification Service] waiting for messages from the file_converted_notification queue");
        channel.consume("file_converted_notification", async message => {
            const response = await sendMail(JSON.parse(message.content.toString()))
            if (response === 200){
                channel.ack(message)
                console.log(" [Notification Service] Mail sent successfully")
            }
        });
    } catch (error) {
        console.error(error)
    }
}

connectToRabbitMQ()