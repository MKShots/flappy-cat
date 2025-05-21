// --- Responsive Flappy Cat Game ---
// Cat face inspired by uploaded image ![image1](image1)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Responsive canvas settings
let baseWidth = 400, baseHeight = 600; // Reference size for scaling
let scale = 1;

// --- Game variables (will be rescaled in resizeCanvas) ---
let catX, catY, catRadius, earHeight, earWidth, eyeRadius, noseSize, mouthWidth, mouthHeight;
let catHitboxY, catHitboxR;
let groundY, ceilingY, broomWidth, broomGap, broomMinGap, broomBaseGap, broomSpeed, broomBaseSpeed;
let brooms, broomTimer, broomInterval, broomBaseInterval, minBroomInterval;
let gravity, jumpPower;
let gameStarted, inSelectionMode, gameOver, score, catVY;
let unlockedFaces, selectedFace;

// --- Responsive scaling function ---
function resizeCanvas() {
  // Resize canvas to fit window, but keep aspect ratio
  let ww = window.innerWidth, wh = window.innerHeight;
  let targetW = Math.min(ww - 10, 500);
  let targetH = Math.min(wh - 10, 800);
  // Keep 2:3 aspect
  if (targetW/targetH > 2/3) targetW = targetH * 2/3;
  if (targetH/targetW > 1.5) targetH = targetW * 1.5;
  canvas.width = targetW;
  canvas.height = targetH;
  scale = canvas.width / baseWidth;

  // Rescale game variables
  catX = Math.round(canvas.width * 0.22);
  catRadius = Math.round(60 * scale);
  earHeight = Math.round(38 * scale);
  earWidth = Math.round(32 * scale);
  catY = canvas.height / 2;
  catHitboxY = catY;
  catHitboxR = catRadius + earHeight * 0.75;

  eyeRadius = Math.round(16 * scale);
  noseSize = Math.round(9 * scale);
  mouthWidth = Math.round(18 * scale);
  mouthHeight = Math.round(13 * scale);

  groundY = canvas.height - Math.round(25 * scale);
  ceilingY = Math.round(25 * scale);

  broomWidth = Math.round(48 * scale);
  broomBaseGap = Math.round(2.1 * catHitboxR); // very wide gap
  broomMinGap = Math.round(1.5 * catHitboxR); // minimum gap (still wide)
  broomGap = broomBaseGap;

  broomBaseSpeed = 2.2 * scale;
  broomSpeed = broomBaseSpeed;

  broomBaseInterval = Math.round(115 * scale);
  minBroomInterval = Math.round(70 * scale);
  broomInterval = broomBaseInterval;

  gravity = 0.56 * scale;
  jumpPower = -8 * scale;

  // If brooms already exist, adjust their positions
  if (brooms) {
    for (let broom of brooms) {
      broom.x = Math.round(broom.x * canvas.width / baseWidth);
    }
  }
}

