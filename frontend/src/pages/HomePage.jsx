import { useState } from "react";
import {v4 as uuidV4 } from "uuid"
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
const HomePage = () => {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidV4();
    setRoomId(id);
    toast.success("Created a new room")
  }
  const joinRoom = () => {
    if(!username || !roomId){
      toast.error("RoomId or Username missing");
      return;
    }
    navigate(`/editor/${roomId}`, {
      state:{
        username,
      }
    })
  }

  const handleKeyDown = (event) => {
    if(event.key == 'Enter'){
      joinRoom();
    }
  }
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#0D1117] text-white">
      
      <div className="flex flex-col items-center gap-4 bg-[#161B22] p-8 rounded-xl border border-[#30363D] w-96 shadow-lg">
        
        <img
          src="/code-collab.png"
          className="w-32 h-32 object-contain"
          alt="code-collab-logo"
        />

        <h3 className="text-gray-400 text-center mr-auto">
          Paste invitation Room ID
        </h3>

        <div className="flex flex-col gap-3 w-full">
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-4 py-2 outline-none focus:border-green-500"
          />

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-4 py-2 outline-none focus:border-green-500"
          />

          <button
            type="submit"
            onClick={joinRoom}
            className="w-20 ml-auto bg-green-500 hover:bg-green-600 py-2 rounded-lg font-medium transition "
          >
            Join
          </button>
        </div>

        <p className="text-sm text-gray-400">
          If you don't have an invite then create {" "}
          <button
            onClick={createNewRoom}
            type="button"
            className="text-green-400 hover:underline"
          >
            new room
          </button>
        </p>
      </div>

      <div className=" bottom-0 fixed text-sm text-gray-500">
        Made with ❤️ by{" "}
        <a
          href="https://github.com/Fz-Faiz"
          className="text-green-400 hover:underline"
        >
          Fz-Faiz
        </a>
      </div>
    </div>
  );
};

export default HomePage;