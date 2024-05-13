package auth

import (
	"Audio_Conversion-Microservice/authentication_service/database"
	"Audio_Conversion-Microservice/authentication_service/types"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func createJWT(userData types.UserLogin) string {

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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(userdata.Password), bcrypt.DefaultCost)

	if err != nil {
		contextProvider.IndentedJSON(http.StatusInternalServerError, err.Error())
		return
	}

	_, err = database.Db.Exec("INSERT INTO users (firstname, lastname, username, usermail, password) VALUES ($1, $2, $3, $4, $5)", userdata.FirstName, userdata.LastName, userdata.UserName, userdata.UserMail, string(hashedPassword))

	if err != nil {
		contextProvider.IndentedJSON(http.StatusInternalServerError, err.Error())
		return
	} else {
		contextProvider.IndentedJSON(201, "User Created Successfully")
		return
	}
}

func Login(contextProvider *gin.Context) {
	var userData = types.UserLogin{}

	if err := contextProvider.BindJSON(&userData); err != nil {
		contextProvider.IndentedJSON(http.StatusBadRequest, err.Error())
		return
	}

	row := database.Db.QueryRow("SELECT * FROM users WHERE usermail = $1", userData.UserMail)

	var userLoginData = types.UserSignup{}

	err := row.Scan(&userLoginData.FirstName, &userLoginData.LastName, &userLoginData.UserName, &userLoginData.UserMail, &userLoginData.Password)

	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			contextProvider.IndentedJSON(http.StatusUnauthorized, "Invalid Credentials")
			return
		} else {
			contextProvider.IndentedJSON(http.StatusInternalServerError, err.Error())
			return
		}
	}

	err = bcrypt.CompareHashAndPassword([]byte(userLoginData.Password), []byte(userData.Password))

	if err != nil {
		contextProvider.IndentedJSON(http.StatusInternalServerError, err.Error())
		return
	}

	jwtToken := createJWT(userData)

	contextProvider.IndentedJSON(http.StatusOK, jwtToken)
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