// --- Cat drawing inspired by image ---
function drawCatFace(x, y) {
  // Ears
  ctx.save();
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  // Left ear
  ctx.beginPath();
  ctx.moveTo(x - catRadius * 0.55, y - catRadius * 0.8);
  ctx.lineTo(x - catRadius * 0.55 - earWidth/2, y - catRadius * 0.8 - earHeight);
  ctx.lineTo(x - catRadius * 0.1, y - catRadius * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Left inner
  ctx.fillStyle = "#f7c8b3";
  ctx.beginPath();
  ctx.moveTo(x - catRadius * 0.51, y - catRadius * 0.82);
  ctx.lineTo(x - catRadius * 0.55 - earWidth/2 + earWidth*0.23, y - catRadius * 0.8 - earHeight+earHeight*0.4);
  ctx.lineTo(x - catRadius * 0.13, y - catRadius * 0.93);
  ctx.closePath();
  ctx.fill();
  // Right ear
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(x + catRadius * 0.55, y - catRadius * 0.8);
  ctx.lineTo(x + catRadius * 0.55 + earWidth/2, y - catRadius * 0.8 - earHeight);
  ctx.lineTo(x + catRadius * 0.1, y - catRadius * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Right inner
  ctx.fillStyle = "#f7c8b3";
  ctx.beginPath();
  ctx.moveTo(x + catRadius * 0.51, y - catRadius * 0.82);
  ctx.lineTo(x + catRadius * 0.55 + earWidth/2 - earWidth*0.23, y - catRadius * 0.8 - earHeight+earHeight*0.4);
  ctx.lineTo(x + catRadius * 0.13, y - catRadius * 0.93);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Head (circle)
  ctx.save();
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x, y, catRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Eyes
  ctx.save();
  ctx.fillStyle = "#111";
  // Left eye
  ctx.beginPath();
  ctx.arc(x - catRadius * 0.38, y - catRadius * 0.13, eyeRadius, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - catRadius * 0.38 - eyeRadius*0.35, y - catRadius * 0.13 - eyeRadius*0.35, eyeRadius*0.4, eyeRadius*0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  // Right eye
  ctx.beginPath();
  ctx.arc(x + catRadius * 0.38, y - catRadius * 0.13, eyeRadius, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + catRadius * 0.38 + eyeRadius*0.35, y - catRadius * 0.13 - eyeRadius*0.35, eyeRadius*0.4, eyeRadius*0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Nose (triangle)
  ctx.save();
  ctx.fillStyle = "#f7c8b3";
  ctx.beginPath();
  ctx.moveTo(x, y + catRadius * 0.06);
  ctx.lineTo(x - noseSize/2, y + catRadius * 0.16);
  ctx.lineTo(x + noseSize/2, y + catRadius * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Smile (gentle W)
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.2 * scale;
  ctx.beginPath();
  let smileY = y + catRadius * 0.21;
  ctx.moveTo(x - mouthWidth/2, smileY);
  ctx.bezierCurveTo(
    x - mouthWidth/2 + mouthWidth*0.2, smileY + mouthHeight*0.5,
    x - mouthWidth*0.1, smileY + mouthHeight*0.7,
    x, smileY + mouthHeight*0.3
  );
  ctx.bezierCurveTo(
    x + mouthWidth*0.1, smileY + mouthHeight*0.7,
    x + mouthWidth/2 - mouthWidth*0.2, smileY + mouthHeight*0.5,
    x + mouthWidth/2, smileY
  );
  ctx.stroke();
  ctx.restore();

  // Cheek dots (freckles)
  ctx.save();
  ctx.fillStyle = "#111";
  let cheekY = y + catRadius*0.17;
  ctx.beginPath();
  ctx.arc(x - catRadius*0.48, cheekY, scale*2, 0, Math.PI*2);
  ctx.arc(x + catRadius*0.48, cheekY, scale*2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // Whiskers
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.5 * scale;
  // Left whiskers
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x - catRadius*0.18, y + catRadius*0.14 + i*scale*7);
    ctx.lineTo(x - catRadius*0.78, y + catRadius*0.12 + i*scale*13);
    ctx.stroke();
  }
  // Right whiskers
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + catRadius*0.18, y + catRadius*0.14 + i*scale*7);
    ctx.lineTo(x + catRadius*0.78, y + catRadius*0.12 + i*scale*13);
    ctx.stroke();
  }
  ctx.restore();
}

// --- Collision uses circular hitbox (includes ears, not whiskers) ---
function catHitbox() {
  return {x: catX, y: catY - earHeight*0.5, r: catHitboxR};
}
function checkCollision() {
  let hit = catHitbox();
  for (let broom of brooms) {
    // Check horizontal overlap
    if (hit.x + hit.r > broom.x && hit.x - hit.r < broom.x + broomWidth) {
      // Check vertical collision (outside gap)
      if (
        hit.y - hit.r < broom.gapY - broom.gap/2 ||
        hit.y + hit.r > broom.gapY + broom.gap/2
      ) {
        return true;
      }
    }
  }
  // Touching the bottom = game over
  if (catY + catRadius > groundY) return true;
  return false;
}

// --- Drawing functions (score, UI, etc) ---
function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = `${Math.round(32 * scale)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20 * scale, 48 * scale);
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
  ctx.font = `bold ${Math.round(32*scale)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("Choose Your Cat Face", canvas.width / 2, 100 * scale);
  // Only 1 face for now
  drawCatFace(canvas.width/2, canvas.height/2);
  wrapText(
    "Use ←/→ or click to select, Enter/Space to confirm",
    canvas.width / 2,
    canvas.height - 80 * scale,
    canvas.width - 60 * scale,
    28 * scale,
    3,
    `${Math.round(24*scale)}px Arial`,
    "#333"
  );
}
function drawBrooms() {
  ctx.fillStyle = "#c28d60";
  for (let broom of brooms) {
    ctx.fillRect(broom.x, 0, broomWidth, broom.gapY - broom.gap / 2);
    ctx.fillRect(broom.x, broom.gapY + broom.gap / 2, broomWidth, canvas.height - (broom.gapY + broom.gap / 2));
  }
}
function drawGround() {
  ctx.fillStyle = "#c6b79b";
  ctx.fillRect(0, groundY, canvas.width, canvas.height-groundY);
}

// --- Game logic ---
function resetGame() {
  catY = canvas.height / 2;
  catVY = 0;
  broomGap = broomBaseGap;
  broomSpeed = broomBaseSpeed;
  broomInterval = broomBaseInterval;
  brooms = [];
  broomTimer = 0;
  score = 0;
  gameOver = false;
  gameStarted = false;
  inSelectionMode = false; // only one face
}
function updateBroomDifficulty() {
  let logScore = Math.log2(1 + score);
  broomGap = Math.max(broomBaseGap - (broomBaseGap - broomMinGap) * (logScore / 8), broomMinGap);
  broomSpeed = Math.min(broomBaseSpeed + (maxBroomSpeed - broomBaseSpeed) * (logScore / 10), maxBroomSpeed);
  broomInterval = Math.max(broomBaseInterval - (broomBaseInterval - minBroomInterval) * (logScore / 10), minBroomInterval);
}
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();

  if (gameStarted && !gameOver) {
    catVY += gravity;
    catY += catVY;
    updateBroomDifficulty();
    broomTimer++;
    if (broomTimer >= broomInterval) {
      broomTimer = 0;
      const gapY = ceilingY + broomGap/2 + Math.random() * (groundY - ceilingY - broomGap);
      brooms.push({ x: canvas.width, gapY, gap: broomGap, passed: false });
    }
    for (let broom of brooms) {
      broom.x -= broomSpeed;
    }
    brooms = brooms.filter(broom => broom.x + broomWidth > 0);
    for (let broom of brooms) {
      if (!broom.passed && broom.x + broomWidth < catX - catHitboxR) {
        broom.passed = true;
        score++;
      }
    }
    drawBrooms();
    if (checkCollision()) gameOver = true;
  } else if (gameOver) {
    ctx.fillStyle = "#d32f2f";
    ctx.font = `bold ${Math.round(34*scale)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 32 * scale);
    wrapText(
      "Press SPACE, ENTER, or TAP to restart",
      canvas.width / 2,
      canvas.height / 2 + 20 * scale,
      canvas.width - 60 * scale,
      28 * scale,
      3,
      `${Math.round(22*scale)}px Arial`,
      "#d32f2f"
    );
    drawBrooms();
  }

  drawCatFace(catX, catY);
  drawScore();
  if (!gameStarted && !gameOver && !inSelectionMode) {
    wrapText(
      "Press SPACE, ENTER, or TAP to start",
      canvas.width / 2,
      canvas.height / 2 + 100 * scale,
      canvas.width - 60 * scale,
      26 * scale,
      3,
      `${Math.round(20*scale)}px Arial`,
      "#333"
    );
  }
  requestAnimationFrame(update);
}

// --- Controls ---
function triggerFlap() {
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

// Keyboard
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    triggerFlap();
  }
});

// Mouse
canvas.addEventListener('mousedown', function (e) {
  e.preventDefault();
  triggerFlap();
});

// Touch (for mobile)
canvas.addEventListener('touchstart', function (e) {
  e.preventDefault();
  triggerFlap();
});

// Prevent scrolling when touching the canvas
canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
});

// --- Init ---
window.addEventListener('resize', () => {
  resizeCanvas();
  // Also reposition cat to center if not started
  if (!gameStarted) catY = canvas.height/2;
});
function initVars() {
  unlockedFaces = [0];
  selectedFace = 0;
  resetGame();
}
initVars();
resizeCanvas();
update();