package main

import (
	"io"
	"net/http"

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

func upload(contextProvider *gin.Context) {
	contextProvider.JSON(200, "UPLOAD")
}

func conversionCompleted(contextProvider *gin.Context) {
	contextProvider.JSON(200, "CONVERSION COMPLETED")
}

func download(contextProvider *gin.Context) {
	contextProvider.JSON(200, "DOWNLOAD")
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	router := gin.Default()

	router.POST("/login", login)
	router.POST("/signup", signup)
	router.POST("/upload", upload)
	router.GET("/conversioncompleted", conversionCompleted)
	router.POST("/download", download)

	router.Run(":8001")
}
