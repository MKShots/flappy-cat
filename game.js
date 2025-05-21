const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Cat face data
const catFaces = [
  {
    name: "Classic",
    draw: (catX, catY) => {
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
  // Future faces can be added here
];
let unlockedFaces = [0]; // Indexes of unlocked faces
let selectedFace = 0;

// Cat properties
const catX = 90;
let catY = canvas.height / 2;
let catVY = 0;
let gravity = 0.7;
let jumpPower = -10;
let gameStarted = false;
let inSelectionMode = true; // Show face select before game

const catRadiusX = 35;
const catRadiusY = 30;

// Obstacle properties (will adjust with score)
let broomWidth = 60;
let baseBroomGap = 220; // Start wide
let minBroomGap = 110; // Tightest
let broomGap = baseBroomGap;
let brooms = [];
let broomTimer = 0;
let broomInterval = 90; // Frames between brooms
let broomSpeed = 3;
let maxBroomSpeed = 8;

// Game state
let gameOver = false;
let score = 0;

// --- Drawing functions ---

function drawCatFace() {
  catFaces[selectedFace].draw(catX, catY);
}

function drawBrooms() {
  ctx.fillStyle = "#c28d60";
  for (let broom of brooms) {
    // Top broom
    ctx.fillRect(broom.x, 0, broomWidth, broom.gapY - broom.gap / 2);
    // Bottom broom
    ctx.fillRect(broom.x, broom.gapY + broom.gap / 2, broomWidth, canvas.height - (broom.gapY + broom.gap / 2));
  }
}

function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = "32px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20, 50);
}

function drawSelectionMenu() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#333";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Choose Your Cat Face", canvas.width / 2, 100);

  // Draw unlocked faces
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

  ctx.fillStyle = "#333";
  ctx.font = "28px Arial";
  ctx.fillText("Use ←/→ or click to select, Enter/Space to confirm", canvas.width / 2, canvas.height - 80);
}

// --- Game logic ---

function resetGame() {
  catY = canvas.height / 2;
  catVY = 0;
  // Dynamic broom settings
  broomGap = baseBroomGap;
  broomSpeed = 3;
  brooms = [];
  broomTimer = 0;
  score = 0;
  gameOver = false;
  gameStarted = false;
  inSelectionMode = unlockedFaces.length > 1; // If more than 1 face, show selection
}

function updateBroomDifficulty() {
  // Gradually decrease gap and increase speed, up to min/max
  // e.g., every 5 points, adjust a little, up to score 25
  let level = Math.min(score, 25);
  broomGap = baseBroomGap - ((baseBroomGap - minBroomGap) * level / 25);
  broomSpeed = 3 + ((maxBroomSpeed - 3) * level / 25);
}

function checkCollision() {
  for (let broom of brooms) {
    if (
      catX + catRadiusX > broom.x && catX - catRadiusX < broom.x + broomWidth
    ) {
      // Check vertical collision (outside gap)
      if (
        catY - catRadiusY < broom.gapY - broom.gap / 2 ||
        catY + catRadiusY > broom.gapY + broom.gap / 2
      ) {
        return true;
      }
    }
  }
  // Only bottom out-of-bounds is game over
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
    // Move and draw brooms
    for (let broom of brooms) {
      broom.x -= broomSpeed;
    }
    // Remove offscreen brooms
    brooms = brooms.filter(broom => broom.x + broomWidth > 0);

    // Update score
    for (let broom of brooms) {
      if (!broom.passed && broom.x + broomWidth < catX - catRadiusX) {
        broom.passed = true;
        score++;
        // Example unlock logic: unlock second face at 10 points (if you have more faces)
        // if (score === 10 && !unlockedFaces.includes(1)) unlockedFaces.push(1);
      }
    }

    drawBrooms();

    if (checkCollision()) {
      gameOver = true;
    }
  } else if (gameOver) {
    ctx.fillStyle = "#d32f2f";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "32px Arial";
    ctx.fillText("Press SPACE/ENTER/CLICK to restart", canvas.width / 2, canvas.height / 2 + 40);
    drawBrooms();
  }

  drawCatFace();
  drawScore();

  if (!gameStarted && !gameOver && !inSelectionMode) {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE/ENTER/CLICK to start', canvas.width / 2, canvas.height / 2 + 100);
  }

  requestAnimationFrame(update);
}

// --- Controls ---

function triggerFlap() {
  if (inSelectionMode) {
    // Confirm face selection
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

// Handle face selection navigation
function selectFace(direction) {
  if (unlockedFaces.length <= 1) return;
  selectedFace = (selectedFace + direction + unlockedFaces.length) % unlockedFaces.length;
}

// Keyboard controls
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

// Mouse controls
canvas.addEventListener('mousedown', function (e) {
  if (inSelectionMode) {
    // Detect face click
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
    // Otherwise, cycle to next face
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