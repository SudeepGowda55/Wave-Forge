package types

import "go.mongodb.org/mongo-driver/bson/primitive"

type GridfsFile struct {
	FileName string             `bson:"filename"`
	Id       primitive.ObjectID `bson:"_id"`
}

// {"_id": {"$oid":"663d8d7615b1ef95a578a2a5"},
//  "length":{"$numberLong":"4"},
//  "chunkSize":{"$numberInt":"261120"},
//  "uploadDate":{"$date":{"$numberLong":"1715309942985"}},
//  "filename":"monisha.txt",
//  "metadata":{"userid":"sudeep@gmail.com"}
// }

type UserLoginData struct {
	UserMail string `json:"usermail"`
	Password string `json:"password"`
}

type UserSignupData struct {
	UserMail  string `json:"usermail"`
	Password  string `json:"password"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	UserName  string `json:"username"`
}
