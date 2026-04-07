/**
 * Clase Player - Representa al jugador en Shooter Arena
 * Maneja movimiento, combate, habilidades y estadísticas
 */

class Player {
    constructor(x, y, game) {
        // Referencia al juego
        this.game = game;

        // Posición y dimensión
        this.x = x;
        this.y = y;
        this.width = PlayerConfig.WIDTH;
        this.height = PlayerConfig.HEIGHT;

        // Movimiento
        this.vx = 0;
        this.vy = 0;
        this.speed = PlayerConfig.BASE_SPEED;
        this.rotation = 0;

        // Estadísticas de combate
        this.health = PlayerConfig.BASE_HEALTH;
        this.maxHealth = PlayerConfig.BASE_HEALTH;
        this.armor = PlayerConfig.BASE_ARMOR;
        this.maxArmor = PlayerConfig.BASE_ARMOR;
        this.damage = PlayerConfig.BASE_DAMAGE;

        // Estado
        this.alive = true;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.isReloading = false;
        this.reloadTime = 0;
        this.isShooting = false;
        this.lastShotTime = 0;

        // Armas
        this.weapons = {};
        this.currentWeapon = null;
        this.ammo = {};

        // Habilidades
        this.abilities = {};
        this.abilityCooldowns = {};
        this.energy = 100;
        this.maxEnergy = 100;

        // Power-ups activos
        this.activePowerUps = new Map();

        // Estadísticas
        this.stats = {
            kills: 0,
            deaths: 0,
            shotsFired: 0,
            shotsHit: 0,
            damageDealt: 0,
            damageTaken: 0,
            powerUpsCollected: 0,
            distanceTraveled: 0,
            timeAlive: 0
        };

        // Nivel y experiencia
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = PlayerConfig.LEVELS.EXP_PER_LEVEL;
        this.skillPoints = 0;

        // Animación
        this.animation = {
            state: 'idle',
            frame: 0,
            frameTime: 0,
            frameDuration: 100
        };

        // Inicializar
        this.init();
    }

    /**
     * Inicializa al jugador
     */
    init() {
        // Inicializar armas
        this.initWeapons();

        // Inicializar habilidades
        this.initAbilities();

        // Seleccionar arma inicial
        this.switchWeapon('pistol');

        console.log('Jugador inicializado');
    }

    /**
     * Inicializa las armas del jugador
     */
    initWeapons() {
        for (const [weaponKey, weaponData] of Object.entries(PlayerConfig.WEAPONS)) {
            this.weapons[weaponKey] = {
                ...weaponData,
                currentAmmo: weaponData.magazineSize,
                reserveAmmo: weaponData.magazineSize * 3
            };
        }
    }

    /**
     * Inicializa las habilidades del jugador
     */
    initAbilities() {
        for (const [abilityKey, abilityData] of Object.entries(PlayerConfig.ABILITIES)) {
            this.abilities[abilityKey] = { ...abilityData };
            this.abilityCooldowns[abilityKey] = 0;
        }
    }

    /**
     * Actualiza al jugador
     */
    update(deltaTime) {
        if (!this.alive) return;

        // Actualizar tiempo de vida
        this.stats.timeAlive += deltaTime;

        // Actualizar posición
        this.updatePosition(deltaTime);

        // Actualizar invulnerabilidad
        this.updateInvulnerability(deltaTime);

        // Actualizar recarga
        this.updateReload(deltaTime);

        // Actualizar cooldowns de habilidades
        this.updateAbilityCooldowns(deltaTime);

        // Actualizar power-ups
        this.updatePowerUps(deltaTime);

        // Actualizar energía
        this.updateEnergy(deltaTime);

        // Actualizar animación
        this.updateAnimation(deltaTime);

        // Regeneración pasiva
        this.passiveRegeneration(deltaTime);
    }

    /**
     * Actualiza la posición del jugador
     */
    updatePosition(deltaTime) {
        // Aplicar velocidad
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;

        // Aplicar fricción
        this.vx *= PlayerConfig.FRICTION;
        this.vy *= PlayerConfig.FRICTION;

        // Limitar velocidad máxima
        const maxSpeed = this.speed * this.getSpeedMultiplier();
        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > maxSpeed) {
            this.vx = (this.vx / currentSpeed) * maxSpeed;
            this.vy = (this.vy / currentSpeed) * maxSpeed;
        }

