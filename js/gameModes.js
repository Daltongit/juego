/**
 * Sistema de modos de juego para Shooter Arena
 * Maneja diferentes modos y sus reglas
 */

class GameModeManager {
    constructor(game) {
        this.game = game;
        this.currentMode = null;
        this.modeInstance = null;
        this.modes = new Map();

        // Inicializar modos de juego
        this.initGameModes();

        console.log('Gestor de modos de juego inicializado');
    }

    /**
     * Inicializa los modos de juego disponibles
     */
    initGameModes() {
        // Registrar modos
        this.registerMode('deathmatch', DeathmatchMode);
        this.registerMode('team_deathmatch', TeamDeathmatchMode);
        this.registerMode('capture_flag', CaptureFlagMode);
        this.registerMode('survival', SurvivalMode);
        this.registerMode('zombies', ZombieMode);
        this.registerMode('arms_race', ArmsRaceMode);
    }

    /**
     * Registra un modo de juego
     */
    registerMode(modeId, modeClass) {
        this.modes.set(modeId, modeClass);
    }

    /**
     * Inicia un modo de juego
     */
    startMode(modeId, options = {}) {
        const ModeClass = this.modes.get(modeId);
        if (!ModeClass) {
            console.error(`Modo de juego no encontrado: ${modeId}`);
            return false;
        }

        // Detener modo actual
        if (this.modeInstance) {
            this.modeInstance.stop();
        }

        // Crear nueva instancia del modo
        this.modeInstance = new ModeClass(this.game, options);
        this.currentMode = modeId;

        // Iniciar modo
        this.modeInstance.start();

        // Emitir evento
        this.game.emit('gameModeStart', { mode: modeId, instance: this.modeInstance });

        console.log(`Modo de juego iniciado: ${modeId}`);
        return true;
    }

    /**
     * Detiene el modo actual
     */
    stopMode() {
        if (this.modeInstance) {
            this.modeInstance.stop();
            this.modeInstance = null;
            this.currentMode = null;

            this.game.emit('gameModeStop');
            console.log('Modo de juego detenido');
        }
    }

    /**
     * Obtiene el modo actual
     */
    getCurrentMode() {
        return {
            id: this.currentMode,
            instance: this.modeInstance
        };
    }

    /**
     * Obtiene la lista de modos disponibles
     */
    getAvailableModes() {
        return Array.from(this.modes.keys()).map(modeId => ({
            id: modeId,
            config: GameModeConfig.MODES[modeId]
        }));
    }
}

/**
 * Clase base para modos de juego
 */
class BaseGameMode {
    constructor(game, options = {}) {
        this.game = game;
        this.options = options;
        this.config = GameModeConfig.MODES[this.constructor.MODE_ID];
        this.active = false;
        this.startTime = 0;
        this.gameTime = 0;

        // Estado del juego
        this.teams = new Map();
        this.players = new Map();
        this.score = new Map();
        this.round = 1;
        this.winner = null;

        // Eventos
        this.listeners = new Map();
    }

    /**
     * Inicia el modo de juego
     */
    start() {
        this.active = true;
        this.startTime = Date.now();

        // Inicializar modo
        this.init();

        // Configurar eventos
        this.setupEvents();

        // Iniciar bucle del modo
        this.startGameLoop();

        console.log(`Modo ${this.constructor.MODE_ID} iniciado`);
    }

    /**
     * Detiene el modo de juego
     */
    stop() {
        this.active = false;

        // Limpiar eventos
        this.cleanupEvents();

        // Limpiar modo
        this.cleanup();

        console.log(`Modo ${this.constructor.MODE_ID} detenido`);
    }

    /**
     * Inicialización del modo (sobreescribir)
     */
    init() {
        // Implementar en subclases
    }

    /**
     * Limpieza del modo (sobreescribir)
     */
    cleanup() {
        // Implementar en subclases
    }

    /**
     * Configura los eventos del modo
     */
    setupEvents() {
        this.on('playerDeath', (data) => this.onPlayerDeath(data));
        this.on('enemyKilled', (data) => this.onEnemyKilled(data));
        this.on('gameTimeUpdate', (data) => this.onGameTimeUpdate(data));
    }

