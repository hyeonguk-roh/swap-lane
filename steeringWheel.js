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
    
    // Mouse tracking
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.currentMouseX = 0;
    this.currentMouseY = 0;
    this.totalRotation = 0;
    this.maxRotation = (720 * Math.PI) / 180; // 720 degrees in radians
    
    // Event listeners
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if click is within wheel radius
    const dx = mouseX - this.centerX;
    const dy = mouseY - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= this.radius) {
      this.isDragging = true;
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
      this.currentMouseX = mouseX;
      this.currentMouseY = mouseY;
    }
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.currentMouseX = e.clientX - rect.left;
    this.currentMouseY = e.clientY - rect.top;
    
    // Calculate vectors from center to mouse positions
    const lastVector = {
      x: this.lastMouseX - this.centerX,
      y: this.lastMouseY - this.centerY
    };
    const currentVector = {
      x: this.currentMouseX - this.centerX,
      y: this.currentMouseY - this.centerY
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
    
    // Update last mouse position
    this.lastMouseX = this.currentMouseX;
    this.lastMouseY = this.currentMouseY;
  }

  handleMouseUp() {
    this.isDragging = false;
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