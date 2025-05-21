const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Cat face data
const catFaces = [
  {
    name: "Classic",
    draw: (catX, catY) => {
      // Draw border first for visibility
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#111";
      ctx.beginPath();
      ctx.ellipse(catX, catY, catRadiusX, catRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // Cat face
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(catX, catY, catRadiusX, catRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(catX - 15, catY - 7, 6, 0, Math.PI * 2);
      ctx.arc(catX + 15, catY - 7, 6, 0, Math.PI * 2);
      ctx.fill();
      // Nose
      ctx.fillStyle = '#f7c8b3';
      ctx.beginPath();
      ctx.ellipse(catX, catY + 12, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
];
let unlockedFaces = [0];
let selectedFace = 0;

const catX = 90;
let catY = canvas.height / 2;
let catVY = 0;
let gravity = 0.7;
let jumpPower = -10;
let gameStarted = false;
let inSelectionMode = unlockedFaces.length > 1;
const catRadiusX = 35;
const catRadiusY = 30;

// Obstacle properties and game difficulty
let broomWidth = 60;
let baseBroomGap = 260;
let minBroomGap = 120;
let broomGap = baseBroomGap;
let brooms = [];
let broomTimer = 0;
let baseBroomInterval = 120;
let minBroomInterval = 70;
let broomInterval = baseBroomInterval;
let broomSpeed = 2.5;
let maxBroomSpeed = 6;

let gameOver = false;
let score = 0;

// --- Drawing functions ---

function drawCatFace() {
  catFaces[selectedFace].draw(catX, catY);
}

function drawBrooms() {
  ctx.fillStyle = "#c28d60";
  for (let broom of brooms) {
    ctx.fillRect(broom.x, 0, broomWidth, broom.gapY - broom.gap / 2);
    ctx.fillRect(broom.x, broom.gapY + broom.gap / 2, broomWidth, canvas.height - (broom.gapY + broom.gap / 2));
  }
}

function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = "32px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20, 50);
}

function wrapText(text, x, y, maxWidth, lineHeight, maxLines, font, color, align="center") {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  let words = text.split(' ');
  let line = '';
  let lines = [];
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + ' ';
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
      if (lines.length === maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  ctx.restore();
}

function drawSelectionMenu() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#333";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Choose Your Cat Face", canvas.width / 2, 100);

  for (let i = 0; i < unlockedFaces.length; i++) {
    let x = canvas.width / 2 + (i - (unlockedFaces.length - 1) / 2) * 150;
    let y = canvas.height / 2;
    ctx.save();
    ctx.globalAlpha = (i === selectedFace) ? 1.0 : 0.5;
    catFaces[unlockedFaces[i]].draw(x, y);
    ctx.restore();
    if (i === selectedFace) {
      ctx.strokeStyle = "#0074d9";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, y, catRadiusX + 8, catRadiusY + 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  wrapText(
    "Use ←/→ or click to select, Enter/Space to confirm",
    canvas.width / 2,
    canvas.height - 80,
    canvas.width - 60,
    28,
    3,
    "28px Arial",
    "#333"
  );
}

// --- Game logic ---

function resetGame() {
  catY = canvas.height / 2;
  catVY = 0;
  broomGap = baseBroomGap;
  broomSpeed = 2.5;
  broomInterval = baseBroomInterval;
  brooms = [];
  broomTimer = 0;
  score = 0;
  gameOver = false;
  gameStarted = false;
  inSelectionMode = unlockedFaces.length > 1;
}

function updateBroomDifficulty() {
  // Smoothly decrease gap and interval, smoothly increase speed with score.
  // Use a nonlinear (logarithmic) scale for smooth but slowing progression.
  let logScore = Math.log2(1 + score);

  broomGap = Math.max(baseBroomGap - (baseBroomGap - minBroomGap) * (logScore / 8), minBroomGap);
  broomSpeed = Math.min(2.5 + (maxBroomSpeed - 2.5) * (logScore / 10), maxBroomSpeed);
  broomInterval = Math.max(baseBroomInterval - (baseBroomInterval - minBroomInterval) * (logScore / 10), minBroomInterval);
}

function checkCollision() {
  for (let broom of brooms) {
    if (
      catX + catRadiusX > broom.x && catX - catRadiusX < broom.x + broomWidth
    ) {
      if (
        catY - catRadiusY < broom.gapY - broom.gap / 2 ||
        catY + catRadiusY > broom.gapY + broom.gap / 2
      ) {
        return true;
      }
    }
  }
  if (catY > canvas.height - catRadiusY) {
    return true;
  }
  return false;
}

function update() {
  if (inSelectionMode) {
    drawSelectionMenu();
    return requestAnimationFrame(update);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameStarted && !gameOver) {
    catVY += gravity;
    catY += catVY;

    updateBroomDifficulty();

    broomTimer++;
    if (broomTimer >= broomInterval) {
      broomTimer = 0;
      const gapY = 100 + Math.random() * (canvas.height - 200);
      brooms.push({ x: canvas.width, gapY, gap: broomGap, passed: false });
    }
    for (let broom of brooms) {
      broom.x -= broomSpeed;
    }
    brooms = brooms.filter(broom => broom.x + broomWidth > 0);

    for (let broom of brooms) {
      if (!broom.passed && broom.x + broomWidth < catX - catRadiusX) {
        broom.passed = true;
        score++;
      }
    }

    drawBrooms();

    if (checkCollision()) {
      gameOver = true;
    }
  } else if (gameOver) {
    ctx.fillStyle = "#d32f2f";
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 32);

    wrapText(
      "Press SPACE, ENTER, or CLICK to restart",
      canvas.width / 2,
      canvas.height / 2 + 20,
      canvas.width - 60,
      28,
      3,
      "24px Arial",
      "#d32f2f"
    );
    drawBrooms();
  }

  drawCatFace();
  drawScore();

  if (!gameStarted && !gameOver && !inSelectionMode) {
    wrapText(
      "Press SPACE, ENTER, or CLICK to start",
      canvas.width / 2,
      canvas.height / 2 + 100,
      canvas.width - 60,
      26,
      3,
      "22px Arial",
      "#333"
    );
  }

  requestAnimationFrame(update);
}

// --- Controls ---

function triggerFlap() {
  if (inSelectionMode) {
    inSelectionMode = false;
    gameStarted = false;
    return;
  }
  if (!gameStarted) {
    resetGame();
    gameStarted = true;
  }
  if (!gameOver) {
    catVY = jumpPower;
  } else {
    resetGame();
    gameStarted = true;
  }
}

function selectFace(direction) {
  if (unlockedFaces.length <= 1) return;
  selectedFace = (selectedFace + direction + unlockedFaces.length) % unlockedFaces.length;
}

document.addEventListener('keydown', function (e) {
  if (inSelectionMode) {
    if (e.code === 'ArrowLeft') selectFace(-1);
    if (e.code === 'ArrowRight') selectFace(1);
    if (e.code === 'Space' || e.code === 'Enter') triggerFlap();
    return;
  }
  if (e.code === 'Space' || e.code === 'Enter') {
    triggerFlap();
  }
});

canvas.addEventListener('mousedown', function (e) {
  if (inSelectionMode) {
    for (let i = 0; i < unlockedFaces.length; i++) {
      let x = canvas.width / 2 + (i - (unlockedFaces.length - 1) / 2) * 150;
      let y = canvas.height / 2;
      let dx = e.offsetX - x;
      let dy = e.offsetY - y;
      if (Math.sqrt(dx * dx + dy * dy) < catRadiusX + 16) {
        selectedFace = i;
        triggerFlap();
        return;
      }
    }
    selectFace(1);
  } else {
    triggerFlap();
  }
});

canvas.addEventListener('touchstart', function (e) {
  triggerFlap();
});

// --- Start up ---
resetGame();
update();