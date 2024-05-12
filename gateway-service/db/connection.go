package db

import (
	"context"
	"fmt"
	"os"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var MongodbClient *mongo.Client

func Connection() {
	connectionString := fmt.Sprint("mongodb+srv://", os.Getenv("MONGODB_USERNAME"), ":", os.Getenv("MONGODB_PASSWORD"), "@audioconversion.wr8azuc.mongodb.net/?retryWrites=true&w=majority&appName=", os.Getenv("MONGODB_APPNAME"))

	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(connectionString).SetServerAPIOptions(serverAPI)

	client, err := mongo.Connect(context.TODO(), opts)

	if err != nil {
		panic(err)
	}

	MongodbClient = client

	fmt.Println("Connected to MongoDB successfully!")
}

func ConversionCompleted(contextProvider *gin.Context) {
	contextProvider.JSON(200, "CONVERSION COMPLETED")
}