    /**
     * Limpia los eventos del modo
     */
    cleanupEvents() {
        this.listeners.clear();
    }

    /**
     * Inicia el bucle del modo
     */
    startGameLoop() {
        const gameLoop = () => {
            if (!this.active) return;

            // Actualizar tiempo
            this.updateGameTime();

            // Actualizar lógica del modo
            this.update();

            // Verificar condiciones de victoria
            this.checkWinConditions();

            // Continuar bucle
            requestAnimationFrame(gameLoop);
        };

        gameLoop();
    }

    /**
     * Actualiza el tiempo de juego
     */
    updateGameTime() {
        this.gameTime = Date.now() - this.startTime;
        this.game.emit('gameTimeUpdate', { time: this.gameTime });
    }

    /**
     * Actualiza la lógica del modo (sobreescribir)
     */
    update() {
        // Implementar en subclases
    }

    /**
     * Verifica condiciones de victoria (sobreescribir)
     */
    checkWinConditions() {
        // Implementar en subclases
    }

    /**
     * Maneja la muerte de un jugador (sobreescribir)
     */
    onPlayerDeath(data) {
        // Implementar en subclases
    }

    /**
     * Maneja la eliminación de un enemigo (sobreescribir)
     */
    onEnemyKilled(data) {
        // Implementar en subclases
    }

    /**
     * Maneja la actualización del tiempo (sobreescribir)
     */
    onGameTimeUpdate(data) {
        // Implementar en subclases
    }

    /**
     * Añade un event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        // Escuchar evento del juego
        this.game.on(event, callback);
    }

    /**
     * Remueve un event listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }

        // Dejar de escuchar evento del juego
        this.game.off(event, callback);
    }

    /**
     * Emite un evento del modo
     */
    emit(event, data) {
        this.game.emit(`gameMode:${event}`, data);
    }

    /**
     * Formatea el tiempo
     */
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Finaliza el juego con un ganador
     */
    endGame(winner, reason = '') {
        this.winner = winner;
        this.active = false;

        // Emitir evento de fin de juego
        this.game.emit('gameModeEnd', {
            mode: this.constructor.MODE_ID,
            winner: winner,
            reason: reason,
            duration: this.gameTime,
            scores: this.score
        });

        console.log(`Juego finalizado - Ganador: ${winner}, Razón: ${reason}`);
    }
}

/**
 * Modo Deathmatch
 */
class DeathmatchMode extends BaseGameMode {
    static MODE_ID = 'deathmatch';

    init() {
        // Configurar límite de puntuación
        this.scoreLimit = this.options.scoreLimit || this.config.scoreLimit;
        this.timeLimit = this.options.timeLimit || this.config.timeLimit * 1000;

        // Inicializar puntuación
        this.score.set('player', 0);
    }

    onPlayerDeath(data) {
        // Penalizar por muerte
        const currentScore = this.score.get('player') || 0;
        this.score.set('player', Math.max(0, currentScore - 5));

        // Respawnear jugador
        this.respawnPlayer();
    }

    onEnemyKilled(data) {
        // Añadir puntos por eliminación
        const currentScore = this.score.get('player') || 0;
        const points = data.points || 10;
        this.score.set('player', currentScore + points);

        // Verificar límite de puntuación
        if (this.score.get('player') >= this.scoreLimit) {
            this.endGame('player', 'Límite de puntuación alcanzado');
        }
    }

    onGameTimeUpdate(data) {
        // Verificar límite de tiempo
        if (this.timeLimit > 0 && data.time >= this.timeLimit) {
            // Determinar ganador por puntuación
            const winner = this.getScoreLeader();
            this.endGame(winner, 'Tiempo agotado');
        }
    }

    respawnPlayer() {
        setTimeout(() => {
            if (this.game.player) {
                const spawnPoint = this.game.map.spawnPoints[0];
                this.game.player.x = spawnPoint.x;
                this.game.player.y = spawnPoint.y;
                this.game.player.health = this.game.player.maxHealth;
                this.game.player.alive = true;
            }
        }, this.config.respawnTime);
    }

    getScoreLeader() {
        let leader = null;
        let maxScore = 0;

        for (const [player, score] of this.score) {
            if (score > maxScore) {
                maxScore = score;
                leader = player;
            }
        }

        return leader;
    }
}

