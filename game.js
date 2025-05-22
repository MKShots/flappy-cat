// Cat faces asset folder and list
const CAT_FACE_PATHS = [
  "assets/cat_faces/cat_face_1.png", // starter
  "assets/cat_faces/cat_face_2.png", // unlockable
  // ...add more faces here
];
// Unlock status
let unlockedFaces = [true, false]; // Only the first is unlocked
let selectedFace = 0;

// For image objects
let catImages = CAT_FACE_PATHS.map(path => {
  let img = new Image();
  img.src = path;
  return img;
});

// Hitbox dimensions (set in resizeCanvas)
let catX, catY, catHitboxRX, catHitboxRY;

// Drawing the cat face PNG into the hitbox
function drawCatFace(x, y) {
  let img = catImages[selectedFace];
  if (img.complete && img.naturalWidth > 0) {
    // Draw centered, scaled to hitbox size
    ctx.save();
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
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, catHitboxRX, catHitboxRY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Example hitbox collision check (oval)
function catHitbox() {
  return {
    x: catX,
    y: catY,
    rx: catHitboxRX,
    ry: catHitboxRY
  };
}
// ...collision logic remains the same

// Example unlock logic for future:
function unlockFace(index) {
  if (index >= 0 && index < unlockedFaces.length) {
    unlockedFaces[index] = true;
  }
}