package main

import (
	"net/http/httputil"
	"net/url"
	"os"

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

	router.GET("/health", func(c *gin.Context) { c.Status(200) })
	router.POST("/signup", auth.Forward("/signup"))
	router.POST("/login", auth.Forward("/login"))
	router.POST("/upload", auth.RequireAuth(), db.UploadFile)
	router.POST("/getfiles", auth.RequireAuth(), db.GetFiles)

	// /ai/* goes to the internal AI service with the caller's email taken from the verified token
	aiURL, _ := url.Parse(os.Getenv("AI_SERVICE_URL"))
	aiProxy := httputil.NewSingleHostReverseProxy(aiURL)
	// public showcase: no token, and the AI service picks the demo account itself
	router.GET("/demo", func(c *gin.Context) {
		c.Request.URL.Path = "/ai/demo"
		c.Request.Header.Del("usermail")
		aiProxy.ServeHTTP(c.Writer, c.Request)
	})
	router.Any("/ai/*path", auth.RequireAuth(), func(c *gin.Context) {
		c.Request.Header.Del("Authorization")
		c.Request.Header.Set("usermail", c.GetString("usermail"))
		aiProxy.ServeHTTP(c.Writer, c.Request)
	})

	router.Run(":8000")
}
