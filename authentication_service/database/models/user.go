package models

type UserSignup struct {
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
}

type UserLogin struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
