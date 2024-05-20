package db

import (
	"Audio_Conversion-Microservice/gateway-service/rabbitmq"
	"Audio_Conversion-Microservice/gateway-service/types"
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/rabbitmq/amqp091-go"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var gridfsBucket *gridfs.Bucket

func CreateBucket() {
	bucket, err := gridfs.NewBucket(MongodbClient.Database(os.Getenv("MONGODB_DATABASE")), options.GridFSBucket().SetName("gridfsbucket"))

	if err != nil {
		log.Fatalln(err.Error())
		return
	}

	gridfsBucket = bucket
}

// curl -X POST -F 'usermail=ssudeepgowda55@gmail.com' -F 'firstname=Sudeep' -F 'sourcefile=@/home/sudeep/dog.mp4' http://localhost:8000/upload

func UploadFile(contextProvider *gin.Context) {
	file, fileMetadata, err := contextProvider.Request.FormFile("sourcefile")

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	userID := options.GridFSUpload().SetMetadata(bson.D{{Key: "userid", Value: contextProvider.PostForm("usermail")}})

	objectID, err := gridfsBucket.UploadFromStream(fileMetadata.Filename, io.Reader(file), userID)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	var fileEntryData = types.FileEntry{
		UserMail:        contextProvider.PostForm("usermail"),
		FileId:          objectID.String(),
		FileName:        fileMetadata.Filename,
		DestAudioFormat: contextProvider.PostForm("destaudioformat"),
		SamplingRate:    contextProvider.PostForm("samplingrate"),
	}

	fileEntryDataJSON, _ := json.Marshal(fileEntryData)

	buf := new(bytes.Buffer)

	_, _ = buf.Write(fileEntryDataJSON)

	httpClient := &http.Client{}

	req, err := http.NewRequest("POST", "http://172.17.0.3:8001/fileentry", buf)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	res, err := httpClient.Do(req)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	if res.StatusCode != 201 {
		contextProvider.JSON(500, "Error in File Data Entry")
		return
	}

	var fileUploadedMessage = types.FileUploadedMessage{
		UserMail:        contextProvider.PostForm("usermail"),
		FileName:        fileMetadata.Filename,
		FileID:          objectID.String(),
		UserName:        contextProvider.PostForm("firstname"),
		DestAudioFormat: contextProvider.PostForm("destaudioformat"),
		SamplingRate:    contextProvider.PostForm("samplingrate"),
	}

	jsonData, _ := json.Marshal(fileUploadedMessage)

	errr := rabbitmq.RabbitMQChannel.Publish(
		"",
		"file_uploaded",
		false,
		false,
		amqp091.Publishing{
			ContentType: "text/plain",
			Body:        jsonData,
		},
	)

	if errr != nil {
		contextProvider.JSON(500, errr.Error())
		return
	}

	contextProvider.JSON(201, "File Successfully Uploaded with the ObjectID: "+objectID.String())
}
