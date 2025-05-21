const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Cat properties
let catY = canvas.height / 2;
let catVY = 0; // velocity Y
let gravity = 0.7;
let jumpPower = -10;
let gameStarted = false;

// Draw cat face
function drawCatFace() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  if (!gameStarted) {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2 + 100);
  }
}

// Game loop
function update() {
  if (gameStarted) {
    catVY += gravity;
    catY += catVY;

    // Stop at the bottom
    if (catY > canvas.height - 50) {
      catY = canvas.height - 50;
      catVY = 0;
    }
    // Stop at the top
    if (catY < 50) {
      catY = 50;
      catVY = 0;
    }
  }
  drawCatFace();
  requestAnimationFrame(update);
}

// Jump on space
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space') {
    if (!gameStarted) {
      gameStarted = true;
      catY = canvas.height / 2;
      catVY = 0;
    }
    catVY = jumpPower;
  }
});

// Start
drawCatFace();
update();