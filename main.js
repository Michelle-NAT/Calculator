const display = document.getElementById("display");

let currentInput = "";

function setDisplay(val) {
  display.value = val || "0";
}

function deleteLastToken(str) {
  const tokens = ["sin(", "cos(", "tan(", "ln(", "log(", "sqrt(", "fact("];
  tokens.sort((a, b) => b.length - a.length);
  for (const t of tokens) {
    if (str.endsWith(t)) return str.slice(0, -t.length);
  }
  return str.slice(0, -1);
}

function fact(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return NaN;
  if (!Number.isInteger(x)) return NaN;
  let res = 1;
  for (let i = 2; i <= x; i++) res *= i;
  return res;
}

function evaluateExpression(expr) {
  let e = String(expr || "").trim();
  if (!e) return "0";

  // Buttons control input, but keep a basic sanity filter.
  if (!/^[0-9+\-*/().^A-Za-z\s]*$/.test(e)) {
    throw new Error("Invalid input");
  }

  // Convert caret power to JS power.
  e = e.replace(/\^/g, "**");

  // Replace constants and known function wrappers.
  e = e
    .replace(/\bpi\b/g, "Math.PI")
    .replace(/\be\b/g, "Math.E")
    .replace(/\bsin\(/g, "Math.sin(")
    .replace(/\bcos\(/g, "Math.cos(")
    .replace(/\btan\(/g, "Math.tan(")
    .replace(/\bln\(/g, "Math.log(")
    .replace(/\blog\(/g, "Math.log10(")
    .replace(/\bsqrt\(/g, "Math.sqrt(");

  const result = Function("Math", "fact", `return ${e}`)(Math, fact);
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Invalid math");
  }
  return result.toString();
}

function handleCalcToken(token) {
  if (!token) return;

  if (token === "C") {
    currentInput = "";
    setDisplay("0");
    return;
  }

  if (token === "DEL") {
    currentInput = deleteLastToken(currentInput);
    setDisplay(currentInput || "0");
    return;
  }

  if (token === "=") {
    try {
      currentInput = evaluateExpression(currentInput);
    } catch {
      currentInput = "Error";
    }
    setDisplay(currentInput);
    return;
  }

  currentInput += token;
  setDisplay(currentInput);
}

// Calculator buttons (basic + scientific only).
const calcButtons = document.querySelectorAll(".calculator-grid .btn, .scientific-grid .btn");
calcButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const token = (button.dataset.value ?? button.textContent).trim();
    handleCalcToken(token);
  });
});

// Mode Switching
const calcMode = document.getElementById("calcMode");
const sciMode = document.getElementById("sciMode");
const convMode = document.getElementById("convMode");

const converter = document.querySelector(".converter");
const basicCalculatorGrid = document.querySelector(".calculator-grid");
const scientificGrid = document.querySelector(".scientific-grid");
const displayContainer = document.querySelector(".display");

function setActiveMode(mode) {
  const isCalc = mode === "calc";
  const isSci = mode === "sci";
  const isConv = mode === "conv";

  if (basicCalculatorGrid) basicCalculatorGrid.classList.toggle("hidden", !isCalc);
  if (scientificGrid) scientificGrid.classList.toggle("hidden", !isSci);
  if (converter) converter.classList.toggle("hidden", !isConv);
  if (displayContainer) displayContainer.classList.toggle("hidden", isConv);

  if (calcMode) calcMode.classList.toggle("active", isCalc);
  if (sciMode) sciMode.classList.toggle("active", isSci);
  if (convMode) convMode.classList.toggle("active", isConv);
}

if (calcMode) calcMode.addEventListener("click", () => setActiveMode("calc"));
if (sciMode) sciMode.addEventListener("click", () => setActiveMode("sci"));
if (convMode) convMode.addEventListener("click", () => setActiveMode("conv"));

// Initial mode
setActiveMode("calc");


// Currency conversion
document.addEventListener("DOMContentLoaded", () => {
  const amountInput = document.getElementById("amount");
  const resultEl = document.getElementById("result");
  const fromSelect = document.getElementById("fromCurrency");
  const toSelect = document.getElementById("toCurrency");
  const convertBtn = document.querySelector(".convert-btn");

  // Converter keypad
  const keypadButtons = document.querySelectorAll(".converter-keypad .conv-key-btn");
  keypadButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const token = (btn.dataset.value ?? "").trim();
      if (!token || !amountInput) return;

      const current = amountInput.value ?? "";

      if (token === "C") {
        amountInput.value = "";
        if (resultEl) resultEl.textContent = "0";
        return;
      }

      if (token === "DEL") {
        amountInput.value = current.slice(0, -1);
        return;
      }

      if (token === "NEG") {
        if (!current) amountInput.value = "-";
        else if (current.startsWith("-")) amountInput.value = current.slice(1);
        else amountInput.value = "-" + current;
        return;
      }

      if (token === "." && current.includes(".")) return;

      amountInput.value = current + token;
      if (resultEl) resultEl.textContent = "0";
    });
  });

  // Cache to avoid refetching repeatedly.
  let cachedFrom = null;
  let cachedRates = null;

  async function fetchLatestRates(from) {
    const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.result !== "success" || !data.rates) {
      throw new Error("Bad response");
    }
    return data.rates;
  }

  async function getRates(from) {
    if (cachedFrom === from && cachedRates) return cachedRates;
    try {
      cachedRates = await fetchLatestRates(from);
      cachedFrom = from;
    } catch {
      cachedRates = null;
    }
    return cachedRates;
  }

  function setSelectOptions(select, codes, preserveValue) {
    if (!select) return;
    const existing = preserveValue && codes.includes(preserveValue) ? preserveValue : codes[0];

    select.innerHTML = "";
    codes.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      select.appendChild(opt);
    });

    if (existing) select.value = existing;
  }

  async function loadCurrencyOptions(base) {
    if (!fromSelect || !toSelect) return;

    const rates = await getRates(base);
    if (!rates) return;

    const codes = Object.keys(rates).sort((a, b) => a.localeCompare(b));
    if (!codes.includes(base)) codes.unshift(base);

    const preserveFrom = fromSelect.value;
    const preserveTo = toSelect.value;

    setSelectOptions(fromSelect, codes, preserveFrom);
    setSelectOptions(toSelect, codes, preserveTo);
  }

  // Populate dropdowns once at startup (using the default FROM currency).
  if (fromSelect) {
    loadCurrencyOptions(fromSelect.value || "USD").catch(() => {});

    fromSelect.addEventListener("change", async () => {
      await loadCurrencyOptions(fromSelect.value);
    });
  }

  if (convertBtn) {
    convertBtn.addEventListener("click", async () => {
      if (!amountInput || !fromSelect || !toSelect || !resultEl) return;

      const amount = parseFloat(amountInput.value);
      if (Number.isNaN(amount)) {
        resultEl.textContent = "Enter a valid amount";
        return;
      }

      const from = fromSelect.value;
      const to = toSelect.value;

      const rates = await getRates(from);
      if (!rates) {
        resultEl.textContent = "Unable to fetch rates (check internet)";
        return;
      }

      const rate = rates[to];
      if (rate == null) {
        resultEl.textContent = "Rate not available";
        return;
      }

      const result = amount * rate;
      resultEl.textContent = result.toFixed(2);
    });
  }
});