/**
 * Modo Team Deathmatch
 */
class TeamDeathmatchMode extends BaseGameMode {
    static MODE_ID = 'team_deathmatch';

    init() {
        // Configurar equipos
        this.setupTeams();

        // Configurar límites
        this.scoreLimit = this.options.scoreLimit || this.config.scoreLimit;
        this.timeLimit = this.options.timeLimit || this.config.timeLimit * 1000;
    }

    setupTeams() {
        // Crear equipos
        this.teams.set('RED', {
            name: 'Equipo Rojo',
            color: '#ff4444',
            score: 0,
            spawns: [this.game.map.spawnPoints[0]]
        });

        this.teams.set('BLUE', {
            name: 'Equipo Azul',
            color: '#4444ff',
            score: 0,
            spawns: [this.game.map.spawnPoints[1]]
        });

        // Asignar jugador a un equipo
        this.assignPlayerToTeam('player', 'RED');
    }

    assignPlayerToTeam(playerId, teamId) {
        this.players.set(playerId, {
            team: teamId,
            kills: 0,
            deaths: 0
        });
    }

    onPlayerDeath(data) {
        const player = this.players.get('player');
        if (player) {
            player.deaths++;

            // Respawnear en base del equipo
            this.respawnPlayer(player.team);
        }
    }

    onEnemyKilled(data) {
        const player = this.players.get('player');
        if (player) {
            player.kills++;

            // Añadir puntos al equipo
            const team = this.teams.get(player.team);
            if (team) {
                team.score += data.points || 10;

                // Verificar victoria
                if (team.score >= this.scoreLimit) {
                    this.endGame(player.team, 'Límite de puntuación alcanzado');
                }
            }
        }
    }

    respawnPlayer(teamId) {
        const team = this.teams.get(teamId);
        if (team && team.spawns.length > 0) {
            const spawn = team.spawns[0];

            setTimeout(() => {
                if (this.game.player) {
                    this.game.player.x = spawn.x;
                    this.game.player.y = spawn.y;
                    this.game.player.health = this.game.player.maxHealth;
                    this.game.player.alive = true;
                }
            }, this.config.respawnTime);
        }
    }
}

/**
 * Modo Capture the Flag
 */
class CaptureFlagMode extends BaseGameMode {
    static MODE_ID = 'capture_flag';

    init() {
        // Configurar equipos
        this.setupTeams();

        // Crear banderas
        this.createFlags();

        // Configurar puntuación
        this.scoreLimit = this.options.scoreLimit || this.config.scoreLimit;
    }

    setupTeams() {
        this.teams.set('RED', {
            name: 'Equipo Rojo',
            color: '#ff4444',
            score: 0,
            flag: null,
            base: { x: 100, y: 350 }
        });

        this.teams.set('BLUE', {
            name: 'Equipo Azul',
            color: '#4444ff',
            score: 0,
            flag: null,
            base: { x: 1100, y: 350 }
        });
    }

    createFlags() {
        // Crear banderas
        for (const [teamId, team] of this.teams) {
            team.flag = {
                team: teamId,
                x: team.base.x,
                y: team.base.y,
                held: false,
                holder: null,
                atBase: true
            };
        }
    }

    update() {
        // Verificar captura de banderas
        this.checkFlagCapture();

        // Verificar retorno de bandera
        this.checkFlagReturn();
    }

    checkFlagCapture() {
        if (!this.game.player || !this.game.player.alive) return;

        for (const [teamId, team] of this.teams) {
            const flag = team.flag;

            // No capturar propia bandera
            if (flag.team === 'RED') continue; // Asumir que jugador es del equipo rojo

            // Verificar si el jugador está cerca de la bandera enemiga
            const distance = Math.hypot(flag.x - this.game.player.x, flag.y - this.game.player.y);

            if (distance < 50 && !flag.held && flag.atBase) {
                // Capturar bandera
                this.captureFlag(flag);
            }
        }
    }

    captureFlag(flag) {
        flag.held = true;
        flag.holder = 'player';
        flag.atBase = false;

        this.game.emit('flagCaptured', { flag: flag.team });
        console.log(`Bandera ${flag.team} capturada`);
    }

