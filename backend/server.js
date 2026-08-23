const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const ACTIONS = require("./action.js")
const axios = require("axios")
const dotenv  = require("dotenv")


dotenv.config()

const PORT = process.env.PORT || 5000
const app = express()
const server = http.createServer(app)

allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
].filter(Boolean)

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
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
    language: "cpp",
    fileName: "main.cpp",
  },

  javascript: {
    language: "javascript",
    fileName: "main.js",
  },

  python: {
    language: "python",
    fileName: "main.py",
  },

  java: {
    language: "java",
    fileName: "Main.java",
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

    socket.on( ACTIONS.COMPILE_CODE, async ({ code, roomId, language }) => {
        try {
            const runtime = languageConfig[language];

            if (!runtime) {
                throw new Error("Unsupported language");
            }
            console.log("API KEY EXISTS:", !!process.env.ONECOMPILER_API_KEY);
            const response = await axios.post(
                "https://api.onecompiler.com/v1/run",
                {
                language: runtime.language,

                files: [
                    {
                    name: runtime.fileName,
                    content: code,
                    },
                ],
                },
                {
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": process.env.ONECOMPILER_API_KEY,
                },
                }
            );
            console.log("OneCompiler response:", response.data);
            io.to(roomId).emit(
                ACTIONS.CODE_RESPONSE,
                response.data
            );

        } catch (error) {
            console.log(
                "OneCompiler Error:",
                error.response?.data || error.message
            );

            io.to(roomId).emit(ACTIONS.CODE_RESPONSE, {
                error: error.response?.data || error.message,
            });
            }
        }
        );



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

