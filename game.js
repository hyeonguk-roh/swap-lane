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
const MAX_WHEEL_ROTATION = 540; // degrees, 1.5 full turns
const MAX_TIRE_ANGLE = 90; // degrees, tire can turn 90 deg at max wheel rotation
const MAX_STEERING_ANGLE = MAX_WHEEL_ROTATION;

// Game state
let score = 0;
let gameOver = false;
let roadSegments = [];
const SEGMENT_LENGTH = 80;

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

// Steering wheel UI functions
window.setSteeringVisual = function(angle) {
  document.getElementById('steeringWheel').style.transform = `rotate(${angle}deg)`;
};

window.getAngleFromCenter = function(x, y, rect) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  return Math.atan2(dy, dx) * 180 / Math.PI;
};

window.onSteeringStart = function(e) {
  window.steeringActive = true;
  const pointer = e.touches ? e.touches[0] : e;
  const rect = e.target.getBoundingClientRect();
  window.steeringStartPointerAngle = window.getAngleFromCenter(pointer.clientX, pointer.clientY, rect);
  window.steeringStartAngle = window.steeringAngle;
  window.lastSteeringPointer = pointer;
  e.preventDefault();
};

window.onSteeringMove = function(e) {
  if (!window.steeringActive) return;
  const pointer = e.touches ? e.touches[0] : e;
  const rect = document.getElementById('steeringWheel').getBoundingClientRect();
  const pointerAngle = window.getAngleFromCenter(pointer.clientX, pointer.clientY, rect);
  let delta = pointerAngle - window.steeringStartPointerAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  delta *= 1.2;
  window.steeringAngle = Math.max(-window.MAX_STEERING_ANGLE, Math.min(window.MAX_STEERING_ANGLE, window.steeringStartAngle + delta));
  window.setSteeringVisual(window.steeringAngle);
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
    this.ctx = canvas.getContext('2d');
    
    // Canvas-dependent constants
    this.ROAD_WIDTH = 480;  // Doubled from 240 to accommodate 6 lanes
    this.ROAD_LEFT = (canvas.width - this.ROAD_WIDTH) / 2;
    this.LANE_COUNT = 6;  // Changed from 3 to 6
    this.LANE_WIDTH = this.ROAD_WIDTH / this.LANE_COUNT;
    
    // Camera settings
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraSmoothing = 0.1; // How quickly the camera follows (0-1)
    
    // Game state
    this.score = 0;
    this.gameOver = false;
    this.scoreActive = true;
    this.highScore = localStorage.getItem('highScore') || 0;
    this.passedCars = new Set(); // Track which cars have been passed
    
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
    // Pedal buttons
    document.getElementById('gasBtn').addEventListener('mousedown', () => this.playerCar.setPedal('gas', true));
    document.getElementById('gasBtn').addEventListener('mouseup', () => this.playerCar.setPedal('gas', false));
    document.getElementById('gasBtn').addEventListener('mouseleave', () => this.playerCar.setPedal('gas', false));
    document.getElementById('brakeBtn').addEventListener('mousedown', () => this.playerCar.setPedal('brake', true));
    document.getElementById('brakeBtn').addEventListener('mouseup', () => this.playerCar.setPedal('brake', false));
    document.getElementById('brakeBtn').addEventListener('mouseleave', () => this.playerCar.setPedal('brake', false));

    // Touch support
    ['gasBtn','brakeBtn'].forEach(id => {
      document.getElementById(id).addEventListener('touchstart', e => { 
        e.preventDefault(); 
        this.playerCar.setPedal(id==='gasBtn'?'gas':'brake', true); 
      });
      document.getElementById(id).addEventListener('touchend', e => { 
        e.preventDefault(); 
        this.playerCar.setPedal(id==='gasBtn'?'gas':'brake', false); 
      });
    });

    // Keyboard
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

    // Steering wheel
    const steeringWheel = document.getElementById('steeringWheel');
    steeringWheel.addEventListener('mousedown', window.onSteeringStart);
    steeringWheel.addEventListener('touchstart', window.onSteeringStart);
    window.addEventListener('mousemove', window.onSteeringMove);
    window.addEventListener('touchmove', window.onSteeringMove);
    window.addEventListener('mouseup', window.onSteeringEnd);
    window.addEventListener('touchend', window.onSteeringEnd);
  }

  updateCamera() {
    // Calculate target camera position (centered on player)
    const targetX = this.playerCar.x - this.canvas.width / 2;
    const targetY = this.playerCar.y;
    
    // Smoothly interpolate current camera position to target
    this.cameraX += (targetX - this.cameraX) * this.cameraSmoothing;
    this.cameraY = targetY; // Keep vertical camera instant for better gameplay
  }

  reset() {
    // Reset game state
    this.score = 0;
    this.gameOver = false;
    this.scoreActive = true;
    this.passedCars.clear(); // Clear the set of passed cars
    
    // Reset player car
    this.playerCar.reset();
    
    // Reset enemy cars
    this.enemyCarManager.reset();
    
    // Reset camera
    this.cameraY = this.playerCar.y;
    this.cameraX = this.playerCar.x - this.canvas.width / 2;
    
    // Reset road segments
    roadSegments = [];
    
    // Reset steering
    window.steeringAngle = 0;
    window.setSteeringVisual(0);
  }

  generateRoadIfNeeded() {
    while (
      roadSegments.length === 0 ||
      roadSegments[roadSegments.length - 1].y > this.cameraY - this.canvas.height
    ) {
      let y = roadSegments.length === 0 ? 
        Math.floor(this.cameraY / SEGMENT_LENGTH) * SEGMENT_LENGTH : 
        roadSegments[roadSegments.length - 1].y - SEGMENT_LENGTH;
      roadSegments.push({ y });
    }
    while (roadSegments.length > 0 && roadSegments[0].y > this.cameraY + this.canvas.height) {
      roadSegments.shift();
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
      for (let seg of roadSegments) {
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

  drawTitleScreen() {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Swap Lane', this.canvas.width / 2, this.canvas.height / 2 - 50);
    
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Press SPACE to Start', this.canvas.width / 2, this.canvas.height / 2 + 50);
  }

  drawGameOver() {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 100);
    
    this.ctx.font = '36px Arial';
    this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 - 20);
    this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
    
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Press SPACE to Restart', this.canvas.width / 2, this.canvas.height / 2 + 100);
  }

  update() {
    // Update camera position
    this.updateCamera();
    
    // Generate road segments as needed
    this.generateRoadIfNeeded();
    
    // Update player car
    this.playerCar.update(this.ROAD_LEFT, this.ROAD_WIDTH, this.LANE_COUNT, this.LANE_WIDTH);
    
    // Update enemy cars
    this.enemyCarManager.update(this.cameraY, this.ROAD_LEFT, this.ROAD_WIDTH, this.LANE_COUNT, this.LANE_WIDTH);
    
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
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw road
    this.drawRoad();
    
    // Draw score
    this.drawScore();
    
    // Draw title screen if game is not started
    if (!this.gameOver) {
      this.drawTitleScreen();
      return;
    }
    
    // Draw game over screen if game is over
    if (this.gameOver) {
      this.drawGameOver();
      return;
    }
    
    // Draw game elements
    this.playerCar.draw(this.cameraY, this.cameraX);
    this.enemyCarManager.draw(this.cameraY, this.cameraX);
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
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