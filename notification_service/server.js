const express = require("express");
const cors = require("cors");

require("dotenv").config()

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}))

app.get("/", (req, res) => {
    res.send("Notification Service running");
})

app.listen(process.env.APP_PORT, () => {
    console.log("Server Running at port 8003");
})
