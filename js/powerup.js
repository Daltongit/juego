/**
 * Clase PowerUp - Representa los power-ups en Shooter Arena
 * Maneja tipos, efectos y recolección
 */

class PowerUp {
    constructor(x, y, type, game) {
        // Referencia al juego
        this.game = game;

        // Propiedades básicas
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = PowerUpConfig.TYPES[type];

        // Dimensiones
        this.width = 30;
        this.height = 30;

        // Estado
        this.active = true;
        this.collected = false;
        this.age = 0;
        this.lifetime = PowerUpConfig.SPAWNING.DESPAWN_TIME;

        // Animación
        this.animation = {
            float: 0,
            rotation: 0,
            pulse: 0,
            bounce: 0
        };

        // Efectos visuales
        this.particles = [];
        this.glowIntensity = 0;

        // Física
        this.vy = 0;
        this.gravity = -0.05;
        this.bounceHeight = 10;
        this.bounceSpeed = 2;

        // Atracción
        this.attractionRange = 100;
        this.attractionSpeed = 5;
        this.isAttracted = false;

        // Sonido
        this.spawnSoundPlayed = false;

        console.log(`Power-up ${type} creado en (${x}, ${y})`);
    }

    /**
     * Actualiza el power-up
     */
    update(deltaTime) {
        if (!this.active) return;

        // Actualizar edad
        this.age += deltaTime * 1000;

        // Verificar tiempo de vida
        if (this.age >= this.lifetime) {
            this.destroy();
            return;
        }

        // Actualizar animación
        this.updateAnimation(deltaTime);

        // Actualizar física
        this.updatePhysics(deltaTime);

        // Actualizar efectos
        this.updateEffects(deltaTime);

        // Verificar atracción
        this.updateAttraction();

        // Verificar recolección
        this.checkCollection();

        // Reproducir sonido de spawn
        if (!this.spawnSoundPlayed) {
            this.game.audioSystem.playSound('powerup_spawn', 0.5);
            this.spawnSoundPlayed = true;
        }
    }

    /**
     * Actualiza la animación
     */
    updateAnimation(deltaTime) {
        // Flotación
        this.animation.float = Math.sin(Date.now() * 0.002) * 5;

        // Rotación
        this.animation.rotation += deltaTime * 2;

        // Pulso
        this.animation.pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;

        // Rebote
        this.animation.bounce = Math.abs(Math.sin(Date.now() * 0.003)) * this.bounceHeight;
    }

    /**
     * Actualiza la física
     */
    updatePhysics(deltaTime) {
        if (!this.isAttracted) {
            // Movimiento de flotación
            this.vy += this.gravity * deltaTime * 60;
            this.y += this.vy * deltaTime * 60;

            // Límite de rebote
            if (this.y < this.originalY - this.bounceHeight) {
                this.y = this.originalY - this.bounceHeight;
                this.vy = Math.abs(this.vy) * 0.8;
            } else if (this.y > this.originalY) {
                this.y = this.originalY;
                this.vy = -Math.abs(this.vy) * 0.8;
            }
        }
    }

    /**
     * Actualiza los efectos visuales
     */
    updateEffects(deltaTime) {
        // Intensidad del brillo
        this.glowIntensity = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;

        // Generar partículas
        if (Math.random() < 0.1) {
            this.createParticle();
        }

        // Actualizar partículas
        this.particles = this.particles.filter(particle => {
            particle.life -= deltaTime * 1000;
            particle.y -= particle.speed * deltaTime * 60;
            particle.x += (Math.random() - 0.5) * deltaTime * 20;
            return particle.life > 0;
        });

        // Advertencia de desaparición
        if (this.age > this.lifetime - 3000) {
            this.createWarningEffect();
        }
    }

    /**
     * Actualiza la atracción hacia el jugador
     */
    updateAttraction() {
        if (!this.game.player || !this.game.player.alive) return;

        const distance = this.getDistanceTo(this.game.player);

        // Activar atracción si el jugador está cerca
        if (distance <= this.attractionRange) {
            this.isAttracted = true;

            // Moverse hacia el jugador
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;

            if (distance > 0) {
                this.x += (dx / distance) * this.attractionSpeed;
                this.y += (dy / distance) * this.attractionSpeed;
            }
        } else {
            this.isAttracted = false;
        }
    }

    /**
     * Verifica si el jugador puede recolectarlo
     */
    checkCollection() {
        if (!this.game.player || !this.game.player.alive || this.collected) return;

        if (this.collidesWith(this.game.player)) {
            this.collect();
        }
    }

