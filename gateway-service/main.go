package main

import (
	"Audio_Conversion-Microservice/gateway-service/auth"
	"Audio_Conversion-Microservice/gateway-service/db"
	"Audio_Conversion-Microservice/gateway-service/rabbitmq"
	"Audio_Conversion-Microservice/gateway-service/utils"

	"github.com/gin-gonic/gin"
)

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	utils.Loadenv()

	db.Connection()
	db.CreateBucket()

	rabbitmq.ConnectToRabbitMQ()

	router := gin.Default()

	router.Use(corsMiddleware())

	router.POST("/signup", auth.Signup)
	router.POST("/validatejwt", auth.ValidateJWT)
	router.POST("/updatefileurl", db.UpdateFileUrl)
	router.POST("/upload", db.UploadFile)
	router.POST("/getfiles", db.GetFiles)

	router.Run(":8000")
}
