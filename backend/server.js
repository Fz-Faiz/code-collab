const express = require("express")
const http = require("http")
const { Server } = require("socket.io")


const PORT = 5000
const app = express()
const server = http.createServer(app)

const io = new Server(server)

io.on('connection', (socket) => {
    console.log('socket connected', socket.id)
})


server.listen(PORT, () => {
    console.log(`Server started at Port: ${PORT}`)
})

