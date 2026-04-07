/**
 * Sistema de partículas para Shooter Arena
 * Maneja efectos visuales y partículas
 */

class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.maxParticles = ParticleConfig.EMITTER.MAX_PARTICLES;
        this.pool = [];
        this.emitters = new Map();

        // Inicializar pool de partículas
        this.initPool();

        console.log('Sistema de partículas inicializado');
    }

    /**
     * Inicializa el pool de partículas
     */
    initPool() {
        for (let i = 0; i < ParticleConfig.EMITTER.POOL_SIZE; i++) {
            this.pool.push(new Particle());
        }
    }

    /**
     * Obtiene una partícula del pool
     */
    getParticle() {
        return this.pool.pop() || new Particle();
    }

    /**
     * Devuelve una partícula al pool
     */
    returnParticle(particle) {
        particle.reset();
        this.pool.push(particle);
    }

    /**
     * Emite partículas
     */
    emit(type, x, y, count = null, color = null) {
        const config = ParticleConfig.TYPES[type];
        if (!config) {
            console.warn(`Tipo de partícula no encontrado: ${type}`);
            return;
        }

        const particleCount = count || config.count;

        for (let i = 0; i < particleCount; i++) {
            if (this.particles.length >= this.maxParticles) {
                break;
            }

            const particle = this.getParticle();
            this.initParticle(particle, type, x, y, config, color);
            this.particles.push(particle);
        }
    }

    /**
     * Inicializa una partícula
     */
    initParticle(particle, type, x, y, config, customColor) {
        // Posición
        particle.x = x;
        particle.y = y;

        // Velocidad
        const speed = this.randomBetween(config.speed.min, config.speed.max);
        const angle = Math.random() * Math.PI * 2;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;

        // Tamaño
        particle.size = this.randomBetween(config.size.min, config.size.max);
        particle.originalSize = particle.size;

        // Color
        const colors = customColor ? [customColor] : config.color;
        particle.color = colors[Math.floor(Math.random() * colors.length)];

        // Vida
        particle.life = this.randomBetween(config.lifetime.min, config.lifetime.max);
        particle.maxLife = particle.life;

        // Gravedad
        particle.gravity = config.gravity || 0;

        // Tipo
        particle.type = type;

        // Propiedades adicionales según tipo
        this.initParticleProperties(particle, type);
    }

    /**
     * Inicializa propiedades específicas de partícula
     */
    initParticleProperties(particle, type) {
        switch (type) {
            case 'EXPLOSION':
                particle.shrinkRate = 0.98;
                particle.fadeRate = 0.95;
                break;

            case 'BLOOD':
                particle.shrinkRate = 0.99;
                particle.fadeRate = 0.98;
                particle.stickiness = 0.8;
                break;

            case 'SPARK':
                particle.shrinkRate = 0.95;
                particle.fadeRate = 0.9;
                particle.bounce = 0.7;
                break;

            case 'SMOKE':
                particle.growRate = 1.02;
                particle.fadeRate = 0.99;
                particle.rise = true;
                break;

            case 'HEAL':
                particle.shrinkRate = 0.97;
                particle.fadeRate = 0.96;
                particle.oscillation = Math.random() * Math.PI * 2;
                break;
        }
    }

    /**
     * Actualiza el sistema de partículas
     */
    update(deltaTime) {
        // Actualizar partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Actualizar partícula
            particle.update(deltaTime);

            // Remover partículas muertas
            if (!particle.alive) {
                this.particles.splice(i, 1);
                this.returnParticle(particle);
            }
        }

        // Actualizar emisores
        for (const [id, emitter] of this.emitters) {
            emitter.update(deltaTime);

            // Remover emisores inactivos
            if (!emitter.active) {
                this.emitters.delete(id);
            }
        }
    }

    /**
     * Renderiza las partículas
     */
    render(ctx) {
        // Ordenar partículas por tipo para optimización
        const sortedParticles = this.particles.slice().sort((a, b) => {
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return 0;
        });

        // Renderizar partículas
        for (const particle of sortedParticles) {
            particle.render(ctx);
        }
    }

    /**
     * Crea un emisor de partículas
     */
    createEmitter(type, x, y, options = {}) {
        const emitter = new ParticleEmitter(type, x, y, this, options);
        const id = Date.now() + Math.random();
        this.emitters.set(id, emitter);
        return id;
    }

    /**
     * Detiene un emisor
     */
    stopEmitter(id) {
        const emitter = this.emitters.get(id);
        if (emitter) {
            emitter.stop();
        }
    }

    /**
     * Limpia todas las partículas
     */
    clear() {
        for (const particle of this.particles) {
            this.returnParticle(particle);
        }
        this.particles = [];
        this.emitters.clear();
    }

    /**
     * Obtiene un número aleatorio entre min y max
     */
    randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Obtiene estadísticas del sistema
     */
    getStats() {
        return {
            activeParticles: this.particles.length,
            maxParticles: this.maxParticles,
            poolSize: this.pool.length,
            activeEmitters: this.emitters.size
        };
    }
}