    checkFlagReturn() {
        if (!this.game.player || !this.game.player.alive) return;

        // Verificar si el jugador tiene una bandera
        for (const [teamId, team] of this.teams) {
            const flag = team.flag;

            if (flag.held && flag.holder === 'player') {
                // Verificar si está en su base
                const base = this.teams.get('RED').base;
                const distance = Math.hypot(base.x - this.game.player.x, base.y - this.game.player.y);

                if (distance < 100) {
                    // Retornar bandera y anotar punto
                    this.scoreFlag(flag);
                }
            }
        }
    }

    scoreFlag(flag) {
        // Anotar punto
        const scoringTeam = 'RED'; // Equipo del jugador
        const team = this.teams.get(scoringTeam);
        if (team) {
            team.score++;

            // Verificar victoria
            if (team.score >= this.scoreLimit) {
                this.endGame(scoringTeam, 'Límite de capturas alcanzado');
            }
        }

        // Resetear bandera
        flag.held = false;
        flag.holder = null;
        flag.atBase = true;
        flag.x = this.teams.get(flag.team).base.x;
        flag.y = this.teams.get(flag.team).base.y;

        this.game.emit('flagScored', { flag: flag.team, scorer: scoringTeam });
        console.log(`Bandera ${flag.team} anotada`);
    }
}

/**
 * Modo Survival
 */
class SurvivalMode extends BaseGameMode {
    static MODE_ID = 'survival';

    init() {
        // Configuración de oleadas
        this.currentWave = 0;
        this.waveDelay = GameModeConfig.WAVES.START_DELAY;
        this.enemiesPerWave = 10;
        this.waveEnemies = [];
        this.waveActive = false;
        this.waveComplete = false;

        // Estadísticas
        this.totalEnemiesKilled = 0;
        this.wavesSurvived = 0;
    }

    update() {
        // Gestionar oleadas
        this.manageWaves();

        // Verificar si todos los enemigos fueron eliminados
        if (this.waveActive && this.game.enemies.length === 0) {
            this.completeWave();
        }
    }

    manageWaves() {
        if (!this.waveActive && !this.waveComplete) {
            // Iniciar nueva oleada
            setTimeout(() => {
                this.startWave();
            }, this.waveDelay);
        }
    }

    startWave() {
        this.currentWave++;
        this.waveActive = true;
        this.waveComplete = false;

        // Calcular cantidad de enemigos
        this.enemiesPerWave = Math.min(
            EnemyConfig.SPAWNING.ENEMY_PER_WAVE + (this.currentWave - 1) * 2,
            EnemyConfig.SPAWNING.MAX_ENEMIES
        );

        // Spawnear enemigos
        this.spawnWaveEnemies();

        this.game.emit('waveStart', { wave: this.currentWave, enemies: this.enemiesPerWave });
        console.log(`Oleada ${this.currentWave} iniciada`);
    }

    spawnWaveEnemies() {
        for (let i = 0; i < this.enemiesPerWave; i++) {
            setTimeout(() => {
                this.spawnWaveEnemy();
            }, i * 1000);
        }

        // Spawnear jefe cada ciertas oleadas
        if (this.currentWave % EnemyConfig.SPAWNING.BOSS_WAVE_INTERVAL === 0) {
            setTimeout(() => {
                this.spawnBoss();
            }, this.enemiesPerWave * 1000);
        }
    }

    spawnWaveEnemy() {
        const spawnPoint = this.getRandomSpawnPoint();
        const enemyType = this.getRandomEnemyType();

        const enemy = new Enemy(spawnPoint.x, spawnPoint.y, enemyType, this.game);
        this.game.enemies.push(enemy);
        this.waveEnemies.push(enemy);
    }

    spawnBoss() {
        const spawnPoint = this.getRandomSpawnPoint();
        const boss = new Enemy(spawnPoint.x, spawnPoint.y, 'BOSS', this.game);
        this.game.enemies.push(boss);
        this.waveEnemies.push(boss);

        this.game.emit('bossSpawn', { wave: this.currentWave });
    }

    getRandomSpawnPoint() {
        const validSpawns = this.game.map.spawnPoints.filter(spawn => {
            const dist = Math.hypot(spawn.x - this.game.player.x, spawn.y - this.game.player.y);
            return dist > 200;
        });

        return validSpawns[Math.floor(Math.random() * validSpawns.length)];
    }

