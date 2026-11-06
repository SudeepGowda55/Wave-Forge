package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"

	"Audio_Conversion-Microservice/gateway-service/types"
)

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

	authenticationServiceUrl := fmt.Sprint(os.Getenv("AUTHENTICATION_SERVICE_URL"), "/signup")

	resp, err := http.Post(authenticationServiceUrl, "application/json", buffer)

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

	if resp.StatusCode != 201 {
		contextProvider.JSON(resp.StatusCode, string(body))
		return
	}

	token := string(body)
	jwtToken := strings.ReplaceAll(token, "\"", "")

	contextProvider.JSON(200, jwtToken)
}

// RequireAuth checks the "Authorization: Bearer <jwt>" header with the authentication
// service and stores the email from the token as "usermail" for the handler.
func RequireAuth() gin.HandlerFunc {
	return func(contextProvider *gin.Context) {
		jwtToken := strings.TrimPrefix(contextProvider.GetHeader("Authorization"), "Bearer ")

		if jwtToken == "" {
			contextProvider.AbortWithStatusJSON(401, "JWT Token is missing")
			return
		}

		authenticationServiceUrl := fmt.Sprint(os.Getenv("AUTHENTICATION_SERVICE_URL"), "/validate")

		req, _ := http.NewRequest("POST", authenticationServiceUrl, nil)
		req.Header.Set("JWTToken", jwtToken)

		resp, err := http.DefaultClient.Do(req)

		if err != nil {
			contextProvider.AbortWithStatusJSON(http.StatusInternalServerError, err.Error())
			return
		}

		defer resp.Body.Close()

		var result struct {
			Valid    bool   `json:"tokenvalidity"`
			UserMail string `json:"usermail"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || !result.Valid {
			contextProvider.AbortWithStatusJSON(401, "Invalid or expired JWT Token")
			return
		}

		contextProvider.Set("usermail", result.UserMail)
		contextProvider.Next()
	}
}
