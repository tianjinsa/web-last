/**
 * Antigravity Background Animation
 * Mimics a floating, weightless environment with particles.
 */

class AntigravityBackground {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 60; 
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.mouseX = -1000;
        this.mouseY = -1000;
        
        this.init();
    }

    init() {
        this.canvas.id = 'antigravity-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '1'; // Increased z-index to be above body background but below content
        this.canvas.style.pointerEvents = 'none'; 
        
        document.body.insertBefore(this.canvas, document.body.firstChild);

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Track mouse for interaction
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        this.createParticles();
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new Particle(this.width, this.height));
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.particles.forEach(p => {
            p.update(this.width, this.height, this.mouseX, this.mouseY);
            p.draw(this.ctx);
        });

        requestAnimationFrame(() => this.animate());
    }
}

class Particle {
    constructor(w, h) {
        this.reset(w, h, true);
    }

    reset(w, h, initial = false) {
        this.x = Math.random() * w;
        this.y = initial ? Math.random() * h : h + 20;
        this.size = Math.random() * 5 + 2; 
        
        // Base velocity
        this.baseVx = (Math.random() - 0.5) * 0.5; 
        this.baseVy = -Math.random() * 0.5 - 0.2; 
        
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        
        this.alpha = Math.random() * 0.5 + 0.3; // Increased visibility
        // Use CSS variable color if possible, or fallback
        this.color = `rgba(123, 108, 255, ${this.alpha})`; 
    }

    update(w, h, mx, my) {
        // Mouse interaction
        const dx = this.x - mx;
        const dy = this.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const forceDist = 150; // Interaction radius

        if (dist < forceDist) {
            const force = (forceDist - dist) / forceDist;
            const angle = Math.atan2(dy, dx);
            const pushX = Math.cos(angle) * force * 2;
            const pushY = Math.sin(angle) * force * 2;
            
            this.vx += pushX * 0.1;
            this.vy += pushY * 0.1;
        }

        // Return to base velocity
        this.vx += (this.baseVx - this.vx) * 0.05;
        this.vy += (this.baseVy - this.vy) * 0.05;

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around
        if (this.y < -20) {
            this.reset(w, h);
        }
        if (this.x < -20) this.x = w + 20;
        if (this.x > w + 20) this.x = -20;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize when DOM is ready
function initBackground() {
    // 强制开启粒子动画，忽略系统的“减弱动态效果”设置
    // const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // if (!mediaQuery.matches) {
        console.log('[Background] Initializing particle system...');
        new AntigravityBackground();
    // }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackground);
} else {
    initBackground();
}
