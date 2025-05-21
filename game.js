const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Cat properties
let catY = canvas.height / 2;
let catVY = 0;
let gravity = 0.7;
let jumpPower = -10;
let gameStarted = false;

// Obstacle properties
const broomWidth = 60;
const broomGap = 170;
let brooms = [];
let broomTimer = 0;
let broomInterval = 90; // Frames between brooms

// Game state
let gameOver = false;
let score = 0;

// Draw cat face
function drawCatFace() {
  // Cat face
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(200, catY, 60, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(185, catY - 10, 7, 0, Math.PI * 2);
  ctx.arc(215, catY - 10, 7, 0, Math.PI * 2);
  ctx.fill();
  // Nose
  ctx.fillStyle = '#f7c8b3';
  ctx.beginPath();
  ctx.ellipse(200, catY + 20, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBrooms() {
  ctx.fillStyle = "#c28d60";
  for (let broom of brooms) {
    // Top broom
    ctx.fillRect(broom.x, 0, broomWidth, broom.gapY - broomGap / 2);
    // Bottom broom
    ctx.fillRect(broom.x, broom.gapY + broomGap / 2, broomWidth, canvas.height - (broom.gapY + broomGap / 2));
  }
}

function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = "32px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20, 50);
}

function resetGame() {
  catY = canvas.height / 2;
  catVY = 0;
  brooms = [];
  broomTimer = 0;
  score = 0;
  gameOver = false;
  gameStarted = false;
}

// Collision detection
function checkCollision() {
  for (let broom of brooms) {
    if (
      200 + 60 > broom.x && 200 - 60 < broom.x + broomWidth // Cat overlaps horizontally
    ) {
      // Check vertical collision (outside gap)
      if (
        catY - 50 < broom.gapY - broomGap / 2 ||
        catY + 50 > broom.gapY + broomGap / 2
      ) {
        return true;
      }
    }
  }
  // Out of bounds
  if (catY < 50 || catY > canvas.height - 50) {
    return true;
  }
  return false;
}

// Game loop
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ground and ceiling reference lines
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 50);
  ctx.lineTo(canvas.width, canvas.height - 50);
  ctx.stroke();

  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 50);
  ctx.lineTo(canvas.width, 50);
  ctx.stroke();

  if (gameStarted && !gameOver) {
    catVY += gravity;
    catY += catVY;

    // Broom logic
    broomTimer++;
    if (broomTimer >= broomInterval) {
      broomTimer = 0;
      const gapY = 100 + Math.random() * (canvas.height - 200);
      brooms.push({ x: canvas.width, gapY, passed: false });
    }
    // Move and draw brooms
    for (let broom of brooms) {
      broom.x -= 3;
    }
    // Remove offscreen brooms
    brooms = brooms.filter(broom => broom.x + broomWidth > 0);

    // Update score
    for (let broom of brooms) {
      if (!broom.passed && broom.x + broomWidth < 200 - 60) {
        broom.passed = true;
        score++;
      }
    }

    drawBrooms();

    // Collision
    if (checkCollision()) {
      gameOver = true;
    }
  } else if (gameOver) {
    ctx.fillStyle = "#d32f2f";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "32px Arial";
    ctx.fillText("Press SPACE to restart", canvas.width / 2, canvas.height / 2 + 40);
    drawBrooms();
  }

  drawCatFace();
  drawScore();

  if (!gameStarted && !gameOver) {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2 + 100);
  }

  requestAnimationFrame(update);
}

// Jump on space
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space') {
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
});

// Start
resetGame();
update();