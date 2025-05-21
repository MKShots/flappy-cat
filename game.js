const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Cat geometry
const catX = 90;
const catHeadRadiusX = 27; // Reduced head width
const catHeadRadiusY = 21; // Reduced head height
const earHeight = 22;      // Ear extends this far above the top of the head
const catRadiusX = catHeadRadiusX; // For hitbox, width is head width
const catRadiusY = catHeadRadiusY + earHeight; // For hitbox, height is head + ears

// Cat face data
const catFaces = [
  {
    name: "Classic",
    draw: (catX, catY) => {
      // Draw ears (outer triangles)
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2.5;
      // Left ear outer
      ctx.beginPath();
      ctx.moveTo(catX - 17, catY - catHeadRadiusY + 2);                    // left base
      ctx.lineTo(catX - 34, catY - catHeadRadiusY - earHeight);            // tip
      ctx.lineTo(catX - 3, catY - catHeadRadiusY - 2);                     // right base
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Right ear outer
      ctx.beginPath();
      ctx.moveTo(catX + 17, catY - catHeadRadiusY + 2);
      ctx.lineTo(catX + 34, catY - catHeadRadiusY - earHeight);
      ctx.lineTo(catX + 3, catY - catHeadRadiusY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Ears (inner pink triangles)
      ctx.fillStyle = "#f7c8b3";
      // Left inner
      ctx.beginPath();
      ctx.moveTo(catX - 17, catY - catHeadRadiusY + 2);
      ctx.lineTo(catX - 29, catY - catHeadRadiusY - earHeight + 5);
      ctx.lineTo(catX - 8, catY - catHeadRadiusY - 3);
      ctx.closePath();
      ctx.fill();
      // Right inner
      ctx.beginPath();
      ctx.moveTo(catX + 17, catY - catHeadRadiusY + 2);
      ctx.lineTo(catX + 29, catY - catHeadRadiusY - earHeight + 5);
      ctx.lineTo(catX + 8, catY - catHeadRadiusY - 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Face border
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#111";
      ctx.beginPath();
      ctx.ellipse(catX, catY, catHeadRadiusX, catHeadRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Cat face fill
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(catX, catY, catHeadRadiusX, catHeadRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (bigger, lower, cuter, with highlights)
      // Left eye
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(catX - 10, catY - 3, 5.5, 7, -0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
      // Highlight
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(catX - 12, catY - 7, 1.6, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Right eye
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(catX + 10, catY - 3, 5.5, 7, 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(catX + 8, catY - 7, 1.6, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Nose (small pink triangle)
      ctx.save();
      ctx.fillStyle = "#f7c8b3";
      ctx.beginPath();
      ctx.moveTo(catX, catY + 4);
      ctx.lineTo(catX - 4, catY + 9);
      ctx.lineTo(catX + 4, catY + 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Smile (arc)
      ctx.save();
      ctx.strokeStyle = "#a86a3d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(catX, catY + 13, 8, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();
      ctx.restore();

      // Whiskers (do not affect collision)
      ctx.save();
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 1.6;
      // Left whiskers
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(catX - 5, catY + 5 + i * 4);
        ctx.lineTo(catX - 30, catY + 4 + i * 9);
        ctx.stroke();
      }
      // Right whiskers
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(catX + 5, catY + 5 + i * 4);
        ctx.lineTo(catX + 30, catY + 4 + i * 9);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
];
let unlockedFaces = [0];
let selectedFace = 0;

let catY = canvas.height / 2;
let catVY = 0;
let gravity = 0.7;
let jumpPower = -10;
let gameStarted = false;
let inSelectionMode = unlockedFaces.length > 1;

// Obstacle properties and game difficulty
let broomWidth = 60;
let baseBroomGap = 320;      // Wider gap
let minBroomGap = 190;       // Wider minimum gap
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
      ctx.ellipse(x, y, catHeadRadiusX + 10, catHeadRadiusY + earHeight + 10, 0, 0, Math.PI * 2);
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
      const gapY = 60 + Math.random() * (canvas.height - 120);
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
      if (Math.sqrt(dx * dx + dy * dy) < catHeadRadiusX + earHeight + 14) {
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