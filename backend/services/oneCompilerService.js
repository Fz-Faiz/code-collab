const axios = require("axios");

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

/**
 * Execute code via OneCompiler API
 * @param {Object} params
 * @param {string} params.code
 * @param {string} params.language
 * @param {string} [params.input=""]
 * @returns {Promise<Object>} Execution result or error object
 */
async function executeCode({ code, language, input = "" }) {
  const runtime = languageConfig[language];

  if (!runtime) {
    throw new Error("Unsupported language");
  }

  const apiKey = process.env.ONECOMPILER_API_KEY;
  if (!apiKey) {
    console.warn("ONECOMPILER_API_KEY is not defined in environment variables");
  }

  const payload = {
    language: runtime.language,
    stdin: input || "",
    files: [
      {
        name: runtime.fileName,
        content: code,
      },
    ],
  };

  const headers = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const response = await axios.post(
    "https://api.onecompiler.com/v1/run",
    payload,
    { headers }
  );

  return response.data;
}

module.exports = {
  languageConfig,
  executeCode,
};
