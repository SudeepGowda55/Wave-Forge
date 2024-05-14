package auth

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"Audio_Conversion-Microservice/gateway-service/types"
)

func Login(contextProvider *gin.Context) {
	var userLoginData types.UserLoginData

	if err := contextProvider.BindJSON(&userLoginData); err != nil {
		contextProvider.JSON(400, err.Error())
		return
	}

	jsonData, err := json.Marshal(userLoginData)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	buf := new(bytes.Buffer)

	_, _ = buf.Write(jsonData)

	resp, err := http.Post("http://localhost:8001/login", "application/json", buf)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	token := string(body)
	jwtToken := strings.ReplaceAll(token, "\"", "")

	contextProvider.JSON(200, jwtToken)
}

func Signup(contextProvider *gin.Context) {
	var signupData types.UserSignupData

	if err := contextProvider.BindJSON(&signupData); err != nil {
		contextProvider.JSON(400, err.Error())
		return
	}

	jsonData, err := json.Marshal(signupData)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	buffer := new(bytes.Buffer)

	_, _ = buffer.Write(jsonData)

	resp, err := http.Post("http://localhost:8001/signup", "application/json", buffer)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	response := string(body)
	resMessage := strings.ReplaceAll(response, "\"", "")

	contextProvider.JSON(200, resMessage)
}

func ValidateJWT(contextProvider *gin.Context) {

	jwtToken := contextProvider.GetHeader("JWTToken")

	if jwtToken == "" {
		contextProvider.JSON(400, "JWT Token is missing")
		return
	}

	httpClient := &http.Client{}

	req, _ := http.NewRequest("POST", "http://localhost:8001/validate", nil)
	req.Header.Set("JWTToken", jwtToken)

	resp, err := httpClient.Do(req)

	if err != nil {
		contextProvider.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	respData, err := io.ReadAll(resp.Body)

	defer resp.Body.Close()

	if err != nil {
		contextProvider.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	response := string(respData)
	resMessage := strings.ReplaceAll(response, "\"", "")

	contextProvider.JSON(200, resMessage)
}
