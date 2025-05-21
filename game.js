const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIG ---
const ASPECT_W = 3, ASPECT_H = 4; // Portrait aspect ratio (e.g., 450x600)
const BASE_W = 360, BASE_H = 480; // Reference resolution for scaling

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

  // Geometry for game and cat
  catX = Math.round(width * 0.22);
  catRadius = Math.round(38 * scale);    // SMALLER HEAD!
  earHeight = Math.round(23 * scale);    // Shorter ears
  earWidth = Math.round(23 * scale);     // Narrower ears, point more up
  catY = height / 2;
  catHitboxY = catY - earHeight * 0.35;  // Slightly up, includes ears
  catHitboxR = catRadius + earHeight * 0.62;

  eyeRadius = Math.round(9 * scale);
  noseSize = Math.round(7 * scale);
  mouthW = Math.round(12 * scale);
  mouthH = Math.round(7 * scale);

  groundY = height - Math.round(25 * scale);
  ceilingY = Math.round(25 * scale);

  broomWidth = Math.round(44 * scale);
  broomBaseGap = Math.round(2.7 * catHitboxR); // wide gap
  broomMinGap = Math.round(1.8 * catHitboxR); // minimum gap (still wide)
  broomGap = broomBaseGap;

  broomBaseSpeed = 2.1 * scale;
  broomSpeed = broomBaseSpeed;

  broomBaseInterval = Math.round(120 * scale);
  minBroomInterval = Math.round(70 * scale);
  broomInterval = broomBaseInterval;

  gravity = 0.54 * scale;
  jumpPower = -7 * scale;

  // If brooms already exist, adjust their positions proportionally
  if (brooms) {
    for (let broom of brooms) {
      broom.x = Math.round(broom.x * width / BASE_W);
    }
  }
}

// --- Cat drawing (matches your requests) ---
function drawCatFace(x, y) {
  // Ears (start from further left/right, point more up, shorter)
  ctx.save();
  ctx.lineWidth = 2.1 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  // Left ear outer
  ctx.beginPath();
  ctx.moveTo(x - catRadius * 0.75, y - catRadius * 0.62); // Left base
  ctx.lineTo(x - catRadius * 0.93, y - catRadius * 0.62 - earHeight); // Tip (more up)
  ctx.lineTo(x - catRadius * 0.45, y - catRadius * 0.80); // Right base
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Right ear outer
  ctx.beginPath();
  ctx.moveTo(x + catRadius * 0.75, y - catRadius * 0.62);
  ctx.lineTo(x + catRadius * 0.93, y - catRadius * 0.62 - earHeight);
  ctx.lineTo(x + catRadius * 0.45, y - catRadius * 0.80);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ears (inner pink triangles, fully inside outer, equivalent triangles)
  ctx.fillStyle = "#f7c8b3";
  // Left inner
  ctx.beginPath();
  ctx.moveTo(x - catRadius * 0.73, y - catRadius * 0.65);
  ctx.lineTo(x - catRadius * 0.89, y - catRadius * 0.62 - earHeight + earHeight*0.21);
  ctx.lineTo(x - catRadius * 0.49, y - catRadius * 0.79);
  ctx.closePath();
  ctx.fill();
  // Right inner
  ctx.beginPath();
  ctx.moveTo(x + catRadius * 0.73, y - catRadius * 0.65);
  ctx.lineTo(x + catRadius * 0.89, y - catRadius * 0.62 - earHeight + earHeight*0.21);
  ctx.lineTo(x + catRadius * 0.49, y - catRadius * 0.79);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Head (circle)
  ctx.save();
  ctx.lineWidth = 2.1 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x, y, catRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Eyes (centered highlights)
  ctx.save();
  ctx.fillStyle = "#111";
  // Left eye
  ctx.beginPath();
  ctx.arc(x - catRadius * 0.34, y - catRadius * 0.10, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  // Highlight (centered)
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - catRadius * 0.34, y - catRadius * 0.10, eyeRadius*0.38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  // Right eye
  ctx.beginPath();
  ctx.arc(x + catRadius * 0.34, y - catRadius * 0.10, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + catRadius * 0.34, y - catRadius * 0.10, eyeRadius*0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Nose (pink triangle with black border)
  ctx.save();
  ctx.lineWidth = 1.2 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#f7c8b3";
  ctx.beginPath();
  ctx.moveTo(x, y + catRadius * 0.09);
  ctx.lineTo(x - noseSize/2, y + catRadius * 0.18);
  ctx.lineTo(x + noseSize/2, y + catRadius * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Smile (gentle W)
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.8 * scale;
  ctx.beginPath();
  let smileY = y + catRadius * 0.23;
  ctx.moveTo(x - mouthW/2, smileY);
  ctx.bezierCurveTo(
    x - mouthW/2 + mouthW*0.2, smileY + mouthH*0.25,
    x - mouthW*0.1, smileY + mouthH*0.38,
    x, smileY + mouthH*0.11
  );
  ctx.bezierCurveTo(
    x + mouthW*0.1, smileY + mouthH*0.38,
    x + mouthW/2 - mouthW*0.2, smileY + mouthH*0.25,
    x + mouthW/2, smileY
  );
  ctx.stroke();
  ctx.restore();

  // Whiskers
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.1 * scale;
  // Left whiskers
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x - catRadius*0.18, y + catRadius*0.13 + i*scale*6);
    ctx.lineTo(x - catRadius*0.67, y + catRadius*0.09 + i*scale*11);
    ctx.stroke();
  }
  // Right whiskers
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + catRadius*0.18, y + catRadius*0.13 + i*scale*6);
    ctx.lineTo(x + catRadius*0.67, y + catRadius*0.09 + i*scale*11);
    ctx.stroke();
  }
  ctx.restore();
}

// --- Collision uses circular hitbox (includes ears, not whiskers) ---
function catHitbox() {
  return {x: catX, y: catHitboxY, r: catHitboxR};
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
  ctx.font = `${Math.round(28 * scale)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20 * scale, 44 * scale);
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
  broomSpeed = Math.min(broomBaseSpeed + (2.7 * scale) * (logScore / 10), broomBaseSpeed + 2.7 * scale);
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
    ctx.font = `bold ${Math.round(28*scale)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", width / 2, height / 2 - 32 * scale);
    wrapText(
      "Press SPACE, ENTER, or TAP to restart",
      width / 2,
      height / 2 + 20 * scale,
      width - 60 * scale,
      24 * scale,
      3,
      `${Math.round(17*scale)}px Arial`,
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
      height / 2 + 80 * scale,
      width - 60 * scale,
      22 * scale,
      3,
      `${Math.round(15*scale)}px Arial`,
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