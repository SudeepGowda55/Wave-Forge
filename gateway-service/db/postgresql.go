package db

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-gonic/gin"
)

func GetFiles(contextProvider *gin.Context) {
	usermail := contextProvider.GetHeader("usermail")

	if usermail == "" {
		contextProvider.JSON(http.StatusForbidden, "User Mail not specified")
		return
	}

	httpClient := &http.Client{}

	authenticationServiceUrl := fmt.Sprint(os.Getenv("AUTHENTICATION_SERVICE_URL"), "/getfiles")

	req, _ := http.NewRequest("POST", authenticationServiceUrl, nil)

	req.Header.Set("usermail", usermail)

	res, err := httpClient.Do(req)

	if err != nil {
		contextProvider.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	defer res.Body.Close()

	resData, err := io.ReadAll(res.Body)

	if err != nil {
		contextProvider.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	contextProvider.JSON(200, string(resData))
}

func UpdateFileUrl(contextProvider *gin.Context) {
	form := url.Values{
		"usermail": {contextProvider.PostForm("usermail")},
		"fileid":   {contextProvider.PostForm("fileid")},
		"fileurl":  {contextProvider.PostForm("fileurl")},
	}

	authenticationServiceUrl := fmt.Sprint(os.Getenv("AUTHENTICATION_SERVICE_URL"), "/updatefileurl")

	res, err := http.PostForm(authenticationServiceUrl, form)

	if err != nil {
		contextProvider.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	defer res.Body.Close()

	resData, err := io.ReadAll(res.Body)

	if err != nil {
		contextProvider.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	contextProvider.JSON(200, string(resData))
}
