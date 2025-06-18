// Player car class
class PlayerCar {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reset();
    
    // Load car image
    this.carImage = new Image();
    this.carImage.src = 'assets/player_car.png';
    this.carImage.onload = () => {
      this.imageLoaded = true;
      // Calculate display dimensions to maintain aspect ratio
      const aspectRatio = this.carImage.width / this.carImage.height;
      this.displayHeight = CAR_HEIGHT * 1.5;  // 1.5x taller
      this.displayWidth = this.displayHeight * aspectRatio;  // Width scales proportionally
    };
    this.imageLoaded = false;
  }

  reset() {
    this.x = ROAD_LEFT + ROAD_WIDTH / 2;
    this.y = 0;
    this.speed = 0;
    this.steering = 0;
    this.steeringAngle = 0;
    this.steeringSpeed = 0;
    this.steeringFriction = 0.95;
    this.steeringReturn = 0.1;
    this.steeringMax = 0.5;
    this.steeringAccel = 0.05;
    this.pedals = { gas: false, brake: false };
    
    // Physics properties
    this.velocityX = 0;
    this.velocityY = 0;
    this.angularVelocity = 0;
    this.rotation = 0;
    this.mass = 1;
    this.friction = 0.98;
    this.angularFriction = 0.95;
    this.isColliding = false;
  }

  setPedal(pedal, pressed) {
    this.pedals[pedal] = pressed;
  }

  applyCollision(impactX, impactY, force) {
    // Convert impact to velocity
    this.velocityX += impactX * force;
    this.velocityY += impactY * force;
    this.angularVelocity += (Math.random() - 0.5) * force * 0.1; // Random spin
    this.isColliding = true;
  }

  update(roadLeft, roadWidth, laneCount, laneWidth) {
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
      // Normal car control when not colliding
      // Update steering based on wheel input
      const targetSteering = window.steeringAngle / window.MAX_STEERING_ANGLE * this.steeringMax;
      this.steeringSpeed += (targetSteering - this.steering) * this.steeringAccel;
      this.steeringSpeed *= this.steeringFriction;
      this.steering += this.steeringSpeed;
      
      // Auto-center steering when no input
      if (!window.steeringActive && Math.abs(window.steeringAngle) < 1) {
        this.steering *= (1 - this.steeringReturn);
      }

      // Update speed based on pedals
      if (this.pedals.brake) {
        // When braking, gradually slow down
        this.speed = Math.max(this.speed - BRAKE, 0); // Never go below 0 (no reverse)
      } else if (this.pedals.gas) {
        // Accelerate when gas pedal is pressed
        this.speed = Math.min(this.speed + ACCEL, MAX_SPEED);
      } else {
        // Default to a slower speed when no pedals are pressed
        this.speed = Math.max(this.speed - FRICTION, MAX_SPEED * 0.5); // Default to half max speed
      }

      // Update position
      this.x += this.speed * this.steering;
      this.y -= this.speed;
    }

    // Check for wall collisions
    const carWidth = this.displayWidth;
    if (this.x - carWidth/2 < roadLeft || this.x + carWidth/2 > roadLeft + roadWidth) {
      // Calculate impact direction (always from the wall)
      const impactX = this.x < roadLeft + roadWidth/2 ? 1 : -1;
      const impactY = 0;
      const force = 2; // Wall collision force
      this.applyCollision(impactX, impactY, force);
    }

    // Keep car within road bounds
    this.x = Math.max(roadLeft + CAR_WIDTH / 2, Math.min(roadLeft + roadWidth - CAR_WIDTH / 2, this.x));
  }

  draw(cameraY, cameraX) {
    const screenY = (this.canvas.height / 2) - (cameraY - this.y);
    const screenX = this.x - cameraX;
    
    // Save context state
    this.ctx.save();
    
    // Translate to car position
    this.ctx.translate(screenX, screenY);
    
    // Rotate based on steering or physics rotation
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
      this.ctx.fillStyle = '#0af';
      this.ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
    }
    
    // Restore context state
    this.ctx.restore();
  }
}

// Export the PlayerCar class
window.PlayerCar = PlayerCar; 