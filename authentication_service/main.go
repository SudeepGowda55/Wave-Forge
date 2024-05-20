package main

import (
	"Audio_Conversion-Microservice/authentication_service/auth"
	"Audio_Conversion-Microservice/authentication_service/database"
	"Audio_Conversion-Microservice/authentication_service/utils"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
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

	err := godotenv.Load()

	if err != nil {
		log.Fatal("Error loading .env file")
	}

	database.ConnectToDatabase()

	router := gin.Default()

	router.Use(corsMiddleware())

	router.POST("/signup", auth.Signup)
	router.POST("/validate", auth.ValidateJWT)
	router.POST("/fileentry", utils.FileEntry)
	router.POST("/getfiles", utils.GetFiles)
	router.POST("/updatefileurl", utils.UpdateFileUrl)

	router.Run(":8001")
}
