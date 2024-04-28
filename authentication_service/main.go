package main

import (
	"Audio_Conversion-Microservice/authentication_service/database"
	"Audio_Conversion-Microservice/authentication_service/database/models"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func createJWT() {
	println("createJWT")
}

func signup(context *gin.Context) {
	var userdata = models.UserLogin{}
	context.BindJSON(&userdata)

	result, err := database.Db.Exec("INSERT INTO users (username, password) VALUES ($1, $2)", userdata.Username, userdata.Password)

	if err != nil {
		fmt.Println(err)
		context.IndentedJSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
	} else {
		fmt.Println(result)
		context.IndentedJSON(http.StatusOK, "User Created Successfully")
	}
}

func login(context *gin.Context) {
	createJWT()
	context.IndentedJSON(http.StatusOK, gin.H{"message": "login"})
}

func validatejwt(context *gin.Context) {
	context.IndentedJSON(http.StatusOK, gin.H{"message": "validatejwt"})
}

func loadenv() {
	err := godotenv.Load()

	if err != nil {
		log.Fatal("Error loading .env file")
	}
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	loadenv()
	database.ConnectToDatabase()

	var _ = database.Db

	router := gin.Default()

	router.POST("/signup", signup)
	router.POST("/login", login)
	router.POST("/validate", validatejwt)

	router.Run(":8000")
}
