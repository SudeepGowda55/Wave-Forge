package auth

import (
	"Audio_Conversion-Microservice/authentication_service/database"
	"Audio_Conversion-Microservice/authentication_service/types"
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
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 100)),
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

func Signup(contextProvider *gin.Context) {
	var userdata = types.UserSignup{}

	if err := contextProvider.BindJSON(&userdata); err != nil {
		contextProvider.IndentedJSON(http.StatusBadRequest, err.Error())
		return
	}

	_, err := database.Db.Exec("INSERT INTO users (firstname, lastname, username, usermail) VALUES ($1, $2, $3, $4)", userdata.FirstName, userdata.LastName, userdata.UserName, userdata.UserMail)

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

	token, err := jwt.ParseWithClaims(jwtToken, &types.JWTPayload{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			contextProvider.JSON(http.StatusBadRequest, "Invalid JSON Web Token")
			return nil, nil
		}

		return []byte(os.Getenv("JWT_PRIVATE_KEY")), nil
	})

	if err != nil {
		contextProvider.JSON(500, err.Error())
		return
	}

	if !token.Valid {
		contextProvider.IndentedJSON(401, gin.H{"tokenvalidity": token.Valid})
		return
	} else {
		contextProvider.IndentedJSON(200, gin.H{"tokenvalidity": token.Valid})
	}
}
