// Swapline - Simple Hypercasual Highway Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const ROAD_WIDTH = 240;
const ROAD_LEFT = (canvas.width - ROAD_WIDTH) / 2;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const CAR_WIDTH = 36;
const CAR_HEIGHT = 60;
const OBSTACLE_WIDTH = 36;
const OBSTACLE_HEIGHT = 60;
const MAX_SPEED = 8;
const ACCEL = 0.2;
const BRAKE = 0.3;
const FRICTION = 0.05;

// Game state
let car = {
  x: canvas.width / 2,
  y: canvas.height - 100,
  speed: 3, // Start in motion
  heading: -Math.PI / 2, // Upwards (forwards)
  steering: 0 // radians
};
let obstacles = [];
let score = 0;
let gameOver = false;
let keys = { gas: false, brake: false };
let lastObstacleTime = 0;
const WHEEL_BASE = 40; // px, distance between front and rear wheels

// --- Steering wheel state ---
const MAX_WHEEL_ROTATION = 540; // degrees, 1.5 full turns
const MAX_TIRE_ANGLE = 90; // degrees, tire can turn 90 deg at max wheel rotation
let steeringAngle = 0; // in degrees, -MAX_WHEEL_ROTATION to +MAX_WHEEL_ROTATION
const MAX_STEERING_ANGLE = MAX_WHEEL_ROTATION;
let steeringActive = false;
let lastSteeringPointer = null;
let steeringStartAngle = 0;
let steeringStartPointerAngle = 0;

// Camera follows car vertically
let cameraY = car.y;

// Procedural road generation
const SEGMENT_LENGTH = 80;
let roadSegments = [];
function generateRoadIfNeeded() {
  // Generate new segments ahead
  while (
    roadSegments.length === 0 ||
    roadSegments[roadSegments.length - 1].y > cameraY - canvas.height
  ) {
    let y = roadSegments.length === 0 ? Math.floor(cameraY / SEGMENT_LENGTH) * SEGMENT_LENGTH : roadSegments[roadSegments.length - 1].y - SEGMENT_LENGTH;
    roadSegments.push({ y });
  }
  // Remove segments behind
  while (roadSegments.length > 0 && roadSegments[0].y > cameraY + canvas.height) {
    roadSegments.shift();
  }
}

function resetGame() {
  car = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    speed: 3, // Start in motion
    heading: -Math.PI / 2, // Upwards (forwards)
    steering: 0
  };
  obstacles = [];
  score = 0;
  gameOver = false;
  lastObstacleTime = 0;
  roadSegments = [];
  cameraY = car.y;
}

