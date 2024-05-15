package main

import (
	"Audio_Conversion-Microservice/authentication_service/auth"
	"Audio_Conversion-Microservice/authentication_service/database"
	"Audio_Conversion-Microservice/authentication_service/utils"
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
	router.POST("/validate", auth.ValidateJWT)
	router.POST("/fileentry", utils.FileEntry)
	router.POST("/getfiles", utils.GetFiles)

	router.Run(":8001")
}
