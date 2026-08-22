import { ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

const Output = ({ output }) => {
  const [isOutputOpen, setIsOutputOpen] = useState(true);
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

  return (
    <div
      className="shrink-0 border-t border-gray-700 bg-[#0D1117]"
      style={{
        height: isOutputOpen ? `${outputHeight}px` : "40px"
      }}
    >
      {/* Resizer */}
      {isOutputOpen && (
        <div
          onMouseDown={handleMouseDown}
          className="h-1 cursor-row-resize hover:bg-blue-500"
        />
      )}

      {/* Output Header */}
      <div className="h-10 px-4 flex items-center justify-between bg-[#161B22]">
        <span className="text-sm font-semibold text-gray-300">
          OUTPUT
        </span>

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

      {/* Output Content */}
      {isOutputOpen && (
        <pre className="overflow-auto p-4 text-sm text-gray-200 whitespace-pre-wrap">
          {output || "Run your code to see the output..."}
        </pre>
      )}
    </div>
  );
};

export default Output;