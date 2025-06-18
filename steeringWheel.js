class SteeringWheel {
  constructor(canvas, playerCar) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.playerCar = playerCar;
    
    // Wheel properties
    this.centerX = canvas.width - 100;
    this.centerY = canvas.height - 100;
    this.radius = 50;
    this.rotation = 0;
    this.isDragging = false;
    
    // Mouse/touch tracking
    this.lastX = 0;
    this.lastY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.totalRotation = 0;
    this.maxRotation = (720 * Math.PI) / 180; // 720 degrees in radians
    this.activeTouchId = null;
    
    // Event listeners
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch event listeners
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    this.startDrag(mouseX, mouseY);
  }

  handleTouchStart(e) {
    e.preventDefault(); // Prevent default touch behavior
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Check if touch is within wheel radius
    const dx = touchX - this.centerX;
    const dy = touchY - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= this.radius) {
      this.activeTouchId = touch.identifier;
      this.startDrag(touchX, touchY);
    }
  }

  startDrag(x, y) {
    // Check if touch/click is within wheel radius
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= this.radius) {
      this.isDragging = true;
      this.lastX = x;
      this.lastY = y;
      this.currentX = x;
      this.currentY = y;
    }
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.currentX = e.clientX - rect.left;
    this.currentY = e.clientY - rect.top;
    
    this.updateRotation();
  }

  handleTouchMove(e) {
    e.preventDefault(); // Prevent default touch behavior
    if (!this.isDragging || this.activeTouchId === null) return;
    
    // Find the active touch
    const touch = Array.from(e.touches).find(t => t.identifier === this.activeTouchId);
    if (!touch) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.currentX = touch.clientX - rect.left;
    this.currentY = touch.clientY - rect.top;
    
    this.updateRotation();
  }

  updateRotation() {
    // Calculate vectors from center to positions
    const lastVector = {
      x: this.lastX - this.centerX,
      y: this.lastY - this.centerY
    };
    const currentVector = {
      x: this.currentX - this.centerX,
      y: this.currentY - this.centerY
    };
    
    // Calculate angle difference using atan2
    const lastAngle = Math.atan2(lastVector.y, lastVector.x);
    const currentAngle = Math.atan2(currentVector.y, currentVector.x);
    
    // Calculate the smallest angle difference, handling wrapping
    let angleDiff = currentAngle - lastAngle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Update total rotation without wrapping
    const newRotation = this.totalRotation + angleDiff;
    
    // Only update if within limits
    if (newRotation >= -this.maxRotation && newRotation <= this.maxRotation) {
      this.totalRotation = newRotation;
      this.rotation = this.totalRotation;
      
      // Map rotation to steering (-1 to 1)
      const steeringFactor = this.rotation / this.maxRotation;
      this.playerCar.steering = steeringFactor;
    }
    
    // Update last position
    this.lastX = this.currentX;
    this.lastY = this.currentY;
  }

  handleMouseUp() {
    this.isDragging = false;
  }

  handleTouchEnd(e) {
    e.preventDefault(); // Prevent default touch behavior
    if (this.activeTouchId !== null) {
      this.isDragging = false;
      this.activeTouchId = null;
    }
  }

  draw() {
    // Draw wheel background
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#333';
    this.ctx.fill();
    
    // Save context state
    this.ctx.save();
    
    // Translate to wheel center and rotate
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.rotation);
    
    // Draw wheel spokes
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 4;
    
    // Draw 3 spokes
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(
        Math.cos(angle) * this.radius,
        Math.sin(angle) * this.radius
      );
      this.ctx.stroke();
    }
    
    // Draw wheel rim
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#999';
    this.ctx.lineWidth = 6;
    this.ctx.stroke();
    
    // Restore context state
    this.ctx.restore();
  }
}

// Export the class
window.SteeringWheel = SteeringWheel; 