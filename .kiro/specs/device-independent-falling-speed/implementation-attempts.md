# Implementation Attempts - Device-Independent Falling Speed Fix

**Status:** INCOMPLETE - Multiple attempts failed  
**Date:** February 25, 2026  
**Original Issue:** Cat falls at different speeds on devices with different refresh rates (60Hz, 90Hz, 120Hz, 144Hz)

## Root Cause Analysis

The game uses a fixed delta time of `1/60` seconds regardless of actual frame rate:
```javascript
function update(dt = 1/60) {
  // Physics calculations use fixed dt
  catVY += gravity;  // Applied every frame
  catY += catVY;
}
```

On a 120Hz display, `update()` runs 120 times per second but still applies physics as if running at 60 FPS, causing the cat to fall twice as fast.

## Attempted Solution: Delta Time Implementation

### Design Approach
1. Calculate real elapsed time between frames using `requestAnimationFrame` timestamps
2. Convert physics constants from "per frame at 60 FPS" to "per second" units
3. Scale all physics calculations by real delta time
4. Cap delta time at 100ms to prevent physics explosions

### Implementation Attempts

#### Attempt 1: Manual Implementation
**Changes Made:**
- Added `lastTimestamp = null` variable for timestamp tracking
- Modified `update(dt = 1/60)` to `update(timestamp)`
- Implemented delta time calculation with 100ms cap
- Multiplied physics constants by 60: `gravity = 0.13 * scale * 60`
- Updated physics: `catVY += gravity * dt`
- Changed all `requestAnimationFrame(() => update(1/60))` to `requestAnimationFrame(update)`
- Added timestamp resets in `resetGame()`, `startGame()`, and unpause logic

**Problems Encountered:**
1. **Missing function**: Accidentally removed `updateBroomDifficulty()` function during implementation
2. **Initial call issue**: `update()` called directly instead of via `requestAnimationFrame(update)` at initialization
3. **Double-flapping bug**: Both `if` statements in keyboard handler and `triggerFlap()` executed on game start, causing huge negative velocity
4. **Zero delta time**: `dt = 0` occurred frequently, causing physics to freeze
5. **Game broken**: Cat and UI elements disappeared completely

#### Attempt 2: Subagent Implementation
**Approach:** Delegated to spec-task-execution subagent for clean implementation

**Problems Encountered:**
1. **Same initialization bug**: `update()` called without `requestAnimationFrame` wrapper
2. **Double-flapping persisted**: Keyboard handler had two separate `if` statements instead of `if/else if`
3. **triggerFlap double-execution**: Function also had two `if` statements, causing double-flap on game start

#### Attempt 3: Manual Fixes to Subagent Code
**Fixes Applied:**
- Changed `update()` to `requestAnimationFrame(update)` at initialization
- Changed keyboard handler to use `if/else if` pattern
- Changed `triggerFlap()` to use `if/else if` pattern

**Problems Encountered:**
1. **Zero delta time epidemic**: Console logs showed `dt: 0.0000` in majority of frames
2. **Incorrect physics values**: 
   - `jumpPower: -361.20` (should be around -4.2 for original feel)
   - `gravity: 11.18` (should be around 0.13 for original feel)
3. **Broken gameplay**: Cat floated slowly, clicking made it shoot upward uncontrollably
4. **No response to input**: Cat didn't respond properly to spacebar or clicks

## Technical Issues Identified

### Issue 1: Zero Delta Time (dt = 0)
**Symptom:** Console logs showed `dt: 0.0000` in many consecutive frames

**Cause:** `lastTimestamp` being set to same value as `timestamp`, resulting in:
```javascript
dt = (timestamp - lastTimestamp) / 1000; // = 0
```

**Impact:** When `dt = 0`, physics doesn't update:
```javascript
catVY += gravity * dt;  // Adds nothing when dt = 0
catY += catVY * dt;     // No movement when dt = 0
```

**Why it happened:** Unclear - possibly browser optimization, multiple update loops, or timing issue

### Issue 2: Physics Constant Scaling
**Problem:** Multiplying constants by 60 made values too large

