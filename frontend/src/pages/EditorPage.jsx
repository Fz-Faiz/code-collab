import { useEffect, useRef, useState } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import {initSocket} from "../socket.js"

const EditorPage = () => {
  const sockerRef = useRef(null);
  useEffect(() => {
    const init = async () => {
      sockerRef.current = await initSocket()
      sockerRef.current.emit()
    }
    init()
  },[])
  const [clients] = useState([
    { sockedId: 1, username: "faiz f" },
    { sockedId: 2, username: "fz" },
  ]);

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
                key={client.sockedId}
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
        <Editor />
      </div>
    </div>
  );
};

export default EditorPage;