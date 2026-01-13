let keyDownTimes = {};
let lastKeyReleaseTime = null;

let individualKeys = [];
let digraphs = [];

let duration = 300;
let timerInterval;
let testCompleted = false;

// 🔹 Mobile helpers
let lastValue = "";
let lastInputTime = null;

const area = document.getElementById("typingArea");
const startBtn = document.getElementById("startBtn");
const submitBtn = document.getElementById("submitBtn");
const timerDisplay = document.getElementById("timer");
const usernameInput = document.getElementById("username");
const referenceTextEl = document.getElementById("referenceText");

/* ---------------- ANTI-CHEAT ---------------- */
document.addEventListener("contextmenu", e => e.preventDefault());
["copy", "paste", "cut", "drop"].forEach(evt => {
  document.addEventListener(evt, e => e.preventDefault());
});
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey) {
    if (["c", "v", "x"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }
});

/* ---------------- DICTIONARY ---------------- */
const DICTIONARY = [
  "time","people","year","day","way","thing","world","life","hand","part",
  "child","eye","place","work","week","case","point","government","company","number",
  "group","problem","fact","be","have","do","say","get","make","go",
  "know","take","see","come","think","look","want","give","use","find",
  "tell","ask","work","seem","feel","try","leave","call","good","new",
  "first","last","long","great","little","own","other","old","right","big",
  "high","different","small","large","next","early","young","important","few","public",
  "software","hardware","network","keyboard","screen","mouse","server","client",
  "database","program","code","logic","algorithm","variable","function","object",
  "class","method","framework","library","frontend","backend","api","request",
  "response","security","performance","memory","storage","cloud"
];

function generateRandomWords(count = 25) {
  let words = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * DICTIONARY.length);
    words.push(DICTIONARY[index]);
  }
  return words.join(" ");
}

let referenceText = "";

function loadInitialWords() {
  referenceText = generateRandomWords(25);
  referenceTextEl.textContent = referenceText;
}

function extendWordsIfNeeded(typedLength) {
  if (typedLength + 100 > referenceText.length) {
    referenceText += " " + generateRandomWords(20);
    referenceTextEl.textContent = referenceText;
  }
}

/* ---------------- START TEST ---------------- */
startBtn.onclick = () => {
  keyDownTimes = {};
  lastKeyReleaseTime = null;
  individualKeys = [];
  digraphs = [];
  testCompleted = false;
  duration = 300;

  lastValue = "";
  lastInputTime = null;

  area.value = "";
  area.disabled = false;
  area.focus();

  startBtn.disabled = true;
  submitBtn.disabled = true;

  loadInitialWords();

  timerDisplay.textContent = "Time Left: 5:00";

  timerInterval = setInterval(() => {
    duration--;
    timerDisplay.textContent =
      `Time Left: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;

    if (duration <= 0) {
      clearInterval(timerInterval);
      area.disabled = true;
      testCompleted = true;
      submitBtn.disabled = false;
      alert("Time Over! You can now submit.");
    }
  }, 1000);
};

/* ---------------- TEXT EXTENSION ---------------- */
area.addEventListener("input", () => {
  extendWordsIfNeeded(area.value.length);
});

/* ================= DESKTOP KEYBOARD ================= */
area.addEventListener("keydown", e => {
  if (!keyDownTimes[e.code]) {
    keyDownTimes[e.code] = performance.now();
  }
});

area.addEventListener("keyup", e => {
  const releaseTime = performance.now();
  const pressTime = keyDownTimes[e.code];
  if (!pressTime) return;

  recordKeystroke(e.key, e.code, pressTime, releaseTime);
  delete keyDownTimes[e.code];
});

/* ================= MOBILE / TOUCH KEYBOARD ================= */
area.addEventListener("input", e => {
  const now = performance.now();
  const currentValue = e.target.value;

  if (currentValue.length > lastValue.length) {
    const key = currentValue[currentValue.length - 1];
    const pressTime = lastInputTime || now;
    const releaseTime = now;

    recordKeystroke(key, "touch", pressTime, releaseTime);
    lastInputTime = now;
  }

  lastValue = currentValue;
});

/* ---------------- COMMON RECORD FUNCTION ---------------- */
function recordKeystroke(key, code, pressTime, releaseTime) {
  const holdTime = releaseTime - pressTime;
  const flightTime = lastKeyReleaseTime
    ? pressTime - lastKeyReleaseTime
    : 0;

  individualKeys.push({
    key,
    code,
    pressTime,
    releaseTime,
    holdTime_HT: holdTime,
    flightTime_FT: flightTime
  });

  if (individualKeys.length >= 2) {
    const k1 = individualKeys[individualKeys.length - 2];
    const k2 = individualKeys[individualKeys.length - 1];

    digraphs.push({
      digraph: k1.key + k2.key,
      PP: k2.pressTime - k1.pressTime,
      RP: k2.pressTime - k1.releaseTime,
      RR: k2.releaseTime - k1.releaseTime,
      PR: k2.releaseTime - k1.pressTime,
      D: k2.releaseTime - k1.pressTime
    });
  }

  lastKeyReleaseTime = releaseTime;
}

/* ---------------- SUBMIT ---------------- */
submitBtn.onclick = async () => {
  if (!testCompleted) return;

  const payload = {
    username: usernameInput.value.trim(),
    typedText: area.value.trim(),
    charCount: area.value.length,
    timestamp: new Date().toISOString(),
    device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    individualKeys,
    digraphs
  };

  submitBtn.disabled = true;

  try {
    const response = await fetch(
      "https://ts-backend-seven.vercel.app/api/submit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) throw new Error();
    alert("Data submitted successfully!");
  } catch (err) {
    alert("Submission failed. Try again.");
    submitBtn.disabled = false;
  }
};