**Original values (per frame at 60 FPS):**
- `gravity = 0.13 * scale` ≈ 0.14
- `jumpPower = -4.2 * scale` ≈ -4.5

**After multiplying by 60 (per second):**
- `gravity = 0.13 * scale * 60` ≈ 7.8-11.18
- `jumpPower = -4.2 * scale * 60` ≈ -252 to -361

**Expected behavior:** With `dt ≈ 1/60 ≈ 0.0166`, we should get:
- `gravity * dt = 7.8 * 0.0166 ≈ 0.13` (back to original)
- `jumpPower * dt = -252 * 0.0166 ≈ -4.2` (back to original)

**Actual behavior:** Due to `dt = 0` in many frames, physics was inconsistent and broken

### Issue 3: Double-Flapping Bug
**Problem:** When starting game with spacebar, `triggerFlap()` executed twice

**Code pattern:**
```javascript
function triggerFlap() {
  if (!gameStarted && !gameOver && ...) {
    startGame();  // Sets gameStarted = true
  }
  if (gameStarted && !gameOver && ...) {
    catVY = jumpPower;  // ALSO executes because gameStarted is now true!
  }
}
```

**Result:** Cat got double jump power on game start, shooting upward with velocity around -500 to -700

**Fix attempted:** Changed second `if` to `else if`, but other issues persisted

### Issue 4: Missing updateBroomDifficulty()
**Problem:** Function was accidentally deleted during implementation

**Original function:**
```javascript
function updateBroomDifficulty() {
  let level = score + 1;
  let t = Math.min(level, 300) / 300;
  broomGap = maxBroomGap - (maxBroomGap - minBroomGap) * t;
}
```

**Impact:** JavaScript error stopped all game execution, causing blank screen

**Fix:** Restored function from git history

## Console Log Evidence

### Broken Physics (Attempt 3)
```
dt: 0.0000 gravity: 11.18 jumpPower: -361.20 catVY: 1.49
dt: 0.0000 gravity: 11.18 jumpPower: -361.20 catVY: 3.91
dt: 0.0166 gravity: 11.18 jumpPower: -361.20 catVY: 6.71
dt: 0.0000 gravity: 11.18 jumpPower: -361.20 catVY: 8.20
dt: 0.0000 gravity: 11.18 jumpPower: -361.20 catVY: 8.76
...
dt: 0.0166 gravity: 11.18 jumpPower: -361.20 catVY: -359.71  // After click
```

**Analysis:**
- Majority of frames have `dt = 0`
- When user clicks, `catVY` jumps to -359.71 (nearly equal to jumpPower)
- Physics only updates on frames with `dt = 0.0166`
- Inconsistent behavior due to zero delta times

## Why the Fix Failed

### Fundamental Issues
1. **Browser timing inconsistency**: `requestAnimationFrame` providing same timestamp multiple times
2. **Physics scaling mismatch**: Constants multiplied by 60 but dt frequently zero
3. **Complex state management**: Multiple code paths (pause, countdown, start, play) all need correct timestamp handling
4. **Event handler bugs**: Double-execution patterns not caught in initial implementation

### What Worked
- Test harnesses (exploration and preservation tests) worked correctly
- Design document was comprehensive and accurate
- Root cause analysis was correct
- Subagent could implement the changes mechanically

### What Didn't Work
- Delta time calculation produced too many zero values
- Physics constants scaling approach may have been incorrect
- Event handler patterns had subtle bugs
- Browser behavior didn't match expectations

## Lessons Learned

1. **Delta time is tricky**: Converting from fixed timestep to variable timestep requires careful handling of edge cases
2. **Browser timing is unreliable**: `requestAnimationFrame` can provide duplicate timestamps
3. **Physics tuning is sensitive**: Small errors in constants or dt calculation break game feel completely
4. **Event handlers need careful review**: Double-execution bugs are easy to introduce
5. **Testing in isolation isn't enough**: Tests passed but real gameplay failed

## Recommendations for Future Attempts

