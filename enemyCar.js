// Enemy car class
class EnemyCar {
  constructor(canvas, lane, speed) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lane = lane;
    this.speed = speed;
    this.y = -OBSTACLE_HEIGHT;
    this.x = ROAD_LEFT + (lane + 0.5) * LANE_WIDTH;
    
    // Load enemy car image
    this.carImage = new Image();
    this.carImage.src = 'assets/enemy_car.png';
    this.carImage.onload = () => {
      this.imageLoaded = true;
      // Calculate display dimensions to maintain aspect ratio
      const aspectRatio = this.carImage.width / this.carImage.height;
      this.displayHeight = OBSTACLE_HEIGHT * 1.5;  // 1.5x taller to match player car
      this.displayWidth = this.displayHeight * aspectRatio;
    };
    this.imageLoaded = false;

    // Physics properties
    this.velocityX = 0;
    this.velocityY = 0;
    this.angularVelocity = 0;
    this.rotation = 0;
    this.mass = 1;
    this.friction = 0.98;
    this.angularFriction = 0.95;
    this.isColliding = false;

    // Steering properties (like player car)
    this.steering = 0;
    this.steeringAngle = 0;
    this.steeringSpeed = 0;
    this.steeringFriction = 0.95;
    this.steeringReturn = 0.1;
    this.steeringMax = 0.5;
    this.steeringAccel = 0.02;

