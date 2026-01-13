let keyDownTimes = {};
let lastKeyReleaseTime = null;

let individualKeys = [];
let digraphs = [];

let lastValue = "";
let lastInputTime = null;

const area = document.getElementById("typingArea");
const startBtn = document.getElementById("startBtn");
const submitBtn = document.getElementById("submitBtn");
const timerDisplay = document.getElementById("timer");
const usernameInput = document.getElementById("username");

let duration = 60;
let timerInterval;
let testStarted = false;

// ---------------- TIMER ----------------
startBtn.onclick = () => {
  if (testStarted) return;

  testStarted = true;
  let timeLeft = duration;
  timerDisplay.textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      area.disabled = true;
    }
  }, 1000);
};

// ---------------- DESKTOP KEYBOARD ----------------
area.addEventListener("keydown", (e) => {
  if (!keyDownTimes[e.code]) {
    keyDownTimes[e.code] = performance.now();
  }
});

area.addEventListener("keyup", (e) => {
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
    flightTime_FT: flightTime
  });

  if (individualKeys.length >= 2) {
    const k1 = individualKeys[individualKeys.length - 2];
    const k2 = individualKeys[individualKeys.length - 1];

    digraphs.push({
      digraph: k1.key + k2.key,
      PP: k2.pressTime - k1.pressTime,
      RR: k2.releaseTime - k1.releaseTime,
      PR: k2.releaseTime - k1.pressTime,
      RP: k2.pressTime - k1.releaseTime
    });
  }

  lastKeyReleaseTime = releaseTime;
  delete keyDownTimes[e.code];
});

// ---------------- MOBILE / TOUCH KEYBOARD ----------------
area.addEventListener("input", (e) => {
  const now = performance.now();
  const currentValue = e.target.value;

  if (currentValue.length > lastValue.length) {
    const key = currentValue[currentValue.length - 1];

    const pressTime = lastInputTime || now;
    const releaseTime = now;

    const holdTime = releaseTime - pressTime;
    const flightTime = lastKeyReleaseTime
      ? pressTime - lastKeyReleaseTime
      : 0;

    individualKeys.push({
      key: key,
      code: "touch",
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
        RR: k2.releaseTime - k1.releaseTime,
        PR: k2.releaseTime - k1.pressTime,
        RP: k2.pressTime - k1.releaseTime
      });
    }

    lastKeyReleaseTime = releaseTime;
    lastInputTime = now;
  }

  lastValue = currentValue;
});

// ---------------- SUBMIT ----------------
submitBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Enter username");
    return;
  }

  const payload = {
    username,
    text: area.value,
    individualKeys,
    digraphs,
    device: /Mobi|Android/i.test(navigator.userAgent)
      ? "mobile"
      : "desktop",
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch("https://keylogger-delta.vercel.app/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    alert("Data submitted successfully");
    console.log(data);
  } catch (err) {
    alert("Submission failed");
    console.error(err);
  }
};