        // Actualizar distancia viajada
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            this.stats.distanceTraveled += Math.hypot(this.vx, this.vy) * deltaTime * 60;
        }

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
     * Actualiza el estado de invulnerabilidad
     */
    updateInvulnerability(deltaTime) {
        if (this.invulnerable) {
            this.invulnerableTime -= deltaTime * 1000;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
                this.invulnerableTime = 0;
            }
        }
    }

    /**
     * Actualiza el estado de recarga
     */
    updateReload(deltaTime) {
        if (this.isReloading) {
            this.reloadTime -= deltaTime * 1000;
            if (this.reloadTime <= 0) {
                this.completeReload();
            }
        }
    }

    /**
     * Actualiza los cooldowns de habilidades
     */
    updateAbilityCooldowns(deltaTime) {
        for (const [ability, cooldown] of Object.entries(this.abilityCooldowns)) {
            if (cooldown > 0) {
                this.abilityCooldowns[ability] = Math.max(0, cooldown - deltaTime * 1000);
            }
        }
    }

    /**
     * Actualiza los power-ups activos
     */
    updatePowerUps(deltaTime) {
        for (const [powerUpType, powerUp] of this.activePowerUps.entries()) {
            powerUp.duration -= deltaTime * 1000;

            if (powerUp.duration <= 0) {
                // Remover power-up
                this.removePowerUp(powerUpType);
            }
        }
    }

    /**
     * Actualiza la energía
     */
    updateEnergy(deltaTime) {
        // Regenerar energía pasivamente
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + 10 * deltaTime);
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
        } else {
            this.animation.state = 'idle';
        }
    }

    /**
     * Regeneración pasiva
     */
    passiveRegeneration(deltaTime) {
        // Regenerar salud lentamente
        if (this.health < this.maxHealth && this.gameTime % 5 < deltaTime) {
            this.health = Math.min(this.maxHealth, this.health + 1);
        }
    }

    /**
     * Mueve al jugador
     */
    move(dx, dy) {
        if (!this.alive) return;

        // Aplicar aceleración
        this.vx += dx * PlayerConfig.ACCELERATION;
        this.vy += dy * PlayerConfig.ACCELERATION;
    }

    /**
     * Apunta el jugador hacia una posición
     */
    aimAt(targetX, targetY) {
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        this.rotation = angle;
    }

    /**
     * Dispara el arma actual
     */
    shoot() {
        if (!this.alive || !this.currentWeapon || this.isReloading) return;

        const weapon = this.weapons[this.currentWeapon];
        const currentTime = Date.now();

        // Verificar cadencia de fuego
        if (currentTime - this.lastShotTime < weapon.fireRate / this.getFireRateMultiplier()) {
            return;
        }

        // Verificar munición
        if (weapon.currentAmmo <= 0) {
            this.reload();
            return;
        }

        // Disparar
        this.isShooting = true;
        this.lastShotTime = currentTime;
        weapon.currentAmmo--;
        this.stats.shotsFired++;

        // Crear balas
        this.createBullets();

        // Reproducir sonido
        this.game.audioSystem.playSound('shoot');

        // Efectos visuales
        this.createMuzzleFlash();

        // Retroceso
        this.applyRecoil();

        // Emitir evento
        this.game.emit('playerShoot', {
            weapon: this.currentWeapon,
            ammo: weapon.currentAmmo
        });
    }

    /**
     * Crea las balas del disparo
     */
    createBullets() {
        const weapon = this.weapons[this.currentWeapon];
        const bulletCount = weapon.pellets || 1;

        for (let i = 0; i < bulletCount; i++) {
            // Calcular dispersión
            const spread = (Math.random() - 0.5) * weapon.spread * 2;
            const angle = this.rotation + spread;

            // Calcular posición de inicio
            const bulletX = this.x + Math.cos(angle) * (this.width / 2 + 10);
            const bulletY = this.y + Math.sin(angle) * (this.height / 2 + 10);

            // Crear bala
            const bullet = new Bullet(
                bulletX,
                bulletY,
                angle,
                weapon.damage * this.getDamageMultiplier(),
                weapon.bulletSpeed,
                'player',
                this.game
            );

            this.game.bullets.push(bullet);
        }
    }

    /**
     * Crea efecto de fogonazo
     */
    createMuzzleFlash() {
        const flashX = this.x + Math.cos(this.rotation) * (this.width / 2);
        const flashY = this.y + Math.sin(this.rotation) * (this.height / 2);

        this.game.particleSystem.emit('spark', flashX, flashY, 5);
    }

    /**
     * Aplica retroceso del arma
     */
    applyRecoil() {
        const recoilForce = 2;
        this.vx -= Math.cos(this.rotation) * recoilForce;
        this.vy -= Math.sin(this.rotation) * recoilForce;
    }

    /**
     * Recarga el arma actual
     */
    reload() {
        if (!this.currentWeapon || this.isReloading) return;

        const weapon = this.weapons[this.currentWeapon];

        // Verificar si hay munición de reserva
        if (weapon.reserveAmmo <= 0) {
            this.game.uiSystem.showNotification('Sin munición', 'warning');
            return;
        }

        // Iniciar recarga
        this.isReloading = true;
        this.reloadTime = weapon.reloadTime;

        // Reproducir sonido
        this.game.audioSystem.playSound('reload');

        // Emitir evento
        this.game.emit('playerReload', { weapon: this.currentWeapon });
    }

    /**
     * Completa la recarga
     */
    completeReload() {
        const weapon = this.weapons[this.currentWeapon];

        // Calcular munición a recargar
        const ammoNeeded = weapon.magazineSize - weapon.currentAmmo;
        const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);

        weapon.currentAmmo += ammoToReload;
        weapon.reserveAmmo -= ammoToReload;

        this.isReloading = false;
        this.reloadTime = 0;

        // Emitir evento
        this.game.emit('playerReloadComplete', {
            weapon: this.currentWeapon,
            currentAmmo: weapon.currentAmmo
        });
    }

    /**
     * Cambia de arma
     */
    switchWeapon(weaponKey) {
        if (!this.weapons[weaponKey] || this.currentWeapon === weaponKey) return;

        this.currentWeapon = weaponKey;

        // Cancelar recarga si se cambia de arma
        if (this.isReloading) {
            this.isReloading = false;
            this.reloadTime = 0;
        }

        // Emitir evento
        this.game.emit('weaponSwitch', { weapon: weaponKey });
    }

    /**
     * Usa una habilidad
     */
    useAbility(abilityKey) {
        if (!this.alive || !this.abilities[abilityKey]) return;

        const ability = this.abilities[abilityKey];
        const cooldown = this.abilityCooldowns[abilityKey];

        // Verificar cooldown
        if (cooldown > 0) {
            this.game.uiSystem.showNotification(
                `${ability.name} en cooldown: ${Math.ceil(cooldown / 1000)}s`,
                'warning'
            );
            return;
        }

        // Verificar energía
        if (this.energy < ability.energyCost) {
            this.game.uiSystem.showNotification('Energía insuficiente', 'warning');
            return;
        }

        // Usar habilidad
        this.energy -= ability.energyCost;
        this.abilityCooldowns[abilityKey] = ability.cooldown;

        // Ejecutar efecto de la habilidad
        this.executeAbility(abilityKey, ability);

        // Emitir evento
        this.game.emit('abilityUse', { ability: abilityKey });
    }

    /**
     * Ejecuta el efecto de una habilidad
     */
    executeAbility(abilityKey, ability) {
        switch (abilityKey) {
            case 'dash':
                this.dash(ability.speed, ability.duration);
                break;
            case 'shield':
                this.activateShield(ability.duration);
                break;
            case 'heal':
                this.heal(ability.amount);
                break;
            case 'rage':
                this.activateRage(ability.duration, ability.damageMultiplier);
                break;
        }
    }

    /**
     * Ejecuta un dash
     */
    async dash(speed, duration) {
        const originalSpeed = this.speed;
        this.speed = speed;

        // Crear efecto visual
        this.game.particleSystem.emit('smoke', this.x, this.y, 10);

        // Esperar duración
        await new Promise(resolve => setTimeout(resolve, duration));

        this.speed = originalSpeed;
    }

