package auth

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"Audio_Conversion-Microservice/gateway-service/types"
)

func Login(contextProvider *gin.Context) {
	var userLoginData types.UserLoginData

	if err := contextProvider.BindJSON(&userLoginData); err != nil {
		contextProvider.JSON(400, "BAD REQUEST")
		return
	}

	jsonData, err := json.Marshal(userLoginData)

	if err != nil {
		contextProvider.JSON(500, "INTERNAL SERVER ERROR")
		return
	}

	buf := new(bytes.Buffer)

	_, _ = buf.Write(jsonData)

	resp, err := http.Post("http://localhost:8001/login", "application/json", buf)

	if err != nil {
		contextProvider.JSON(500, "INTERNAL SERVER ERROR")
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)

	if err != nil {
		contextProvider.JSON(500, "INTERNAL SERVER ERROR")
		return
	}

	contextProvider.JSON(200, string(body))
}

func Signup(contextProvider *gin.Context) {
	var signupData types.UserSignupData

	if err := contextProvider.BindJSON(&signupData); err != nil {
		contextProvider.JSON(400, "BAD REQUEST")
		return
	}

	jsonData, err := json.Marshal(signupData)

	if err != nil {
		contextProvider.JSON(500, "INTERNAL SERVER ERROR")
		return
	}

	buffer := new(bytes.Buffer)

	_, _ = buffer.Write(jsonData)

	resp, err := http.Post("http://localhost:8001/signup", "application/json", buffer)

	if err != nil {
		contextProvider.JSON(500, "INTERNAL SERVER ERROR")
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)

	if err != nil {
		contextProvider.JSON(500, "INTERNAL SERVER ERROR")
		return
	}

	contextProvider.JSON(200, string(body))
}

func ValidateJWT(contextProvider *gin.Context) {
	contextProvider.JSON(200, "VALIDATE JWT")
}
