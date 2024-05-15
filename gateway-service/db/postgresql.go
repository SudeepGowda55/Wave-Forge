package db

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetFiles(contextProvider *gin.Context) {
	usermail := contextProvider.GetHeader("usermail")

	if usermail == "" {
		contextProvider.JSON(http.StatusForbidden, "User Mail not specified")
		return
	}

	httpClient := &http.Client{}

	req, _ := http.NewRequest("POST", "http://172.17.0.3:8001/getfiles", nil)

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