/**
 * Activa un escudo
 */
    activateShield(duration) {
    this.invulnerable = true;
    this.invulnerableTime = duration;

    // Crear efecto visual
    this.game.particleSystem.emit('spark', this.x, this.y, 20);
    }

/**
 * Cura al jugador
 */
    heal(amount) {
    const healthHealed = Math.min(amount, this.maxHealth - this.health);
    this.health += healthHealed;

    // Crear efecto visual
    this.game.particleSystem.emit('heal', this.x, this.y, 15);

    // Reproducir sonido
    this.game.audioSystem.playSound('heal');

    // Mostrar notificación
    this.game.uiSystem.showNotification(`+${healthHealed} HP`, 'success');
    }

/**
 * Activa el modo furia
 */
    activateRage(duration, damageMultiplier) {
    const powerUp = {
        type: 'rage',
        duration: duration,
        effect: { damageMultiplier: damageMultiplier }
    };

    this.activePowerUps.set('rage', powerUp);

    // Crear efecto visual
    this.game.particleSystem.emit('explosion', this.x, this.y, 10);
    }

/**
 * Aplica daño al jugador
 */
    takeDamage(damage, source = null) {
    if (!this.alive || this.invulnerable) return;

    // Calcular daño con armadura
    const actualDamage = Math.max(1, damage - this.armor);

    // Aplicar daño
    this.health -= actualDamage;
    this.stats.damageTaken += actualDamage;

    // Crear efectos
    this.createDamageEffects();

    // Verificar si murió
    if (this.health <= 0) {
        this.die(source);
    }

    // Emitir evento
    this.game.emit('playerDamage', { damage: actualDamage, health: this.health });
    }