### Alternative Approach 1: Fixed Timestep with Accumulator
Instead of variable delta time, use a fixed timestep accumulator:
```javascript
let accumulator = 0;
const FIXED_DT = 1/60;

function update(timestamp) {
  let dt = (timestamp - lastTimestamp) / 1000;
  accumulator += dt;
  
  while (accumulator >= FIXED_DT) {
    // Run physics with fixed FIXED_DT
    catVY += gravity;  // Keep original constants
    catY += catVY;
    accumulator -= FIXED_DT;
  }
  
  // Render with interpolation
  render(accumulator / FIXED_DT);
}
```

**Pros:**
- Deterministic physics
- No need to change constants
- Handles variable frame rates correctly

**Cons:**
- More complex
- Requires interpolation for smooth rendering

### Alternative Approach 2: Keep Original Constants, Scale by dt * 60
```javascript
// Keep original constants
gravity = 0.13 * scale;  // Don't multiply by 60
jumpPower = -4.2 * scale;

// Scale physics by dt * 60
catVY += gravity * (dt * 60);
catY += catVY * (dt * 60);
```

**Rationale:** Original constants were tuned for 60 FPS, so `dt * 60` converts real time to "60 FPS frames"

### Alternative Approach 3: Simpler Delta Time with Fallback
```javascript
function update(timestamp) {
  let dt = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 1/60;
  if (dt <= 0 || dt > 0.1) dt = 1/60;  // Fallback for bad values
  lastTimestamp = timestamp;
  
  // Use dt directly with scaled constants
  catVY += (gravity * 60) * dt;
}
```

**Pros:**
- Handles zero/negative dt
- Simpler logic
- Fallback to 60 FPS behavior

### Testing Strategy for Next Attempt
1. Add extensive console logging from the start
2. Test on multiple devices/browsers before committing
3. Verify dt values are reasonable (0.008 - 0.033 for 30-120 FPS)
4. Check for zero dt occurrences
5. Manual gameplay testing after each sub-task
6. Compare physics feel to original at 60 FPS

## Files Created During Attempts

### Test Files (Keep)
- `test-falling-speed.html` - Bug exploration test (unfixed code)
- `test-falling-speed-fixed.html` - Bug exploration test (fixed code)
- `test-preservation.html` - Preservation property tests (browser)
- `run-preservation-tests.js` - Preservation tests (Node.js)
- `run-exploration-test.js` - Exploration test (Node.js)

### Documentation Files (Keep)
- `.kiro/specs/device-independent-falling-speed/bugfix.md` - Bug requirements
- `.kiro/specs/device-independent-falling-speed/design.md` - Design document
- `.kiro/specs/device-independent-falling-speed/tasks.md` - Implementation tasks
- `.kiro/specs/device-independent-falling-speed/test-results-exploration.md` - Test results
- `.kiro/specs/device-independent-falling-speed/test-results-preservation.md` - Test results
- `.kiro/specs/device-independent-falling-speed/implementation-summary.md` - Subagent summary
- `.kiro/specs/device-independent-falling-speed/implementation-attempts.md` - This document

## Current Status

**Game State:** Restored to original working version (commit HEAD~1)
- Cat falls correctly
- Responds to clicks and spacebar
- All gameplay mechanics work
- Frame rate dependency issue remains unfixed

**Spec Status:** Incomplete
- Requirements documented ✓
- Design documented ✓
- Tasks defined ✓
- Tests created ✓
- Implementation attempted ✗
- Implementation failed ✗

## Conclusion

The device-independent falling speed fix is more complex than initially anticipated. While the root cause is clear and the design approach is sound, the implementation encountered multiple technical issues:

1. Browser timing inconsistencies (zero delta times)
2. Physics constant scaling challenges
3. Event handler double-execution bugs
4. Complex state management across game modes

The issue is real and affects gameplay fairness across devices, but fixing it requires either:
- A different technical approach (fixed timestep accumulator)
- More careful handling of edge cases
- Extensive testing on multiple devices/browsers
- Possibly a simpler game architecture

For now, the original game remains functional but frame-rate dependent. Future attempts should consider the alternative approaches and lessons learned documented above.
