/* Nishan Expert Tools Web Edition — no backend required for most tools. */
const $ = id => document.getElementById(id);
const toolNames = {
  random: "Random Number", password: "Password Generator", calculator: "Smart Calculator",
  text: "Text Tools", ip: "IP Information", qr: "QR Scanner", base64: "Base64 Tools", url: "URL Tools"
};
let activeTool = "random";

function showNotice(message, error = false) {
  const el = $("notice");
  el.textContent = message;
  el.style.color = error ? "#a33d36" : "#467357";
}
function selectTool(name, scroll = false) {
  if (!toolNames[name]) return;
  activeTool = name;
  document.querySelectorAll(".tool-card").forEach(card => card.classList.toggle("selected", card.dataset.tool === name));
  document.querySelectorAll(".tool-panel").forEach(panel => {
    const visible = panel.dataset.panel === name;
    panel.hidden = !visible;
    panel.classList.toggle("active", visible);
  });
  $("workspaceTitle").textContent = toolNames[name];
  showNotice("");
  if (scroll && window.matchMedia("(max-width: 720px)").matches) $("workspace").scrollIntoView({behavior:"smooth", block:"start"});
}
document.querySelectorAll(".tool-card").forEach(card => card.addEventListener("click", () => selectTool(card.dataset.tool, true)));

$("toolSearch").addEventListener("input", () => {
  const q = $("toolSearch").value.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll(".tool-card").forEach(card => {
    const match = `${card.textContent} ${card.dataset.tool}`.toLowerCase().includes(q);
    card.hidden = !match;
    if (match) visible++;
  });
  $("toolCount").textContent = String(visible).padStart(2,"0");
});
document.addEventListener("keydown", event => {
  if (event.key === "/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault(); $("toolSearch").focus();
  }
  if (event.key === "Escape" && document.activeElement === $("toolSearch")) {
    $("toolSearch").value = ""; $("toolSearch").dispatchEvent(new Event("input")); $("toolSearch").blur();
  }
});

// Secure random number uses crypto.getRandomValues with rejection sampling.
function secureInt(min, max) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) throw new Error("Enter valid integer limits (minimum must not exceed maximum).");
  const range = max - min + 1;
  if (!Number.isSafeInteger(range) || range <= 0 || range > 2 ** 32) throw new Error("Range is too large. Use a range within 2^32.");
  const limit = Math.floor(2 ** 32 / range) * range;
  const buf = new Uint32Array(1);
  let value;
  do { crypto.getRandomValues(buf); value = buf[0]; } while (value >= limit);
  return min + (value % range);
}
$("generateRandom").addEventListener("click", () => {
  try {
    const value = secureInt(Number($("randomMin").value), Number($("randomMax").value));
    $("randomResult").querySelector("strong").textContent = value;
    showNotice("Random number generated.");
  } catch (e) { showNotice(e.message, true); }
});

$("passwordLength").addEventListener("input", () => $("passwordLengthLabel").textContent = $("passwordLength").value);
$("generatePassword").addEventListener("click", () => {
  let chars = "";
  if ($("pwUpper").checked) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if ($("pwLower").checked) chars += "abcdefghijklmnopqrstuvwxyz";
  if ($("pwNumbers").checked) chars += "0123456789";
  if ($("pwSymbols").checked) chars += "!@#$%^&*()-_=+[]{}?";
  if (!chars) return showNotice("Select at least one character type.", true);
  try {
    if (!globalThis.crypto?.getRandomValues) throw new Error("Secure random generation is not available in this browser. Open the site over HTTPS.");
    const length = Number($("passwordLength").value);
    // Rejection sampling avoids modulo bias when choosing characters.
    const result = [];
    const limit = Math.floor(256 / chars.length) * chars.length;
    const buf = new Uint8Array(1);
    while (result.length < length) {
      crypto.getRandomValues(buf);
      if (buf[0] < limit) result.push(chars[buf[0] % chars.length]);
    }
    $("passwordResult").textContent = result.join("");
    showNotice("Password generated locally.");
  } catch (e) {
    $("passwordResult").textContent = "";
    showNotice(e.message || "Password generation failed.", true);
  }
});

