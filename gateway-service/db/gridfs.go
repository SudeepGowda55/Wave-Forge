package db

import (
	"bytes"
	"fmt"
	"io"
	"os"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var gridfsBucket *gridfs.Bucket

func CreateBucket() {
	bucket, err := gridfs.NewBucket(MongodbClient.Database(os.Getenv("MONGODB_DATABASE")), options.GridFSBucket().SetName("gridfsbucket"))

	if err != nil {
		fmt.Println(err.Error())
	}

	gridfsBucket = bucket
}

func UploadFile(contextProvider *gin.Context) {
	file, fileMetadata, err := contextProvider.Request.FormFile("sourcefile")

	if err != nil {
		contextProvider.JSON(500, err.Error())
	}

	userID := options.GridFSUpload().SetMetadata(bson.D{{Key: "userid", Value: "sudeep@gmail.com"}})

	objectID, err := gridfsBucket.UploadFromStream(fileMetadata.Filename, io.Reader(file), userID)

	if err != nil {
		contextProvider.JSON(500, err.Error())
	}

	contextProvider.JSON(201, "File Successfully Uploaded with the ObjectID: "+objectID.String())
}

// No need of this

// func FindFileName(contextProvider *gin.Context) string {
// 	filter := bson.D{{Key: "metadata", Value: bson.D{{Key: "userid", Value: "sudeep@gmail.com"}}}}

// 	cursor, err := gridfsBucket.Find(filter)

// 	if err != nil {
// 		contextProvider.JSON(500, "FILE NOT FOUND")
// 		// return
// 	}

// 	var files []types.GridfsFile

// 	if err = cursor.All(context.TODO(), &files); err != nil {
// 		contextProvider.JSON(500, "INTERNAL SERVER ERROR, FILE NOT FOUND")
// 	}

// 	for _, file := range files {
// 		return file.FileName
// 	}

// 	return "filename"
// }

func DownloadFile(contextProvider *gin.Context) {
	id := contextProvider.Param("id")
	objId, err := primitive.ObjectIDFromHex(id)

	if err != nil {
		contextProvider.JSON(500, "INVALID OBJECT ID")
	}

	buffer := new(bytes.Buffer)

	if _, err := gridfsBucket.DownloadToStream(objId, buffer); err != nil {
		contextProvider.JSON(500, "FILE NOT FOUND")
	}

	// filename := FindFileName(contextProvider)

	// contextProvider.JSON(200, filename)
	// contextProvider.Data(200, "file Data", buffer.Bytes())
}

func DeleteFile(contextProvider *gin.Context) {
	id := contextProvider.Param("id")
	objId, err := primitive.ObjectIDFromHex(id)

	if err != nil {
		contextProvider.JSON(500, "INVALID OBJECT ID")
	}

	if err := gridfsBucket.Delete(objId); err != nil {
		contextProvider.JSON(500, "FILE NOT DELETED")
	}

	contextProvider.JSON(200, "FILE DELETED SUCCESSFULLY")
}

func ConversionCompleted(contextProvider *gin.Context) {
	contextProvider.JSON(200, "CONVERSION COMPLETED")
}
