/**
 * Clase Enemy - Representa a los enemigos en Shooter Arena
 * Maneja IA, comportamientos y tipos de enemigos
 */

class Enemy {
    constructor(x, y, type, game) {
        // Referencia al juego
        this.game = game;

        // Tipo y configuración
        this.type = type;
        this.config = EnemyConfig.TYPES[type];

        // Posición y dimensión
        this.x = x;
        this.y = y;
        this.width = this.config.size.width;
        this.height = this.config.size.height;

        // Movimiento
        this.vx = 0;
        this.vy = 0;
        this.speed = this.config.speed;
        this.rotation = 0;

        // Estadísticas de combate
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.damage = this.config.damage;

        // Estado
        this.alive = true;
        this.canAttack = true;
        this.attackCooldown = 0;
        this.lastAttackTime = 0;
        this.stunned = false;
        this.stunTime = 0;

        // IA
        this.ai = new EnemyAI(this, this.config.ai);
        this.target = null;
        this.state = 'idle';
        this.path = [];
        this.pathIndex = 0;

        // Comportamiento
        this.aggressionRange = EnemyConfig.AI.DETECTION_RANGE;
        this.attackRange = EnemyConfig.AI.ATTACK_RANGE;
        this.retreatThreshold = this.maxHealth * EnemyConfig.AI.RETREAT_HEALTH;

        // Animación
        this.animation = {
            state: 'idle',
            frame: 0,
            frameTime: 0,
            frameDuration: 150
        };

        // Efectos visuales
        this.effects = [];

        // Fase (para jefes)
        this.phase = 1;
        this.maxPhases = this.config.phases || 1;

        // Drop
        this.dropRate = this.config.dropRate;

        console.log(`Enemigo ${type} creado en (${x}, ${y})`);
    }

    /**
     * Actualiza al enemigo
     */
    update(deltaTime) {
        if (!this.alive) return;

        // Actualizar efectos de estado
        this.updateStatusEffects(deltaTime);

        // Actualizar IA
        this.ai.update(deltaTime);

        // Actualizar movimiento
        this.updateMovement(deltaTime);

        // Actualizar ataque
        this.updateAttack(deltaTime);

        // Actualizar animación
        this.updateAnimation(deltaTime);

        // Actualizar efectos visuales
        this.updateEffects(deltaTime);

        // Verificar cambio de fase (jefes)
        if (this.type === 'BOSS') {
            this.checkPhaseTransition();
        }
    }

