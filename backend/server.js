const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const ACTIONS = require("./action.js")
const axios = require("axios")


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
const roomState = {};
const languageConfig = {
  cpp: {
    language: "c++",
    version: "10.2.0",
  },

  javascript: {
    language: "javascript",
    version: "20.11.1",
  },

  python: {
    language: "python",
    version: "3.12.0",
  },

  java: {
    language: "java",
    version: "15.0.2",
  },
};

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
        if (roomState[roomId]) {
            socket.emit(ACTIONS.SYNC_STATE, roomState[roomId]);
        }
        
        const clients = getAllConnectedClients(roomId);

        clients.forEach(({socketId}) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id
            })
        })
    })

    socket.on(ACTIONS.CODE_CHANGE, ({ code, roomId }) => {
    if (!roomState[roomId]) {
        roomState[roomId] = {
        language: "cpp",
        code: ""
        };
    }

    roomState[roomId].code = code;

    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {
        code
    });
    });

    socket.on(ACTIONS.SYNC_CODE, ({code, socketId}) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code })
    })

    socket.on(ACTIONS.TYPING, ({username, roomId}) => {
        socket.in(roomId).emit(ACTIONS.TYPING, {username})
    })

    socket.on(ACTIONS.LANGUAGE, ({ language, roomId }) => {
    if (!roomState[roomId]) {
        roomState[roomId] = {
        language: "cpp",
        code: ""
        };
    }

    roomState[roomId].language = language;

    socket.in(roomId).emit(ACTIONS.LANGUAGE, {
        language
    });
    });

    socket.on(ACTIONS.COMPILE_CODE, async ({ code, roomId,  language}) => {
        try {
            const runtime = languageConfig[language]
            const response = await axios.post(
                "http://localhost:2000/api/v2/execute",
                {
                    language: runtime.language,
                    version: runtime.version,
                    files: [
                    {
                        content: code,
                    },
                    ],
                }
            );
            io.to(roomId).emit(ACTIONS.CODE_RESPONSE, response.data)
        } catch (error) {
            io.to(roomId).emit(ACTIONS.CODE_RESPONSE, {
                error: error.response?.data || error.message,
            })
        }
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

