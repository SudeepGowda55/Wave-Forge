package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// Forward passes a JSON request straight to the same path on the authentication
// service and relays its status and body (used for /signup and /login).
func Forward(path string) gin.HandlerFunc {
	return func(contextProvider *gin.Context) {
		authenticationServiceUrl := fmt.Sprint(os.Getenv("AUTHENTICATION_SERVICE_URL"), path)

		resp, err := http.Post(authenticationServiceUrl, "application/json", contextProvider.Request.Body)

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

		contextProvider.Data(resp.StatusCode, "application/json", body)
	}
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
