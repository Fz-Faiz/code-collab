const ACTIONS = require("../action.js");
const oneCompilerService = require("../services/oneCompilerService");

function initEditorSocket(io) {
  const userSocketMap = {};
  const roomState = {};

  function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    });
  }

  io.on("connection", (socket) => {
    console.log("socket connected", socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
      userSocketMap[socket.id] = username;
      socket.join(roomId);

      if (roomState[roomId]) {
        socket.emit(ACTIONS.SYNC_STATE, roomState[roomId]);
      }

      const clients = getAllConnectedClients(roomId);

      clients.forEach(({ socketId }) => {
        io.to(socketId).emit(ACTIONS.JOINED, {
          clients,
          username,
          socketId: socket.id,
        });
      });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ code, roomId }) => {
      if (!roomState[roomId]) {
        roomState[roomId] = {
          language: "cpp",
          code: "",
          input: "",
        };
      }

      roomState[roomId].code = code;

      socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {
        code,
      });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ code, socketId }) => {
      io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.TYPING, ({ username, roomId }) => {
      socket.in(roomId).emit(ACTIONS.TYPING, { username });
    });

    socket.on(ACTIONS.LANGUAGE, ({ language, roomId }) => {
      if (!roomState[roomId]) {
        roomState[roomId] = {
          language: "cpp",
          code: "",
          input: "",
        };
      }

      roomState[roomId].language = language;

      socket.in(roomId).emit(ACTIONS.LANGUAGE, {
        language,
      });
    });

    socket.on(ACTIONS.COMPILE_CODE, async ({ code, roomId, language, input }) => {
      try {
        console.log("API KEY EXISTS:", !!process.env.ONECOMPILER_API_KEY);
        const data = await oneCompilerService.executeCode({ code, language, input });
        console.log("OneCompiler response:", data);
        io.to(roomId).emit(ACTIONS.CODE_RESPONSE, data);
      } catch (error) {
        console.log(
          "OneCompiler Error:",
          error.response?.data || error.message
        );

        io.to(roomId).emit(ACTIONS.CODE_RESPONSE, {
          error: error.response?.data || error.message,
        });
      }
    });

    socket.on(ACTIONS.INPUT_CHANGE, ({ input, roomId }) => {
      if (!roomState[roomId]) {
        roomState[roomId] = {
          language: "cpp",
          code: "",
          input: "",
        };
      }

      roomState[roomId].input = input;

      socket.in(roomId).emit(ACTIONS.INPUT_CHANGE, {
        input,
      });
    });

    socket.on("disconnecting", () => {
      const rooms = [...socket.rooms];

      rooms.forEach((roomId) => {
        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: userSocketMap[socket.id],
        });
      });

      delete userSocketMap[socket.id];
      socket.leave();
    });
  });
}

module.exports = initEditorSocket;
