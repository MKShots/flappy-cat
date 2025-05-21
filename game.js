// --- Flappy Cat: Responsive, Cute Cat, Fixed Aspect Ratio ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIG ---
const ASPECT_W = 3, ASPECT_H = 4; // Classic vertical aspect ratio
const BASE_W = 360, BASE_H = 480; // Reference resolution for scaling logic

// These will be set in resizeCanvas()
let width, height, scale;

// --- Game variables ---
let catX, catY, catRadius, earHeight, earWidth, eyeRadius, noseSize, mouthW, mouthH;
let catHitboxY, catHitboxR;
let groundY, ceilingY, broomWidth, broomGap, broomMinGap, broomBaseGap, broomSpeed, broomBaseSpeed;
let brooms, broomTimer, broomInterval, broomBaseInterval, minBroomInterval;
let gravity, jumpPower;
let gameStarted, gameOver, score, catVY;

// --- Responsive scaling function ---
function resizeCanvas() {
  // Always keep the chosen aspect ratio, largest possible for window
  let ww = window.innerWidth, wh = window.innerHeight;
  let ar = ASPECT_W / ASPECT_H;
  if (ww / wh > ar) {
    height = Math.floor(wh * 0.98);
    width = Math.floor(height * ar);
  } else {
    width = Math.floor(ww * 0.98);
    height = Math.floor(width / ar);
  }
  canvas.width = width;
  canvas.height = height;
  scale = width / BASE_W;

  // Game geometry
  catX = Math.round(width * 0.22);
  catRadius = Math.round(60 * scale);
  earHeight = Math.round(38 * scale);
  earWidth = Math.round(36 * scale);
  catY = height / 2;
  catHitboxY = catY;
  catHitboxR = catRadius + earHeight * 0.7;

  eyeRadius = Math.round(16 * scale);
  noseSize = Math.round(9 * scale);
  mouthW = Math.round(18 * scale);
  mouthH = Math.round(13 * scale);

  groundY = height - Math.round(25 * scale);
  ceilingY = Math.round(25 * scale);

  broomWidth = Math.round(48 * scale);
  broomBaseGap = Math.round(2.2 * catHitboxR); // very wide gap
  broomMinGap = Math.round(1.5 * catHitboxR); // minimum gap (still wide)
  broomGap = broomBaseGap;

  broomBaseSpeed = 2.2 * scale;
  broomSpeed = broomBaseSpeed;

  broomBaseInterval = Math.round(115 * scale);
  minBroomInterval = Math.round(70 * scale);
  broomInterval = broomBaseInterval;

  gravity = 0.56 * scale;
  jumpPower = -8 * scale;

  // If brooms already exist, adjust their positions proportionally
  if (brooms) {
    for (let broom of brooms) {
      broom.x = Math.round(broom.x * width / BASE_W);
    }
  }
}

