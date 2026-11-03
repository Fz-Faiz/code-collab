const oneCompilerService = require("./oneCompilerService");

/**
 * Normalizes program output and expected output for fair comparison
 * - Normalizes line breaks (CRLF and CR to standard LF \n)
 * - Trims insignificant trailing whitespace on each line (spaces/tabs)
 * - Strips trailing blank lines at the end of output (standard POSIX / competitive programming newline handling)
 * - Preserves meaningful internal tokens, line breaks, and leading blank lines
 *
 * @param {string} str
 * @returns {string}
 */
function normalizeOutput(str) {
  if (str === null || str === undefined) return "";
  
  // 1. Normalize line endings (CRLF and CR to LF)
  const normalizedBreaks = String(str)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // 2. Trim trailing whitespace on each individual line
  const lines = normalizedBreaks.split("\n").map((line) => line.trimEnd());

  // 3. Remove trailing empty lines at end of output (e.g. trailing \n from print / endl)
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  // Preserve internal structure and do not silently swallow leading blank lines
  return lines.join("\n");
}

/**
 * Strict equality comparison after whitespace normalization
 *
 * @param {string} actual
 * @param {string} expected
 * @returns {boolean}
 */
function compareOutput(actual, expected) {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

/**
 * Determines whether OneCompiler result indicates a genuine execution failure
 *
 * @param {Object} result - OneCompiler execution result
 * @param {string} language - Programming language
 * @returns {boolean}
 */
function isExecutionFailure(result, language) {
  const stderr = (result?.stderr || "").trim();
  const exception = (result?.exception || "").trim();

  // If provider explicitly reported an exception
  if (exception) return true;

  // If stdout is completely null/missing and stderr is non-empty, execution failed
  if ((result?.stdout === null || result?.stdout === undefined) && stderr) {
    return true;
  }

  // If compilation failed (compilationTime > 0 and executionTime is 0/null in C++/Java)
  if (
    (language === "cpp" || language === "java") &&
    result?.compilationTime > 0 &&
    (!result?.executionTime || result?.executionTime === 0)
  ) {
    return true;
  }

  // Check for genuine compiler errors or crash signatures in stderr
  if (
    /Segmentation fault|core dumped|Aborted|Floating point exception|killed/i.test(stderr) ||
    /Exception in thread|java\.lang\.|OutOfMemoryError/i.test(stderr) ||
    /Traceback \(most recent call last\):/i.test(stderr) ||
    /SyntaxError:|IndentationError:|TabError:|ReferenceError:|TypeError:|RangeError:/i.test(stderr) ||
    /error:|fatal error:|javac|undefined reference/i.test(stderr)
  ) {
    return true;
  }

  return false;
}

/**
 * Classifies an execution failure into "Compilation Error" or "Runtime Error"
 *
 * @param {Object} result - OneCompiler execution result
 * @param {string} language - Programming language
 * @returns {"Compilation Error" | "Runtime Error"}
 */
function classifyError(result, language) {
  const stderr = result?.stderr || "";
  const exception = result?.exception || "";
  const combinedError = `${stderr}\n${exception}`.trim();

  // For compiled languages (C++, Java)
  if (language === "cpp" || language === "java") {
    // If compilation time was spent and execution time is 0/null, or compiler error output present
    if (
      (result?.compilationTime > 0 && (!result?.executionTime || result?.executionTime === 0)) ||
      /error:|javac|fatal error|undeclared|undefined reference|no such file/i.test(stderr)
    ) {
      return "Compilation Error";
    }
    return "Runtime Error";
  }

  // For interpreted languages (Python, JavaScript)
  if (language === "python" || language === "javascript") {
    if (/SyntaxError:|IndentationError:|TabError:/i.test(combinedError)) {
      return "Compilation Error";
    }
    return "Runtime Error";
  }

  return "Runtime Error";
}

/**
 * Evaluates code against a set of test cases
 *
 * @param {Object} params
 * @param {Object} params.question - Question document with sampleTestCases and hiddenTestCases
 * @param {string} params.code - Source code
 * @param {string} params.language - Programming language
 * @param {Function} [params.executeCodeFn] - Custom executor (for unit testing/mocking)
 * @returns {Promise<Object>} Safe evaluation summary
 */
async function evaluateSubmission({
  question,
  code,
  language,
  executeCodeFn,
}) {
  const runner = executeCodeFn || oneCompilerService.executeCode;
  const allTestCases = [
    ...(question.sampleTestCases || []),
    ...(question.hiddenTestCases || []),
  ];

  const totalTestCases = allTestCases.length;
  if (totalTestCases === 0) {
    throw new Error("Question has no test cases defined for evaluation");
  }

  let passedTestCases = 0;
  let finalVerdict = "Accepted";
  let failureErrorMessage = null;
  const testResults = [];

  for (let i = 0; i < allTestCases.length; i++) {
    const testCase = allTestCases[i];
    const testIndex = i + 1;

    let result;
    try {
      result = await runner({
        code,
        language,
        input: testCase.input || "",
      });
    } catch (err) {
      // OneCompiler network or service error
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Execution service unavailable";
      throw new Error(`Execution provider failure: ${errorMsg}`);
    }

    if (!result) {
      throw new Error("Execution provider returned empty response");
    }

    // Check for provider-level errors (e.g. invalid API key, system failure)
    if (result.error) {
      const errDetail = typeof result.error === "string" ? result.error : JSON.stringify(result.error);
      throw new Error(`Execution provider error: ${errDetail}`);
    }

    // Check for compilation or runtime errors
    const hasFailure = isExecutionFailure(result, language);

    if (hasFailure) {
      const errorCategory = classifyError(result, language);
      failureErrorMessage = (result.stderr || result.exception || "").trim();

      if (errorCategory === "Compilation Error") {
        finalVerdict = "Compilation Error";
        testResults.push({
          testIndex,
          passed: false,
          status: "Compilation Error",
          executionTime: result.executionTime || 0,
        });

        // Early exit: Compilation error fails all subsequent test cases immediately
        return {
          verdict: "Compilation Error",
          totalTestCases,
          passedTestCases: 0,
          failedTestCases: totalTestCases,
          testResults,
          errorMessage: failureErrorMessage,
        };
      } else {
        // Runtime error
        finalVerdict = "Runtime Error";
        testResults.push({
          testIndex,
          passed: false,
          status: "Runtime Error",
          executionTime: result.executionTime || 0,
        });

        // Early exit on first runtime error
        break;
      }
    }

    // Compare stdout with expected output
    const isCorrect = compareOutput(result.stdout || "", testCase.expectedOutput);

    if (isCorrect) {
      passedTestCases++;
      testResults.push({
        testIndex,
        passed: true,
        status: "Passed",
        executionTime: result.executionTime || 0,
      });
    } else {
      finalVerdict = "Wrong Answer";
      testResults.push({
        testIndex,
        passed: false,
        status: "Wrong Answer",
        executionTime: result.executionTime || 0,
      });

      // Early exit on first failing test case
      break;
    }
  }

  const failedTestCases = totalTestCases - passedTestCases;

  return {
    verdict: finalVerdict,
    totalTestCases,
    passedTestCases,
    failedTestCases,
    testResults,
    errorMessage: failureErrorMessage,
  };
}

module.exports = {
  normalizeOutput,
  compareOutput,
  classifyError,
  isExecutionFailure,
  evaluateSubmission,
};
