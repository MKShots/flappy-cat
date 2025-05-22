// --- Flappy Cat Game with PNG Cat Faces & Big Broom Gaps ---
// Place all your cat face PNGs in assets/cat_faces/ and list them below.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Cat Faces ---
const CAT_FACE_PATHS = [
  "assets/cat_faces/cat_face_1.png", // starter face
  // Add more faces here as you unlock them
  // "assets/cat_faces/cat_face_2.png",
];
let unlockedFaces = [true]; // Start with only first face unlocked
let selectedFace = 0;
let catImages = CAT_FACE_PATHS.map(path => {
  let img = new Image();
  img.src = path;
  return img;
});

// --- Game Variables ---
const ASPECT_W = 3, ASPECT_H = 4;
const BASE_W = 360, BASE_H = 480;

// Geometry
let width, height, scale;
let catX, catY, catHitboxRX, catHitboxRY;
let groundY, ceilingY, broomWidth, broomGap, broomMinGap, broomBaseGap, broomSpeed, broomBaseSpeed;
let brooms, broomTimer, broomInterval, broomBaseInterval, minBroomInterval;
let gravity, jumpPower;
let gameStarted, gameOver, score, catVY;

// --- Responsive Scaling and Geometry ---
function resizeCanvas() {
  // Maintain 3:4 aspect ratio, fill as much of screen as possible
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

  // Cat settings: small and forgiving hitbox
  catX = Math.round(width * 0.22);
  catY = height / 2;
  catHitboxRX = Math.round(16 * scale); // width of hitbox
  catHitboxRY = Math.round(12 * scale); // height of hitbox

  groundY = height - Math.round(25 * scale);
  ceilingY = Math.round(25 * scale);

  broomWidth = Math.round(38 * scale);

  // --- Brooms: Huge gap early, slow progression ---
  broomBaseGap = Math.round(12 * catHitboxRY); // HUGE gap at start (e.g. 144px if catHitboxRY=12)
  broomMinGap = Math.round(3.5 * catHitboxRY); // Never gets too tight
  broomGap = broomBaseGap;

  broomBaseSpeed = 1.0 * scale; // Very slow at first
  broomSpeed = broomBaseSpeed;
  broomBaseInterval = Math.round(170 * scale); // Few brooms early
  minBroomInterval = Math.round(110 * scale);
  broomInterval = broomBaseInterval;

  gravity = 0.37 * scale;
  jumpPower = -3.8 * scale;

  // If brooms already exist, adjust their positions proportionally
  if (brooms) {
    for (let broom of brooms) {
      broom.x = Math.round(broom.x * width / BASE_W);
    }
  }
}

// --- Draw Cat Face PNG, perfectly fitted to hitbox ---
function drawCatFace(x, y) {
  let img = catImages[selectedFace];
  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    // Draw the PNG centered at (x, y), scaled to the oval hitbox
    ctx.drawImage(
      img,
      x - catHitboxRX,
      y - catHitboxRY,
      catHitboxRX * 2,
      catHitboxRY * 2
    );
    ctx.restore();
  } else {
    // fallback: draw a placeholder oval
    ctx.save();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.ellipse(x, y, catHitboxRX, catHitboxRY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// --- Cat Hitbox (oval) for collision ---
function catHitbox() {
  return {
    x: catX,
    y: catY,
    rx: catHitboxRX,
    ry: catHitboxRY
  };
}

// --- Collision ---
function checkCollision() {
  let hit = catHitbox();
  for (let broom of brooms) {
    if (hit.x + hit.rx > broom.x && hit.x - hit.rx < broom.x + broomWidth) {
      if (
        hit.y - hit.ry < broom.gapY - broom.gap/2 ||
        hit.y + hit.ry > broom.gapY + broom.gap/2
      ) {
        return true;
      }
    }
  }
  if (catY + catHitboxRY > groundY) return true;
  return false;
}

// --- Drawing functions ---
function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = `${Math.round(22 * scale)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 14 * scale, 30 * scale);
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
  // Easy until level 50, then slow progression
  if (score <= 50) {
    broomGap = broomBaseGap;
    broomSpeed = broomBaseSpeed;
    broomInterval = broomBaseInterval;
  } else {
    // After 50, gradually shrink gap and increase speed
    let prog = Math.min((score - 50) / 120, 1); // 0 to 1 as score goes from 50 to 170
    broomGap = broomBaseGap - (broomBaseGap - broomMinGap) * prog;
    broomSpeed = broomBaseSpeed + (2.2 * scale) * prog;
    broomInterval = broomBaseInterval - (broomBaseInterval - minBroomInterval) * prog;
  }
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
      if (!broom.passed && broom.x + broomWidth < catX - catHitboxRX) {
        broom.passed = true;
        score++;
      }
    }
    drawBrooms();
    if (checkCollision()) gameOver = true;
  } else if (gameOver) {
    ctx.fillStyle = "#d32f2f";
    ctx.font = `bold ${Math.round(18*scale)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", width / 2, height / 2 - 32 * scale);
    wrapText(
      "Press SPACE, ENTER, or TAP to restart",
      width / 2,
      height / 2 + 20 * scale,
      width - 60 * scale,
      18 * scale,
      3,
      `${Math.round(13*scale)}px Arial`,
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
      height / 2 + 60 * scale,
      width - 60 * scale,
      13 * scale,
      3,
      `${Math.round(11*scale)}px Arial`,
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
catImages[0].onload = function() {
  update();
};
resizeCanvas();
resetGame();
update();