package auth

import (
	"Audio_Conversion-Microservice/authentication_service/database"
	"Audio_Conversion-Microservice/authentication_service/types"
	"errors"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func createJWT(userData types.UserSignup) string {

	payload := types.JWTPayload{
		CustomClaims: userData.UserMail,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24 * 30)),
			Issuer:    "Sudeep Gowda",
		},
	}

	signingKey := []byte(os.Getenv("JWT_PRIVATE_KEY"))

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, payload)
	accessToken, err := jwtToken.SignedString(signingKey)

	if err != nil {
		return err.Error()
	} else {
		return accessToken
	}
}

// Signup doubles as login: there is no password, so signing up again with the same
// email just refreshes the name and hands back a new token.
func Signup(contextProvider *gin.Context) {
	var userdata = types.UserSignup{}

	if err := contextProvider.BindJSON(&userdata); err != nil {
		contextProvider.IndentedJSON(http.StatusBadRequest, err.Error())
		return
	}

	if userdata.UserMail == "" || userdata.FirstName == "" {
		contextProvider.IndentedJSON(http.StatusBadRequest, "usermail and firstname are required")
		return
	}

	_, err := database.Db.Exec("INSERT INTO users (firstname, username, usermail) VALUES ($1, $2, $3) ON CONFLICT (usermail) DO UPDATE SET firstname = EXCLUDED.firstname, username = EXCLUDED.username", userdata.FirstName, userdata.UserName, userdata.UserMail)

	if err != nil {
		contextProvider.IndentedJSON(http.StatusInternalServerError, err.Error())
		return
	} else {
		jwtToken := createJWT(userdata)
		contextProvider.IndentedJSON(http.StatusCreated, jwtToken)
	}
}

func ValidateJWT(contextProvider *gin.Context) {
	jwtToken := contextProvider.GetHeader("JWTToken")

	claims := &types.JWTPayload{}

	token, err := jwt.ParseWithClaims(jwtToken, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}

		return []byte(os.Getenv("JWT_PRIVATE_KEY")), nil
	})

	if err != nil || !token.Valid {
		contextProvider.IndentedJSON(401, gin.H{"tokenvalidity": false})
		return
	}

	contextProvider.IndentedJSON(200, gin.H{"tokenvalidity": true, "usermail": claims.CustomClaims})
}