// Arithmetic parser: supports only numeric literals, parentheses, unary +/- and basic arithmetic.
function calculateExpression(input) {
  const s = input.replace(/\s+/g, "");
  if (!s || s.length > 120) throw new Error("Enter an expression up to 120 characters.");
  let i = 0, operations = 0;
  function expr() {
    let value = term();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i++], rhs = term(); value = op === "+" ? value + rhs : value - rhs; operations++;
      check(value);
    }
    return value;
  }
  function term() {
    let value = unary();
    while (["*","/","%"].includes(s[i])) {
      const op = s[i++], rhs = unary();
      if ((op === "/" || op === "%") && rhs === 0) throw new Error("Cannot divide by zero.");
      value = op === "*" ? value * rhs : op === "/" ? value / rhs : value % rhs; operations++; check(value);
    }
    return value;
  }
  function unary() {
    if (s[i] === "+") { i++; return unary(); }
    if (s[i] === "-") { i++; return -unary(); }
    return power();
  }
  function power() {
    let value = atom();
    if (s.slice(i, i + 2) === "**") {
      i += 2; const exponent = unary();
      if (Math.abs(exponent) > 100 || Math.abs(value) > 1e12) throw new Error("Power is too large.");
      value = value ** exponent; operations++; check(value);
    }
    return value;
  }
  function atom() {
    if (s[i] === "(") {
      i++; const value = expr();
      if (s[i] !== ")") throw new Error("Missing closing parenthesis.");
      i++; return value;
    }
    const match = s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match) throw new Error("Invalid expression. Use numbers and + - * / % ** ( ).");
    i += match[0].length;
    const n = Number(match[0]); check(n); return n;
  }
  function check(n) { if (!Number.isFinite(n) || Math.abs(n) > 1e100) throw new Error("Result is too large or not finite."); }
  const result = expr();
  if (i !== s.length) throw new Error("Unexpected characters in expression.");
  if (operations > 80) throw new Error("Too many operations.");
  return result;
}
$("calculate").addEventListener("click", () => {
  try { $("calcResult").textContent = String(calculateExpression($("calcInput").value)); showNotice("Calculation complete."); }
  catch (e) { $("calcResult").textContent = "—"; showNotice(e.message, true); }
});
$("calcInput").addEventListener("keydown", e => { if (e.key === "Enter") $("calculate").click(); });

document.querySelectorAll("[data-text-action]").forEach(button => button.addEventListener("click", () => {
  const text = $("textInput").value;
  const action = button.dataset.textAction;
  let result;
  if (action === "upper") result = text.toUpperCase();
  if (action === "lower") result = text.toLowerCase();
  if (action === "reverse") result = Array.from(text).reverse().join("");
  if (action === "count") result = `Characters (with spaces): ${Array.from(text).length}\nCharacters (without spaces): ${Array.from(text.replace(/\s/g,"")).length}\nWords: ${text.trim() ? text.trim().split(/\s+/).length : 0}\nLetters: ${Array.from(text).filter(c=>/\p{L}/u.test(c)).length}\nDigits: ${Array.from(text).filter(c=>/\p{N}/u.test(c)).length}\nLines: ${text ? text.split(/\r\n|\r|\n/).length : 0}`;
  $("textResult").textContent = result;
  showNotice("Text processed.");
}));