/**
 * Crea efectos de daño
 */
    createDamageEffects() {
    // Partículas de sangre
    this.game.particleSystem.emit('blood', this.x, this.y, 8);

    // Pantalla roja
    this.game.uiSystem.showDamageEffect();

    // Sonido de daño
    this.game.audioSystem.playSound('hit');
    }

/**
 * Maneja la muerte del jugador
 */
    die(source = null) {
    this.alive = false;
    this.stats.deaths++;

    // Crear efectos de muerte
    this.createDeathEffects();

    // Soltar power-ups
    this.dropPowerUps();

    // Emitir evento
    this.game.emit('playerDeath', { source });

    console.log('Jugador muerto');
    }

/**
 * Crea efectos de muerte
 */
    createDeathEffects() {
    // Explosión grande
    this.game.particleSystem.emit('explosion', this.x, this.y, 30);

    // Sonido de muerte
    this.game.audioSystem.playSound('death');
    }

/**
 * Suelta power-ups al morir
 */
    dropPowerUps() {
    // Soltar munición
    if (Math.random() < 0.5) {
        this.game.spawnPowerUp(this.x, this.y, 'AMMO');
    }

    // Soltar salud
    if (Math.random() < 0.3) {
        this.game.spawnPowerUp(this.x, this.y, 'HEALTH');
    }
    }

/**
 * Recoge un power-up
 */
    collectPowerUp(powerUp) {
    const config = PowerUpConfig.TYPES[powerUp.type];

    // Aplicar efecto del power-up
    this.applyPowerUpEffect(powerUp.type, config.effect);

    // Actualizar estadísticas
    this.stats.powerUpsCollected++;

    // Añadir puntuación
    this.game.addScore(5);

    // Reproducir sonido
    this.game.audioSystem.playSound('pickup');

    // Mostrar notificación
    this.game.uiSystem.showNotification(`+${config.name}`, 'success');

    // Emitir evento
    this.game.emit('powerUpCollect', { powerUp: powerUp.type });
    }

/**
 * Aplica el efecto de un power-up
 */
    applyPowerUpEffect(powerUpType, effect) {
    if (effect.health) {
        this.health = Math.min(this.maxHealth, this.health + effect.health);
    }

    if (effect.armor) {
        this.armor = Math.min(this.maxArmor, this.armor + effect.armor);
    }

    if (effect.speedMultiplier) {
        const powerUp = {
            type: powerUpType,
            duration: PowerUpConfig.TYPES[powerUpType].duration,
            effect: { speedMultiplier: effect.speedMultiplier }
        };
        this.activePowerUps.set(powerUpType, powerUp);
    }

    if (effect.damageMultiplier) {
        const powerUp = {
            type: powerUpType,
            duration: PowerUpConfig.TYPES[powerUpType].duration,
            effect: { damageMultiplier: effect.damageMultiplier }
        };
        this.activePowerUps.set(powerUpType, powerUp);
    }

    if (effect.fireRateMultiplier) {
        const powerUp = {
            type: powerUpType,
            duration: PowerUpConfig.TYPES[powerUpType].duration,
            effect: { fireRateMultiplier: effect.fireRateMultiplier }
        };
        this.activePowerUps.set(powerUpType, powerUp);
    }

    if (effect.invincible) {
        this.invulnerable = true;
        this.invulnerableTime = PowerUpConfig.TYPES[powerUpType].duration;
    }

    if (effect.refillAmmo) {
        for (const weapon of Object.values(this.weapons)) {
            weapon.reserveAmmo = weapon.magazineSize * 3;
        }
    }

    if (effect.multiShot) {
        const powerUp = {
            type: powerUpType,
            duration: PowerUpConfig.TYPES[powerUpType].duration,
            effect: { multiShot: effect.multiShot }
        };
        this.activePowerUps.set(powerUpType, powerUp);
    }
    }

/**
 * Remueve un power-up activo
 */
    removePowerUp(powerUpType) {
    this.activePowerUps.delete(powerUpType);

    // Mostrar notificación
    this.game.uiSystem.showNotification(
        `${PowerUpConfig.TYPES[powerUpType].name} expiró`,
        'info'
    );
    }

