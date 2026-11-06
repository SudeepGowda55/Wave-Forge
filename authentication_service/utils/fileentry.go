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

	_, err := database.Db.Exec("INSERT INTO userfiles (usermail, fileid, filename, fileurl, destaudioformat, samplingrate) VALUES ($1, $2, $3, $4, $5, $6)", fileId.UserMail, fileId.FileId, fileId.FileName, "n/a", fileId.DestAudioFormat, fileId.SamplingRate)

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
	status := contextProvider.DefaultPostForm("status", "converted")

	if fileUrl == "" {
		contextProvider.JSON(400, "File URL not specified")
		return
	}

	_, err := database.Db.Exec("UPDATE userfiles SET fileurl = $1, status = $2 WHERE usermail = $3 AND fileid = $4", fileUrl, status, contextProvider.PostForm("usermail"), contextProvider.PostForm("fileid"))

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

	rows, err := database.Db.Query("SELECT fileid, filename, fileurl, destaudioformat, samplingrate, status FROM userfiles WHERE usermail = $1 ORDER BY created_at DESC", userMail)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	defer rows.Close()

	var filesList = []types.File{}

	for rows.Next() {
		var file types.File

		err := rows.Scan(&file.FileId, &file.FileName, &file.FileUrl, &file.DestAudioFormat, &file.SamplingRate, &file.Status)

		if err != nil {
			contextProvider.JSON(500, err.Error())
			return
		}

		filesList = append(filesList, file)
	}

	contextProvider.JSON(200, filesList)
}

// UpdateStatus lets the converter and AI workers move a file through
// queued -> converting -> converted -> transcribing -> done | failed.
func UpdateStatus(contextProvider *gin.Context) {
	status := contextProvider.PostForm("status")

	if status == "" {
		contextProvider.JSON(400, "status not specified")
		return
	}

	_, err := database.Db.Exec("UPDATE userfiles SET status = $1 WHERE fileid = $2", status, contextProvider.PostForm("fileid"))

	if err != nil {
		contextProvider.IndentedJSON(500, err.Error())
		return
	}

	contextProvider.IndentedJSON(200, "Status updated")
}