    getRandomEnemyType() {
        const types = ['GRUNT', 'HEAVY', 'SNIPER', 'FAST'];
        const weights = [0.4, 0.2, 0.2, 0.2];

        // Aumentar dificultad con oleadas
        const difficultyMultiplier = 1 + (this.currentWave - 1) * 0.1;

        // Ajustar pesos
        for (let i = 0; i < weights.length; i++) {
            if (i < 2) { // Enemigos más difíciles
                weights[i] = Math.min(0.4, weights[i] * difficultyMultiplier);
            } else {
                weights[i] = Math.max(0.1, weights[i] / difficultyMultiplier);
            }
        }

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

    completeWave() {
        this.waveActive = false;
        this.waveComplete = true;
        this.wavesSurvived++;

        // Recompensa de oleada
        this.giveWaveReward();

        // Preparar siguiente oleada
        setTimeout(() => {
            this.waveComplete = false;
        }, GameModeConfig.WAVES.REWARD_TIME);

        this.game.emit('waveComplete', { wave: this.currentWave });
        console.log(`Oleada ${this.currentWave} completada`);
    }

    giveWaveReward() {
        // Curar al jugador
        if (this.game.player) {
            this.game.player.health = Math.min(
                this.game.player.maxHealth,
                this.game.player.health + 25
            );
        }

        // Spawnear power-ups
        const powerUpCount = Math.min(3, Math.floor(this.currentWave / 2));
        for (let i = 0; i < powerUpCount; i++) {
            const x = Math.random() * this.game.map.width;
            const y = Math.random() * this.game.map.height;
            this.game.spawnPowerUp(x, y);
        }
    }

    onPlayerDeath(data) {
        // Fin del juego en modo supervivencia
        this.endGame(null, 'El jugador ha muerto');
    }

    onEnemyKilled(data) {
        this.totalEnemiesKilled++;
    }
}

/**
 * Modo Zombies
 */
class ZombieMode extends BaseGameMode {
    static MODE_ID = 'zombies';

    init() {
        // Configuración de zombis
        this.zombieWave = 1;
        this.zombiesPerWave = 5;
        this.specialZombieChance = 0.1;
        this.infectionDamage = 1;

        // Estado de infección
        this.infected = false;
        this.infectionTime = 0;
        this.infectionDuration = 10000; // 10 segundos

        // Último humano
        this.lastHumanStanding = null;
    }

    update() {
        // Actualizar infección
        if (this.infected) {
            this.updateInfection();
        }

        // Gestionar oleadas de zombis
        this.manageZombieWaves();

        // Verificar si todos son zombis
        this.checkAllInfected();
    }

    updateInfection() {
        this.infectionTime += 16; // Asumiendo 60 FPS

        if (this.infectionTime >= this.infectionDuration) {
            // Convertir a zombi
            this.convertToZombie();
        }

        // Daño por infección
        if (this.game.player && this.game.player.alive) {
            this.game.player.takeDamage(this.infectionDamage * 0.016, 'infection');
        }
    }

    convertToZombie() {
        if (this.game.player) {
            // Efectos de conversión
            this.game.particleSystem.emit('blood', this.game.player.x, this.game.player.y, 20);

            // Convertir (en un juego multijugador, cambiaría de equipo)
            this.game.player.health = 0;
            this.game.player.alive = false;

            this.game.emit('playerInfected', { player: 'player' });
        }
    }

    manageZombieWaves() {
        // Spawnear zombis periódicamente
        if (Math.random() < 0.01) {
            this.spawnZombie();
        }
    }

    spawnZombie() {
        const spawnPoint = this.getRandomEdgeSpawn();
        const isSpecial = Math.random() < this.specialZombieChance;

        const zombieType = isSpecial ? 'FAST' : 'GRUNT';
        const zombie = new Enemy(spawnPoint.x, spawnPoint.y, zombieType, this.game);

        // Modificar para que parezca zombi
        zombie.config.color = '#00ff00';
        zombie.speed *= 0.8; // Más lento pero persistente
        zombie.damage = 5; // Menos daño pero infecta

        this.game.enemies.push(zombie);
    }