/**
 * Clase Particle - Representa una partícula individual
 */
class Particle {
    constructor() {
        this.reset();
    }

    /**
     * Resetea la partícula
     */
    reset() {
        // Posición
        this.x = 0;
        this.y = 0;

        // Velocidad
        this.vx = 0;
        this.vy = 0;

        // Apariencia
        this.size = 1;
        this.originalSize = 1;
        this.color = '#ffffff';
        this.alpha = 1;

        // Vida
        this.life = 0;
        this.maxLife = 0;
        this.alive = false;

        // Física
        this.gravity = 0;
        this.bounce = 0;
        this.friction = 1;

        // Comportamiento
        this.shrinkRate = 1;
        this.growRate = 1;
        this.fadeRate = 1;
        this.stickiness = 0;
        this.rise = false;
        this.oscillation = 0;

        // Tipo
        this.type = 'default';

        // Trail
        this.trail = [];
        this.maxTrailLength = 5;
    }

    /**
     * Actualiza la partícula
     */
    update(deltaTime) {
        if (!this.alive) return;

        // Actualizar vida
        this.life -= deltaTime * 1000;
        if (this.life <= 0) {
            this.alive = false;
            return;
        }

        // Actualizar trail
        this.updateTrail();

        // Aplicar física
        this.applyPhysics(deltaTime);

        // Actualizar comportamiento
        this.updateBehavior(deltaTime);

        // Actualizar apariencia
        this.updateAppearance();
    }

    /**
     * Actualiza el trail
     */
    updateTrail() {
        this.trail.push({ x: this.x, y: this.y, alpha: this.alpha });

        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    /**
     * Aplica física a la partícula
     */
    applyPhysics(deltaTime) {
        // Aplicar gravedad
        this.vy += this.gravity * deltaTime * 60;

        // Aplicar velocidad
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;

        // Aplicar fricción
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Rebote en el suelo
        if (this.bounce > 0 && this.y > 0) {
            this.y = 0;
            this.vy = -this.vy * this.bounce;
            this.vx *= (1 - this.stickiness);
        }
    }

    /**
     * Actualiza comportamiento específico
     */
    updateBehavior(deltaTime) {
        // Crecimiento/encogimiento
        this.size *= this.shrinkRate * this.growRate;

        // Ascensión (humo)
        if (this.rise) {
            this.vy -= 0.1;
        }

        // Oscilación (curación)
        if (this.oscillation !== undefined) {
            this.oscillation += deltaTime * 5;
            this.x += Math.sin(this.oscillation) * 0.5;
        }
    }

    /**
     * Actualiza la apariencia
     */
    updateAppearance() {
        // Actualizar alfa basada en la vida
        const lifePercent = this.life / this.maxLife;
        this.alpha = lifePercent * this.fadeRate;

        // Limitar valores
        this.alpha = Math.max(0, Math.min(1, this.alpha));
        this.size = Math.max(0.1, this.size);
    }

    /**
     * Renderiza la partícula
     */
    render(ctx) {
        if (!this.alive) return;

        ctx.save();

        // Renderizar trail
        this.renderTrail(ctx);

        // Configurar estilo
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;

        // Renderizar según tipo
        switch (this.type) {
            case 'SPARK':
                this.renderSpark(ctx);
                break;
            case 'SMOKE':
                this.renderSmoke(ctx);
                break;
            case 'HEAL':
                this.renderHeal(ctx);
                break;
            default:
                this.renderDefault(ctx);
                break;
        }

        ctx.restore();
    }

    /**
     * Renderiza el trail
     */
    renderTrail(ctx) {
        if (this.trail.length < 2) return;

        ctx.strokeStyle = this.color;
        ctx.lineCap = 'round';

        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            const prevPoint = this.trail[i - 1];

            ctx.globalAlpha = point.alpha * (i / this.trail.length) * 0.3;
            ctx.lineWidth = this.size * (i / this.trail.length) * 0.5;

            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }
    }

