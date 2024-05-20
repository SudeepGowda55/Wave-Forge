package types

import "github.com/golang-jwt/jwt/v5"

type UserSignup struct {
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	UserName  string `json:"username"`
	UserMail  string `json:"usermail"`
}

type JWTPayload struct {
	CustomClaims string
	jwt.RegisteredClaims
}

// To upload File Data to userfiles table
type FileId struct {
	UserMail        string `json:"usermail"`
	FileId          string `json:"fileid"`
	FileName        string `json:"filename"`
	DestAudioFormat string `json:"destaudioformat"`
	SamplingRate    string `json:"samplingrate"`
}

// To retrive File Data from userfiles table
type File struct {
	FileId          string `json:"fileid"`
	FileName        string `json:"filename"`
	FileUrl         string `json:"fileurl"`
	DestAudioFormat string `json:"destaudioformat"`
	SamplingRate    string `json:"samplingrate"`
}
