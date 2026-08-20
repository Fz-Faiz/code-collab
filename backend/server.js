const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const ACTIONS = require("./action.js")


const PORT = 5000
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
})


app.use(cors());
app.use(express.json());

const userSocketMap = {};

function getAllConnectedClients(roomId){
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId]
        };
    });
};

io.on('connection', (socket) => {
    console.log('socket connected', socket.id)

    socket.on(ACTIONS.JOIN, ({roomId, username})=>{
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        
        const clients = getAllConnectedClients(roomId);

        clients.forEach(({socketId}) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id
            })
        })
    })

    socket.on(ACTIONS.CODE_CHANGE, ({roomId, code}) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code })
    })

    socket.on(ACTIONS.SYNC_CODE, ({code, socketId}) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code })
    })

    socket.on(ACTIONS.TYPING, ({username, roomId}) => {
        socket.in(roomId).emit(ACTIONS.TYPING, {username})
    })

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];

        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            })
        })

        delete userSocketMap[socket.id];
        socket.leave();
    })


});


server.listen(PORT, () => {
    console.log(`Server started at Port: ${PORT}`)
})

