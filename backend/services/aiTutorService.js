const axios = require("axios");

/**
 * Service to communicate with the FastAPI AI Tutor microservice
 */
class AITutorService {
  constructor() {
    this._customRequester = null;
  }

  setCustomRequester(fn) {
    this._customRequester = fn;
  }

  getServiceUrl() {
    const raw = process.env.AI_SERVICE_URL || "http://localhost:8000";
    return raw.replace(/\/+$/, "");
  }

  getServiceSecret() {
    return process.env.AI_SERVICE_SECRET || "dev_ai_secret_codecollab";
  }

  /**
   * Request adaptive hint from FastAPI microservice
   *
   * @param {Object} params
   * @param {Object} params.problem - Problem statement context (title, description, formats, constraints)
   * @param {string} params.code - Student source code
   * @param {string} params.language - Language
   * @param {Object} [params.testResults] - Trusted aggregate test counts computed by Node backend
   * @param {Array} [params.previousHints] - Previous hint summaries from session
   * @param {number} [params.requestedHintLevel] - 1 to 4
   * @returns {Promise<Object>} HintResponse from AI service
   */
  async requestHint({
    problem,
    code,
    language,
    testResults,
    previousHints = [],
    requestedHintLevel = 1,
    studentQuery = "",
  }) {
    const payload = {
      problem: {
        title: problem.title,
        description: problem.description,
        inputFormat: problem.inputFormat,
        outputFormat: problem.outputFormat,
        constraints: problem.constraints || "",
      },
      code: code || "",
      language,
      testResults: testResults || { passed: 0, failed: 0, total: 0 },
      previousHints: Array.isArray(previousHints)
        ? previousHints.map((h, idx) => ({
            hintLevel: Number(h.hintLevel || h.hintNumber) || (idx + 1),
            hintNumber: Number(h.hintNumber || h.hintLevel) || (idx + 1),
            hintTitle: String(h.hintTitle || "").slice(0, 200),
            hint: String(h.hint || "").slice(0, 5000),
          }))
        : [],
      requestedHintLevel: Number(requestedHintLevel) || 1,
      hintNumber: Number(requestedHintLevel) || 1,
      studentQuery: typeof studentQuery === "string" ? studentQuery.slice(0, 2000) : "",
    };

    // If test mock requester is set, use it
    if (this._customRequester) {
      return this._customRequester(payload);
    }

    const serviceUrl = this.getServiceUrl();
    const secret = this.getServiceSecret();

    try {
      const response = await axios.post(
        `${serviceUrl}/api/tutor/hint`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Service-Secret": secret,
          },
          timeout: 25000,
        }
      );

      return response.data;
    } catch (err) {
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        throw new Error(
          "AI Tutor microservice is currently unreachable. Please verify that the Python AI service is running."
        );
      }
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        throw new Error("AI Tutor request timed out. Please try again.");
      }
      if (err.response?.status === 401) {
        throw new Error("Internal AI microservice authentication failed.");
      }
      if (err.response?.status === 413) {
        throw new Error("Code and context payload exceeds AI service size limits.");
      }
      if (err.response?.data?.detail) {
        const detail =
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail);
        throw new Error(`AI Tutor error: ${detail}`);
      }

      throw new Error(`AI Tutor service error: ${err.message}`);
    }
  }
}

const aiTutorService = new AITutorService();

module.exports = aiTutorService;