    /**
     * Actualiza los efectos de estado
     */
    updateStatusEffects(deltaTime) {
        // Actualizar aturdimiento
        if (this.stunned) {
            this.stunTime -= deltaTime * 1000;
            if (this.stunTime <= 0) {
                this.stunned = false;
                this.stunTime = 0;
            }
        }

        // Actualizar cooldown de ataque
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime * 1000;
        }
    }

    /**
     * Actualiza el movimiento
     */
    updateMovement(deltaTime) {
        if (this.stunned) return;

        // Aplicar velocidad
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;

        // Aplicar fricción
        this.vx *= 0.9;
        this.vy *= 0.9;

        // Mantener dentro de los límites del mapa
        this.x = Math.max(this.width / 2, Math.min(this.x, this.game.map.width - this.width / 2));
        this.y = Math.max(this.height / 2, Math.min(this.y, this.game.map.height - this.height / 2));

        // Verificar colisión con obstáculos
        this.checkObstacleCollision();
    }

    /**
     * Verifica colisión con obstáculos
     */
    checkObstacleCollision() {
        for (const obstacle of this.game.obstacles) {
            if (this.collidesWith(obstacle)) {
                // Calcular superposición
                const overlapX = (this.width / 2 + obstacle.width / 2) - Math.abs(this.x - obstacle.x);
                const overlapY = (this.height / 2 + obstacle.height / 2) - Math.abs(this.y - obstacle.y);

                // Separar
                if (overlapX < overlapY) {
                    if (this.x < obstacle.x) {
                        this.x -= overlapX;
                    } else {
                        this.x += overlapX;
                    }
                    this.vx = 0;
                } else {
                    if (this.y < obstacle.y) {
                        this.y -= overlapY;
                    } else {
                        this.y += overlapY;
                    }
                    this.vy = 0;
                }
            }
        }
    }

    /**
     * Actualiza el ataque
     */
    updateAttack(deltaTime) {
        if (!this.canAttack || this.attackCooldown > 0) return;

        // Verificar si está en rango de ataque
        if (this.target && this.getDistanceTo(this.target) <= this.attackRange) {
            this.attack();
        }
    }

    /**
     * Actualiza la animación
     */
    updateAnimation(deltaTime) {
        this.animation.frameTime += deltaTime * 1000;

        if (this.animation.frameTime >= this.animation.frameDuration) {
            this.animation.frameTime = 0;
            this.animation.frame = (this.animation.frame + 1) % 4;
        }

        // Determinar estado de animación
        if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
            this.animation.state = 'run';
        } else if (this.state === 'attacking') {
            this.animation.state = 'attack';
        } else {
            this.animation.state = 'idle';
        }
    }

    /**
     * Actualiza los efectos visuales
     */
    updateEffects(deltaTime) {
        this.effects = this.effects.filter(effect => {
            effect.duration -= deltaTime * 1000;
            return effect.duration > 0;
        });
    }

    /**
     * Verifica el cambio de fase (jefes)
     */
    checkPhaseTransition() {
        const healthPercent = this.health / this.maxHealth;
        const phaseThreshold = 1 - (this.phase / this.maxPhases);

        if (healthPercent <= phaseThreshold && this.phase < this.maxPhases) {
            this.transitionToNextPhase();
        }
    }

    /**
     * Transiciona a la siguiente fase (jefes)
     */
    transitionToNextPhase() {
        this.phase++;

        // Mejorar estadísticas
        this.speed *= 1.2;
        this.damage *= 1.3;
        this.attackRange *= 1.1;

        // Cambiar color
        const colors = ['#ff0000', '#ff4444', '#ff8888', '#ffaaaa'];
        this.config.color = colors[Math.min(this.phase - 1, colors.length - 1)];

        // Crear efectos
        this.game.particleSystem.emit('explosion', this.x, this.y, 20);

        // Emitir evento
        this.game.emit('bossPhaseChange', { enemy: this, phase: this.phase });

        console.log(`Jefe entró en fase ${this.phase}`);
    }

    /**
     * Establece el objetivo
     */
    setTarget(target) {
        this.target = target;
    }

    /**
     * Mueve al enemigo hacia una posición
     */
    moveTo(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            // Normalizar y aplicar velocidad
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;

            // Actualizar rotación
            this.rotation = Math.atan2(dy, dx);
        }
    }

    /**
     * Ataca al objetivo
     */
    attack() {
        if (!this.target || !this.canAttack || this.attackCooldown > 0) return;

        this.state = 'attacking';
        this.lastAttackTime = Date.now();
        this.attackCooldown = 2000; // Cooldown base

        // Ejecutar ataque según el tipo
        switch (this.type) {
            case 'GRUNT':
                this.meleeAttack();
                break;
            case 'HEAVY':
                this.heavyAttack();
                break;
            case 'SNIPER':
                this.sniperAttack();
                break;
            case 'FAST':
                this.fastAttack();
                break;
            case 'BOSS':
                this.bossAttack();
                break;
        }

        // Emitir evento
        this.game.emit('enemyAttack', { enemy: this, target: this.target });
    }

    /**
     * Ataque melee básico
     */
    meleeAttack() {
        if (this.getDistanceTo(this.target) <= this.attackRange) {
            this.target.takeDamage(this.damage, this);

            // Efectos
            this.createAttackEffects();
        }
    }

    /**
     * Ataque pesado
     */
    heavyAttack() {
        // Área de daño
        const attackRadius = 60;

        for (const entity of [this.game.player, ...this.game.enemies]) {
            if (entity !== this && this.getDistanceTo(entity) <= attackRadius) {
                entity.takeDamage(this.damage * 1.5, this);
            }
        }

        // Efectos
        this.game.particleSystem.emit('explosion', this.x, this.y, 15);
        this.createAttackEffects();
    }

    /**
     * Ataque de francotirador
     */
    sniperAttack() {
        // Crear bala de francotirador
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

        const bullet = new Bullet(
            this.x + Math.cos(angle) * this.width / 2,
            this.y + Math.sin(angle) * this.height / 2,
            angle,
            this.damage * 2,
            25,
            'enemy',
            this.game
        );

        this.game.bullets.push(bullet);

        // Efectos
        this.createMuzzleFlash();
    }

    /**
     * Ataque rápido
     */
    fastAttack() {
        // Múltiples ataques rápidos
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (this.alive && this.target) {
                    this.meleeAttack();
                }
            }, i * 200);
        }

        this.attackCooldown = 1000;
    }

    /**
     * Ataque de jefe
     */
    bossAttack() {
        // Ataque según la fase
        switch (this.phase) {
            case 1:
                this.bossPhase1Attack();
                break;
            case 2:
                this.bossPhase2Attack();
                break;
            case 3:
                this.bossPhase3Attack();
                break;
        }
    }

    /**
     * Ataque de jefe fase 1
     */
    bossPhase1Attack() {
        // Llamada de refuerzos
        if (Math.random() < 0.3) {
            this.spawnMinions();
        } else {
            // Ataque de área
            this.heavyAttack();
        }
    }

    /**
     * Ataque de jefe fase 2
     */
    bossPhase2Attack() {
        // Ráfaga de balas
        const bulletCount = 8;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;

            const bullet = new Bullet(
                this.x + Math.cos(angle) * this.width / 2,
                this.y + Math.sin(angle) * this.height / 2,
                angle,
                this.damage,
                10,
                'enemy',
                this.game
            );

            this.game.bullets.push(bullet);
        }

        // Efectos
        this.game.particleSystem.emit('spark', this.x, this.y, 20);
    }

    /**
     * Ataque de jefe fase 3
     */
    bossPhase3Attack() {
        // Ataque láser
        this.laserAttack();

        // Movimiento rápido
        this.speed *= 2;
        setTimeout(() => {
            this.speed /= 2;
        }, 2000);
    }

    /**
     * Ataque láser
     */
    laserAttack() {
        if (!this.target) return;

        // Crear láser
        const laser = {
            x: this.x,
            y: this.y,
            targetX: this.target.x,
            targetY: this.target.y,
            damage: this.damage * 3,
            duration: 1000,
            startTime: Date.now()
        };

        this.effects.push(laser);

        // Aplicar daño inmediato
        if (this.getDistanceTo(this.target) <= this.attackRange * 2) {
            this.target.takeDamage(laser.damage, this);
        }
    }

    /**
     * Spawnea minions
     */
    spawnMinions() {
        const minionCount = 3;

        for (let i = 0; i < minionCount; i++) {
            const angle = (Math.PI * 2 / minionCount) * i;
            const spawnX = this.x + Math.cos(angle) * 100;
            const spawnY = this.y + Math.sin(angle) * 100;

            const minion = new Enemy(spawnX, spawnY, 'GRUNT', this.game);
            this.game.enemies.push(minion);
        }

        // Efectos
        this.game.particleSystem.emit('spark', this.x, this.y, 15);
    }

    /**
     * Crea efectos de ataque
     */
    createAttackEffects() {
        // Partículas de impacto
        this.game.particleSystem.emit('spark', this.x, this.y, 5);

        // Sonido
        this.game.audioSystem.playSound('enemy_attack');
    }

    /**
     * Crea efecto de fogonazo
     */
    createMuzzleFlash() {
        const flashX = this.x + Math.cos(this.rotation) * (this.width / 2);
        const flashY = this.y + Math.sin(this.rotation) * (this.height / 2);

        this.game.particleSystem.emit('spark', flashX, flashY, 3);
    }

    /**
     * Aplica daño al enemigo
     */
    takeDamage(damage, source = null) {
        if (!this.alive) return;

        // Aplicar daño
        this.health -= damage;

        // Crear efectos
        this.createDamageEffects();

        // Reaccionar al daño
        this.reactToDamage(source);

        // Verificar si murió
        if (this.health <= 0) {
            this.die(source);
        }

        // Emitir evento
        this.game.emit('enemyDamage', { enemy: this, damage, health: this.health });
    }

    /**
     * Crea efectos de daño
     */
    createDamageEffects() {
        // Partículas de sangre
        this.game.particleSystem.emit('blood', this.x, this.y, 5);

        // Efecto visual
        this.addEffect({
            type: 'damage',
            duration: 200,
            color: '#ff0000'
        });
    }

    /**
     * Reacciona al recibir daño
     */
    reactToDamage(source) {
        // Cambiar a estado agresivo si no lo estaba
        if (this.state !== 'aggressive') {
            this.state = 'aggressive';
            if (source) {
                this.setTarget(source);
            }
        }

        // Posibilidad de aturdir
        if (Math.random() < EnemyConfig.AI.DODGE_CHANCE) {
            this.stunned = true;
            this.stunTime = 500;
        }

        // Retroceso
        if (source) {
            const dx = this.x - source.x;
            const dy = this.y - source.y;
            const distance = Math.hypot(dx, dy);

            if (distance > 0) {
                this.vx = (dx / distance) * 5;
                this.vy = (dy / distance) * 5;
            }
        }
    }

    /**
     * Maneja la muerte del enemigo
     */
    die(source = null) {
        this.alive = false;

        // Registrar eliminación
        if (source && source === this.game.player) {
            this.game.player.registerKill(this);
        }

        // Crear efectos de muerte
        this.createDeathEffects();

        // Soltar power-ups
        this.dropLoot();

        // Emitir evento
        this.game.emit('enemyDeath', { enemy: this, source });

        console.log(`Enemigo ${this.type} eliminado`);
    }

    /**
     * Crea efectos de muerte
     */
    createDeathEffects() {
        // Explosión
        this.game.particleSystem.emit('explosion', this.x, this.y, 10);

        // Sonido
        this.game.audioSystem.playSound('enemy_death');
    }

    /**
     * Suelta loot al morir
     */
    dropLoot() {
        if (Math.random() < this.dropRate) {
            this.game.spawnPowerUp(this.x, this.y);
        }
    }

    /**
     * Añade un efecto visual
     */
    addEffect(effect) {
        this.effects.push(effect);
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
     * Verifica si puede ver al objetivo
     */
    canSeeTarget(target) {
        const distance = this.getDistanceTo(target);

        if (distance > this.aggressionRange) {
            return false;
        }

        // Verificar línea de visión
        return this.hasLineOfSight(target);
    }

    /**
     * Verifica si hay línea de visión
     */
    hasLineOfSight(target) {
        // Simplificado: verificar si no hay obstáculos en el camino
        const steps = 10;
        const dx = (target.x - this.x) / steps;
        const dy = (target.y - this.y) / steps;

        for (let i = 1; i < steps; i++) {
            const checkX = this.x + dx * i;
            const checkY = this.y + dy * i;

            for (const obstacle of this.game.obstacles) {
                if (this.pointInObstacle(checkX, checkY, obstacle)) {
                    return false;
                }
            }
        }

        return true;
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
     * Renderiza al enemigo
     */
    render(ctx) {
        if (!this.alive) return;

        ctx.save();

        // Trasladar al enemigo
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Aplicar efectos de estado
        this.applyStatusEffects(ctx);

        // Renderizar cuerpo
        ctx.fillStyle = this.config.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Renderizar detalles según tipo
        this.renderDetails(ctx);

        // Renderizar efectos
        this.renderEffects(ctx);

        ctx.restore();

        // Renderizar barra de salud
        this.renderHealthBar(ctx);

        // Renderizar nombre (jefes)
        if (this.type === 'BOSS') {
            this.renderName(ctx);
        }
    }

    /**
     * Aplica efectos de estado al renderizado
     */
    applyStatusEffects(ctx) {
        // Aturdimiento
        if (this.stunned) {
            ctx.globalAlpha = 0.5;
        }

        // Efectos de daño
        const damageEffect = this.effects.find(e => e.type === 'damage');
        if (damageEffect) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = damageEffect.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
    }

    /**
     * Renderiza detalles según el tipo
     */
    renderDetails(ctx) {
        switch (this.type) {
            case 'HEAVY':
                // Blindaje
                ctx.strokeStyle = '#444444';
                ctx.lineWidth = 3;
                ctx.strokeRect(-this.width / 2 + 5, -this.height / 2 + 5, this.width - 10, this.height - 10);
                break;

            case 'SNIPER':
                // Mira
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.width / 2, 0);
                ctx.lineTo(this.width / 2 + 10, 0);
                ctx.stroke();
                break;

            case 'FAST':
                // Líneas de velocidad
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-this.width / 2, -this.height / 2 + i * 10);
                    ctx.lineTo(-this.width / 2 - 10, -this.height / 2 + i * 10 - 5);
                    ctx.stroke();
                }
                break;

            case 'BOSS':
                // Corona
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                    const x = Math.cos(angle) * (this.width / 2 + 10);
                    const y = Math.sin(angle) * (this.width / 2 + 10) - this.height / 2;
                    ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                break;
        }
    }

    /**
     * Renderiza efectos
     */
    renderEffects(ctx) {
        for (const effect of this.effects) {
            switch (effect.type) {
                case 'laser':
                    this.renderLaser(ctx, effect);
                    break;
            }
        }
    }

    /**
     * Renderiza un láser
     */
    renderLaser(ctx, laser) {
        const elapsed = Date.now() - laser.startTime;
        if (elapsed > laser.duration) return;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.8;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        const dx = laser.targetX - this.x;
        const dy = laser.targetY - this.y;
        ctx.lineTo(dx, dy);
        ctx.stroke();

        // Brillo
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Renderiza la barra de salud
     */
    renderHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = this.y - this.height / 2 - 10;

        // Fondo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

        // Salud
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#ff0000' : healthPercent > 0.25 ? '#ff8800' : '#ff4444';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

        // Borde
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - barWidth / 2, barY, barWidth, barHeight);
    }

    /**
     * Renderiza el nombre (jefes)
     */
    renderName(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.config.name} - Fase ${this.phase}`, this.x, this.y - this.height / 2 - 20);
    }

    /**
     * Obtiene información del enemigo
     */
    getInfo() {
        return {
            type: this.type,
            position: { x: this.x, y: this.y },
            health: this.health,
            maxHealth: this.maxHealth,
            state: this.state,
            phase: this.phase
        };
    }
}

/**
 * Clase EnemyAI - Maneja la inteligencia artificial de los enemigos
 */
class EnemyAI {
    constructor(enemy, aiType) {
        this.enemy = enemy;
        this.aiType = aiType;
        this.decisionCooldown = 0;
        this.lastDecisionTime = 0;
    }

    /**
     * Actualiza la IA
     */
    update(deltaTime) {
        if (!this.enemy.alive || this.enemy.stunned) return;

        // Actualizar cooldown de decisiones
        if (this.decisionCooldown > 0) {
            this.decisionCooldown -= deltaTime * 1000;
            return;
        }

        // Tomar decisión según el tipo de IA
        switch (this.aiType) {
            case 'basic':
                this.basicAI();
                break;
            case 'aggressive':
                this.aggressiveAI();
                break;
            case 'sniper':
                this.sniperAI();
                break;
            case 'hitAndRun':
                this.hitAndRunAI();
                break;
            case 'boss':
                this.bossAI();
                break;
        }

        // Establecer cooldown
        this.decisionCooldown = 500;
    }

    /**
     * IA básica
     */
    basicAI() {
        // Buscar al jugador
        if (!this.enemy.target || !this.enemy.canSeeTarget(this.enemy.target)) {
            this.findTarget();
        }

        if (this.enemy.target) {
            // Moverse hacia el objetivo
            this.enemy.moveTo(this.enemy.target.x, this.enemy.target.y);

            // Atacar si está en rango
            if (this.enemy.getDistanceTo(this.enemy.target) <= this.enemy.attackRange) {
                this.enemy.attack();
            }
        } else {
            // Patrullar
            this.patrol();
        }
    }

    /**
     * IA agresiva
     */
    aggressiveAI() {
        // Siempre perseguir al jugador
        if (!this.enemy.target) {
            this.findTarget();
        }

        if (this.enemy.target) {
            // Movimiento directo y rápido
            this.enemy.moveTo(this.enemy.target.x, this.enemy.target.y);

            // Atacar tan pronto como sea posible
            if (this.enemy.getDistanceTo(this.enemy.target) <= this.enemy.attackRange * 1.5) {
                this.enemy.attack();
            }
        }
    }

    /**
     * IA de francotirador
     */
    sniperAI() {
        if (!this.enemy.target) {
            this.findTarget();
        }

        if (this.enemy.target) {
            const distance = this.enemy.getDistanceTo(this.enemy.target);

            if (distance > this.enemy.attackRange) {
                // Acercarse lo suficiente
                this.enemy.moveTo(this.enemy.target.x, this.enemy.target.y);
            } else if (distance < this.enemy.attackRange * 0.5) {
                // Alejarse si está muy cerca
                this.retreat();
            } else {
                // Posicionarse y atacar
                this.enemy.attack();
            }
        }
    }

    /**
     * IA de golpe y huida
     */
    hitAndRunAI() {
        if (!this.enemy.target) {
            this.findTarget();
        }

        if (this.enemy.target) {
            const distance = this.enemy.getDistanceTo(this.enemy.target);

            if (distance > this.enemy.attackRange) {
                // Cargar rápidamente
                this.enemy.moveTo(this.enemy.target.x, this.enemy.target.y);
            } else {
                // Atacar y retroceder
                this.enemy.attack();
                this.retreat();
            }
        }
    }

    /**
     * IA de jefe
     */
    bossAI() {
        if (!this.enemy.target) {
            this.findTarget();
        }

        if (this.enemy.target) {
            // Comportamiento según la fase
            switch (this.enemy.phase) {
                case 1:
                    // Fase 1: Perseguir y atacar
                    this.enemy.moveTo(this.enemy.target.x, this.enemy.target.y);
                    if (this.enemy.getDistanceTo(this.enemy.target) <= this.enemy.attackRange) {
                        this.enemy.attack();
                    }
                    break;

                case 2:
                    // Fase 2: Mantener distancia y atacar
                    const distance = this.enemy.getDistanceTo(this.enemy.target);
                    if (distance > this.enemy.attackRange * 1.5) {
                        this.enemy.moveTo(this.enemy.target.x, this.enemy.target.y);
                    } else if (distance < this.enemy.attackRange * 0.8) {
                        this.retreat();
                    } else {
                        this.enemy.attack();
                    }
                    break;

                case 3:
                    // Fase 3: Movimiento errático y ataques constantes
                    this.erraticMovement();
                    this.enemy.attack();
                    break;
            }
        }
    }

    /**
     * Busca un objetivo
     */
    findTarget() {
        // El jugador es el objetivo principal
        if (this.enemy.game.player && this.enemy.game.player.alive) {
            this.enemy.setTarget(this.enemy.game.player);
        }
    }

    /**
     * Patrulla el área
     */
    patrol() {
        // Movimiento aleatorio
        if (Math.random() < 0.02) {
            const randomX = this.enemy.x + (Math.random() - 0.5) * 200;
            const randomY = this.enemy.y + (Math.random() - 0.5) * 200;
            this.enemy.moveTo(randomX, randomY);
        }
    }

    /**
     * Retrocede
     */
    retreat() {
        if (!this.enemy.target) return;

        const dx = this.enemy.x - this.enemy.target.x;
        const dy = this.enemy.y - this.enemy.target.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            const retreatX = this.enemy.x + (dx / distance) * 100;
            const retreatY = this.enemy.y + (dy / distance) * 100;
            this.enemy.moveTo(retreatX, retreatY);
        }
    }

    /**
     * Movimiento errático
     */
    erraticMovement() {
        if (Math.random() < 0.1) {
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDistance = 50 + Math.random() * 100;
            const targetX = this.enemy.x + Math.cos(randomAngle) * randomDistance;
            const targetY = this.enemy.y + Math.sin(randomAngle) * randomDistance;
            this.enemy.moveTo(targetX, targetY);
        }
    }
}

// Exportar clases
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Enemy, EnemyAI };
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.Enemy = Enemy;
    window.EnemyAI = EnemyAI;
}