    /**
     * Renderiza partícula por defecto
     */
    renderDefault(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Renderiza chispa
     */
    renderSpark(ctx) {
        // Línea estilizada
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(this.x - this.vx * 0.1, this.y - this.vy * 0.1);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        // Punto brillante
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Renderiza humo
     */
    renderSmoke(ctx) {
        // Círculo suave
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, this.color + '40');
        gradient.addColorStop(1, this.color + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Renderiza partícula de curación
     */
    renderHeal(ctx) {
        // Cruz de curación
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size * 0.3;
        ctx.lineCap = 'round';

        const crossSize = this.size;

        ctx.beginPath();
        ctx.moveTo(this.x - crossSize, this.y);
        ctx.lineTo(this.x + crossSize, this.y);
        ctx.moveTo(this.x, this.y - crossSize);
        ctx.lineTo(this.x, this.y + crossSize);
        ctx.stroke();

        // Centro brillante
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Clase ParticleEmitter - Emite partículas continuamente
 */
class ParticleEmitter {
    constructor(type, x, y, particleSystem, options = {}) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.particleSystem = particleSystem;
        this.active = true;

        // Configuración
        this.emitRate = options.emitRate || ParticleConfig.EMITTER.EMIT_RATE;
        this.particleCount = options.particleCount || 1;
        this.duration = options.duration || 1000;
        this.spread = options.spread || Math.PI * 2;
        this.direction = options.direction || 0;
        this.speed = options.speed || { min: 1, max: 5 };
        this.color = options.color || null;

        // Estado
        this.age = 0;
        this.emitTimer = 0;
        this.emitInterval = 1000 / this.emitRate;

        // Movimiento
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
    }

    /**
     * Actualiza el emisor
     */
    update(deltaTime) {
        if (!this.active) return;

        // Actualizar edad
        this.age += deltaTime * 1000;

        // Verificar duración
        if (this.duration > 0 && this.age >= this.duration) {
            this.stop();
            return;
        }

        // Actualizar posición
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;

        // Emitir partículas
        this.emitTimer += deltaTime * 1000;
        while (this.emitTimer >= this.emitInterval) {
            this.emit();
            this.emitTimer -= this.emitInterval;
        }
    }

    /**
     * Emite partículas
     */
    emit() {
        for (let i = 0; i < this.particleCount; i++) {
            // Calcular dirección con dispersión
            const angle = this.direction + (Math.random() - 0.5) * this.spread;

            // Calcular velocidad
            const speed = this.particleSystem.randomBetween(this.speed.min, this.speed.max);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            // Crear partícula personalizada
            const particle = this.particleSystem.getParticle();
            particle.x = this.x;
            particle.y = this.y;
            particle.vx = vx;
            particle.vy = vy;
            particle.type = this.type;

            // Configurar apariencia
            const config = ParticleConfig.TYPES[this.type];
            if (config) {
                particle.size = this.particleSystem.randomBetween(config.size.min, config.size.max);
                particle.color = this.color || config.color[Math.floor(Math.random() * config.color.length)];
                particle.life = this.particleSystem.randomBetween(config.lifetime.min, config.lifetime.max);
                particle.maxLife = particle.life;
                particle.gravity = config.gravity || 0;
            }

            particle.alive = true;
            this.particleSystem.particles.push(particle);
        }
    }

    /**
     * Detiene el emisor
     */
    stop() {
        this.active = false;
    }

    /**
     * Establece la posición del emisor
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}

// Exportar clases
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ParticleSystem, Particle, ParticleEmitter };
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.ParticleSystem = ParticleSystem;
    window.Particle = Particle;
    window.ParticleEmitter = ParticleEmitter;
}