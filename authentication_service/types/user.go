package types

import "github.com/golang-jwt/jwt/v5"

type UserSignup struct {
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	UserName  string `json:"username"`
	UserMail  string `json:"usermail"`
	Password  string `json:"password"`
}

type UserLogin struct {
	UserMail string `json:"usermail"`
	Password string `json:"password"`
}

type JWTPayload struct {
	CustomClaims string
	jwt.RegisteredClaims
}
