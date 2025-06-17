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
let car = { lane: 1, x: ROAD_LEFT + LANE_WIDTH * 1 + (LANE_WIDTH - CAR_WIDTH) / 2, y: canvas.height - CAR_HEIGHT - 20, speed: 0 };
let obstacles = [];
let score = 0;
let gameOver = false;
let keys = { left: false, right: false, gas: false, brake: false };
let lastObstacleTime = 0;

function resetGame() {
  car = { lane: 1, x: ROAD_LEFT + LANE_WIDTH * 1 + (LANE_WIDTH - CAR_WIDTH) / 2, y: canvas.height - CAR_HEIGHT - 20, speed: 0 };
  obstacles = [];
  score = 0;
  gameOver = false;
  lastObstacleTime = 0;
}

function drawRoad() {
  // Road
  ctx.fillStyle = '#555';
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, canvas.height);
  // Lane lines
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  for (let i = 1; i < LANE_COUNT; i++) {
    let x = ROAD_LEFT + i * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCar(carObj, color = '#0af') {
  ctx.fillStyle = color;
  ctx.fillRect(carObj.x, carObj.y, CAR_WIDTH, CAR_HEIGHT);
  // Simple windshield
  ctx.fillStyle = '#fff8';
  ctx.fillRect(carObj.x + 6, carObj.y + 8, CAR_WIDTH - 12, 16);
}

function drawObstacles() {
  ctx.fillStyle = '#f33';
  obstacles.forEach(obs => {
    ctx.fillRect(obs.x, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
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
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const x = ROAD_LEFT + lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2;
  obstacles.push({ x, y: -OBSTACLE_HEIGHT });
}

function updateObstacles() {
  for (let obs of obstacles) {
    obs.y += car.speed + 2;
  }
  obstacles = obstacles.filter(obs => obs.y < canvas.height + OBSTACLE_HEIGHT);
}

function checkCollision() {
  for (let obs of obstacles) {
    if (
      car.x < obs.x + OBSTACLE_WIDTH &&
      car.x + CAR_WIDTH > obs.x &&
      car.y < obs.y + OBSTACLE_HEIGHT &&
      car.y + CAR_HEIGHT > obs.y
    ) {
      gameOver = true;
      return;
    }
  }
}

function updateScore() {
  score += Math.floor(car.speed);
}

function updateCar() {
  // Steering
  if (keys.left && car.lane > 0) {
    car.lane--;
    keys.left = false;
  }
  if (keys.right && car.lane < LANE_COUNT - 1) {
    car.lane++;
    keys.right = false;
  }
  car.x = ROAD_LEFT + car.lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
  // Speed
  if (keys.gas) {
    car.speed = Math.min(car.speed + ACCEL, MAX_SPEED);
  } else if (keys.brake) {
    car.speed = Math.max(car.speed - BRAKE, 0);
  } else {
    car.speed = Math.max(car.speed - FRICTION, 0);
  }
}

function gameLoop(ts) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();
  drawCar(car);
  drawObstacles();
  drawScore();
  if (gameOver) {
    drawGameOver();
    return;
  }
  // Spawn obstacles
  if (!lastObstacleTime || ts - lastObstacleTime > 1200 - car.speed * 80) {
    spawnObstacle();
    lastObstacleTime = ts;
  }
  updateObstacles();
  checkCollision();
  updateScore();
  updateCar();
  requestAnimationFrame(gameLoop);
}

// Input handlers
function setPedal(key, state) {
  keys[key] = state;
}
document.getElementById('leftBtn').addEventListener('click', () => { keys.left = true; });
document.getElementById('rightBtn').addEventListener('click', () => { keys.right = true; });
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
  if (e.code === 'ArrowLeft') keys.left = true;
  if (e.code === 'ArrowRight') keys.right = true;
  if (e.code === 'ArrowUp') keys.gas = true;
  if (e.code === 'ArrowDown') keys.brake = true;
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowUp') keys.gas = false;
  if (e.code === 'ArrowDown') keys.brake = false;
});
// Restart on tap
canvas.addEventListener('pointerdown', () => { if (gameOver) { resetGame(); requestAnimationFrame(gameLoop); } });

// Start game
resetGame();
requestAnimationFrame(gameLoop); 