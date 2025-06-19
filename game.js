// Game constants
const CAR_WIDTH = 36;
const CAR_HEIGHT = 60;
const OBSTACLE_WIDTH = 36;
const OBSTACLE_HEIGHT = 60;
const MAX_SPEED = 8;
const ACCEL = 0.1;
const BRAKE = 0.1;
const FRICTION = 0.02;
const WHEEL_BASE = 40; // px, distance between front and rear wheels

// AI Car constants
const AI_CAR_SPEED_MIN = 2;
const AI_CAR_SPEED_MAX = 6;
const AI_CAR_SPAWN_DISTANCE = 1000; // Distance ahead to spawn AI cars
const AI_CAR_SPAWN_INTERVAL = 2000; // Time between AI car spawns in ms

// Steering wheel constants
const MAX_WHEEL_ROTATION = 720; // degrees (one full rotation)
const MAX_TIRE_ANGLE = 60; // degrees (tire turn angle)
const MAX_STEERING_ANGLE = MAX_WHEEL_ROTATION;
const STEERING_SENSITIVITY = 0.8;

// Game state
let score = 0;
let gameOver = false;
let roadSegments = [];
const SEGMENT_LENGTH = 80;

// Add touch tracking map and touch-specific state
const activeTouches = new Map(); // Maps touch identifier to { control: 'steering'|'gas'|'brake', startAngle: number, startPointerAngle: number, lastPointerAngle: number }

// Helper to check if a touch is over an element
function isTouchOverElement(x, y, element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// Helper to get angle from center
window.getAngleFromCenter = function(x, y, rect) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
};

