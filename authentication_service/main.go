package main

import (
	"Audio_Conversion-Microservice/authentication_service/auth"
	"Audio_Conversion-Microservice/authentication_service/database"
	"Audio_Conversion-Microservice/authentication_service/utils"

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

	// optional: in Docker the variables come from the environment itself
	_ = godotenv.Load()

	database.ConnectToDatabase()

	router := gin.Default()

	router.Use(corsMiddleware())

	router.GET("/health", func(c *gin.Context) { c.Status(200) })
	router.POST("/signup", auth.Signup)
	router.POST("/login", auth.Login)
	router.POST("/validate", auth.ValidateJWT)
	router.POST("/fileentry", utils.FileEntry)
	router.POST("/getfiles", utils.GetFiles)
	router.POST("/updatefileurl", utils.UpdateFileUrl)
	router.POST("/updatestatus", utils.UpdateStatus)

	router.Run(":8001")
}
