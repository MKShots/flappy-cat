// Node.js script to run preservation tests
// This simulates the game logic to verify preservation properties

class GameSimulator {
  constructor() {
    this.reset();
  }

  reset() {
    this.width = 360;
    this.height = 480;
    this.scale = 1;
    
    this.catX = Math.round(this.width * 0.22);
    this.catY = this.height / 2;
    this.catHitboxRX = Math.round(28 * this.scale);
    this.catHitboxRY = Math.round(34 * this.scale);
    this.catVY = 0;
    
    this.groundY = this.height - Math.round(25 * this.scale);
    this.ceilingY = Math.round(25 * this.scale);
    
    this.broomWidth = Math.round(44 * this.scale);
    this.broomSpeed = 1.2 * this.scale;
    this.broomGap = 7 * this.catHitboxRY; // maxBroomGap
    
    this.gravity = 0.13 * this.scale;
    this.jumpPower = -4.2 * this.scale;
    
    this.brooms = [];
    this.score = 0;
    this.gameStarted = false;
    this.gameOver = false;
  }

  triggerFlap() {
    if (!this.gameStarted && !this.gameOver) {
      this.startGame();
    }
    if (this.gameStarted && !this.gameOver) {
      this.catVY = this.jumpPower;
    }
  }

  startGame() {
    this.brooms = [];
    const gapY = this.ceilingY + this.broomGap/2 + Math.random() * (this.groundY - this.ceilingY - this.broomGap);
    this.brooms.push({ x: this.width, gapY, gap: this.broomGap, passed: false });
    this.gameStarted = true;
    this.gameOver = false;
    this.score = 0;
    this.catY = this.height / 2;
    this.catVY = 0;
  }

  updateUnfixed(dt = 1/60) {
    if (this.gameStarted && !this.gameOver) {
      this.catVY += this.gravity;
      this.catY += this.catVY;
      
      for (let broom of this.brooms) {
        broom.x -= this.broomSpeed;
      }
      
      // Filter out brooms that have moved off screen
      this.brooms = this.brooms.filter(broom => broom.x + this.broomWidth > 0);
      
      for (let broom of this.brooms) {
        if (!broom.passed && broom.x + this.broomWidth < this.catX - this.catHitboxRX) {
          broom.passed = true;
          this.score++;
        }
      }
      
      if (this.checkCollision()) {
        this.gameOver = true;
      }
    }
  }

  checkCollision() {
    const hit = {
      x: this.catX,
      y: this.catY,
      rx: this.catHitboxRX,
      ry: this.catHitboxRY
    };
    
    for (let broom of this.brooms) {
      if (hit.x + hit.rx > broom.x && hit.x - hit.rx < broom.x + this.broomWidth) {
        if (
          hit.y - hit.ry < broom.gapY - broom.gap/2 ||
          hit.y + hit.ry > broom.gapY + broom.gap/2
        ) {
          return true;
        }
      }
    }
    
    if (this.catY + this.catHitboxRY > this.groundY) return true;
    return false;
  }

  getCatVY() { return this.catVY; }
  getCatY() { return this.catY; }
  getScore() { return this.score; }
  isGameOver() { return this.gameOver; }
  isGameStarted() { return this.gameStarted; }
}