/**
 * Añade experiencia
 */
    addXP(amount) {
    this.xp += amount;

    // Verificar si subió de nivel
    while (this.xp >= this.xpToNextLevel && this.level < PlayerConfig.LEVELS.MAX_LEVEL) {
        this.levelUp();
    }

    // Emitir evento
    this.game.emit('xpGained', { amount, total: this.xp });
    }

/**
 * Sube de nivel
 */
    levelUp() {
    this.level++;
    this.skillPoints += PlayerConfig.LEVELS.SKILL_POINTS_PER_LEVEL;
    this.xp -= this.xpToNextLevel;
    this.xpToNextLevel = PlayerConfig.LEVELS.EXP_PER_LEVEL * this.level;

    // Mejorar estadísticas
    this.maxHealth += 10;
    this.health = this.maxHealth;
    this.maxEnergy += 5;
    this.energy = this.maxEnergy;

    // Crear efectos
    this.game.particleSystem.emit('spark', this.x, this.y, 25);

    // Reproducir sonido
    this.game.audioSystem.playSound('levelup');

    // Mostrar notificación
    this.game.uiSystem.showNotification(`¡Nivel ${this.level}!`, 'success');

    // Emitir evento
    this.game.emit('levelUp', { level: this.level, skillPoints: this.skillPoints });
    }

/**
 * Registra una eliminación
 */
    registerKill(enemy) {
    this.stats.kills++;

    // Añadir puntuación
    const points = EnemyConfig.TYPES[enemy.type].score;
    this.game.addScore(points);

    // Añadir experiencia
    this.addXP(points / 2);

    // Emitir evento
    this.game.emit('enemyKilled', { enemy, points });
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
 * Obtiene multiplicadores de estadísticas
 */
    getSpeedMultiplier() {
    let multiplier = 1;

    for (const powerUp of this.activePowerUps.values()) {
        if (powerUp.effect.speedMultiplier) {
            multiplier *= powerUp.effect.speedMultiplier;
        }
    }

    return multiplier;
    }

    getDamageMultiplier() {
    let multiplier = 1;

    for (const powerUp of this.activePowerUps.values()) {
        if (powerUp.effect.damageMultiplier) {
            multiplier *= powerUp.effect.damageMultiplier;
        }
    }

    return multiplier;
    }

    getFireRateMultiplier() {
    let multiplier = 1;

    for (const powerUp of this.activePowerUps.values()) {
        if (powerUp.effect.fireRateMultiplier) {
            multiplier *= powerUp.effect.fireRateMultiplier;
        }
    }

    return multiplier;
    }

/**
 * Renderiza al jugador
 */
    render(ctx) {
    if (!this.alive) return;

    ctx.save();

    // Trasladar al jugador
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Efecto de invulnerabilidad
    if (this.invulnerable) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
    }

    // Renderizar cuerpo del jugador
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Renderizar arma
    this.renderWeapon(ctx);

    // Renderizar escudo si está activo
    if (this.invulnerable) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.width, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();

    // Renderizar barra de salud
    this.renderHealthBar(ctx);

    // Renderizar nombre
    this.renderName(ctx);
    }

/**
 * Renderiza el arma
 */
    renderWeapon(ctx) {
    if (!this.currentWeapon) return;

    ctx.fillStyle = '#888888';
    ctx.fillRect(this.width / 2 - 5, -3, 20, 6);
    }

/**
 * Renderiza la barra de salud
 */
    renderHealthBar(ctx) {
    const barWidth = 40;
    const barHeight = 4;
    const barY = this.y - this.height / 2 - 10;

    // Fondo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

    // Salud
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

    // Armadura
    if (this.armor > 0) {
        const armorPercent = this.armor / this.maxArmor;
        ctx.fillStyle = 'rgba(0, 100, 255, 0.7)';
        ctx.fillRect(this.x - barWidth / 2, barY - 2, barWidth * armorPercent, 2);
    }
    }

/**
 * Renderiza el nombre del jugador
 */
    renderName(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Player', this.x, this.y - this.height / 2 - 15);
    }

/**
 * Obtiene información del jugador
 */
    getInfo() {
    return {
        position: { x: this.x, y: this.y },
        health: this.health,
        maxHealth: this.maxHealth,
        armor: this.armor,
        energy: this.energy,
        level: this.level,
        xp: this.xp,
        weapon: this.currentWeapon,
        ammo: this.currentWeapon ? this.weapons[this.currentWeapon].currentAmmo : 0,
        stats: this.stats
    };
    }
    }