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

    // Add collision avoidance properties
    this.safeDistance = OBSTACLE_HEIGHT * 2; // Minimum safe distance between cars
    this.emergencySwerve = false;
    this.emergencySwerveDirection = null;
    this.emergencySwerveTimer = null;
    this.playerAvoidanceDistance = OBSTACLE_HEIGHT * 3; // Distance at which to start avoiding player
  }

  // Add new method to check for nearby cars
  checkNearbyCars(enemyCars, targetLane, playerCar) {
    const safeZone = {
      left: this.x - this.safeDistance,
      right: this.x + this.safeDistance,
      top: this.y - this.safeDistance,
      bottom: this.y + this.safeDistance
    };

    // Check player car first
    if (playerCar) {
      const playerLane = Math.floor((playerCar.x - ROAD_LEFT) / LANE_WIDTH);
      if (playerLane === targetLane) {
        if (playerCar.x > safeZone.left && playerCar.x < safeZone.right &&
            playerCar.y > safeZone.top && playerCar.y < safeZone.bottom) {
          return true; // Player car is too close
        }
      }
    }

    // Then check other enemy cars
    for (let car of enemyCars) {
      if (car === this) continue; // Skip self

      // Check if car is in target lane
      const carLane = Math.floor((car.x - ROAD_LEFT) / LANE_WIDTH);
      if (carLane !== targetLane) continue;

      // Check if car is within safe distance
      if (car.x > safeZone.left && car.x < safeZone.right &&
          car.y > safeZone.top && car.y < safeZone.bottom) {
        return true; // Car is too close
      }
    }
    return false; // No cars too close
  }

  // Add emergency swerve method
  startEmergencySwerve(direction) {
    if (this.emergencySwerve) return;
    
    this.emergencySwerve = true;
    this.emergencySwerveDirection = direction;
    
    // Cancel any ongoing lane change
    if (this.isChangingLanes) {
      this.isChangingLanes = false;
      clearTimeout(this.turnSignalTimer);
      clearInterval(this.turnSignalBlinkInterval);
      this.turnSignal = null;
    }
    
    // Set timer to end emergency swerve
    this.emergencySwerveTimer = setTimeout(() => {
      this.emergencySwerve = false;
      this.emergencySwerveDirection = null;
    }, 1000);
  }

  // Add new method to check for player proximity
  checkPlayerProximity(playerCar) {
    if (!playerCar) return false;
    
    const dx = playerCar.x - this.x;
    const dy = playerCar.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < this.playerAvoidanceDistance;
  }

  // Add new method to determine best avoidance direction
  getAvoidanceDirection(playerCar) {
    if (!playerCar) return null;
    
    const dx = playerCar.x - this.x;
    // If player is to the left, swerve right and vice versa
    return dx < 0 ? 'right' : 'left';
  }

  startLaneChange(direction, enemyCars, playerCar) {
    if (this.isChangingLanes || this.emergencySwerve) return;
    
    // Check if player is nearby before attempting lane change
    if (this.checkPlayerProximity(playerCar)) {
      const avoidanceDirection = this.getAvoidanceDirection(playerCar);
      if (avoidanceDirection) {
        this.startEmergencySwerve(avoidanceDirection);
      }
      return;
    }
    
    // Determine target lane
    let targetLane;
    if (direction === 'left' && this.lane > 0) {
      targetLane = this.lane - 1;
    } else if (direction === 'right' && this.lane < LANE_COUNT - 1) {
      targetLane = this.lane + 1;
    } else {
      return; // Can't change lanes in that direction
    }

    // Check if there are any cars in the target lane (including player car)
    if (this.checkNearbyCars(enemyCars, targetLane, playerCar)) {
      // If there's a car in the target lane, try to swerve in the opposite direction
      const oppositeDirection = direction === 'left' ? 'right' : 'left';
      this.startEmergencySwerve(oppositeDirection);
      return;
    }

    // If safe to change lanes, proceed with normal lane change
    this.targetLane = targetLane;
    this.turnSignal = direction;

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
    }, 1000 + Math.random() * 2000);
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
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;
      }
    } else {
      // Move in the same direction as the player (up the screen)
      this.y -= this.speed;

      // Handle emergency swerving
      if (this.emergencySwerve) {
        const swerveAmount = this.emergencySwerveDirection === 'left' ? -0.3 : 0.3;
        this.steering = swerveAmount;
        this.x += this.speed * swerveAmount;
      }
      // Handle normal lane changing
      else if (this.isChangingLanes) {
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

// Drunk driver variant
class DrunkDriver extends EnemyCar {
  constructor(canvas, lane, speed) {
    super(canvas, lane, speed);
    this.swerveTimer = null;
    this.currentSwerveDirection = null;
    this.swerveIntensity = 0.4; // How much the car swerves
    this.swerveChangeInterval = 500; // How often the swerve direction changes
    
    // Override the car image with drunk driver sprite
    this.carImage = new Image();
    this.carImage.src = 'assets/drunk_driver.png';
    this.carImage.onload = () => {
      this.imageLoaded = true;
      // Calculate display dimensions to maintain aspect ratio
      const aspectRatio = this.carImage.width / this.carImage.height;
      this.displayHeight = OBSTACLE_HEIGHT * 1.5;  // 1.5x taller to match player car
      this.displayWidth = this.displayHeight * aspectRatio;
    };
    this.imageLoaded = false;
    
    this.startDrunkDriving();
  }

  startDrunkDriving() {
    // Start random swerving
    this.updateSwerveDirection();
    this.swerveTimer = setInterval(() => this.updateSwerveDirection(), this.swerveChangeInterval);
  }

  updateSwerveDirection() {
    // Randomly change swerve direction
    this.currentSwerveDirection = Math.random() < 0.5 ? -1 : 1;
    // Randomly adjust swerve intensity
    this.swerveIntensity = 0.3 + Math.random() * 0.3; // Between 0.3 and 0.6
  }

  // Override checkNearbyCars to always return false (no collision avoidance)
  checkNearbyCars(enemyCars, targetLane, playerCar) {
    return false;
  }

  // Override startLaneChange to be more erratic
  startLaneChange(direction, enemyCars, playerCar) {
    if (this.isChangingLanes) return;
    
    // Determine target lane with more randomness
    let targetLane;
    if (direction === 'left' && this.lane > 0) {
      targetLane = this.lane - 1;
    } else if (direction === 'right' && this.lane < LANE_COUNT - 1) {
      targetLane = this.lane + 1;
    } else {
      return;
    }

    // Always proceed with lane change, no safety checks
    this.targetLane = targetLane;
    this.turnSignal = direction;

    // Start turn signal
    this.turnSignalBlinkState = true;
    this.turnSignalBlinkInterval = setInterval(() => {
      this.turnSignalBlinkState = !this.turnSignalBlinkState;
    }, 500);

    // Set timer for actual lane change with random delay
    this.turnSignalTimer = setTimeout(() => {
      this.isChangingLanes = true;
      clearInterval(this.turnSignalBlinkInterval);
      this.turnSignal = null;
    }, 500 + Math.random() * 1000); // Shorter, more random delay
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
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;
      }
    } else {
      // Move in the same direction as the player (up the screen)
      this.y -= this.speed;

      // Add constant swerving
      this.steering = this.currentSwerveDirection * this.swerveIntensity;
      
      // Update position with steering
      this.x += this.speed * this.steering;
    }
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
    this.maxCarsInView = 10; // Maximum number of cars that should be visible at once
    this.minCarSpacing = OBSTACLE_HEIGHT * 1.5; // Reduced spacing to allow for occasional crashes
    this.drunkDriverChance = 0.2; // 20% chance to spawn a drunk driver
  }

  reset() {
    this.enemyCars = [];
    this.lastSpawnTime = 0;
  }

  spawnCar(playerY) {
    // Count cars that are within the spawn radius
    const carsInView = this.enemyCars.filter(car => 
      Math.abs(car.y - playerY) < this.spawnRadius
    ).length;

    // Don't spawn if we already have too many cars in view
    if (carsInView >= this.maxCarsInView) {
      return;
    }

    // Randomly select a lane
    const lane = Math.floor(Math.random() * LANE_COUNT);
    
    // Use player's default speed (half of MAX_SPEED)
    const speed = MAX_SPEED * 0.5;
    
    // Calculate spawn position within radius but outside camera view
    const angle = Math.random() * Math.PI * 2;
    const distance = this.minSpawnDistance + Math.random() * (this.spawnRadius - this.minSpawnDistance);
    const spawnY = playerY - distance;

    // Check if there's enough space for the new car
    const hasSpace = this.enemyCars.every(car => 
      Math.abs(car.y - spawnY) > this.minCarSpacing || 
      Math.abs(car.x - (ROAD_LEFT + (lane + 0.5) * LANE_WIDTH)) > LANE_WIDTH
    );

    if (!hasSpace) {
      return;
    }
    
    // Randomly decide whether to spawn a drunk driver
    const car = Math.random() < this.drunkDriverChance ? 
      new DrunkDriver(this.canvas, lane, speed) : 
      new EnemyCar(this.canvas, lane, speed);
    
    car.y = spawnY;
    this.enemyCars.push(car);

    // Only try to change lanes if it's not a drunk driver
    if (!(car instanceof DrunkDriver) && Math.random() < 0.5) {
      const direction = Math.random() < 0.5 ? 'left' : 'right';
      car.startLaneChange(direction, this.enemyCars, this.playerCar);
    }
  }

  update(cameraY, roadLeft, roadWidth, laneCount, laneWidth, playerCar) {
    // Update each car
    for (let i = this.enemyCars.length - 1; i >= 0; i--) {
      const car = this.enemyCars[i];
      
      // Remove cars that are off screen
      if (car.isOffScreen(cameraY)) {
        this.enemyCars.splice(i, 1);
        continue;
      }
      
      // Check wall collisions
      const carWidth = car.displayWidth;
      if (car.x - carWidth/2 < roadLeft || car.x + carWidth/2 > roadLeft + roadWidth) {
        // Calculate impact direction (always from the wall)
        const impactX = car.x < roadLeft + roadWidth/2 ? 1 : -1;
        const impactY = 0;
        const force = 2; // Wall collision force
        car.applyCollision(impactX, impactY, force);
      }

      // Check collisions with other cars
      for (let j = i + 1; j < this.enemyCars.length; j++) {
        const otherCar = this.enemyCars[j];
        
        // Get the actual dimensions of both cars
        const car1Width = car.displayWidth;
        const car1Height = car.displayHeight;
        const car2Width = otherCar.displayWidth;
        const car2Height = otherCar.displayHeight;
        
        // Calculate hitboxes (centered on car positions)
        const box1 = {
          left: car.x - car1Width / 2,
          right: car.x + car1Width / 2,
          top: car.y - car1Height / 2,
          bottom: car.y + car1Height / 2
        };
        
        const box2 = {
          left: otherCar.x - car2Width / 2,
          right: otherCar.x + car2Width / 2,
          top: otherCar.y - car2Height / 2,
          bottom: otherCar.y + car2Height / 2
        };
        
        // Check for intersection
        if (box1.left < box2.right &&
            box1.right > box2.left &&
            box1.top < box2.bottom &&
            box1.bottom > box2.top) {
          
          // Calculate collision force based on relative speeds
          const force = Math.max(1, Math.abs(car.speed - otherCar.speed));
          
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
          car.applyCollision(impactX, impactY, force);
          otherCar.applyCollision(-impactX, -impactY, force);
        }
      }
      
      // Update car
      car.update();
      
      // Randomly try to change lanes if not already changing lanes and not colliding
      if (!car.isChangingLanes && !car.emergencySwerve && !car.isColliding && Math.random() < 0.005) {
        const direction = Math.random() < 0.5 ? 'left' : 'right';
        car.startLaneChange(direction, this.enemyCars, playerCar);
      }
    }
    
    // Spawn new cars
    const now = Date.now();
    if (now - this.lastSpawnTime > this.spawnInterval) {
      this.spawnCar(cameraY);
      this.lastSpawnTime = now;
    }
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