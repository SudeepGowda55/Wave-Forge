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
	"golang.org/x/crypto/bcrypt"
)

func createJWT(usermail string) string {

	payload := types.JWTPayload{
		CustomClaims: usermail,
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

func Signup(contextProvider *gin.Context) {
	var userdata = types.UserSignup{}

	if err := contextProvider.BindJSON(&userdata); err != nil {
		contextProvider.IndentedJSON(http.StatusBadRequest, err.Error())
		return
	}

	if userdata.UserMail == "" || userdata.FirstName == "" || len(userdata.Password) < 8 {
		contextProvider.IndentedJSON(http.StatusBadRequest, "usermail, firstname and a password of at least 8 characters are required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(userdata.Password), bcrypt.DefaultCost)

	if err != nil {
		contextProvider.IndentedJSON(http.StatusInternalServerError, err.Error())
		return
	}

	res, err := database.Db.Exec("INSERT INTO users (firstname, username, usermail, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (usermail) DO NOTHING", userdata.FirstName, userdata.UserName, userdata.UserMail, string(hash))

	if err != nil {
		contextProvider.IndentedJSON(http.StatusInternalServerError, err.Error())
		return
	}

	if n, _ := res.RowsAffected(); n == 0 {
		contextProvider.IndentedJSON(http.StatusConflict, "An account with this email already exists. Sign in instead.")
		return
	}

	contextProvider.IndentedJSON(http.StatusCreated, gin.H{"token": createJWT(userdata.UserMail), "firstname": userdata.FirstName})
}

func Login(contextProvider *gin.Context) {
	var userdata = types.UserSignup{}

	if err := contextProvider.BindJSON(&userdata); err != nil {
		contextProvider.IndentedJSON(http.StatusBadRequest, err.Error())
		return
	}

	var firstName, hash string

	err := database.Db.QueryRow("SELECT firstname, COALESCE(password_hash, '') FROM users WHERE usermail = $1", userdata.UserMail).Scan(&firstName, &hash)

	// same answer for unknown email and wrong password, so emails can't be probed
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(userdata.Password)) != nil {
		contextProvider.IndentedJSON(http.StatusUnauthorized, "Wrong email or password")
		return
	}

	contextProvider.IndentedJSON(http.StatusOK, gin.H{"token": createJWT(userdata.UserMail), "firstname": firstName})
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