    // Lane changing properties
    this.isChangingLanes = false;
    this.targetLane = lane;
    this.turnSignal = null; // 'left' or 'right'
    this.turnSignalTimer = null;
    this.turnSignalBlinkState = false;
    this.turnSignalBlinkInterval = 500; // ms
  }

  startLaneChange(direction) {
    if (this.isChangingLanes) return;
    
    // Determine target lane
    if (direction === 'left' && this.lane > 0) {
      this.targetLane = this.lane - 1;
      this.turnSignal = 'left';
    } else if (direction === 'right' && this.lane < LANE_COUNT - 1) {
      this.targetLane = this.lane + 1;
      this.turnSignal = 'right';
    } else {
      return; // Can't change lanes in that direction
    }

    // Start turn signal
    this.turnSignalBlinkState = true;
    this.turnSignalBlinkInterval = setInterval(() => {
      this.turnSignalBlinkState = !this.turnSignalBlinkState;
    }, 500);

    // Set timer for actual lane change
    this.turnSignalTimer = setTimeout(() => {
      this.isChangingLanes = true;
      clearInterval(this.turnSignalBlinkInterval);
      this.turnSignal = null;
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  }

  applyCollision(impactX, impactY, force) {
    // Convert impact to velocity
    this.velocityX += impactX * force;
    this.velocityY += impactY * force;
    this.angularVelocity += (Math.random() - 0.5) * force * 0.1; // Random spin
    this.isColliding = true;
    
    // Stop any ongoing lane change
    if (this.isChangingLanes) {
      this.isChangingLanes = false;
      clearTimeout(this.turnSignalTimer);
      clearInterval(this.turnSignalBlinkInterval);
      this.turnSignal = null;
    }
  }

  update() {
    if (this.isColliding) {
      // Apply physics when colliding
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.rotation += this.angularVelocity;
      
      // Apply friction
      this.velocityX *= this.friction;
      this.velocityY *= this.friction;
      this.angularVelocity *= this.angularFriction;
      
      // Stop physics when velocities are very small
      if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1 && Math.abs(this.angularVelocity) < 0.01) {
        this.isColliding = false;
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;
      }
    } else {
      // Move in the same direction as the player (up the screen)
      this.y -= this.speed;

      // Handle lane changing with steering mechanics
      if (this.isChangingLanes) {
        const targetX = ROAD_LEFT + (this.targetLane + 0.5) * LANE_WIDTH;
        const dx = targetX - this.x;
        
        // Calculate steering based on distance to target
        const targetSteering = Math.max(-this.steeringMax, Math.min(this.steeringMax, dx * 0.01));
        
        // Update steering like player car
        this.steeringSpeed += (targetSteering - this.steering) * this.steeringAccel;
        this.steeringSpeed *= this.steeringFriction;
        this.steering += this.steeringSpeed;
        
        // Auto-center steering when close to target
        if (Math.abs(dx) < 1) {
          this.x = targetX;
          this.lane = this.targetLane;
          this.isChangingLanes = false;
          this.steering = 0;
          this.steeringSpeed = 0;
        }
      } else {
        // Auto-center steering when not changing lanes
        this.steering *= (1 - this.steeringReturn);
      }

      // Update position with steering
      this.x += this.speed * this.steering;
    }
  }

  draw(cameraY, cameraX) {
    const screenY = (this.canvas.height / 2) - (cameraY - this.y);
    const screenX = this.x - cameraX;
    
    // Save context state
    this.ctx.save();
    
    // Translate to car position
    this.ctx.translate(screenX, screenY);
    
    // Rotate based on physics rotation or steering
    if (this.isColliding) {
      this.ctx.rotate(this.rotation);
    } else {
      this.ctx.rotate(this.steering * 0.5);
    }
    
    if (this.imageLoaded) {
      // Draw the entire image
      this.ctx.drawImage(
        this.carImage,
        -this.displayWidth / 2, -this.displayHeight / 2, this.displayWidth, this.displayHeight
      );
    } else {
      // Fallback to rectangle if image not loaded
      this.ctx.fillStyle = '#f00';
      this.ctx.fillRect(-OBSTACLE_WIDTH / 2, -OBSTACLE_HEIGHT / 2, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
    }

    // Draw turn signal if active
    if (this.turnSignal && this.turnSignalBlinkState) {
      this.ctx.fillStyle = '#ff0';
      const arrowSize = 10;
      const arrowOffset = this.displayWidth / 2 + 5;
      
      if (this.turnSignal === 'left') {
        // Draw left arrow
        this.ctx.beginPath();
        this.ctx.moveTo(-arrowOffset, 0);
        this.ctx.lineTo(-arrowOffset - arrowSize, -arrowSize);
        this.ctx.lineTo(-arrowOffset - arrowSize, arrowSize);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Draw right arrow
        this.ctx.beginPath();
        this.ctx.moveTo(arrowOffset, 0);
        this.ctx.lineTo(arrowOffset + arrowSize, -arrowSize);
        this.ctx.lineTo(arrowOffset + arrowSize, arrowSize);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
    
    // Restore context state
    this.ctx.restore();
  }

  isOffScreen(cameraY) {
    return this.y > cameraY + this.canvas.height;
  }
}

// Enemy car manager class
class EnemyCarManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.enemyCars = [];
    this.lastSpawnTime = 0;
    this.spawnInterval = 1000; // Spawn a car every second
    this.spawnRadius = 1000; // Spawn cars within 1000 pixels of player
    this.minSpawnDistance = 800; // Minimum distance from player to spawn
  }

  reset() {
    this.enemyCars = [];
    this.lastSpawnTime = 0;
  }

  spawnCar(playerY) {
    // Randomly select a lane
    const lane = Math.floor(Math.random() * LANE_COUNT);
    
    // Use player's default speed (half of MAX_SPEED)
    const speed = MAX_SPEED * 0.5;
    
    // Calculate spawn position within radius but outside camera view
    const angle = Math.random() * Math.PI * 2; // Random angle
    const distance = this.minSpawnDistance + Math.random() * (this.spawnRadius - this.minSpawnDistance);
    const spawnY = playerY - distance; // Spawn behind the player
    
    // Create new enemy car
    const car = new EnemyCar(this.canvas, lane, speed);
    car.y = spawnY; // Set the initial Y position
    this.enemyCars.push(car);

    // Randomly decide if this car will change lanes
    if (Math.random() < 0.3) { // 30% chance to change lanes
      const direction = Math.random() < 0.5 ? 'left' : 'right';
      car.startLaneChange(direction);
    }
  }

  update(cameraY, roadLeft, roadWidth, laneCount, laneWidth) {
    const currentTime = Date.now();
    
    // Spawn new cars at random intervals
    if (currentTime - this.lastSpawnTime > this.spawnInterval) {
      this.spawnCar(cameraY);
      this.lastSpawnTime = currentTime;
      // Randomize next spawn interval between 0.5 and 2 seconds
      this.spawnInterval = 500 + Math.random() * 1500;
    }

    // Update and check collisions between cars
    for (let i = 0; i < this.enemyCars.length; i++) {
      const car1 = this.enemyCars[i];
      car1.update();

      // Check collisions with other cars
      for (let j = i + 1; j < this.enemyCars.length; j++) {
        const car2 = this.enemyCars[j];
        
        // Get the actual dimensions of both cars
        const car1Width = car1.displayWidth;
        const car1Height = car1.displayHeight;
        const car2Width = car2.displayWidth;
        const car2Height = car2.displayHeight;
        
        // Calculate hitboxes (centered on car positions)
        const box1 = {
          left: car1.x - car1Width / 2,
          right: car1.x + car1Width / 2,
          top: car1.y - car1Height / 2,
          bottom: car1.y + car1Height / 2
        };
        
        const box2 = {
          left: car2.x - car2Width / 2,
          right: car2.x + car2Width / 2,
          top: car2.y - car2Height / 2,
          bottom: car2.y + car2Height / 2
        };
        
        // Check for intersection
        if (box1.left < box2.right &&
            box1.right > box2.left &&
            box1.top < box2.bottom &&
            box1.bottom > box2.top) {
          
          // Calculate collision force based on relative speeds
          const force = Math.max(1, Math.abs(car1.speed - car2.speed));
          
          // Calculate impact direction based on which sides collided
          let impactX = 0;
          let impactY = 0;
          
          // Determine which sides collided
          const leftOverlap = box1.right - box2.left;
          const rightOverlap = box2.right - box1.left;
          const topOverlap = box1.bottom - box2.top;
          const bottomOverlap = box2.bottom - box1.top;
          
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
          car1.applyCollision(impactX, impactY, force);
          car2.applyCollision(-impactX, -impactY, force);
        }
      }
    }

    // Remove off-screen cars
    this.enemyCars = this.enemyCars.filter(car => !car.isOffScreen(cameraY));
  }

  draw(cameraY, cameraX) {
    for (let car of this.enemyCars) {
      car.draw(cameraY, cameraX);
    }
  }

  checkCollision(playerCar) {
    return this.enemyCars.some(car => {
      const dx = car.x - playerCar.x;
      const dy = car.y - playerCar.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < CAR_WIDTH;
    });
  }
}

// Export the classes
window.EnemyCar = EnemyCar;
window.EnemyCarManager = EnemyCarManager; 