    /**
     * Crea una partícula
     */
    createParticle() {
        const particle = {
            x: this.x + (Math.random() - 0.5) * this.width,
            y: this.y + this.height / 2,
            speed: Math.random() * 20 + 10,
            life: 1000,
            color: this.config.color,
            size: Math.random() * 3 + 1
        };

        this.particles.push(particle);
    }

    /**
     * Crea efecto de advertencia
     */
    createWarningEffect() {
        if (Math.random() < 0.1) {
            this.game.particleSystem.emit('spark', this.x, this.y, 2, this.config.color);
        }
    }

    /**
     * Recolecta el power-up
     */
    collect() {
        if (this.collected) return;

        this.collected = true;

        // Aplicar efecto al jugador
        this.game.player.collectPowerUp(this);

        // Crear efectos de recolección
        this.createCollectionEffects();

        // Destruir power-up
        this.destroy();

        // Emitir evento
        this.game.emit('powerUpCollected', { type: this.type, position: { x: this.x, y: this.y } });
    }

    /**
     * Crea efectos de recolección
     */
    createCollectionEffects() {
        // Explosión de partículas
        this.game.particleSystem.emit('spark', this.x, this.y, 20, this.config.color);

        // Anillo de expansión
        this.createExpansionRing();

        // Sonido
        this.game.audioSystem.playSound('powerup_collect', 0.7);
    }

    /**
     * Crea un anillo de expansión
     */
    createExpansionRing() {
        const ring = {
            x: this.x,
            y: this.y,
            radius: 10,
            maxRadius: 50,
            color: this.config.color,
            alpha: 1,
            growth: 100
        };

        // Animar el anillo
        const animateRing = () => {
            ring.radius += ring.growth * 0.016;
            ring.alpha = 1 - (ring.radius / ring.maxRadius);

            if (ring.alpha > 0) {
                requestAnimationFrame(animateRing);
            }
        };

        animateRing();
    }

    /**
     * Destruye el power-up
     */
    destroy() {
        this.active = false;

        // Efectos de destrucción
        if (!this.collected) {
            this.createDestroyEffects();
        }

        // Emitir evento
        this.game.emit('powerUpDestroy', { type: this.type, collected: this.collected });
    }

    /**
     * Crea efectos de destrucción
     */
    createDestroyEffects() {
        // Pequeña explosión
        this.game.particleSystem.emit('spark', this.x, this.y, 5, this.config.color);

        // Sonido de desaparición
        this.game.audioSystem.playSound('powerup_despawn', 0.3);
    }

