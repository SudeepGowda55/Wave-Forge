package database

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"time"

	_ "github.com/lib/pq"
)

// Postrgesql database connection

var Db *sql.DB

func ConnectToDatabase() {
	host := os.Getenv("DB_HOSTNAME")
	port, _ := strconv.Atoi(os.Getenv("DB_PORT"))
	user := os.Getenv("DB_USERNAME")
	dbname := os.Getenv("DB_DATABASE")
	pass := os.Getenv("DB_PASSWORD")

	connString := fmt.Sprintf("host=%s port=%d user=%s dbname=%s password=%s sslmode=require", host, port, user, dbname, pass)

	db, errSql := sql.Open("postgres", connString)

	if errSql != nil {
		fmt.Println("There is an error while connecting to the database ", errSql)
		panic(errSql)
	} else {
		// drop idle connections before Neon's pooler closes them, so a stale one is never reused
		db.SetConnMaxIdleTime(time.Minute)
		Db = db
		fmt.Println("Successfully connected to Postrgesql database!")
	}
}
