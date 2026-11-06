package db

import (
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func GetFiles(contextProvider *gin.Context) {
	usermail := contextProvider.GetString("usermail")

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

	contextProvider.Data(res.StatusCode, "application/json", resData)
}
