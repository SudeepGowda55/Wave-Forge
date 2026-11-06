package utils

import (
	"github.com/joho/godotenv"
)

// Loadenv reads a local .env if present; in Docker the variables come from the environment itself.
func Loadenv() {
	_ = godotenv.Load()
}
