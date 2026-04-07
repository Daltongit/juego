/**
 * Clase Bullet - Representa las balas en Shooter Arena
 * Maneja físicas, colisiones y tipos de balas
 */

class Bullet {
    constructor(x, y, angle, damage, speed, owner, game, type = 'NORMAL') {
        // Referencia al juego
        this.game = game;

        // Propiedades básicas
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.damage = damage;
        this.speed = speed;
        this.owner = owner;
        this.type = type;

        // Configuración del tipo de bala
        this.config = BulletConfig.TYPES[type];

        // Física
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.gravity = BulletConfig.PHYSICS.GRAVITY;
        this.airResistance = BulletConfig.PHYSICS.AIR_RESISTANCE;

        // Dimensiones
        this.width = this.config.size;
        this.height = this.config.size;

        // Estado
        this.active = true;
        this.lifetime = this.config.lifetime;
        this.age = 0;
        this.penetration = this.config.penetration;
        this.penetrationCount = 0;

        // Efectos visuales
        this.trail = [];
        this.maxTrailLength = 5;

        // Propiedades especiales
        this.homingStrength = this.config.homingStrength || 0;
        this.explosionRadius = this.config.explosionRadius || 0;
        this.target = null;

        // Encontrar objetivo para balas teledirigidas
        if (this.homingStrength > 0) {
            this.findHomingTarget();
        }

        // Crear efecto de disparo
        this.createMuzzleEffect();
    }

