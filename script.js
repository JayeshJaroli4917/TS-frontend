/**************** DEVICE DETECTION ****************/
const isTouchDevice =
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

/**************** KEYBOARD VARIABLES ****************/
let keyDownTimes = {};
let lastKeyReleaseTime = null;
let individualKeys = [];
let digraphs = [];

/**************** TOUCH VARIABLES ****************/
let touchKeystrokes = [];
let lastInputTime = null;
let lastValueLength = 0;

/**************** TEST CONTROL ****************/
let duration = 30;
let timerInterval;
let testCompleted = false;

/**************** DOM ELEMENTS ****************/
const area = document.getElementById("typingArea");
const startBtn = document.getElementById("startBtn");
const submitBtn = document.getElementById("submitBtn");
const timerDisplay = document.getElementById("timer");
const usernameInput = document.getElementById("username");
const referenceTextEl = document.getElementById("referenceText");

/**************** SECURITY RESTRICTIONS ****************/
document.addEventListener("contextmenu", e => e.preventDefault());
["copy", "paste", "cut", "drop"].forEach(evt =>
  document.addEventListener(evt, e => e.preventDefault())
);

document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

/**************** WORD GENERATOR ****************/
const DICTIONARY = [
  "time","people","year","day","way","thing","world","life","hand","part",
  "child","eye","place","work","week","case","point","government","company","number",
  "group","problem","fact","be","have","do","say","get","make","go",
  "know","take","see","come","think","look","want","give","use","find"
];

function generateRandomWords(count = 25) {
  return Array.from({ length: count }, () =>
    DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)]
  ).join(" ");
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

/**************** START TEST ****************/
startBtn.onclick = () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Enter username");
    return;
  }

  // Reset all data
  keyDownTimes = {};
  individualKeys = [];
  digraphs = [];
  touchKeystrokes = [];
  lastKeyReleaseTime = null;
  lastInputTime = null;
  lastValueLength = 0;
  testCompleted = false;
  duration = 30;

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

/**************** DESKTOP KEYBOARD CAPTURE ****************/
area.addEventListener("keydown", e => {
  if (!isTouchDevice && !keyDownTimes[e.code]) {
    keyDownTimes[e.code] = performance.now();
  }
});

area.addEventListener("keyup", e => {
  if (isTouchDevice) return;

  const releaseTime = performance.now();
  const pressTime = keyDownTimes[e.code];
  if (!pressTime) return;

  const holdTime = releaseTime - pressTime;
  const flightTime = lastKeyReleaseTime
    ? pressTime - lastKeyReleaseTime
    : 0;

  individualKeys.push({
    key: e.key,
    code: e.code,
    pressTime,
    releaseTime,
    holdTime_HT: holdTime,
    flightTime_FT: flightTime,
    device: "keyboard"
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
  delete keyDownTimes[e.code];
});

/**************** TOUCH KEYBOARD CAPTURE ****************/
area.addEventListener("input", () => {
  const now = performance.now();
  const value = area.value;

  extendWordsIfNeeded(value.length);

  if (!isTouchDevice) return;

  // Only capture additions (ignore deletions/autocorrect)
  if (value.length <= lastValueLength) {
    lastValueLength = value.length;
    return;
  }

  const char = value[value.length - 1];
  const flightTime = lastInputTime ? now - lastInputTime : 0;

  touchKeystrokes.push({
    key: char,
    timestamp: now,
    flightTime_FT: flightTime,
    device: "touch"
  });

  lastInputTime = now;
  lastValueLength = value.length;
});

/**************** SUBMIT DATA ****************/
submitBtn.onclick = async () => {
  if (!testCompleted) return;

  submitBtn.disabled = true;

  const payload = {
    username: usernameInput.value.trim(),
    typedText: area.value.trim(),
    charCount: area.value.trim().length,
    timestamp: new Date().toISOString(),
    deviceType: isTouchDevice ? "touch" : "keyboard",
    individualKeys,
    digraphs,
    touchKeystrokes
  };

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

      alert("Data submitted Successfully!");
    } catch (err) {
    alert("Submission failed. Try again.");
    submitBtn.disabled = false;
  }
};
