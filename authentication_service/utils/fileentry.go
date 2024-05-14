package utils

import (
	"Audio_Conversion-Microservice/authentication_service/database"
	"Audio_Conversion-Microservice/authentication_service/types"

	"github.com/gin-gonic/gin"
)

func FileEntry(contextProvider *gin.Context) {
	var fileId types.FileId

	if err := contextProvider.BindJSON(&fileId); err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	_, err := database.Db.Exec("INSERT INTO userfiles (usermail, fileid, filename) VALUES ($1, $2, $3)", fileId.UserMail, fileId.FileId, fileId.FileName)

	if err != nil {
		contextProvider.IndentedJSON(500, err.Error())
		return
	} else {
		contextProvider.IndentedJSON(201, "File Info Entered Successfully")
		return
	}
}

func GetFiles(contextProvider *gin.Context) {
	userMail := contextProvider.GetHeader("usermail")

	rows, err := database.Db.Query("SELECT fileid, filename FROM userfiles WHERE usermail = $1", userMail)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	defer rows.Close()

	var filesList = []types.File{}

	for rows.Next() {
		var file types.File
		err := rows.Scan(&file.FileId, &file.FileName)

		if err != nil {
			contextProvider.JSON(500, err.Error())
			return
		}

		filesList = append(filesList, file)
	}

	contextProvider.JSON(200, filesList)
}