// --- Cat drawing (based on your image & feedback) ---
function drawCatFace(x, y) {
  // Ears (further apart, not too close to head center)
  ctx.save();
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  // Left ear outer
  ctx.beginPath();
  ctx.moveTo(x - catRadius * 0.80, y - catRadius * 0.60); // Left base
  ctx.lineTo(x - catRadius * 1.18, y - catRadius * 1.25); // Tip
  ctx.lineTo(x - catRadius * 0.47, y - catRadius * 0.82); // Right base
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Right ear outer
  ctx.beginPath();
  ctx.moveTo(x + catRadius * 0.80, y - catRadius * 0.60);
  ctx.lineTo(x + catRadius * 1.18, y - catRadius * 1.25);
  ctx.lineTo(x + catRadius * 0.47, y - catRadius * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Ears (inner pink triangles, fully inside outer)
  ctx.fillStyle = "#f7c8b3";
  // Left inner
  ctx.beginPath();
  ctx.moveTo(x - catRadius * 0.80 + earWidth*0.19, y - catRadius * 0.60);
  ctx.lineTo(x - catRadius * 1.18 + earWidth*0.28, y - catRadius * 1.25 + earHeight*0.22);
  ctx.lineTo(x - catRadius * 0.47 - earWidth*0.14, y - catRadius * 0.82 + earHeight*0.10);
  ctx.closePath();
  ctx.fill();
  // Right inner
  ctx.beginPath();
  ctx.moveTo(x + catRadius * 0.80 - earWidth*0.19, y - catRadius * 0.60);
  ctx.lineTo(x + catRadius * 1.18 - earWidth*0.28, y - catRadius * 1.25 + earHeight*0.22);
  ctx.lineTo(x + catRadius * 0.47 + earWidth*0.14, y - catRadius * 0.82 + earHeight*0.10);
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
  ctx.moveTo(x, y + catRadius * 0.09);
  ctx.lineTo(x - noseSize/2, y + catRadius * 0.18);
  ctx.lineTo(x + noseSize/2, y + catRadius * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Smile (gentle W)
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.2 * scale;
  ctx.beginPath();
  let smileY = y + catRadius * 0.27;
  ctx.moveTo(x - mouthW/2, smileY);
  ctx.bezierCurveTo(
    x - mouthW/2 + mouthW*0.2, smileY + mouthH*0.3,
    x - mouthW*0.1, smileY + mouthH*0.4,
    x, smileY + mouthH*0.1
  );
  ctx.bezierCurveTo(
    x + mouthW*0.1, smileY + mouthH*0.4,
    x + mouthW/2 - mouthW*0.2, smileY + mouthH*0.3,
    x + mouthW/2, smileY
  );
  ctx.stroke();
  ctx.restore();

  // Whiskers
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.6 * scale;
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
    if (hit.x + hit.r > broom.x && hit.x - hit.r < broom.x + broomWidth) {
      if (
        hit.y - hit.r < broom.gapY - broom.gap/2 ||
        hit.y + hit.r > broom.gapY + broom.gap/2
      ) {
        return true;
      }
    }
  }
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
function drawBrooms() {
  ctx.fillStyle = "#c28d60";
  for (let broom of brooms) {
    ctx.fillRect(broom.x, 0, broomWidth, broom.gapY - broom.gap / 2);
    ctx.fillRect(broom.x, broom.gapY + broom.gap / 2, broomWidth, height - (broom.gapY + broom.gap / 2));
  }
}
function drawGround() {
  ctx.fillStyle = "#c6b79b";
  ctx.fillRect(0, groundY, width, height-groundY);
}

// --- Game logic ---
function resetGame() {
  catY = height / 2;
  catVY = 0;
  broomGap = broomBaseGap;
  broomSpeed = broomBaseSpeed;
  broomInterval = broomBaseInterval;
  brooms = [];
  broomTimer = 0;
  score = 0;
  gameOver = false;
  gameStarted = false;
}
function updateBroomDifficulty() {
  let logScore = Math.log2(1 + score);
  broomGap = Math.max(broomBaseGap - (broomBaseGap - broomMinGap) * (logScore / 8), broomMinGap);
  broomSpeed = Math.min(broomBaseSpeed + (3 * scale) * (logScore / 10), broomBaseSpeed + 3 * scale);
  broomInterval = Math.max(broomBaseInterval - (broomBaseInterval - minBroomInterval) * (logScore / 10), minBroomInterval);
}
function update() {
  ctx.clearRect(0, 0, width, height);
  drawGround();

  if (gameStarted && !gameOver) {
    catVY += gravity;
    catY += catVY;
    updateBroomDifficulty();
    broomTimer++;
    if (broomTimer >= broomInterval) {
      broomTimer = 0;
      const gapY = ceilingY + broomGap/2 + Math.random() * (groundY - ceilingY - broomGap);
      brooms.push({ x: width, gapY, gap: broomGap, passed: false });
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
    ctx.fillText("Game Over!", width / 2, height / 2 - 32 * scale);
    wrapText(
      "Press SPACE, ENTER, or TAP to restart",
      width / 2,
      height / 2 + 20 * scale,
      width - 60 * scale,
      28 * scale,
      3,
      `${Math.round(22*scale)}px Arial`,
      "#d32f2f"
    );
    drawBrooms();
  }

  drawCatFace(catX, catY);
  drawScore();
  if (!gameStarted && !gameOver) {
    wrapText(
      "Press SPACE, ENTER, or TAP to start",
      width / 2,
      height / 2 + 100 * scale,
      width - 60 * scale,
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
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    triggerFlap();
  }
});
canvas.addEventListener('mousedown', function (e) {
  e.preventDefault();
  triggerFlap();
});
canvas.addEventListener('touchstart', function (e) {
  e.preventDefault();
  triggerFlap();
});
canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
});

// --- Init ---
window.addEventListener('resize', () => {
  resizeCanvas();
  if (!gameStarted) catY = height/2;
});
resizeCanvas();
resetGame();
update();