    getRandomEdgeSpawn() {
        const edge = Math.floor(Math.random() * 4);
        let x, y;

        switch (edge) {
            case 0: // Arriba
                x = Math.random() * this.game.map.width;
                y = 50;
                break;
            case 1: // Derecha
                x = this.game.map.width - 50;
                y = Math.random() * this.game.map.height;
                break;
            case 2: // Abajo
                x = Math.random() * this.game.map.width;
                y = this.game.map.height - 50;
                break;
            case 3: // Izquierda
                x = 50;
                y = Math.random() * this.game.map.height;
                break;
        }

        return { x, y };
    }

    checkAllInfected() {
        // En modo un jugador, verificar si el jugador fue infectado
        if (!this.game.player || !this.game.player.alive) {
            this.endGame('zombies', 'La infección se ha propagado');
        }
    }

    onPlayerDeath(data) {
        // Iniciar infección si la causa fue un zombi
        if (data.source === 'zombie') {
            this.infected = true;
            this.infectionTime = 0;
        }
    }
}

/**
 * Modo Arms Race
 */
class ArmsRaceMode extends BaseGameMode {
    static MODE_ID = 'arms_race';

    init() {
        // Configurar progresión de armas
        this.weaponProgression = [
            'pistol', 'smg', 'shotgun', 'rifle', 'sniper'
        ];
        this.currentWeaponIndex = 0;
        this.killsWithCurrentWeapon = 0;
        this.killsNeededForNext = 2;

        // Dar arma inicial
        this.giveNextWeapon();
    }

    onEnemyKilled(data) {
        this.killsWithCurrentWeapon++;

        // Verificar si se necesita siguiente arma
        if (this.killsWithCurrentWeapon >= this.killsNeededForNext) {
            this.progressToNextWeapon();
        }
    }

    progressToNextWeapon() {
        this.currentWeaponIndex++;
        this.killsWithCurrentWeapon = 0;

        if (this.currentWeaponIndex >= this.weaponProgression.length) {
            // Última arma (cuchillo)
            this.killsNeededForNext = 1;
            this.giveKnife();
        } else {
            // Siguiente arma
            this.giveNextWeapon();
            this.killsNeededForNext = 2;
        }

        this.game.emit('weaponProgression', {
            weapon: this.getCurrentWeapon(),
            index: this.currentWeaponIndex
        });
    }

    giveNextWeapon() {
        if (this.currentWeaponIndex < this.weaponProgression.length) {
            const weaponId = this.weaponProgression[this.currentWeaponIndex];
            this.game.player.switchWeapon(weaponId);

            // Llenar munición
            const weapon = this.game.player.weapons[weaponId];
            weapon.currentAmmo = weapon.magazineSize;
            weapon.reserveAmmo = weapon.magazineSize * 3;
        }
    }

    giveKnife() {
        // Implementar arma cuchillo
        this.game.emit('knifeUnlocked');
    }

    getCurrentWeapon() {
        if (this.currentWeaponIndex >= this.weaponProgression.length) {
            return 'knife';
        }
        return this.weaponProgression[this.currentWeaponIndex];
    }

    onPlayerDeath(data) {
        // Resetear progreso al morir
        this.currentWeaponIndex = 0;
        this.killsWithCurrentWeapon = 0;
        this.giveNextWeapon();
    }

    checkWinConditions() {
        // Verificar si se mató con el cuchillo
        if (this.currentWeaponIndex >= this.weaponProgression.length &&
            this.killsWithCurrentWeapon >= this.killsNeededForNext) {
            this.endGame('player', 'Victoria con cuchillo');
        }
    }
}

// Exportar clases
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameModeManager,
        BaseGameMode,
        DeathmatchMode,
        TeamDeathmatchMode,
        CaptureFlagMode,
        SurvivalMode,
        ZombieMode,
        ArmsRaceMode
    };
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.GameModeManager = GameModeManager;
    window.BaseGameMode = BaseGameMode;
    window.DeathmatchMode = DeathmatchMode;
    window.TeamDeathmatchMode = TeamDeathmatchMode;
    window.CaptureFlagMode = CaptureFlagMode;
    window.SurvivalMode = SurvivalMode;
    window.ZombieMode = ZombieMode;
    window.ArmsRaceMode = ArmsRaceMode;
}