function drawRoad() {
  ctx.fillStyle = '#555';
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, canvas.height);
  // Lane lines (draw for each segment)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  for (let i = 1; i < LANE_COUNT; i++) {
    let x = ROAD_LEFT + i * LANE_WIDTH;
    ctx.beginPath();
    for (let seg of roadSegments) {
      let segY = (canvas.height / 2) - (cameraY - seg.y);
      ctx.moveTo(x, segY);
      ctx.lineTo(x, segY - SEGMENT_LENGTH);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCar(carObj, color = '#0af') {
  ctx.save();
  ctx.translate(carObj.x, canvas.height / 2); // Always draw car centered vertically
  ctx.rotate(carObj.heading + Math.PI / 2); // So 0 is up
  ctx.fillStyle = color;
  ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
  // Simple windshield
  ctx.fillStyle = '#fff8';
  ctx.fillRect(-CAR_WIDTH / 2 + 6, -CAR_HEIGHT / 2 + 8, CAR_WIDTH - 12, 16);
  // Draw front wheels turned
  ctx.save();
  ctx.translate(0, -CAR_HEIGHT / 2 + 8);
  ctx.rotate(carObj.steering);
  ctx.fillStyle = '#222';
  ctx.fillRect(-CAR_WIDTH / 2 + 4, -4, 12, 8);
  ctx.fillRect(CAR_WIDTH / 2 - 16, -4, 12, 8);
  ctx.restore();
  ctx.restore();
}

function drawObstacles() {
  ctx.fillStyle = '#f33';
  obstacles.forEach(obs => {
    let drawY = (canvas.height / 2) - (cameraY - obs.y);
    ctx.fillRect(obs.x, drawY, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
  });
}

function drawScore() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Score: ${score}`, 16, 32);
}

function drawGameOver() {
  ctx.fillStyle = '#fff';
  ctx.font = '36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '24px sans-serif';
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
  ctx.font = '18px sans-serif';
  ctx.fillText('Press Space or Tap to Restart', canvas.width / 2, canvas.height / 2 + 60);
  ctx.textAlign = 'start';
}

function spawnObstacle() {
  // Place obstacle ahead of car, random lane
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const x = ROAD_LEFT + lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2;
  const y = cameraY - canvas.height - OBSTACLE_HEIGHT - Math.random() * 200;
  obstacles.push({ x, y });
}

function updateObstacles() {
  // Remove obstacles that are far behind
  obstacles = obstacles.filter(obs => obs.y > cameraY + canvas.height / 2 - 100);
}

function checkCollision() {
  // Game over if car hits road edges
  const minX = ROAD_LEFT + CAR_WIDTH / 2;
  const maxX = ROAD_LEFT + ROAD_WIDTH - CAR_WIDTH / 2;
  if (car.x <= minX || car.x >= maxX) {
    gameOver = true;
    return;
  }
  for (let obs of obstacles) {
    // Transform obstacle to car's local space
    const dx = obs.x + OBSTACLE_WIDTH / 2 - car.x;
    const dy = obs.y + OBSTACLE_HEIGHT / 2 - car.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < (CAR_WIDTH + OBSTACLE_WIDTH) / 2) {
      gameOver = true;
      return;
    }
  }
}

function updateScore() {
  score += Math.floor(car.speed);
}

// --- Steering wheel UI logic ---
const steeringWheel = document.getElementById('steeringWheel');
function setSteeringVisual(angle) {
  steeringWheel.style.transform = `rotate(${angle}deg)`;
}
function getAngleFromCenter(x, y, rect) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}
function onSteeringStart(e) {
  steeringActive = true;
  const pointer = e.touches ? e.touches[0] : e;
  const rect = steeringWheel.getBoundingClientRect();
  steeringStartPointerAngle = getAngleFromCenter(pointer.clientX, pointer.clientY, rect);
  steeringStartAngle = steeringAngle;
  lastSteeringPointer = pointer;
  e.preventDefault();
}
function onSteeringMove(e) {
  if (!steeringActive) return;
  const pointer = e.touches ? e.touches[0] : e;
  const rect = steeringWheel.getBoundingClientRect();
  const pointerAngle = getAngleFromCenter(pointer.clientX, pointer.clientY, rect);
  let delta = pointerAngle - steeringStartPointerAngle;
  // Normalize delta to [-180, 180]
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  delta *= 0.6; // Reduce sensitivity
  steeringAngle = Math.max(-MAX_STEERING_ANGLE, Math.min(MAX_STEERING_ANGLE, steeringStartAngle + delta));
  setSteeringVisual(steeringAngle);
  e.preventDefault();
}
function onSteeringEnd(e) {
  steeringActive = false;
}
steeringWheel.addEventListener('mousedown', onSteeringStart);
steeringWheel.addEventListener('touchstart', onSteeringStart);
window.addEventListener('mousemove', onSteeringMove);
window.addEventListener('touchmove', onSteeringMove);
window.addEventListener('mouseup', onSteeringEnd);
window.addEventListener('touchend', onSteeringEnd);

function updateCar() {
  // Convert steering wheel angle to tire angle (tire angle = wheel angle * (90/540))
  if (!steeringActive) {
    // Auto-center steering wheel
    steeringAngle += (0 - steeringAngle) * 0.15;
    if (Math.abs(steeringAngle) < 0.5) steeringAngle = 0;
    setSteeringVisual(steeringAngle);
  }
  // Map wheel rotation to tire angle
  car.steering = (steeringAngle / MAX_WHEEL_ROTATION) * (MAX_TIRE_ANGLE * Math.PI / 180);
  // Bicycle model
  if (Math.abs(car.steering) > 0.001) {
    const turnRadius = WHEEL_BASE / Math.sin(car.steering);
    car.heading += car.speed / turnRadius;
  } else if (!steeringActive) {
    // Auto-straighten car heading toward vertical
    car.heading += (-Math.PI / 2 - car.heading) * 0.18;
    if (Math.abs(car.heading + Math.PI / 2) < 0.01) car.heading = -Math.PI / 2;
  }
  // Move car forward in heading direction
  car.x += car.speed * Math.cos(car.heading);
  car.y += car.speed * Math.sin(car.heading);
  // Clamp car to road bounds
  const minX = ROAD_LEFT + CAR_WIDTH / 2;
  const maxX = ROAD_LEFT + ROAD_WIDTH - CAR_WIDTH / 2;
  car.x = Math.max(minX, Math.min(maxX, car.x));
  // (No vertical clamping)
  // Speed: always moving, gas/brake accelerate/decelerate
  if (keys.gas) {
    car.speed = Math.min(car.speed + ACCEL, MAX_SPEED);
  } else if (keys.brake) {
    car.speed = Math.max(car.speed - BRAKE, 1.5); // Don't stop
  } else {
    car.speed = Math.max(car.speed - FRICTION, 1.5); // Don't stop
  }
}

function gameLoop(ts) {
  // Camera follows car vertically
  cameraY += (car.y - cameraY) * 0.15;
  generateRoadIfNeeded();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();
  drawObstacles();
  drawCar(car);
  drawScore();
  if (gameOver) {
    drawGameOver();
    return;
  }
  // Procedurally spawn obstacles
  if (!lastObstacleTime || ts - lastObstacleTime > 900) {
    spawnObstacle();
    lastObstacleTime = ts;
  }
  updateObstacles();
  checkCollision();
  updateScore();
  updateCar();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', function() {
  // Pedal buttons
  function setPedal(key, state) {
    keys[key] = state;
  }
  document.getElementById('gasBtn').addEventListener('mousedown', () => setPedal('gas', true));
  document.getElementById('gasBtn').addEventListener('mouseup', () => setPedal('gas', false));
  document.getElementById('gasBtn').addEventListener('mouseleave', () => setPedal('gas', false));
  document.getElementById('brakeBtn').addEventListener('mousedown', () => setPedal('brake', true));
  document.getElementById('brakeBtn').addEventListener('mouseup', () => setPedal('brake', false));
  document.getElementById('brakeBtn').addEventListener('mouseleave', () => setPedal('brake', false));
  // Touch support
  ['gasBtn','brakeBtn'].forEach(id => {
    document.getElementById(id).addEventListener('touchstart', e => { e.preventDefault(); setPedal(id==='gasBtn'?'gas':'brake', true); });
    document.getElementById(id).addEventListener('touchend', e => { e.preventDefault(); setPedal(id==='gasBtn'?'gas':'brake', false); });
  });

  // Keyboard
  window.addEventListener('keydown', e => {
    if (gameOver && (e.code === 'Space')) { resetGame(); requestAnimationFrame(gameLoop); }
    if (e.code === 'ArrowLeft') steeringAngle = Math.max(steeringAngle - 10, -MAX_STEERING_ANGLE);
    if (e.code === 'ArrowRight') steeringAngle = Math.min(steeringAngle + 10, MAX_STEERING_ANGLE);
    if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.gas = true;
    if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.brake = true;
    setSteeringVisual(steeringAngle);
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.gas = false;
    if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.brake = false;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      steeringAngle = 0;
      setSteeringVisual(0);
    }
  });
  // Restart on tap
  canvas.addEventListener('pointerdown', () => { if (gameOver) { resetGame(); requestAnimationFrame(gameLoop); } });

  // Start game
  resetGame();
  requestAnimationFrame(gameLoop);
}); 