// Touch event handlers
function handleTouchStart(e) {
  e.preventDefault();
  const steeringWheel = document.getElementById('steeringWheel');
  const gasBtn = document.getElementById('gasBtn');
  const brakeBtn = document.getElementById('brakeBtn');

  for (let touch of e.changedTouches) {
    const { clientX, clientY, identifier } = touch;
    if (isTouchOverElement(clientX, clientY, steeringWheel)) {
      if (!activeTouches.has(identifier)) {
        const rect = steeringWheel.getBoundingClientRect();
        const pointerAngle = window.getAngleFromCenter(clientX, clientY, rect);
        activeTouches.set(identifier, {
          control: 'steering',
          startAngle: window.steeringAngle || 0,
          startPointerAngle: pointerAngle,
          lastPointerAngle: pointerAngle // Initialize last angle
        });
        window.steeringActive = true;
        console.log(`TouchStart: ID=${identifier}, Control=steering, StartAngle=${window.steeringAngle}`);
      }
    } else if (isTouchOverElement(clientX, clientY, gasBtn)) {
      if (!activeTouches.has(identifier)) {
        activeTouches.set(identifier, { control: 'gas' });
        this.playerCar.setPedal('gas', true);
        console.log(`TouchStart: ID=${identifier}, Control=gas`);
      }
    } else if (isTouchOverElement(clientX, clientY, brakeBtn)) {
      if (!activeTouches.has(identifier)) {
        activeTouches.set(identifier, { control: 'brake' });
        this.playerCar.setPedal('brake', true);
        console.log(`TouchStart: ID=${identifier}, Control=brake`);
      }
    }
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  const steeringWheel = document.getElementById('steeringWheel');
  if (!steeringWheel) return;

  for (let touch of e.changedTouches) {
    const { clientX, clientY, identifier } = touch;
    const touchData = activeTouches.get(identifier);
    if (touchData && touchData.control === 'steering' && window.steeringActive) {
      const rect = steeringWheel.getBoundingClientRect();
      const pointerAngle = window.getAngleFromCenter(clientX, clientY, rect);
      let delta = pointerAngle - touchData.lastPointerAngle;
      // Normalize delta to [-180, 180]
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      delta *= STEERING_SENSITIVITY;
      // Smooth delta to prevent snapping
      delta = delta * 0.7 + (touchData.lastDelta || 0) * 0.3;
      touchData.lastDelta = delta;
      const newAngle = Math.max(-window.MAX_STEERING_ANGLE, Math.min(window.MAX_STEERING_ANGLE, window.steeringAngle + delta));
      if (newAngle !== window.steeringAngle) {
        window.steeringAngle = newAngle;
        window.setSteeringVisual(window.steeringAngle);
        console.log(`TouchMove: ID=${identifier}, Angle=${newAngle}, Delta=${delta}`);
      }
      touchData.lastPointerAngle = pointerAngle;
    }
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  for (let touch of e.changedTouches) {
    const { identifier } = touch;
    const touchData = activeTouches.get(identifier);
    if (touchData) {
      if (touchData.control === 'steering') {
        activeTouches.delete(identifier);
        if (!Array.from(activeTouches.values()).some(t => t.control === 'steering')) {
          window.steeringActive = false;
          const returnToCenter = () => {
            if (!window.steeringActive) {
              window.steeringAngle *= 0.9;
              window.setSteeringVisual(window.steeringAngle);
              if (Math.abs(window.steeringAngle) > 0.1) {
                requestAnimationFrame(returnToCenter);
              } else {
                window.steeringAngle = 0;
                window.setSteeringVisual(0);
              }
            }
          };
          returnToCenter();
        }
        console.log(`TouchEnd: ID=${identifier}, Control=steering, ActiveTouches=${activeTouches.size}`);
      } else if (touchData.control === 'gas') {
        this.playerCar.setPedal('gas', false);
        activeTouches.delete(identifier);
        console.log(`TouchEnd: ID=${identifier}, Control=gas`);
      } else if (touchData.control === 'brake') {
        this.playerCar.setPedal('brake', false);
        activeTouches.delete(identifier);
        console.log(`TouchEnd: ID=${identifier}, Control=brake`);
      }
    }
  }
}

// Make constants available globally
Object.assign(window, {
  CAR_WIDTH, CAR_HEIGHT, OBSTACLE_WIDTH, OBSTACLE_HEIGHT,
  MAX_SPEED, ACCEL, BRAKE, FRICTION, WHEEL_BASE,
  AI_CAR_SPEED_MIN, AI_CAR_SPEED_MAX, AI_CAR_SPAWN_DISTANCE, AI_CAR_SPAWN_INTERVAL,
  MAX_WHEEL_ROTATION, MAX_TIRE_ANGLE, MAX_STEERING_ANGLE
});

// Steering wheel state
window.steeringAngle = 0; // in degrees, -MAX_WHEEL_ROTATION to +MAX_WHEEL_ROTATION
window.steeringActive = false;
window.lastSteeringPointer = null;
window.steeringStartAngle = 0;
window.steeringStartPointerAngle = 0;
window.lastPointerAngle = 0; // Add this to track the last angle

// Steering wheel UI functions
window.setSteeringVisual = function(angle) {
  document.getElementById('steeringWheel').style.transform = `rotate(${angle}deg)`;
};

window.onSteeringStart = function(e) {
  window.steeringActive = true;
  const pointer = e.touches ? e.touches[0] : e;
  const rect = e.target.getBoundingClientRect();
  window.steeringStartPointerAngle = window.getAngleFromCenter(pointer.clientX, pointer.clientY, rect);
  window.lastPointerAngle = window.steeringStartPointerAngle; // Initialize last angle
  window.steeringStartAngle = window.steeringAngle;
  window.lastSteeringPointer = pointer;
  e.preventDefault();
};

window.onSteeringMove = function(e) {
  if (!window.steeringActive) return;
  
  const pointer = e.touches ? e.touches[0] : e;
  const rect = document.getElementById('steeringWheel').getBoundingClientRect();
  const pointerAngle = window.getAngleFromCenter(pointer.clientX, pointer.clientY, rect);
  
  let delta = pointerAngle - window.lastPointerAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  
  const angleChange = delta * STEERING_SENSITIVITY;
  const newAngle = Math.max(-MAX_STEERING_ANGLE, 
                           Math.min(MAX_STEERING_ANGLE, 
                                  window.steeringAngle + angleChange));
  
  if (newAngle !== window.steeringAngle) {
    window.steeringAngle = newAngle;
    window.setSteeringVisual(window.steeringAngle);
  }
  
  window.lastPointerAngle = pointerAngle;
  e.preventDefault();
};

window.onSteeringEnd = function(e) {
  window.steeringActive = false;
  const returnToCenter = () => {
    if (!window.steeringActive) {
      window.steeringAngle *= 0.9;
      window.setSteeringVisual(window.steeringAngle);
      if (Math.abs(window.steeringAngle) > 0.1) {
        requestAnimationFrame(returnToCenter);
      } else {
        window.steeringAngle = 0;
        window.setSteeringVisual(0);
      }
    }
  };
  returnToCenter();
};

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false }); // Optimize canvas context
    this.ctx.imageSmoothingEnabled = false; // Disable image smoothing for better performance
    
    // Road properties
    this.ROAD_WIDTH = 700;
    this.ROAD_LEFT = (canvas.width - this.ROAD_WIDTH) / 2;
    this.LANE_COUNT = 7;
    this.LANE_WIDTH = this.ROAD_WIDTH / this.LANE_COUNT;
    
    // Camera properties
    this.cameraY = 0;
    this.cameraX = 0;
    this.cameraSmoothing = 0.1;
    
    // Game state
    this.score = 0;
    this.gameOver = false;
    this.scoreActive = true;
    this.highScore = localStorage.getItem('highScore') || 0;
    this.passedCars = new Set();
    this.roadSegments = [];
    
    // Performance optimizations
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fps = 60;
    this.frameInterval = 1000 / this.fps;
    
    // Make canvas-dependent constants available globally
    Object.assign(window, {
      ROAD_WIDTH: this.ROAD_WIDTH,
      ROAD_LEFT: this.ROAD_LEFT,
      LANE_COUNT: this.LANE_COUNT,
      LANE_WIDTH: this.LANE_WIDTH
    });
    
    this.playerCar = new PlayerCar(canvas);
    this.enemyCarManager = new EnemyCarManager(canvas);
    this.setupEventListeners();
  }

  setupEventListeners() {
    const gasBtn = document.getElementById('gasBtn');
    const brakeBtn = document.getElementById('brakeBtn');
    const steeringWheel = document.getElementById('steeringWheel');

    // Touch listeners (use dedicated touch handlers)
    steeringWheel.addEventListener('touchstart', handleTouchStart.bind(this));
    gasBtn.addEventListener('touchstart', handleTouchStart.bind(this));
    brakeBtn.addEventListener('touchstart', handleTouchStart.bind(this));
    window.addEventListener('touchmove', handleTouchMove.bind(this));
    window.addEventListener('touchend', handleTouchEnd.bind(this));

    // Mouse listeners
    gasBtn.addEventListener('mousedown', () => this.playerCar.setPedal('gas', true));
    gasBtn.addEventListener('mouseup', () => this.playerCar.setPedal('gas', false));
    gasBtn.addEventListener('mouseleave', () => this.playerCar.setPedal('gas', false));
    brakeBtn.addEventListener('mousedown', () => this.playerCar.setPedal('brake', true));
    brakeBtn.addEventListener('mouseup', () => this.playerCar.setPedal('brake', false));
    brakeBtn.addEventListener('mouseleave', () => this.playerCar.setPedal('brake', false));
    steeringWheel.addEventListener('mousedown', window.onSteeringStart);
    window.addEventListener('mousemove', window.onSteeringMove);
    window.addEventListener('mouseup', window.onSteeringEnd);

    // Keyboard listeners
    window.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        if (this.gameOver) {
          this.reset();
        }
        return;
      }
      if (e.code === 'ArrowLeft') window.steeringAngle = Math.max(window.steeringAngle - 10, -window.MAX_STEERING_ANGLE);
      if (e.code === 'ArrowRight') window.steeringAngle = Math.min(window.steeringAngle + 10, window.MAX_STEERING_ANGLE);
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.playerCar.setPedal('gas', true);
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') this.playerCar.setPedal('brake', true);
      window.setSteeringVisual(window.steeringAngle);
    });

    window.addEventListener('keyup', e => {
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.playerCar.setPedal('gas', false);
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') this.playerCar.setPedal('brake', false);
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        window.steeringAngle = 0;
        window.setSteeringVisual(0);
      }
    });

    // Restart on tap
    this.canvas.addEventListener('pointerdown', () => {
      if (this.gameOver) {
        this.reset();
      }
    });
  }

  updateCamera() {
    // Calculate target camera position (centered on player)
    const targetX = this.playerCar.x - this.canvas.width / 2;
    const targetY = this.playerCar.y - this.canvas.height * 0.3;
    
    // Smoothly interpolate current camera position to target
    this.cameraX += (targetX - this.cameraX) * this.cameraSmoothing;
    this.cameraY = targetY;
  }

  reset() {
    this.score = 0;
    this.gameOver = false;
    this.scoreActive = true;
    this.passedCars.clear(); // Clear the set of passed cars
    this.roadSegments = []; // Reset road segments
    
    // Reset player car
    this.playerCar.reset();
    
    // Reset enemy cars
    this.enemyCarManager.reset();
    
    // Reset camera
    this.cameraY = this.playerCar.y - this.canvas.height * 0.3;
    this.cameraX = this.playerCar.x - this.canvas.width / 2;
    
    // Reset steering
    window.steeringAngle = 0;
    window.setSteeringVisual(0);
  }

  generateRoadIfNeeded() {
    while (
      this.roadSegments.length === 0 ||
      this.roadSegments[this.roadSegments.length - 1].y > this.cameraY - this.canvas.height
    ) {
      let y = this.roadSegments.length === 0 ? 
        Math.floor(this.cameraY / SEGMENT_LENGTH) * SEGMENT_LENGTH : 
        this.roadSegments[this.roadSegments.length - 1].y - SEGMENT_LENGTH;
      this.roadSegments.push({ y });
    }
    while (this.roadSegments.length > 0 && this.roadSegments[0].y > this.cameraY + this.canvas.height) {
      this.roadSegments.shift();
    }
  }

  drawRoad() {
    // Draw road background
    this.ctx.fillStyle = '#555';
    this.ctx.fillRect(this.ROAD_LEFT - this.cameraX, 0, this.ROAD_WIDTH, this.canvas.height);
    
    // Draw lane markers
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([20, 20]);
    for (let i = 1; i < this.LANE_COUNT; i++) {
      let x = this.ROAD_LEFT + i * this.LANE_WIDTH - this.cameraX;
      this.ctx.beginPath();
      for (let seg of this.roadSegments) {
        let y = (this.canvas.height / 2) - (this.cameraY - seg.y);
        if (y > -20 && y < this.canvas.height + 20) {
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x, y + SEGMENT_LENGTH);
        }
      }
      this.ctx.stroke();
    }
    this.ctx.setLineDash([]);
  }

  drawScore() {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '20px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.score}`, 16, 32);
    this.ctx.fillText(`High Score: ${this.highScore}`, 16, 64);
  }

  drawGameOver() {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Game over text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 80);
    
    // Score text
    this.ctx.font = '24px sans-serif';
    this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 - 20);
    this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    
    // Restart instructions
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('Press Space or Tap to Restart', this.canvas.width / 2, this.canvas.height / 2 + 80);
  }

  update() {
    // Update camera position
    this.updateCamera();
    
    // Generate road segments as needed
    this.generateRoadIfNeeded();
    
    // Update player car
    this.playerCar.update(this.ROAD_LEFT, this.ROAD_WIDTH, this.LANE_COUNT, this.LANE_WIDTH);
    
    // Update enemy cars
    this.enemyCarManager.update(this.cameraY, this.ROAD_LEFT, this.ROAD_WIDTH, this.LANE_COUNT, this.LANE_WIDTH, this.playerCar);
    
    // Check for collisions and count passed cars
    if (this.scoreActive) {
      for (let car of this.enemyCarManager.enemyCars) {
        // Get the actual dimensions of both cars
        const playerWidth = this.playerCar.displayWidth;
        const playerHeight = this.playerCar.displayHeight;
        const enemyWidth = car.displayWidth;
        const enemyHeight = car.displayHeight;
        
        // Calculate hitboxes (centered on car positions)
        const playerBox = {
          left: this.playerCar.x - playerWidth / 2,
          right: this.playerCar.x + playerWidth / 2,
          top: this.playerCar.y - playerHeight / 2,
          bottom: this.playerCar.y + playerHeight / 2
        };
        
        const enemyBox = {
          left: car.x - enemyWidth / 2,
          right: car.x + enemyWidth / 2,
          top: car.y - enemyHeight / 2,
          bottom: car.y + enemyHeight / 2
        };
        
        // Check for intersection
        if (playerBox.left < enemyBox.right &&
            playerBox.right > enemyBox.left &&
            playerBox.top < enemyBox.bottom &&
            playerBox.bottom > enemyBox.top) {
          
          // Calculate collision force based on relative speeds
          const force = Math.max(1, Math.abs(this.playerCar.speed - car.speed));
          
          // Calculate impact direction based on which sides collided
          let impactX = 0;
          let impactY = 0;
          
          // Determine which sides collided
          const leftOverlap = playerBox.right - enemyBox.left;
          const rightOverlap = enemyBox.right - playerBox.left;
          const topOverlap = playerBox.bottom - enemyBox.top;
          const bottomOverlap = enemyBox.bottom - playerBox.top;
          
          // Find the smallest overlap to determine the primary collision direction
          const minOverlap = Math.min(leftOverlap, rightOverlap, topOverlap, bottomOverlap);
          
          if (minOverlap === leftOverlap) {
            impactX = -1; // Collision from left
          } else if (minOverlap === rightOverlap) {
            impactX = 1; // Collision from right
          } else if (minOverlap === topOverlap) {
            impactY = -1; // Collision from top
          } else {
            impactY = 1; // Collision from bottom
          }
          
          // Normalize the impact vector
          const length = Math.sqrt(impactX * impactX + impactY * impactY);
          impactX /= length;
          impactY /= length;
          
          // Apply collision physics to both cars
          this.playerCar.applyCollision(impactX, impactY, force);
          car.applyCollision(-impactX, -impactY, force);
          
          // Update high score if needed
          if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
          }
          
          // Show game over screen and stop score
          this.gameOver = true;
          this.scoreActive = false;
          break;
        }
        
        // Check if car has been passed
        if (!this.passedCars.has(car) && car.y > this.playerCar.y) {
          this.passedCars.add(car);
          this.score += 1;
        }
      }
    }

    // Check for collisions with enemy cars
    if (this.enemyCarManager.checkCollision(this.playerCar)) {
      // Calculate collision force and direction
      const force = 2;
      const impactX = Math.random() - 0.5; // Random horizontal impact
      const impactY = -1; // Always push the player car backward
      
      // Apply collision physics to player car
      this.playerCar.applyCollision(impactX, impactY, force);
      this.gameOver = true;
    }

    // Check for wall collisions
    const playerWidth = this.playerCar.displayWidth;
    if (this.playerCar.x - playerWidth/2 < this.ROAD_LEFT || this.playerCar.x + playerWidth/2 > this.ROAD_LEFT + this.ROAD_WIDTH) {
      // Calculate impact direction (always from the wall)
      const impactX = this.playerCar.x < this.ROAD_LEFT + this.ROAD_WIDTH/2 ? 1 : -1;
      const impactY = 0;
      const force = 2; // Wall collision force
      this.playerCar.applyCollision(impactX, impactY, force);
      this.gameOver = true;
    }
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw road
    this.drawRoad();
    
    // Draw enemy cars
    this.enemyCarManager.draw(this.cameraY, this.cameraX);
    
    // Draw player car
    this.playerCar.draw(this.cameraY, this.cameraX);
    
    // Draw score
    this.drawScore();
    
    // Draw game over screen if game is over
    if (this.gameOver) {
      this.drawGameOver();
    }
  }

  gameLoop(timestamp) {
    // Throttle frame rate for better performance
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const elapsed = timestamp - this.lastFrameTime;
    
    if (elapsed > this.frameInterval) {
      this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
      
      this.update();
      this.draw();
    }
    
    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  start() {
    this.reset();
    this.gameLoop();
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  game.start();
}); 