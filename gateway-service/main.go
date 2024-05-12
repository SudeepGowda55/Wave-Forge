package main

import (
	"Audio_Conversion-Microservice/gateway-service/auth"
	"Audio_Conversion-Microservice/gateway-service/db"
	"Audio_Conversion-Microservice/gateway-service/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)

	utils.Loadenv()
	db.Connection()
	db.CreateBucket()

	router := gin.Default()

	router.POST("/login", auth.Login)
	router.POST("/signup", auth.Signup)
	router.POST("/upload", db.UploadFile)
	router.POST("/validatejwt", auth.ValidateJWT)
	router.GET("/conversioncompleted", db.ConversionCompleted)
	router.POST("/download/:id", db.DownloadFile)

	router.Run(":8000")
}
