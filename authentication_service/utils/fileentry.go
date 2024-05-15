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

	_, err := database.Db.Exec("INSERT INTO userfiles (usermail, fileid, filename, fileurl) VALUES ($1, $2, $3, $4)", fileId.UserMail, fileId.FileId, fileId.FileName, "n/a")

	if err != nil {
		contextProvider.IndentedJSON(500, err.Error())
		return
	} else {
		contextProvider.IndentedJSON(201, "File Info Entered Successfully")
		return
	}
}

func UpdateFileUrl(contextProvider *gin.Context) {
	fileUrl := contextProvider.PostForm("fileurl")

	if fileUrl == "" {
		contextProvider.JSON(400, "File URL not specified")
		return
	}

	_, err := database.Db.Exec("UPDATE userfiles SET fileurl = $1 WHERE usermail = $2 AND fileid = $3", fileUrl, contextProvider.PostForm("usermail"), contextProvider.PostForm("fileid"))

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

	if userMail == "" {
		contextProvider.JSON(403, "User Mail not specified")
		return
	}

	rows, err := database.Db.Query("SELECT fileid, filename, fileurl FROM userfiles WHERE usermail = $1", userMail)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	defer rows.Close()

	var filesList = []types.File{}

	for rows.Next() {
		var file types.File

		err := rows.Scan(&file.FileId, &file.FileName, &file.FileUrl)

		if err != nil {
			contextProvider.JSON(500, err.Error())
			return
		}

		filesList = append(filesList, file)
	}

	contextProvider.JSON(200, filesList)
}
