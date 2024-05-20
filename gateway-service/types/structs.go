package types

import "go.mongodb.org/mongo-driver/bson/primitive"

type GridfsFile struct {
	FileName string             `bson:"filename"`
	Id       primitive.ObjectID `bson:"_id"`
}

type UserSignupData struct {
	UserMail  string `json:"usermail"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	UserName  string `json:"username"`
}

type FileUploadedMessage struct {
	UserMail        string `json:"usermail"`
	FileName        string `json:"filename"`
	FileID          string `json:"fileid"`
	UserName        string `json:"username"`
	DestAudioFormat string `json:"destaudioformat"`
	SamplingRate    string `json:"samplingrate"`
}

type FileEntry struct {
	UserMail        string `json:"usermail"`
	FileId          string `json:"fileid"`
	FileName        string `json:"filename"`
	DestAudioFormat string `json:"destaudioformat"`
	SamplingRate    string `json:"samplingrate"`
}
