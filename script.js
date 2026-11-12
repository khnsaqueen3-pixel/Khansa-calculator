(() => {
  const expressionEl = document.getElementById("expression");
  const resultEl = document.getElementById("result");
  const themeToggle = document.getElementById("themeToggle");
  const degBtn = document.querySelector('[data-action="deg"]');

  let expression = "";
  let displayValue = "0";
  let justEvaluated = false;
  let angleMode = "DEG";

  const THEME_KEY = "khansa-naz-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const label = themeToggle.querySelector(".theme-label");
    label.textContent = theme === "light" ? "Dark" : "Light";
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      applyTheme(saved);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "light" ? "dark" : "light");
  });

  function updateDisplay() {
    expressionEl.textContent = expression;
    resultEl.textContent = displayValue;
  }

  function resetAfterEvalIfNeeded() {
    if (justEvaluated) {
      expression = "";
      justEvaluated = false;
    }
  }

  function appendNumber(num) {
    resetAfterEvalIfNeeded();
    if (displayValue === "0" || displayValue === "Error") {
      displayValue = num;
    } else {
      displayValue += num;
    }
    updateDisplay();
  }

  function appendDot() {
    resetAfterEvalIfNeeded();
    if (displayValue === "Error") displayValue = "0";
    if (!displayValue.includes(".")) {
      displayValue += ".";
      updateDisplay();
    }
  }

  function setOperator(op) {
    if (displayValue === "Error") return;
    if (justEvaluated) {
      expression = displayValue;
      justEvaluated = false;
    } else {
      expression += displayValue;
    }
    expression += ` ${op} `;
    displayValue = "0";
    updateDisplay();
  }

  function toRadians(value) {
    return angleMode === "DEG" ? (value * Math.PI) / 180 : value;
  }

  function fromRadians(value) {
    return angleMode === "DEG" ? (value * 180) / Math.PI : value;
  }

  function factorial(n) {
    if (!Number.isInteger(n) || n < 0 || n > 170) {
      throw new Error("Invalid factorial");
    }
    let result = 1;
    for (let i = 2; i <= n; i += 1) result *= i;
    return result;
  }

  function tokenize(expr) {
    const tokens = [];
    const src = expr.replace(/\s+/g, "");
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (/[0-9.]/.test(ch)) {
        let num = ch;
        i += 1;
        while (i < src.length && /[0-9.]/.test(src[i])) {
          num += src[i];
          i += 1;
        }
        tokens.push({ type: "number", value: Number(num) });
        continue;
      }
      if ("+-*/^()".includes(ch)) {
        tokens.push({ type: "op", value: ch });
        i += 1;
        continue;
      }
      throw new Error("Invalid character");
    }
    return tokens;
  }

  function toRpn(tokens) {
    const output = [];
    const stack = [];
    const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
    const rightAssoc = { "^": true };

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token.type === "number") {
        output.push(token);
        continue;
      }

      if (token.value === "(") {
        stack.push(token);
        continue;
      }

      if (token.value === ")") {
        while (stack.length && stack[stack.length - 1].value !== "(") {
          output.push(stack.pop());
        }
        if (!stack.length) throw new Error("Mismatched parentheses");
        stack.pop();
        continue;
      }

      // unary minus
      if (
        token.value === "-" &&
        (i === 0 ||
          (tokens[i - 1].type === "op" && tokens[i - 1].value !== ")"))
      ) {
        output.push({ type: "number", value: 0 });
      }

      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.value === "(") break;
        const pTop = precedence[top.value];
        const pCur = precedence[token.value];
        if (
          pTop > pCur ||
          (pTop === pCur && !rightAssoc[token.value])
        ) {
          output.push(stack.pop());
        } else {
          break;
        }
      }
      stack.push(token);
    }

    while (stack.length) {
      const op = stack.pop();
      if (op.value === "(" || op.value === ")") throw new Error("Mismatched parentheses");
      output.push(op);
    }
    return output;
  }

  function evalRpn(rpn) {
    const stack = [];
    for (const token of rpn) {
      if (token.type === "number") {
        stack.push(token.value);
        continue;
      }
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("Invalid expression");
      switch (token.value) {
        case "+":
          stack.push(a + b);
          break;
        case "-":
          stack.push(a - b);
          break;
        case "*":
          stack.push(a * b);
          break;
        case "/":
          if (b === 0) throw new Error("Division by zero");
          stack.push(a / b);
          break;
        case "^":
          stack.push(Math.pow(a, b));
          break;
        default:
          throw new Error("Unknown operator");
      }
    }
    if (stack.length !== 1) throw new Error("Invalid expression");
    return stack[0];
  }

  function formatNumber(n) {
    if (!Number.isFinite(n)) throw new Error("Invalid result");
    const rounded = Math.abs(n) < 1e-10 ? 0 : n;
    let text = Number(rounded.toPrecision(12)).toString();
    if (text.includes("e")) return text;
    if (text.includes(".")) {
      text = text.replace(/\.?0+$/, "");
    }
    return text || "0";
  }

  function evaluateExpression(fullExpr) {
    const tokens = tokenize(fullExpr);
    const rpn = toRpn(tokens);
    return evalRpn(rpn);
  }

  function equals() {
    try {
      const full = justEvaluated ? displayValue : expression + displayValue;
      const value = evaluateExpression(full);
      expression = full;
      displayValue = formatNumber(value);
      justEvaluated = true;
      updateDisplay();
    } catch {
      displayValue = "Error";
      expression = "";
      justEvaluated = true;
      updateDisplay();
    }
  }

  function applyUnary(fn) {
    try {
      const n = Number(displayValue);
      if (!Number.isFinite(n)) throw new Error("Invalid");
      const value = fn(n);
      displayValue = formatNumber(value);
      justEvaluated = true;
      updateDisplay();
    } catch {
      displayValue = "Error";
      justEvaluated = true;
      updateDisplay();
    }
  }

  function clearAll() {
    expression = "";
    displayValue = "0";
    justEvaluated = false;
    updateDisplay();
  }

  function backspace() {
    if (justEvaluated || displayValue === "Error") {
      displayValue = "0";
      justEvaluated = false;
      updateDisplay();
      return;
    }
    displayValue = displayValue.length <= 1 ? "0" : displayValue.slice(0, -1);
    updateDisplay();
  }

  function toggleAngleMode() {
    angleMode = angleMode === "DEG" ? "RAD" : "DEG";
    degBtn.textContent = angleMode;
  }

  document.querySelector(".keys").addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;

    if (btn.dataset.num !== undefined) {
      appendNumber(btn.dataset.num);
      return;
    }
    if (btn.dataset.op !== undefined) {
      setOperator(btn.dataset.op);
      return;
    }
    if (btn.dataset.const === "pi") {
      resetAfterEvalIfNeeded();
      displayValue = String(Math.PI);
      updateDisplay();
      return;
    }
    if (btn.dataset.const === "e") {
      resetAfterEvalIfNeeded();
      displayValue = String(Math.E);
      updateDisplay();
      return;
    }

    switch (btn.dataset.action) {
      case "dot":
        appendDot();
        return;
      case "clear":
        clearAll();
        return;
      case "backspace":
        backspace();
        return;
      case "equals":
        equals();
        return;
      case "negate":
        if (displayValue !== "Error" && displayValue !== "0") {
          displayValue = displayValue.startsWith("-")
            ? displayValue.slice(1)
            : `-${displayValue}`;
          updateDisplay();
        }
        return;
      case "paren-open":
        resetAfterEvalIfNeeded();
        expression += "(";
        updateDisplay();
        return;
      case "paren-close":
        expression += displayValue + ")";
        displayValue = "0";
        updateDisplay();
        return;
      case "deg":
        toggleAngleMode();
        return;
      default:
        break;
    }

    switch (btn.dataset.fn) {
      case "sin":
        applyUnary((n) => Math.sin(toRadians(n)));
        break;
      case "cos":
        applyUnary((n) => Math.cos(toRadians(n)));
        break;
      case "tan":
        applyUnary((n) => Math.tan(toRadians(n)));
        break;
      case "asin":
        applyUnary((n) => fromRadians(Math.asin(n)));
        break;
      case "acos":
        applyUnary((n) => fromRadians(Math.acos(n)));
        break;
      case "atan":
        applyUnary((n) => fromRadians(Math.atan(n)));
        break;
      case "sqrt":
        applyUnary((n) => {
          if (n < 0) throw new Error("Invalid");
          return Math.sqrt(n);
        });
        break;
      case "ln":
        applyUnary((n) => {
          if (n <= 0) throw new Error("Invalid");
          return Math.log(n);
        });
        break;
      case "log":
        applyUnary((n) => {
          if (n <= 0) throw new Error("Invalid");
          return Math.log10(n);
        });
        break;
      case "exp":
        applyUnary((n) => Math.exp(n));
        break;
      case "pow10":
        applyUnary((n) => Math.pow(10, n));
        break;
      case "square":
        applyUnary((n) => n * n);
        break;
      case "inv":
        applyUnary((n) => {
          if (n === 0) throw new Error("Division by zero");
          return 1 / n;
        });
        break;
      case "percent":
        applyUnary((n) => n / 100);
        break;
      case "factorial":
        applyUnary((n) => factorial(n));
        break;
      default:
        break;
    }
  });

  document.addEventListener("keydown", (event) => {
    const { key } = event;
    if (/^[0-9]$/.test(key)) {
      appendNumber(key);
      return;
    }
    if (key === ".") {
      appendDot();
      return;
    }
    if (["+", "-", "*", "/", "^"].includes(key)) {
      setOperator(key);
      return;
    }
    if (key === "Enter" || key === "=") {
      event.preventDefault();
      equals();
      return;
    }
    if (key === "Backspace") {
      backspace();
      return;
    }
    if (key === "Escape") {
      clearAll();
    }
  });

  initTheme();
  updateDisplay();
})();