async function lookupIp() {
  const input = $("ipInput").value.trim();
  if (input && !/^[0-9a-fA-F:.]+$/.test(input)) {
    $("ipResult").textContent = "Enter a valid IPv4 or IPv6 address."; return showNotice("Invalid IP address format.", true);
  }
  $("ipResult").textContent = "Looking up…";
  try {
    const url = input ? `https://ipwho.is/${encodeURIComponent(input)}` : "https://ipwho.is/";
    const response = await fetch(url, {headers: {"Accept":"application/json"}});
    if (!response.ok) throw new Error(`Service returned HTTP ${response.status}`);
    const data = await response.json();
    if (data.success === false) throw new Error(data.message || "Lookup failed.");
    const c = data.connection || {}, tz = data.timezone || {};
    $("ipResult").textContent = [
      `IP: ${data.ip || "N/A"}`, `Country: ${data.country || "N/A"}`,
      `Region: ${data.region || "N/A"}`, `City: ${data.city || "N/A"}`,
      `Postal: ${data.postal || "N/A"}`, `ISP: ${c.isp || "N/A"}`,
      `Organization: ${c.org || "N/A"}`, `ASN: ${c.asn || "N/A"}`,
      `Coordinates: ${data.latitude ?? "N/A"}, ${data.longitude ?? "N/A"}`,
      `Timezone: ${tz.id || "N/A"}`
    ].join("\n");
    showNotice("IP information loaded.");
  } catch (e) {
    $("ipResult").textContent = `Lookup failed: ${e.message}\nCheck your internet connection and try again.`;
    showNotice("IP lookup failed.", true);
  }
}
$("lookupIp").addEventListener("click", lookupIp);

$("scanQr").addEventListener("click", async () => {
  const file = $("qrFile").files[0];
  if (!file) return showNotice("Choose an image first.", true);
  if (!file.type.startsWith("image/")) return showNotice("Please select an image file.", true);
  $("qrResult").textContent = "Scanning image…";
  try {
    if (typeof jsQR !== "function") throw new Error("QR library did not load. Check your internet connection and refresh.");
    const bitmap = await createImageBitmap(file);
    const canvas = $("qrCanvas"), ctx = canvas.getContext("2d", {willReadFrequently:true});
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, {inversionAttempts:"attemptBoth"});
    $("qrResult").textContent = code ? code.data : "No QR code found. Try a clearer, higher-resolution image.";
    showNotice(code ? "QR code decoded." : "No QR code found.", !code);
  } catch (e) { $("qrResult").textContent = e.message; showNotice("QR scan failed.", true); }
});

$("base64Encode").addEventListener("click", () => {
  try {
    const bytes = new TextEncoder().encode($("base64Input").value);
    let binary = ""; bytes.forEach(b => binary += String.fromCharCode(b));
    $("base64Result").textContent = btoa(binary); showNotice("Base64 encoded.");
  } catch (e) { showNotice("Could not encode this text.", true); }
});
$("base64Decode").addEventListener("click", () => {
  try {
    const binary = atob($("base64Input").value.trim());
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    $("base64Result").textContent = new TextDecoder("utf-8", {fatal:true}).decode(bytes);
    showNotice("Base64 decoded.");
  } catch (e) { $("base64Result").textContent = "Invalid Base64 input or decoded data is not valid UTF-8."; showNotice("Could not decode Base64.", true); }
});
$("urlEncode").addEventListener("click", () => {
  $("urlResult").textContent = encodeURIComponent($("urlInput").value); showNotice("URL component encoded.");
});
$("urlDecode").addEventListener("click", () => {
  try { $("urlResult").textContent = decodeURIComponent($("urlInput").value); showNotice("URL component decoded."); }
  catch (e) { $("urlResult").textContent = "Invalid URL encoding."; showNotice("Could not decode URL component.", true); }
});

document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", async () => {
  const element = $(button.dataset.copy);
  const text = element.value ?? element.textContent;
  try {
    await navigator.clipboard.writeText(text);
    showNotice("Copied to clipboard.");
  } catch {
    const temp = document.createElement("textarea"); temp.value = text; document.body.appendChild(temp);
    temp.select(); const ok = document.execCommand("copy"); temp.remove();
    showNotice(ok ? "Copied to clipboard." : "Copy failed. Select and copy the text manually.", !ok);
  }
}));

$("year").textContent = new Date().getFullYear();
$("toolCount").textContent = String(document.querySelectorAll(".tool-card").length).padStart(2,"0");