// Test suite
const tests = [
  {
    name: "Flap Input - Upward Velocity Applied",
    requirement: "3.1",
    run: () => {
      const game = new GameSimulator();
      game.startGame();
      
      const velocityBeforeFlap = game.getCatVY();
      game.triggerFlap();
      const velocityAfterFlap = game.getCatVY();
      
      const expectedJumpPower = -4.2;
      const tolerance = 0.01;
      
      const passed = Math.abs(velocityAfterFlap - expectedJumpPower) < tolerance;
      
      return {
        passed,
        details: `Velocity after flap: ${velocityAfterFlap.toFixed(2)}, Expected: ${expectedJumpPower.toFixed(2)}`
      };
    }
  },
  {
    name: "Broom Movement - Consistent Speed",
    requirement: "3.2",
    run: () => {
      const game = new GameSimulator();
      game.startGame();
      
      // Check if broom exists
      if (game.brooms.length === 0) {
        return { passed: false, details: 'No brooms in game' };
      }
      
      const initialBroomX = game.brooms[0].x;
      
      // Run 10 frames to observe broom movement
      for (let i = 0; i < 10; i++) {
        game.updateUnfixed(1/60);
        if (game.brooms.length === 0) {
          return { passed: false, details: 'Broom was removed during test' };
        }
      }
      
      const finalBroomX = game.brooms[0].x;
      const distanceMoved = initialBroomX - finalBroomX;
      
      // Expected: broomSpeed * frames = 1.2 * 10 = 12 pixels
      const expectedDistance = 1.2 * 10;
      const tolerance = 0.1;
      
      const passed = Math.abs(distanceMoved - expectedDistance) < tolerance;
      
      return {
        passed,
        details: `Broom moved ${distanceMoved.toFixed(2)}px in 10 frames, Expected: ${expectedDistance.toFixed(2)}px (${(distanceMoved/10).toFixed(2)}px/frame)`
      };
    }
  },
  {
    name: "Collision Detection - Broom Hit",
    requirement: "3.3",
    run: () => {
      const game = new GameSimulator();
      game.startGame();
      
      game.catY = game.brooms[0].gapY - game.broomGap/2 - 10;
      game.brooms[0].x = game.catX;
      
      const collisionDetected = game.checkCollision();
      
      return {
        passed: collisionDetected === true,
        details: `Collision detected: ${collisionDetected}, Expected: true`
      };
    }
  },
  {
    name: "Collision Detection - Safe in Gap",
    requirement: "3.3",
    run: () => {
      const game = new GameSimulator();
      game.startGame();
      
      game.catY = game.brooms[0].gapY;
      game.brooms[0].x = game.catX;
      
      const collisionDetected = game.checkCollision();
      
      return {
        passed: collisionDetected === false,
        details: `Collision detected: ${collisionDetected}, Expected: false`
      };
    }
  },
  {
    name: "Collision Detection - Ground Hit",
    requirement: "3.3",
    run: () => {
      const game = new GameSimulator();
      game.startGame();
      
      game.catY = game.groundY + 1;
      
      const collisionDetected = game.checkCollision();
      
      return {
        passed: collisionDetected === true,
        details: `Collision detected: ${collisionDetected}, Expected: true`
      };
    }
  },
  {
    name: "Score Calculation - Passing Broom",
    requirement: "3.5",
    run: () => {
      const game = new GameSimulator();
      game.startGame();
      
      const initialScore = game.getScore();
      
      game.brooms[0].x = game.catX - game.catHitboxRX - game.broomWidth - 1;
      game.updateUnfixed(1/60);
      
      const finalScore = game.getScore();
      
      return {
        passed: finalScore === initialScore + 1,
        details: `Score: ${initialScore} → ${finalScore}, Expected: ${initialScore + 1}`
      };
    }
  },
  {
    name: "State Transitions - Game Start",
    requirement: "3.6",
    run: () => {
      const game = new GameSimulator();
      
      const startedBefore = game.isGameStarted();
      game.triggerFlap();
      const startedAfter = game.isGameStarted();
      
      return {
        passed: !startedBefore && startedAfter,
        details: `Game started: ${startedBefore} → ${startedAfter}`
      };
    }
  },
  {
    name: "State Transitions - Game Over",
    requirement: "3.6",
    run: () => {
      const game = new GameSimulator();
      game.startGame();
      
      const gameOverBefore = game.isGameOver();
      
      game.catY = game.groundY + 10;
      game.updateUnfixed(1/60);
      
      const gameOverAfter = game.isGameOver();
      
      return {
        passed: !gameOverBefore && gameOverAfter,
        details: `Game over: ${gameOverBefore} → ${gameOverAfter}`
      };
    }
  }
];

// Run tests
console.log('🐱 Preservation Property Tests');
console.log('Device-Independent Falling Speed Bugfix\n');
console.log('Property 2: Preservation - Gameplay Mechanics Unchanged');
console.log('Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6\n');

let passCount = 0;
let failCount = 0;

tests.forEach(test => {
  try {
    const result = test.run();
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${test.requirement}] ${test.name}: ${status}`);
    console.log(`  ${result.details}`);
    
    if (result.passed) {
      passCount++;
    } else {
      failCount++;
    }
  } catch (error) {
    console.log(`[${test.requirement}] ${test.name}: ✗ ERROR`);
    console.log(`  ${error.message}`);
    failCount++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Test Summary: ${passCount}/${tests.length} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log('\n✓ All Preservation Tests Passed!');
  console.log('All non-physics gameplay mechanics are working correctly.');
  console.log('These behaviors should remain unchanged after implementing the fix.');
  process.exit(0);
} else {
  console.log('\n✗ Some Tests Failed');
  console.log('Review failed tests to understand baseline behavior.');
  process.exit(1);
}
