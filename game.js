// Simple game starter: just fills the canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Draw a cat face as a placeholder
function drawCatFace() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(200, 300, 60, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(185, 290, 7, 0, Math.PI * 2);
  ctx.arc(215, 290, 7, 0, Math.PI * 2);
  ctx.fill();
  // Nose
  ctx.fillStyle = '#f7c8b3';
  ctx.beginPath();
  ctx.ellipse(200, 320, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}
drawCatFace();