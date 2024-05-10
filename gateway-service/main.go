package main

import (
	"io"
	"net/http"

	"Audio_Conversion-Microservice/gateway-service/db"
	"Audio_Conversion-Microservice/gateway-service/utils"

	"github.com/gin-gonic/gin"
)

func login(contextProvider *gin.Context) {

	resp, err := http.Post("http://172.17.0.2:8000/login", "application/json", nil)

	if err != nil {
		contextProvider.JSON(500, "INTERNAL SERVER ERROR")
	}

	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	contextProvider.JSON(200, string(body))
}

func signup(contextProvider *gin.Context) {
	contextProvider.JSON(200, "SIGNUP")
}

func conversionCompleted(contextProvider *gin.Context) {
	contextProvider.JSON(200, "CONVERSION COMPLETED")
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	utils.Loadenv()
	db.Connection()
	db.CreateBucket()

	router := gin.Default()

	router.POST("/login", login)
	router.POST("/signup", signup)
	router.POST("/upload", db.UploadFile)
	router.GET("/conversioncompleted", conversionCompleted)
	router.POST("/download/:id", db.DownloadFile)

	router.Run(":8001")
}