    /**
     * Actualiza la bala
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

        // Actualizar física
        this.updatePhysics(deltaTime);

        // Actualizar comportamiento especial
        this.updateSpecialBehavior(deltaTime);

        // Actualizar estela
        this.updateTrail();

        // Verificar colisiones
        this.checkCollisions();

        // Verificar límites del mapa
        this.checkMapBounds();
    }

    /**
     * Actualiza la física de la bala
     */
    updatePhysics(deltaTime) {
        // Aplicar gravedad
        this.vy += this.gravity * deltaTime * 60;

        // Aplicar resistencia del aire
        this.vx *= this.airResistance;
        this.vy *= this.airResistance;

        // Actualizar posición
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;

        // Actualizar ángulo basado en la velocidad
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            this.angle = Math.atan2(this.vy, this.vx);
        }
    }

    /**
     * Actualiza comportamientos especiales
     */
    updateSpecialBehavior(deltaTime) {
        // Comportamiento teledirigido
        if (this.homingStrength > 0 && this.target) {
            this.updateHoming(deltaTime);
        }

        // Comportamiento de rebote
        if (Math.random() < BulletConfig.PHYSICS.RICOCHET_CHANCE) {
            this.checkRicochet();
        }
    }

    /**
     * Actualiza el comportamiento teledirigido
     */
    updateHoming(deltaTime) {
        if (!this.target || !this.target.alive) {
            this.findHomingTarget();
            return;
        }

        // Calcular ángulo hacia el objetivo
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const targetAngle = Math.atan2(dy, dx);

        // Suavizar transición de ángulo
        let angleDiff = targetAngle - this.angle;

        // Normalizar diferencia de ángulo
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Aplicar fuerza teledirigida
        this.angle += angleDiff * this.homingStrength;

        // Actualizar velocidad
        const currentSpeed = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(this.angle) * currentSpeed;
        this.vy = Math.sin(this.angle) * currentSpeed;
    }

    /**
     * Encuentra un objetivo para balas teledirigidas
     */
    findHomingTarget() {
        let closestTarget = null;
        let closestDistance = Infinity;

        // Buscar enemigos si el dueño es el jugador
        if (this.owner === 'player') {
            for (const enemy of this.game.enemies) {
                if (!enemy.alive) continue;

                const distance = this.getDistanceTo(enemy);
                if (distance < closestDistance && distance < 300) {
                    closestDistance = distance;
                    closestTarget = enemy;
                }
            }
        }
        // Buscar jugador si el dueño es enemigo
        else if (this.owner === 'enemy') {
            if (this.game.player && this.game.player.alive) {
                const distance = this.getDistanceTo(this.game.player);
                if (distance < 300) {
                    closestTarget = this.game.player;
                }
            }
        }

        this.target = closestTarget;
    }

    /**
     * Verifica y aplica rebote
     */
    checkRicochet() {
        let bounced = false;

        // Rebotar en los bordes del mapa
        if (this.x <= 0 || this.x >= this.game.map.width) {
            this.vx = -this.vx;
            this.x = Math.max(0, Math.min(this.x, this.game.map.width));
            bounced = true;
        }

        if (this.y <= 0 || this.y >= this.game.map.height) {
            this.vy = -this.vy;
            this.y = Math.max(0, Math.min(this.y, this.game.map.height));
            bounced = true;
        }

        // Rebotar en obstáculos
        for (const obstacle of this.game.obstacles) {
            if (this.collidesWith(obstacle)) {
                // Calcular normal de la superficie
                const dx = this.x - obstacle.x;
                const dy = this.y - obstacle.y;

                // Determinar lado de colisión
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.vx = -this.vx;
                    this.x += this.vx > 0 ? 5 : -5;
                } else {
                    this.vy = -this.vy;
                    this.y += this.vy > 0 ? 5 : -5;
                }

                bounced = true;
                break;
            }
        }

        // Crear efecto de rebote
        if (bounced) {
            this.createRicochetEffect();
        }
    }

    /**
     * Actualiza la estela de la bala
     */
    updateTrail() {
        // Añadir posición actual a la estela
        this.trail.push({ x: this.x, y: this.y, age: 0 });

        // Limitar longitud de la estela
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Envejecer puntos de la estela
        this.trail.forEach(point => {
            point.age += 16; // Asumiendo 60 FPS
        });

        // Remover puntos muy viejos
        this.trail = this.trail.filter(point => point.age < 200);
    }

    /**
     * Verifica colisiones
     */
    checkCollisions() {
        // Colisión con el jugador
        if (this.owner === 'enemy' && this.game.player && this.game.player.alive) {
            if (this.collidesWith(this.game.player)) {
                this.hit(this.game.player);
            }
        }

        // Colisión con enemigos
        if (this.owner === 'player') {
            for (const enemy of this.game.enemies) {
                if (!enemy.alive) continue;

                if (this.collidesWith(enemy)) {
                    this.hit(enemy);
                }
            }
        }

        // Colisión con obstáculos
        for (const obstacle of this.game.obstacles) {
            if (this.collidesWith(obstacle)) {
                this.hitObstacle(obstacle);
            }
        }
    }

    /**
     * Verifica los límites del mapa
     */
    checkMapBounds() {
        if (this.x < 0 || this.x > this.game.map.width ||
            this.y < 0 || this.y > this.game.map.height) {
            this.destroy();
        }
    }

    /**
     * Impacta a un objetivo
     */
    hit(target) {
        // Aplicar daño
        target.takeDamage(this.damage, this.owner);

        // Crear efectos de impacto
        this.createImpactEffects(target);

        // Manejar penetración
        this.penetrationCount++;
        if (this.penetrationCount >= this.penetration) {
            this.destroy();
        }

        // Emitir evento
        this.game.emit('bulletHit', { bullet: this, target, damage: this.damage });
    }

    /**
     * Impacta un obstáculo
     */
    hitObstacle(obstacle) {
        // Aplicar daño al obstáculo
        obstacle.health -= this.damage;

        // Crear efectos
        this.createImpactEffects(obstacle);

        // Destruir bala al impactar obstáculo
        this.destroy();
    }

    /**
     * Crea efectos de disparo
     */
    createMuzzleEffect() {
        // Efecto de fogonazo
        this.game.particleSystem.emit('spark', this.x, this.y, 3);

        // Sonido
        this.game.audioSystem.playSound('shoot', 0.3);
    }

    /**
     * Crea efectos de impacto
     */
    createImpactEffects(target) {
        // Partículas de impacto
        this.game.particleSystem.emit('spark', this.x, this.y, 5);

        // Efectos según tipo de bala
        switch (this.type) {
            case 'EXPLOSIVE':
                this.createExplosion();
                break;
            case 'PIERCING':
                this.createPiercingEffect();
                break;
            case 'LASER':
                this.createLaserEffect();
                break;
        }

        // Sonido de impacto
        this.game.audioSystem.playSound('hit', 0.5);
    }

    /**
     * Crea una explosión
     */
    createExplosion() {
        // Daño en área
        for (const entity of [...this.game.enemies, this.game.player]) {
            if (!entity.alive || entity === this.owner) continue;

            const distance = this.getDistanceTo(entity);
            if (distance <= this.explosionRadius) {
                const damage = this.damage * (1 - distance / this.explosionRadius);
                entity.takeDamage(damage, this.owner);
            }
        }

        // Efectos visuales
        this.game.particleSystem.emit('explosion', this.x, this.y, 15);

        // Daño a obstáculos
        for (const obstacle of this.game.obstacles) {
            const distance = this.getDistanceTo(obstacle);
            if (distance <= this.explosionRadius) {
                obstacle.health -= this.damage * 0.5;
            }
        }
    }

    /**
     * Crea efecto de penetración
     */
    createPiercingEffect() {
        // Línea de penetración
        this.game.particleSystem.emit('spark', this.x, this.y, 8);

        // Continuar movimiento con velocidad reducida
        this.vx *= 0.7;
        this.vy *= 0.7;
    }

    /**
     * Crea efecto láser
     */
    createLaserEffect() {
        // Rayo láser
        const endX = this.x + Math.cos(this.angle) * 100;
        const endY = this.y + Math.sin(this.angle) * 100;

        // Crear partículas a lo largo del rayo
        for (let i = 0; i < 10; i++) {
            const t = i / 10;
            const x = this.x + (endX - this.x) * t;
            const y = this.y + (endY - this.y) * t;
            this.game.particleSystem.emit('spark', x, y, 1);
        }
    }

    /**
     * Crea efecto de rebote
     */
    createRicochetEffect() {
        this.game.particleSystem.emit('spark', this.x, this.y, 2);
        this.game.audioSystem.playSound('ricochet', 0.3);
    }

    /**
     * Destruye la bala
     */
    destroy() {
        this.active = false;

        // Efectos de destrucción
        this.createDestroyEffects();

        // Emitir evento
        this.game.emit('bulletDestroy', { bullet: this });
    }

    /**
     * Crea efectos de destrucción
     */
    createDestroyEffects() {
        // Pequeña explosión
        this.game.particleSystem.emit('spark', this.x, this.y, 3);
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
     * Renderiza la bala
     */
    render(ctx) {
        if (!this.active) return;

        ctx.save();

        // Renderizar estela
        this.renderTrail(ctx);

        // Trasladar a la posición de la bala
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Renderizar bala según tipo
        this.renderBullet(ctx);

        ctx.restore();
    }

    /**
     * Renderiza la estela
     */
    renderTrail(ctx) {
        if (this.trail.length < 2) return;

        ctx.strokeStyle = this.config.color;
        ctx.lineCap = 'round';

        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            const prevPoint = this.trail[i - 1];

            // Calcular opacidad basada en la edad
            const opacity = Math.max(0, 1 - point.age / 200) * 0.5;
            ctx.globalAlpha = opacity;

            // Calcular grosor basado en la posición en la estela
            const width = (i / this.trail.length) * this.width * 0.5;
            ctx.lineWidth = width;

            // Dibujar segmento
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Renderiza la bala
     */
    renderBullet(ctx) {
        switch (this.type) {
            case 'NORMAL':
                this.renderNormalBullet(ctx);
                break;
            case 'PIERCING':
                this.renderPiercingBullet(ctx);
                break;
            case 'EXPLOSIVE':
                this.renderExplosiveBullet(ctx);
                break;
            case 'HOMING':
                this.renderHomingBullet(ctx);
                break;
            case 'LASER':
                this.renderLaserBullet(ctx);
                break;
        }
    }

    /**
     * Renderiza bala normal
     */
    renderNormalBullet(ctx) {
        ctx.fillStyle = this.config.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Brillo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(-this.width / 4, -this.width / 4, this.width / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Renderiza bala penetrante
     */
    renderPiercingBullet(ctx) {
        ctx.fillStyle = this.config.color;
        ctx.fillRect(-this.width / 2, -this.height / 4, this.width, this.height / 2);

        // Puntas afiladas
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2 + this.width / 2, -this.height / 4);
        ctx.lineTo(this.width / 2 + this.width / 2, this.height / 4);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Renderiza bala explosiva
     */
    renderExplosiveBullet(ctx) {
        // Cuerpo principal
        ctx.fillStyle = this.config.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Anillo de advertencia
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.width, 0, Math.PI * 2);
        ctx.stroke();

        // Parpadeo
        const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    /**
     * Renderiza bala teledirigida
     */
    renderHomingBullet(ctx) {
        // Cuerpo principal
        ctx.fillStyle = this.config.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Aletas teledirigidas
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            const x = Math.cos(angle) * this.width / 2;
            const y = Math.sin(angle) * this.width / 2;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * this.width / 2, y + Math.sin(angle) * this.width / 2);
            ctx.lineTo(x + Math.cos(angle + 0.5) * this.width / 3, y + Math.sin(angle + 0.5) * this.width / 3);
            ctx.closePath();
            ctx.fill();
        }
    }

    /**
     * Renderiza bala láser
     */
    renderLaserBullet(ctx) {
        // Rayo principal
        ctx.strokeStyle = this.config.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.8;

        ctx.beginPath();
        ctx.moveTo(-this.width * 2, 0);
        ctx.lineTo(this.width * 2, 0);
        ctx.stroke();

        // Brillo central
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = this.width / 2;
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.moveTo(-this.width, 0);
        ctx.lineTo(this.width, 0);
        ctx.stroke();
    }

    /**
     * Obtiene información de la bala
     */
    getInfo() {
        return {
            type: this.type,
            position: { x: this.x, y: this.y },
            velocity: { x: this.vx, y: this.vy },
            damage: this.damage,
            owner: this.owner,
            age: this.age,
            penetrationCount: this.penetrationCount
        };
    }
}

// Exportar clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Bullet;
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.Bullet = Bullet;
}