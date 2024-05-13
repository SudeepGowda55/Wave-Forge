package main

import (
	"Audio_Conversion-Microservice/authentication_service/auth"
	"Audio_Conversion-Microservice/authentication_service/database"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	gin.SetMode(gin.ReleaseMode)

	err := godotenv.Load()

	if err != nil {
		log.Fatal("Error loading .env file")
	}

	database.ConnectToDatabase()

	router := gin.Default()

	router.POST("/signup", auth.Signup)
	router.POST("/login", auth.Login)
	router.POST("/validate", auth.ValidateJWT)

	router.Run(":8001")
}
