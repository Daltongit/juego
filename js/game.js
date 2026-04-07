/**
 * Motor principal del juego Shooter Arena
 * Controla el bucle del juego, la física y la gestión de entidades
 */

class Game {
    constructor() {
        // Estado del juego
        this.isRunning = false;
        this.isPaused = false;
        this.gameTime = 0;
        this.deltaTime = 0;
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;

        // Canvas y contexto
        this.canvas = null;
        this.ctx = null;
        this.width = GameConfig.CANVAS_WIDTH;
        this.height = GameConfig.CANVAS_HEIGHT;

        // Entidades del juego
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.particles = [];
        this.obstacles = [];

        // Sistemas
        this.collisionSystem = null;
        this.particleSystem = null;
        this.audioSystem = null;
        this.uiSystem = null;

        // Modo de juego
        this.gameMode = null;
        this.waveNumber = 0;
        this.score = 0;
        this.highScore = 0;

        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, pressed: false };

        // Cámara
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            target: null,
            followSpeed: 0.1
        };

        // Mapa
        this.map = {
            width: 2400,
            height: 1400,
            tiles: [],
            spawnPoints: []
        };

        // Eventos
        this.listeners = new Map();

        // Inicializar juego
        this.init();
    }

    /**
     * Inicializa el motor del juego
     */
    init() {
        // Configurar canvas
        this.setupCanvas();

        // Configurar input
        this.setupInput();

        // Inicializar sistemas
        this.initSystems();

        // Generar mapa
        this.generateMap();

        // Cargar recursos
        this.loadResources();

        console.log('Motor del juego inicializado');
    }

    /**
     * Configura el canvas del juego
     */
    setupCanvas() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            throw new Error('Canvas del juego no encontrado');
        }

        this.ctx = this.canvas.getContext('2d');

        // Configurar dimensiones
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Configurar estilos
        this.canvas.imageSmoothingEnabled = false;
        this.ctx.imageSmoothingEnabled = false;

        // Configurar fondo
        this.canvas.style.background = GameConfig.CANVAS_BACKGROUND;
    }

    /**
     * Configura el sistema de input
     */
    setupInput() {
        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            // Prevenir comportamiento por defecto en teclas de juego
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Eventos de mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Click izquierdo
                this.mouse.pressed = true;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.pressed = false;
            }
        });

        // Eventos de touch (para móviles)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
            this.mouse.pressed = true;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.mouse.pressed = false;
        });
    }

    /**
     * Inicializa los sistemas del juego
     */
    initSystems() {
        // Sistema de colisiones
        this.collisionSystem = new CollisionSystem(this);

        // Sistema de partículas
        this.particleSystem = new ParticleSystem(this);

        // Sistema de audio
        this.audioSystem = new AudioSystem();

        // Sistema de UI
        this.uiSystem = new UISystem(this);
    }

    /**
     * Genera el mapa del juego
     */
    generateMap() {
        // Generar tiles
        for (let x = 0; x < this.map.width; x += 50) {
            for (let y = 0; y < this.map.height; y += 50) {
                this.map.tiles.push({
                    x: x,
                    y: y,
                    width: 50,
                    height: 50,
                    type: Math.random() > 0.8 ? 'wall' : 'floor'
                });
            }
        }

        // Generar puntos de spawn
        this.map.spawnPoints = [
            { x: 100, y: this.height / 2 },
            { x: this.map.width - 100, y: this.height / 2 },
            { x: this.map.width / 2, y: 100 },
            { x: this.map.width / 2, y: this.map.height - 100 }
        ];

        // Generar obstáculos
        this.generateObstacles();
    }

    /**
     * Genera obstáculos en el mapa
     */
    generateObstacles() {
        const obstacleCount = 20;

        for (let i = 0; i < obstacleCount; i++) {
            const obstacle = {
                x: Math.random() * (this.map.width - 100) + 50,
                y: Math.random() * (this.map.height - 100) + 50,
                width: Math.random() * 50 + 30,
                height: Math.random() * 50 + 30,
                type: 'cover',
                health: 100
            };

            // Verificar que no colisione con puntos de spawn
            let validPosition = true;
            for (const spawn of this.map.spawnPoints) {
                const dist = Math.hypot(obstacle.x - spawn.x, obstacle.y - spawn.y);
                if (dist < 150) {
                    validPosition = false;
                    break;
                }
            }

            if (validPosition) {
                this.obstacles.push(obstacle);
            }
        }
    }

    /**
     * Carga los recursos del juego
     */
    async loadResources() {
        try {
            // Cargar imágenes
            await this.loadImages();

            // Cargar sonidos
            await this.loadSounds();

            // Cargar datos
            await this.loadData();

            console.log('Recursos cargados exitosamente');
            this.emit('resourcesLoaded');
        } catch (error) {
            console.error('Error al cargar recursos:', error);
            this.emit('resourcesError', error);
        }
    }

    /**
     * Carga las imágenes del juego
     */
    async loadImages() {
        const images = [
            'player_idle.png',
            'player_run.png',
            'enemy_grunt.png',
            'enemy_heavy.png',
            'powerup_health.png',
            'powerup_ammo.png'
        ];

        // Simulación de carga
        return new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }

    /**
     * Carga los sonidos del juego
     */
    async loadSounds() {
        const sounds = [
            'shoot.wav',
            'explosion.wav',
            'pickup.wav',
            'hit.wav'
        ];

        // Simulación de carga
        return new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }

    /**
     * Carga los datos del juego
     */
    async loadData() {
        // Cargar configuración de niveles
        // Cargar datos de armas
        // Cargar datos de enemigos

        // Simulación de carga
        return new Promise((resolve) => {
            setTimeout(resolve, 500);
        });
    }

    /**
     * Inicia una nueva partida
     */
    start(gameMode = 'deathmatch') {
        if (this.isRunning) {
            console.warn('El juego ya está en ejecución');
            return;
        }

        // Resetear estado
        this.reset();

        // Configurar modo de juego
        this.gameMode = gameMode;

        // Crear jugador
        this.createPlayer();

        // Iniciar primera oleada
        this.startWave();

        // Iniciar bucle del juego
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.gameLoop();

        // Emitir evento
        this.emit('gameStart', { gameMode });

        console.log('Juego iniciado - Modo:', gameMode);
    }

    /**
     * Detiene el juego
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;

        // Limpiar entidades
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.particles = [];

        // Emitir evento
        this.emit('gameStop');

        console.log('Juego detenido');
    }

    /**
     * Pausa o reanuda el juego
     */
    togglePause() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.emit('gamePaused');
        } else {
            this.lastTime = performance.now();
            this.gameLoop();
            this.emit('gameResumed');
        }
    }

    /**
     * Resetea el estado del juego
     */
    reset() {
        this.gameTime = 0;
        this.score = 0;
        this.waveNumber = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;

        // Resetear cámara
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.zoom = 1;
        this.camera.target = null;

        // Limpiar entidades
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.particles = [];

        // Resetear input
        this.keys = {};
        this.mouse.pressed = false;
    }

    /**
     * Bucle principal del juego
     */
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;

        // Calcular delta time
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Actualizar FPS
        this.updateFPS(currentTime);

        // Actualizar tiempo del juego
        this.gameTime += this.deltaTime;

        // Procesar input
        this.processInput();

        // Actualizar entidades
        this.update(this.deltaTime);

        // Detectar colisiones
        this.collisionSystem.checkCollisions();

        // Renderizar
        this.render();

        // Continuar bucle
        requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Actualiza el contador de FPS
     */
    updateFPS(currentTime) {
        this.frameCount++;

        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
    }

    /**
     * Procesa el input del jugador
     */
    processInput() {
        if (!this.player || !this.player.alive) return;

        // Movimiento
        let dx = 0;
        let dy = 0;

        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;

        // Normalizar movimiento diagonal
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Aplicar movimiento
        this.player.move(dx, dy);

        // Apuntar con el mouse
        const worldMouse = this.screenToWorld(this.mouse.x, this.mouse.y);
        this.player.aimAt(worldMouse.x, worldMouse.y);

        // Disparar
        if (this.mouse.pressed) {
            this.player.shoot();
        }

        // Habilidades
        if (this.keys['shift']) {
            this.player.useAbility('dash');
        }
        if (this.keys['e']) {
            this.player.useAbility('shield');
        }
        if (this.keys['q']) {
            this.player.useAbility('heal');
        }

        // Cambiar de arma
        if (this.keys['1']) this.player.switchWeapon('pistol');
        if (this.keys['2']) this.player.switchWeapon('rifle');
        if (this.keys['3']) this.player.switchWeapon('shotgun');
        if (this.keys['4']) this.player.switchWeapon('sniper');
        if (this.keys['5']) this.player.switchWeapon('smg');

        // Recargar
        if (this.keys['r']) {
            this.player.reload();
        }

        // Pausar
        if (this.keys['escape']) {
            this.togglePause();
            this.keys['escape'] = false;
        }
    }

    /**
     * Actualiza todas las entidades del juego
     */
    update(deltaTime) {
        // Actualizar jugador
        if (this.player) {
            this.player.update(deltaTime);

            // Actualizar cámara para seguir al jugador
            this.updateCamera();
        }

        // Actualizar enemigos
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(deltaTime);
            return enemy.alive;
        });

        // Actualizar balas
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.active;
        });

        // Actualizar power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update(deltaTime);
            return powerUp.active;
        });

        // Actualizar partículas
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.active;
        });

        // Actualizar obstáculos
        this.obstacles.forEach(obstacle => {
            if (obstacle.health <= 0) {
                obstacle.destroyed = true;
            }
        });

        // Eliminar obstáculos destruidos
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.destroyed);

        // Spawnear entidades
        this.spawnEntities();

        // Verificar condiciones de victoria/derrota
        this.checkGameConditions();

        // Actualizar UI
        this.uiSystem.update();
    }

    /**
     * Renderiza el juego
     */
    render() {
        // Limpiar canvas
        this.ctx.fillStyle = GameConfig.CANVAS_BACKGROUND;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Guardar estado del contexto
        this.ctx.save();

        // Aplicar transformación de cámara
        this.ctx.translate(-this.camera.x, -this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // Renderizar mapa
        this.renderMap();

        // Renderizar obstáculos
        this.renderObstacles();

        // Renderizar power-ups (detrás de entidades)
        this.renderPowerUps();

        // Renderizar entidades
        this.renderEntities();

        // Renderizar partículas
        this.renderParticles();

        // Restaurar estado del contexto
        this.ctx.restore();

        // Renderizar UI (sin transformación de cámara)
        this.renderUI();

        // Renderizar debug info
        if (DebugConfig.ENABLED) {
            this.renderDebugInfo();
        }
    }

    /**
     * Renderiza el mapa
     */
    renderMap() {
        this.ctx.fillStyle = '#1a1a1a';

        for (const tile of this.map.tiles) {
            if (tile.type === 'wall') {
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
            }
        }
    }

    /**
     * Renderiza los obstáculos
     */
    renderObstacles() {
        for (const obstacle of this.obstacles) {
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

            // Renderizar daño
            if (obstacle.health < 100) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        }
    }

    /**
     * Renderiza las entidades del juego
     */
    renderEntities() {
        // Renderizar balas
        for (const bullet of this.bullets) {
            bullet.render(this.ctx);
        }

        // Renderizar enemigos
        for (const enemy of this.enemies) {
            enemy.render(this.ctx);
        }

        // Renderizar jugador
        if (this.player) {
            this.player.render(this.ctx);
        }
    }

    /**
     * Renderiza los power-ups
     */
    renderPowerUps() {
        for (const powerUp of this.powerUps) {
            powerUp.render(this.ctx);
        }
    }

    /**
     * Renderiza las partículas
     */
    renderParticles() {
        for (const particle of this.particles) {
            particle.render(this.ctx);
        }
    }

    /**
     * Renderiza la UI del juego
     */
    renderUI() {
        this.uiSystem.render(this.ctx);
    }

    /**
     * Renderiza información de debug
     */
    renderDebugInfo() {
        if (!DebugConfig.ENABLED) return;

        this.ctx.save();
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px monospace';

        let y = 20;
        const debugInfo = [
            `FPS: ${this.fps}`,
            `Game Time: ${this.gameTime.toFixed(1)}s`,
            `Entities: ${this.enemies.length + this.bullets.length + this.particles.length}`,
            `Player: ${this.player ? `(${this.player.x.toFixed(0)}, ${this.player.y.toFixed(0)})` : 'None'}`,
            `Camera: (${this.camera.x.toFixed(0)}, ${this.camera.y.toFixed(0)})`,
            `Wave: ${this.waveNumber}`,
            `Score: ${this.score}`
        ];

        for (const info of debugInfo) {
            this.ctx.fillText(info, 10, y);
            y += 15;
        }

        // Mostrar cajas de colisión
        if (DebugConfig.SHOW_COLLISION_BOXES) {
            this.renderCollisionBoxes();
        }

        this.ctx.restore();
    }

    /**
     * Renderiza las cajas de colisión
     */
    renderCollisionBoxes() {
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;

        // Jugador
        if (this.player) {
            this.ctx.strokeRect(
                this.player.x - this.player.width / 2,
                this.player.y - this.player.height / 2,
                this.player.width,
                this.player.height
            );
        }

        // Enemigos
        for (const enemy of this.enemies) {
            this.ctx.strokeRect(
                enemy.x - enemy.width / 2,
                enemy.y - enemy.height / 2,
                enemy.width,
                enemy.height
            );
        }
    }

    /**
     * Crea al jugador
     */
    createPlayer() {
        const spawnPoint = this.map.spawnPoints[0];
        this.player = new Player(spawnPoint.x, spawnPoint.y, this);

        // Configurar cámara para seguir al jugador
        this.camera.target = this.player;

        console.log('Jugador creado en:', spawnPoint);
    }

    /**
     * Inicia una nueva oleada
     */
    startWave() {
        this.waveNumber++;

        // Calcular cantidad de enemigos
        const enemyCount = Math.min(
            EnemyConfig.SPAWNING.ENEMY_PER_WAVE + (this.waveNumber - 1) * 2,
            EnemyConfig.SPAWNING.MAX_ENEMIES
        );

        // Spawnear enemigos
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                this.spawnEnemy();
            }, i * 500);
        }

        // Spawnear jefe cada ciertas oleadas
        if (this.waveNumber % EnemyConfig.SPAWNING.BOSS_WAVE_INTERVAL === 0) {
            setTimeout(() => {
                this.spawnBoss();
            }, enemyCount * 500);
        }

        // Emitir evento
        this.emit('waveStart', { waveNumber: this.waveNumber, enemyCount });

        console.log(`Oleada ${this.waveNumber} iniciada - ${enemyCount} enemigos`);
    }

    /**
     * Spawnear un enemigo
     */
    spawnEnemy() {
        if (this.enemies.length >= EnemyConfig.SPAWNING.MAX_ENEMIES) return;

        // Seleccionar punto de spawn aleatorio (lejos del jugador)
        const validSpawns = this.map.spawnPoints.filter(spawn => {
            const dist = Math.hypot(spawn.x - this.player.x, spawn.y - this.player.y);
            return dist > 300;
        });

        if (validSpawns.length === 0) return;

        const spawn = validSpawns[Math.floor(Math.random() * validSpawns.length)];

        // Seleccionar tipo de enemigo
        const enemyTypes = Object.keys(EnemyConfig.TYPES);
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        // Crear enemigo
        const enemy = new Enemy(spawn.x, spawn.y, type, this);
        this.enemies.push(enemy);

        // Emitir evento
        this.emit('enemySpawn', { enemy, type });
    }

    /**
     * Spawnear un jefe
     */
    spawnBoss() {
        const spawn = this.map.spawnPoints[this.map.spawnPoints.length - 1];
        const boss = new Enemy(spawn.x, spawn.y, 'BOSS', this);
        this.enemies.push(boss);

        // Emitir evento
        this.emit('bossSpawn', { boss });

        console.log('Jefe spawnado');
    }

    /**
     * Spawnear power-ups
     */
    spawnPowerUp(x, y, type = null) {
        if (this.powerUps.length >= PowerUpConfig.SPAWNING.MAX_POWERUPS) return;

        // Seleccionar tipo aleatorio si no se especifica
        if (!type) {
            const types = Object.keys(PowerUpConfig.TYPES);
            type = types[Math.floor(Math.random() * types.length)];
        }

        // Crear power-up
        const powerUp = new PowerUp(x, y, type, this);
        this.powerUps.push(powerUp);

        // Emitir evento
        this.emit('powerUpSpawn', { powerUp, type });
    }

    /**
     * Spawnear entidades automáticamente
     */
    spawnEntities() {
        // Spawnear power-ups aleatoriamente
        if (Math.random() < 0.001) {
            const x = Math.random() * this.map.width;
            const y = Math.random() * this.map.height;
            this.spawnPowerUp(x, y);
        }

        // Spawnear nueva oleada si no hay enemigos
        if (this.enemies.length === 0 && this.waveNumber > 0) {
            setTimeout(() => {
                this.startWave();
            }, EnemyConfig.SPAWNING.WAVE_DELAY);
        }
    }

    /**
     * Actualiza la cámara
     */
    updateCamera() {
        if (!this.camera.target) return;

        // Seguir al objetivo con suavizado
        const targetX = this.camera.target.x - this.width / (2 * this.camera.zoom);
        const targetY = this.camera.target.y - this.height / (2 * this.camera.zoom);

        this.camera.x += (targetX - this.camera.x) * this.camera.followSpeed;
        this.camera.y += (targetY - this.camera.y) * this.camera.followSpeed;

        // Limitar cámara a los bordes del mapa
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.map.width - this.width / this.camera.zoom));
        this.camera.y = Math.max(0, Math.min(this.camera.y, this.map.height - this.height / this.camera.zoom));
    }

    /**
     * Convierte coordenadas de pantalla a mundo
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX / this.camera.zoom + this.camera.x,
            y: screenY / this.camera.zoom + this.camera.y
        };
    }

    /**
     * Convierte coordenadas de mundo a pantalla
     */
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.camera.x) * this.camera.zoom,
            y: (worldY - this.camera.y) * this.camera.zoom
        };
    }

    /**
     * Verifica las condiciones de victoria/derrota
     */
    checkGameConditions() {
        // Verificar si el jugador murió
        if (this.player && !this.player.alive) {
            this.gameOver();
            return;
        }

        // Verificar condiciones del modo de juego
        switch (this.gameMode) {
            case 'survival':
                // En supervivencia, el juego continúa hasta que el jugador muera
                break;

            case 'deathmatch':
                // Verificar límite de puntuación
                if (this.score >= 50) {
                    this.victory();
                }
                break;

            case 'zombies':
                // Verificar si todos los jugadores están muertos
                if (this.enemies.length === 0 && this.waveNumber >= 10) {
                    this.victory();
                }
                break;
        }
    }

    /**
     * Maneja el game over
     */
    gameOver() {
        this.isRunning = false;

        // Actualizar puntuación máxima
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        // Emitir evento
        this.emit('gameOver', { score: this.score, waveNumber: this.waveNumber });

        // Mostrar pantalla de game over
        this.uiSystem.showGameOver();

        console.log('Game Over - Puntuación:', this.score);
    }

    /**
     * Maneja la victoria
     */
    victory() {
        this.isRunning = false;

        // Calcular bonificación
        const timeBonus = Math.max(0, 1000 - Math.floor(this.gameTime));
        const finalScore = this.score + timeBonus;

        // Actualizar puntuación máxima
        if (finalScore > this.highScore) {
            this.highScore = finalScore;
            this.saveHighScore();
        }

        // Emitir evento
        this.emit('victory', { score: finalScore, timeBonus });

        // Mostrar pantalla de victoria
        this.uiSystem.showVictory();

        console.log('Victoria - Puntuación final:', finalScore);
    }

    /**
     * Guarda la puntuación máxima
     */
    saveHighScore() {
        localStorage.setItem('shooter_arena_highscore', this.highScore.toString());
    }

    /**
     * Carga la puntuación máxima
     */
    loadHighScore() {
        const saved = localStorage.getItem('shooter_arena_highscore');
        if (saved) {
            this.highScore = parseInt(saved);
        }
    }

    /**
     * Añade puntos a la puntuación
     */
    addScore(points) {
        this.score += points;
        this.emit('scoreChanged', { score: this.score, points });
    }

    /**
     * Añade un event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Elimina un event listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emite un evento
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error en event listener:', error);
                }
            });
        }
    }

    /**
     * Obtiene estadísticas del juego
     */
    getStats() {
        return {
            gameTime: this.gameTime,
            score: this.score,
            highScore: this.highScore,
            waveNumber: this.waveNumber,
            enemiesKilled: this.player ? this.player.stats.kills : 0,
            shotsFired: this.player ? this.player.stats.shotsFired : 0,
            accuracy: this.player ? (this.player.stats.kills / Math.max(1, this.player.stats.shotsFired) * 100).toFixed(1) : 0
        };
    }
}

// Crear instancia global del juego
const game = new Game();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.Game = Game;
    window.game = game;
}