    /**
     * Obtiene la distancia a otro objeto
     */
    getDistanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.hypot(dx, dy);
    }

    /**
     * Verifica si colisiona con otro objeto
     */
    collidesWith(other) {
        return (
            this.x - this.width / 2 < other.x + other.width / 2 &&
            this.x + this.width / 2 > other.x - other.width / 2 &&
            this.y - this.height / 2 < other.y + other.height / 2 &&
            this.y + this.height / 2 > other.y - other.height / 2
        );
    }

    /**
     * Renderiza el power-up
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        // Aplicar transformaciones
        ctx.translate(this.x, this.y + this.animation.float + this.animation.bounce);
        ctx.rotate(this.animation.rotation);
        ctx.scale(this.animation.pulse, this.animation.pulse);

        // Renderizar brillo
        this.renderGlow(ctx);

        // Renderizar power-up según tipo
        this.renderPowerUp(ctx);

        // Renderizar partículas
        this.renderParticles(ctx);

        // Renderizar advertencia de tiempo
        if (this.age > this.lifetime - 3000) {
            this.renderTimeWarning(ctx);
        }

        ctx.restore();
    }

    /**
     * Renderiza el brillo
     */
    renderGlow(ctx) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width);
        gradient.addColorStop(0, this.config.color + '40');
        gradient.addColorStop(1, this.config.color + '00');

        ctx.fillStyle = gradient;
        ctx.globalAlpha = this.glowIntensity;
        ctx.fillRect(-this.width * 2, -this.width * 2, this.width * 4, this.width * 4);
        ctx.globalAlpha = 1;
    }

    /**
     * Renderiza el power-up según su tipo
     */
    renderPowerUp(ctx) {
        // Fondo
        ctx.fillStyle = this.config.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Borde
        ctx.strokeStyle = this.config.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icono o símbolo
        this.renderIcon(ctx);

        // Brillo central
        const highlight = ctx.createRadialGradient(-this.width / 4, -this.width / 4, 0, -this.width / 4, -this.width / 4, this.width / 3);
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = highlight;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Renderiza el icono del power-up
     */
    renderIcon(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Usar emoji o símbolo según el tipo
        switch (this.type) {
            case 'HEALTH':
                ctx.fillText('❤️', 0, 0);
                break;
            case 'ARMOR':
                ctx.fillText('🛡️', 0, 0);
                break;
            case 'SPEED':
                ctx.fillText('⚡', 0, 0);
                break;
            case 'DAMAGE':
                ctx.fillText('💪', 0, 0);
                break;
            case 'RAPID_FIRE':
                ctx.fillText('🔥', 0, 0);
                break;
            case 'INVINCIBILITY':
                ctx.fillText('⭐', 0, 0);
                break;
            case 'AMMO':
                ctx.fillText('🔫', 0, 0);
                break;
            case 'MULTI_SHOT':
                ctx.fillText('💫', 0, 0);
                break;
            default:
                // Letra inicial
                ctx.fillText(this.type[0], 0, 0);
                break;
        }
    }

    /**
     * Renderiza las partículas
     */
    renderParticles(ctx) {
        for (const particle of this.particles) {
            ctx.globalAlpha = particle.life / 1000;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x - this.x, particle.y - this.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Renderiza advertencia de tiempo
     */
    renderTimeWarning(ctx) {
        const warningIntensity = (this.age - (this.lifetime - 3000)) / 3000;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;

        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2 + 5 + warningIntensity * 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    /**
     * Obtiene información del power-up
     */
    getInfo() {
        return {
            type: this.type,
            position: { x: this.x, y: this.y },
            age: this.age,
            lifetime: this.lifetime,
            collected: this.collected,
            config: this.config
        };
    }
}

/**
 * Clase PowerUpSpawner - Maneja el spawn de power-ups
 */
class PowerUpSpawner {
    constructor(game) {
        this.game = game;
        this.spawnTimer = 0;
        this.spawnInterval = PowerUpConfig.SPAWNING.RESPAWN_TIME;
        this.maxPowerUps = PowerUpConfig.SPAWNING.MAX_POWERUPS;
        this.spawnRadius = PowerUpConfig.SPAWNING.SPAWN_RADIUS;
    }

    /**
     * Actualiza el spawner
     */
    update(deltaTime) {
        this.spawnTimer += deltaTime * 1000;

        // Verificar si es tiempo de spawnear
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.trySpawn();
        }
    }

    /**
     * Intenta spawnear un power-up
     */
    trySpawn() {
        // Verificar límite de power-ups
        if (this.game.powerUps.length >= this.maxPowerUps) {
            return;
        }

        // Seleccionar tipo de power-up
        const type = this.selectPowerUpType();

        // Encontrar posición de spawn
        const position = this.findSpawnPosition();

        if (position) {
            // Crear power-up
            const powerUp = new PowerUp(position.x, position.y, type, this.game);
            this.game.powerUps.push(powerUp);

            console.log(`Power-up ${type} spawneado en (${position.x}, ${position.y})`);
        }
    }

    /**
     * Selecciona un tipo de power-up
     */
    selectPowerUpType() {
        const types = Object.keys(PowerUpConfig.TYPES);
        const weights = types.map(type => PowerUpConfig.TYPES[type].spawnChance);

        // Selección ponderada
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return types[i];
            }
        }

        return types[0];
    }

    /**
     * Encuentra una posición válida para spawnear
     */
    findSpawnPosition() {
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Posición aleatoria
            const x = Math.random() * (this.game.map.width - 100) + 50;
            const y = Math.random() * (this.game.map.height - 100) + 50;

            // Verificar si está lejos del jugador
            if (this.game.player && this.game.player.alive) {
                const distanceToPlayer = Math.hypot(x - this.game.player.x, y - this.game.player.y);
                if (distanceToPlayer < this.spawnRadius) {
                    continue;
                }
            }

            // Verificar si no colisiona con obstáculos
            let validPosition = true;
            for (const obstacle of this.game.obstacles) {
                if (this.pointInObstacle(x, y, obstacle)) {
                    validPosition = false;
                    break;
                }
            }

            if (validPosition) {
                return { x, y };
            }
        }

        return null;
    }

    /**
     * Verifica si un punto está dentro de un obstáculo
     */
    pointInObstacle(x, y, obstacle) {
        return (
            x >= obstacle.x - obstacle.width / 2 &&
            x <= obstacle.x + obstacle.width / 2 &&
            y >= obstacle.y - obstacle.height / 2 &&
            y <= obstacle.y + obstacle.height / 2
        );
    }

    /**
     * Fuerza el spawn de un power-up específico
     */
    forceSpawn(type, x, y) {
        const powerUp = new PowerUp(x, y, type, this.game);
        this.game.powerUps.push(powerUp);

        console.log(`Power-up ${type} forzado en (${x}, ${y})`);
    }
}

// Exportar clases
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PowerUp, PowerUpSpawner };
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.PowerUp = PowerUp;
    window.PowerUpSpawner = PowerUpSpawner;
}