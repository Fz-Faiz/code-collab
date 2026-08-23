import {  useEffect,  useState, useRef } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import {initSocket} from "../socket.js"
import ACTIONS from "../action.js";
import {useLocation, useNavigate, Navigate, useParams} from 'react-router-dom'
import toast from "react-hot-toast";
import Output from "../components/Output.jsx";
import { Loader2 } from "lucide-react";


const EditorPage = () => {
  const location = useLocation();
  const reactNavigator = useNavigate();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);
  const [socket, setSocket] = useState(null)
  const codeRef = useRef(" ")
  const [typer, setTyper] = useState("")
  const [language, setLanguage] = useState("cpp")
  const typingRef = useRef(null)
  const [output, setOutput] = useState("Your output will appear here");
  const [isRunning, setIsRunning] = useState(false);
  
  
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

      const handleJoined = ({clients, username, socketId}) => {
        if(username !== location.state?.username){
          toast.success(`${username} joined the room`)
        }
        setClients(clients);
        newSocket.emit(ACTIONS.SYNC_CODE, {
          code: codeRef.current,
          socketId,
        })

      }

      const handleDisconnected = ({socketId, username}) => {
        toast.success(`${username} left the room`)

        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId)
        })
      }

      const handleSelectedLanguage = ({language}) => {
        setLanguage(language)
      }

      const handleTyping = ({username}) => {
        setTyper(username)

        clearTimeout(typingRef.current)

        typingRef.current = setTimeout(() => {
          setTyper("")
        }, 1500)
      }

      const handleCodeResponse = (data) => {
        setIsRunning(false);

        if (data.error) {
          setOutput(
            typeof data.error === "string"
              ? data.error
              : JSON.stringify(data.error)
          );
          return;
        }

        if (data.stderr) {
          setOutput(data.stderr);
        } else if (data.exception) {
          setOutput(data.exception);
        } else if (data.stdout !== null && data.stdout !== undefined) {
          setOutput(data.stdout);
        } else {
          setOutput("No output");
        }
      };
              
      // Handling Errors
      newSocket.on("connect_error", handleErrors)
      newSocket.on("connect_failed", handleErrors)

      // Listening for Joined events
      newSocket.on(ACTIONS.JOINED, handleJoined)

      // Listening for Disconnected events
      newSocket.on(ACTIONS.DISCONNECTED, handleDisconnected)

      // Listening for who is typing
      newSocket.on(ACTIONS.TYPING, handleTyping)

      // Listening for Selected Language
      newSocket.on(ACTIONS.LANGUAGE, handleSelectedLanguage)

      newSocket.on(ACTIONS.CODE_RESPONSE, handleCodeResponse)

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
      newSocket.off(ACTIONS.TYPING)
      newSocket.off(ACTIONS.CODE_RESPONSE);
      newSocket.off(ACTIONS.LANGUAGE)
      newSocket.disconnect();
    }
	}
	
  },[])

  useEffect(() => {
      if (!socket) return;

      const handleSyncState = ({ language, code }) => {
        setLanguage(language);
        codeRef.current = code;
      };

      socket.on(ACTIONS.SYNC_STATE, handleSyncState);

      return () => {
        socket.off(ACTIONS.SYNC_STATE, handleSyncState);
      };
    }, [socket]); 

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      toast.success("Room ID has been copied")
    } catch (error) {
      toast.success("Could not copy the Room Id")
      console.log(error)
    }
  }
  
  const handleLeaveRoom = () => {
    reactNavigator('/')
  }

  const handleLanguageChange = (event) => {
    const newlanguage = event.target.value
    setLanguage(newlanguage)

    // Sending Language
    socket.emit(ACTIONS.LANGUAGE, {
      language: newlanguage,
      roomId
    })
  }

  const runCode = () => {
    setIsRunning(true)
    socket.emit(ACTIONS.COMPILE_CODE, {
        code : codeRef.current,
        roomId,
        language
    })
  }

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
          {/*Typing*/}
          {typer && (
            <div className="font-medium text-xl text-gray-300">
              <span>{typer}</span>
              <span className="ml-1 animate-pulse">•••</span>
            </div>
          )}

          <button onClick={handleCopyRoomId} className="w-full bg-gray-200 py-2 rounded-lg hover:bg-gray-100 text-black font-medium transition cursor-pointer">
            Copy Room ID
          </button>

          <button onClick={handleLeaveRoom} className="w-full bg-green-500 py-2 rounded-lg hover:bg-green-600 text-black font-medium transition cursor-pointer">
            Leave
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0 h-screen flex flex-col">
        {/* Navbar */}
        <div className="flex items-center justify-between px-3 h-12 bg-gray-800 border-b border-gray-700">
          
          {/* Language Selector */}
          <select
            name="selectLanguage"
            className="bg-gray-700 text-gray-100 px-3 py-1.5 rounded-md 
                      outline-none border border-gray-600 cursor-pointer
                      focus:border-blue-500"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="cpp">C++</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>

          {/* Run Button */}
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 
                            rounded-md cursor-pointer transition-colors duration-200 flex items-center text-center"
                  onClick={runCode}
                  disabled={isRunning}

          >
             {isRunning ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Running
                </>
              ) : (
                "Run Code"
              )}
          </button>

        </div>

        {/* Code Ediotr */}
        <div className="flex-1 min-h-0 overflow-auto">
          {socket && <Editor socket={socket} roomId={roomId} onCodeChange={(code) => {codeRef.current = code}} username={location.state?.username} language={language}/>}
        </div>
        <Output output={output} />
      </div>
        
      
     
    </div>
     
  );
};

export default EditorPage;