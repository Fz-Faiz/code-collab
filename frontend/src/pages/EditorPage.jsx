import {  useEffect,  useState } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import {initSocket} from "../socket.js"
import ACTIONS from "../action.js";
import {useLocation, useNavigate, Navigate, useParams} from 'react-router-dom'
import toast from "react-hot-toast";


const EditorPage = () => {
  const location = useLocation();
  const reactNavigator = useNavigate();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);
  const [socket, setSocket] = useState(null)
  

  useEffect(() => {
    let newSocket;
    const init = async () => {

      newSocket = await initSocket();
      setSocket(newSocket)

      const handleErrors = (err) => {
        console.log("socket error", err)
        toast.error("Socket connection failed, try again later.")
        reactNavigator("/")
      }

      const handleJoined = ({clients, username}) => {
        if(username !== location.state?.username){
          toast.success(`${username} joined the room`)
        }
        setClients(clients);
      }

      const handleDisconnected = ({socketId, username}) => {
        toast.success(`${username} left the room`)

        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId)
        })
      }
      
      // Handling Errors
      newSocket.on("connect_error", handleErrors)
      newSocket.on("connect_failed", handleErrors)

      // Listening for Joined events
      newSocket.on(ACTIONS.JOINED, handleJoined)

      // Listening for Disconnected events
      newSocket.on(ACTIONS.DISCONNECTED, handleDisconnected)

      // Sending my information to server (socketId, roomId, username)
      newSocket.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      })
    }

    init()
  
  // We turn off the listening to clean up resources and avoid multiple socket
	return () => {
		if (newSocket) {
      newSocket.off("connect_error");
      newSocket.off("connect_failed");
      newSocket.off(ACTIONS.JOINED);
      newSocket.off(ACTIONS.DISCONNECTED);
      newSocket.disconnect();
    }
	}
	
  },[])

  

  if(!location.state){
    return <Navigate to="/" />
  }

  return (
    <div className="h-screen flex bg-[#0D1117] text-white">
      {/* Left Sidebar */}
      <div className="w-64 bg-[#161B22] border-r border-gray-700 flex flex-col justify-between p-4">
        <div>
          <img
            src="/code-collab.png"
            className="w-28 mx-auto object-contain"
            alt="code-collab-logo"
          />

          <hr className="m-4 border-gray-400"/>

          <h3 className="text-xl font-bold mt-6 mb-4">Connected</h3>

          <div className="flex flex-wrap gap-10 text-center">
            {clients.map((client) => (
              <Client
                key={client.socketId}
                username={client.username}
              />
            ))}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="space-y-3">
          <button className="w-full bg-gray-200 py-2 rounded-lg hover:bg-gray-100 text-black font-medium transition">
            Copy Room ID
          </button>

          <button className="w-full bg-green-500 py-2 rounded-lg hover:bg-green-600 text-black font-medium transition">
            Leave
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        {socket && <Editor socket={socket} roomId={roomId} />}
      </div>
    </div>
  );
};

export default EditorPage;