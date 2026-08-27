import { ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import ACTIONS from "../action"; 

const Output = ({
  output,
  input,
  setInput,
  socket,
  roomId,
}) => {
  const [isOutputOpen, setIsOutputOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("output");
  const [outputHeight, setOutputHeight] = useState(192);

  const handleMouseDown = (e) => {
    const startY = e.clientY;
    const startHeight = outputHeight;

    const handleMouseMove = (e) => {
      const newHeight = startHeight - (e.clientY - startY);

      setOutputHeight(
        Math.max(100, Math.min(newHeight, 500))
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleInputChange = (e) => {
    const newInput = e.target.value;
  
    // Update my own browser
    setInput(newInput);

    // Send to other users
    socket.emit(ACTIONS.INPUT_CHANGE, {
      input: newInput,
      roomId,
    });
  };
  

  return (
    <div
      className="shrink-0 flex flex-col overflow-hidden border-t border-gray-700 bg-[#0D1117]"
      style={{
        height: isOutputOpen
          ? `${outputHeight}px`
          : "40px",
      }}
    >
      {/* Resizer */}
      {isOutputOpen && (
        <div
          onMouseDown={handleMouseDown}
          className="shrink-0 h-1 cursor-row-resize hover:bg-blue-500"
        />
      )}

      {/* Header */}
      <div className="shrink-0 h-10 px-4 flex items-center justify-between bg-[#161B22]">
        {/* Tabs */}
        <div className="flex h-full items-center gap-4">
          <button
            onClick={() => setActiveTab("input")}
            className={`h-full px-2 text-sm font-semibold cursor-pointer ${
              activeTab === "input"
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            INPUT
          </button>

          <button
            onClick={() => setActiveTab("output")}
            className={`h-full px-2 text-sm font-semibold cursor-pointer ${
              activeTab === "output"
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            OUTPUT
          </button>
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setIsOutputOpen(!isOutputOpen)}
          className="text-gray-400 hover:text-white cursor-pointer"
        >
          {isOutputOpen ? (
            <ChevronDown size={20} />
          ) : (
            <ChevronUp size={20} />
          )}
        </button>
      </div>

      {/* Input */}
      {isOutputOpen && activeTab === "input" && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Enter program input..."
            className="w-full h-full block overflow-auto bg-[#0D1117] text-gray-200 p-4 outline-none resize-none"
          />
        </div>
      )}

      {/* Output */}
      {isOutputOpen && activeTab === "output" && (
        <pre className="flex-1 min-h-0 overflow-auto p-4 text-sm text-gray-200 whitespace-pre-wrap">
          {output || "Run your code to see the output..."}
        </pre>
      )}
    </div>
  );
};

export default Output;