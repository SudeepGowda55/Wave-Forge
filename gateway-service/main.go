package main

import (
	"Audio_Conversion-Microservice/gateway-service/auth"
	"Audio_Conversion-Microservice/gateway-service/db"
	"Audio_Conversion-Microservice/gateway-service/rabbitmq"
	"Audio_Conversion-Microservice/gateway-service/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)

	utils.Loadenv()
	db.Connection()
	db.CreateBucket()

	rabbitmq.ConnectToRabbitMQ()

	router := gin.Default()

	router.POST("/signup", auth.Signup)
	router.POST("/validatejwt", auth.ValidateJWT)
	router.POST("/upload", db.UploadFile)
	router.POST("/getfiles", db.GetFiles)

	router.Run(":8000")
}
