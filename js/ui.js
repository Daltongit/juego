/**
 * Sistema de interfaz de usuario para Shooter Arena
 * Maneja HUD, menús, notificaciones y elementos visuales
 */

class UISystem {
    constructor(game) {
        this.game = game;
        this.elements = new Map();
        this.notifications = [];
        this.maxNotifications = UIConfig.NOTIFICATIONS.MAX_VISIBLE;
        this.screens = new Map();
        this.currentScreen = null;

        // Estado del HUD
        this.hudVisible = true;
        this.crosshairVisible = true;
        this.minimapVisible = true;

        // Animaciones
        this.animations = new Map();

        // Inicializar UI
        this.init();

        console.log('Sistema de UI inicializado');
    }

    /**
     * Inicializa el sistema de UI
     */
    init() {
        // Crear elementos del HUD
        this.createHUD();

        // Crear pantallas
        this.createScreens();

        // Configurar eventos
        this.setupEvents();

        // Cargar configuración
        this.loadSettings();
    }

    /**
     * Crea los elementos del HUD
     */
    createHUD() {
        // Contenedor principal del HUD
        const hudContainer = document.createElement('div');
        hudContainer.id = 'hud';
        hudContainer.className = 'hud';
        document.body.appendChild(hudContainer);

        // Barra de salud
        this.createHealthBar(hudContainer);

        // Barra de armadura
        this.createArmorBar(hudContainer);

        // Barra de energía
        this.createEnergyBar(hudContainer);

        // Información de munición
        this.createAmmoDisplay(hudContainer);

        // Minimapa
        this.createMinimap(hudContainer);

        // Contador de kills
        this.createKillCounter(hudContainer);

        // Temporizador
        this.createTimer(hudContainer);

        // Puntuación
        this.createScoreDisplay(hudContainer);

        // Mira
        this.createCrosshair();

        // Efectos de daño
        this.createDamageEffects();
    }

    /**
     * Crea la barra de salud
     */
    createHealthBar(container) {
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        healthBar.innerHTML = `
            <div class="bar-label">SALUD</div>
            <div class="bar-container">
                <div class="bar-fill health-fill"></div>
                <div class="bar-text">100/100</div>
            </div>
        `;
        container.appendChild(healthBar);
        this.elements.set('healthBar', healthBar);
    }

    /**
     * Crea la barra de armadura
     */
    createArmorBar(container) {
        const armorBar = document.createElement('div');
        armorBar.className = 'armor-bar';
        armorBar.innerHTML = `
            <div class="bar-label">ARMADURA</div>
            <div class="bar-container">
                <div class="bar-fill armor-fill"></div>
                <div class="bar-text">0/100</div>
            </div>
        `;
        container.appendChild(armorBar);
        this.elements.set('armorBar', armorBar);
    }

    /**
     * Crea la barra de energía
     */
    createEnergyBar(container) {
        const energyBar = document.createElement('div');
        energyBar.className = 'energy-bar';
        energyBar.innerHTML = `
            <div class="bar-label">ENERGÍA</div>
            <div class="bar-container">
                <div class="bar-fill energy-fill"></div>
                <div class="bar-text">100/100</div>
            </div>
        `;
        container.appendChild(energyBar);
        this.elements.set('energyBar', energyBar);
    }

    /**
     * Crea el display de munición
     */
    createAmmoDisplay(container) {
        const ammoDisplay = document.createElement('div');
        ammoDisplay.className = 'ammo-display';
        ammoDisplay.innerHTML = `
            <div class="ammo-current">12</div>
            <div class="ammo-separator">/</div>
            <div class="ammo-reserve">36</div>
            <div class="weapon-name">PISTOLA</div>
        `;
        container.appendChild(ammoDisplay);
        this.elements.set('ammoDisplay', ammoDisplay);
    }

    /**
     * Crea el minimapa
     */
    createMinimap(container) {
        const minimap = document.createElement('div');
        minimap.className = 'minimap';
        minimap.innerHTML = `
            <canvas id="minimap-canvas" width="150" height="150"></canvas>
            <div class="minimap-border"></div>
        `;
        container.appendChild(minimap);
        this.elements.set('minimap', minimap);

        // Configurar canvas del minimapa
        const canvas = minimap.querySelector('#minimap-canvas');
        this.minimapCtx = canvas.getContext('2d');
    }

    /**
     * Crea el contador de kills
     */
    createKillCounter(container) {
        const killCounter = document.createElement('div');
        killCounter.className = 'kill-counter';
        killCounter.innerHTML = `
            <div class="kill-label">KILLS</div>
            <div class="kill-count">0</div>
        `;
        container.appendChild(killCounter);
        this.elements.set('killCounter', killCounter);
    }

    /**
     * Crea el temporizador
     */
    createTimer(container) {
        const timer = document.createElement('div');
        timer.className = 'timer';
        timer.innerHTML = `
            <div class="timer-label">TIEMPO</div>
            <div class="timer-time">00:00</div>
        `;
        container.appendChild(timer);
        this.elements.set('timer', timer);
    }

    /**
     * Crea el display de puntuación
     */
    createScoreDisplay(container) {
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'score-display';
        scoreDisplay.innerHTML = `
            <div class="score-label">PUNTUACIÓN</div>
            <div class="score-value">0</div>
        `;
        container.appendChild(scoreDisplay);
        this.elements.set('scoreDisplay', scoreDisplay);
    }

    /**
     * Crea la mira
     */
    createCrosshair() {
        const crosshair = document.createElement('div');
        crosshair.className = 'crosshair';
        crosshair.innerHTML = `
            <div class="crosshair-line horizontal"></div>
            <div class="crosshair-line vertical"></div>
            <div class="crosshair-dot"></div>
        `;
        document.body.appendChild(crosshair);
        this.elements.set('crosshair', crosshair);
    }

    /**
     * Crea los efectos de daño
     */
    createDamageEffects() {
        const damageOverlay = document.createElement('div');
        damageOverlay.className = 'damage-overlay';
        damageOverlay.style.opacity = '0';
        document.body.appendChild(damageOverlay);
        this.elements.set('damageOverlay', damageOverlay);
    }

    /**
     * Crea las pantallas del juego
     */
    createScreens() {
        // Pantalla de menu principal
        this.createMainMenu();

        // Pantalla de game over
        this.createGameOverScreen();

        // Pantalla de victoria
        this.createVictoryScreen();

        // Pantalla de pausa
        this.createPauseScreen();

        // Pantalla de carga
        this.createLoadingScreen();
    }

    /**
     * Crea la pantalla de menu principal
     */
    createMainMenu() {
        const mainMenu = document.createElement('div');
        mainMenu.className = 'screen main-menu';
        mainMenu.innerHTML = `
            <div class="menu-container">
                <h1 class="game-title">SHOOTER ARENA</h1>
                <div class="menu-buttons">
                    <button class="menu-btn primary" data-action="start">JUGAR</button>
                    <button class="menu-btn" data-action="modes">MODOS DE JUEGO</button>
                    <button class="menu-btn" data-action="leaderboard">TABLA DE POSICIONES</button>
                    <button class="menu-btn" data-action="settings">CONFIGURACIÓN</button>
                    <button class="menu-btn" data-action="quit">SALIR</button>
                </div>
            </div>
        `;
        document.body.appendChild(mainMenu);
        this.screens.set('mainMenu', mainMenu);

        // Configurar eventos
        this.setupMenuEvents(mainMenu);
    }

    /**
     * Crea la pantalla de game over
     */
    createGameOverScreen() {
        const gameOverScreen = document.createElement('div');
        gameOverScreen.className = 'screen game-over';
        gameOverScreen.innerHTML = `
            <div class="screen-container">
                <h2 class="screen-title">GAME OVER</h2>
                <div class="stats-container">
                    <div class="stat-item">
                        <span class="stat-label">Puntuación:</span>
                        <span class="stat-value" id="final-score">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Kills:</span>
                        <span class="stat-value" id="final-kills">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tiempo:</span>
                        <span class="stat-value" id="final-time">00:00</span>
                    </div>
                </div>
                <div class="screen-buttons">
                    <button class="menu-btn primary" data-action="retry">REINTENTAR</button>
                    <button class="menu-btn" data-action="menu">MENÚ PRINCIPAL</button>
                </div>
            </div>
        `;
        document.body.appendChild(gameOverScreen);
        this.screens.set('gameOver', gameOverScreen);

        this.setupMenuEvents(gameOverScreen);
    }

    /**
     * Crea la pantalla de victoria
     */
    createVictoryScreen() {
        const victoryScreen = document.createElement('div');
        victoryScreen.className = 'screen victory';
        victoryScreen.innerHTML = `
            <div class="screen-container">
                <h2 class="screen-title">¡VICTORIA!</h2>
                <div class="stats-container">
                    <div class="stat-item">
                        <span class="stat-label">Puntuación Final:</span>
                        <span class="stat-value" id="victory-score">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Bonificación de Tiempo:</span>
                        <span class="stat-value" id="time-bonus">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total:</span>
                        <span class="stat-value" id="total-score">0</span>
                    </div>
                </div>
                <div class="screen-buttons">
                    <button class="menu-btn primary" data-action="next">SIGUIENTE NIVEL</button>
                    <button class="menu-btn" data-action="menu">MENÚ PRINCIPAL</button>
                </div>
            </div>
        `;
        document.body.appendChild(victoryScreen);
        this.screens.set('victory', victoryScreen);

        this.setupMenuEvents(victoryScreen);
    }

    /**
     * Crea la pantalla de pausa
     */
    createPauseScreen() {
        const pauseScreen = document.createElement('div');
        pauseScreen.className = 'screen pause';
        pauseScreen.innerHTML = `
            <div class="screen-container">
                <h2 class="screen-title">PAUSA</h2>
                <div class="screen-buttons">
                    <button class="menu-btn primary" data-action="resume">REANUDAR</button>
                    <button class="menu-btn" data-action="restart">REINICIAR</button>
                    <button class="menu-btn" data-action="menu">MENÚ PRINCIPAL</button>
                </div>
            </div>
        `;
        document.body.appendChild(pauseScreen);
        this.screens.set('pause', pauseScreen);

        this.setupMenuEvents(pauseScreen);
    }

    /**
     * Crea la pantalla de carga
     */
    createLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'screen loading';
        loadingScreen.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">CARGANDO...</div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">0%</div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingScreen);
        this.screens.set('loading', loadingScreen);
    }

    /**
     * Configura los eventos de los menús
     */
    setupMenuEvents(menu) {
        const buttons = menu.querySelectorAll('[data-action]');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleMenuAction(action);
            });
        });
    }

    /**
     * Maneja las acciones de los menús
     */
    handleMenuAction(action) {
        switch (action) {
            case 'start':
                this.hideScreen('mainMenu');
                this.game.start('deathmatch');
                break;
            case 'modes':
                this.showGameModes();
                break;
            case 'leaderboard':
                this.showLeaderboard();
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'quit':
                this.quitGame();
                break;
            case 'retry':
                this.hideScreen('gameOver');
                this.game.start(this.game.gameMode);
                break;
            case 'next':
                this.hideScreen('victory');
                this.game.start(this.game.gameMode);
                break;
            case 'resume':
                this.hideScreen('pause');
                this.game.togglePause();
                break;
            case 'restart':
                this.hideScreen('pause');
                this.game.stop();
                this.game.start(this.game.gameMode);
                break;
            case 'menu':
                this.hideAllScreens();
                this.game.stop();
                this.showScreen('mainMenu');
                break;
        }
    }

    /**
     * Configura los eventos del juego
     */
    setupEvents() {
        // Eventos del juego
        this.game.on('gameStart', () => this.onGameStart());
        this.game.on('gameStop', () => this.onGameStop());
        this.game.on('gamePaused', () => this.onGamePaused());
        this.game.on('gameResumed', () => this.onGameResumed());
        this.game.on('gameOver', (data) => this.onGameOver(data));
        this.game.on('victory', (data) => this.onVictory(data));

        // Eventos del jugador
        this.game.on('playerDamage', () => this.onPlayerDamage());
        this.game.on('playerDeath', () => this.onPlayerDeath());
        this.game.on('weaponSwitch', (data) => this.onWeaponSwitch(data));
        this.game.on('ammoChange', (data) => this.onAmmoChange(data));

        // Eventos de puntuación
        this.game.on('scoreChanged', (data) => this.onScoreChanged(data));

        // Eventos de teclado
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    /**
     * Actualiza la UI
     */
    update() {
        if (!this.game.isRunning) return;

        // Actualizar HUD
        this.updateHUD();

        // Actualizar minimapa
        this.updateMinimap();

        // Actualizar notificaciones
        this.updateNotifications();

        // Actualizar animaciones
        this.updateAnimations();
    }

    /**
     * Actualiza el HUD
     */
    updateHUD() {
        if (!this.game.player) return;

        const player = this.game.player;

        // Actualizar barra de salud
        this.updateHealthBar(player.health, player.maxHealth);

        // Actualizar barra de armadura
        this.updateArmorBar(player.armor, player.maxArmor);

        // Actualizar barra de energía
        this.updateEnergyBar(player.energy, player.maxEnergy);

        // Actualizar display de munición
        this.updateAmmoDisplay(player);

        // Actualizar contador de kills
        this.updateKillCounter(player.stats.kills);

        // Actualizar temporizador
        this.updateTimer(this.game.gameTime);

        // Actualizar puntuación
        this.updateScoreDisplay(this.game.score);
    }

    /**
     * Actualiza la barra de salud
     */
    updateHealthBar(current, max) {
        const healthBar = this.elements.get('healthBar');
        if (!healthBar) return;

        const fill = healthBar.querySelector('.health-fill');
        const text = healthBar.querySelector('.bar-text');

        const percent = (current / max) * 100;
        fill.style.width = `${percent}%`;
        text.textContent = `${Math.ceil(current)}/${max}`;

        // Cambiar color según salud
        if (percent > 60) {
            fill.style.backgroundColor = '#00ff00';
        } else if (percent > 30) {
            fill.style.backgroundColor = '#ffff00';
        } else {
            fill.style.backgroundColor = '#ff0000';
        }
    }

    /**
     * Actualiza la barra de armadura
     */
    updateArmorBar(current, max) {
        const armorBar = this.elements.get('armorBar');
        if (!armorBar) return;

        const fill = armorBar.querySelector('.armor-fill');
        const text = armorBar.querySelector('.bar-text');

        const percent = (current / max) * 100;
        fill.style.width = `${percent}%`;
        text.textContent = `${Math.ceil(current)}/${max}`;
    }

    /**
     * Actualiza la barra de energía
     */
    updateEnergyBar(current, max) {
        const energyBar = this.elements.get('energyBar');
        if (!energyBar) return;

        const fill = energyBar.querySelector('.energy-fill');
        const text = energyBar.querySelector('.bar-text');

        const percent = (current / max) * 100;
        fill.style.width = `${percent}%`;
        text.textContent = `${Math.ceil(current)}/${max}`;
    }

    /**
     * Actualiza el display de munición
     */
    updateAmmoDisplay(player) {
        const ammoDisplay = this.elements.get('ammoDisplay');
        if (!ammoDisplay || !player.currentWeapon) return;

        const weapon = player.weapons[player.currentWeapon];
        const current = ammoDisplay.querySelector('.ammo-current');
        const reserve = ammoDisplay.querySelector('.ammo-reserve');
        const weaponName = ammoDisplay.querySelector('.weapon-name');

        current.textContent = weapon.currentAmmo;
        reserve.textContent = weapon.reserveAmmo;
        weaponName.textContent = weapon.name.toUpperCase();

        // Cambiar color si la munición está baja
        if (weapon.currentAmmo <= weapon.magazineSize * 0.25) {
            current.style.color = '#ff0000';
        } else {
            current.style.color = '#ffffff';
        }
    }

    /**
     * Actualiza el contador de kills
     */
    updateKillCounter(kills) {
        const killCounter = this.elements.get('killCounter');
        if (!killCounter) return;

        const count = killCounter.querySelector('.kill-count');
        count.textContent = kills;

        // Animación
        this.animateValue(count, parseInt(count.textContent) || 0, kills, 500);
    }

    /**
     * Actualiza el temporizador
     */
    updateTimer(time) {
        const timer = this.elements.get('timer');
        if (!timer) return;

        const timeDisplay = timer.querySelector('.timer-time');
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Actualiza el display de puntuación
     */
    updateScoreDisplay(score) {
        const scoreDisplay = this.elements.get('scoreDisplay');
        if (!scoreDisplay) return;

        const value = scoreDisplay.querySelector('.score-value');
        value.textContent = score;

        // Animación
        this.animateValue(value, parseInt(value.textContent) || 0, score, 300);
    }

    /**
     * Actualiza el minimapa
     */
    updateMinimap() {
        if (!this.minimapVisible || !this.minimapCtx) return;

        const ctx = this.minimapCtx;
        const width = 150;
        const height = 150;

        // Limpiar canvas
        ctx.clearRect(0, 0, width, height);

        // Fondo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Calcular escala
        const scaleX = width / this.game.map.width;
        const scaleY = height / this.game.map.height;

        // Dibujar jugador
        if (this.game.player && this.game.player.alive) {
            const playerX = this.game.player.x * scaleX;
            const playerY = this.game.player.y * scaleY;

            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Dirección del jugador
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playerX, playerY);
            ctx.lineTo(
                playerX + Math.cos(this.game.player.rotation) * 8,
                playerY + Math.sin(this.game.player.rotation) * 8
            );
            ctx.stroke();
        }

        // Dibujar enemigos
        ctx.fillStyle = '#ff0000';
        for (const enemy of this.game.enemies) {
            if (!enemy.alive) continue;

            const enemyX = enemy.x * scaleX;
            const enemyY = enemy.y * scaleY;

            ctx.beginPath();
            ctx.arc(enemyX, enemyY, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dibujar power-ups
        ctx.fillStyle = '#ffff00';
        for (const powerUp of this.game.powerUps) {
            if (!powerUp.active) continue;

            const powerUpX = powerUp.x * scaleX;
            const powerUpY = powerUp.y * scaleY;

            ctx.beginPath();
            ctx.arc(powerUpX, powerUpY, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Borde
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
    }

    /**
     * Muestra una notificación
     */
    showNotification(message, type = 'info', duration = UIConfig.NOTIFICATIONS.DURATION) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Añadir icono según tipo
        const typeConfig = UIConfig.NOTIFICATIONS.TYPES[type];
        if (typeConfig) {
            const icon = document.createElement('span');
            icon.className = 'notification-icon';
            icon.textContent = typeConfig.icon;
            notification.insertBefore(icon, notification.firstChild);
        }

        // Añadir al DOM
        document.body.appendChild(notification);

        // Limitar notificaciones visibles
        if (this.notifications.length >= this.maxNotifications) {
            const oldNotification = this.notifications.shift();
            this.hideNotification(oldNotification);
        }

        this.notifications.push(notification);

        // Animar entrada
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Ocultar automáticamente
        setTimeout(() => {
            this.hideNotification(notification);
        }, duration);
    }

    /**
     * Oculta una notificación
     */
    hideNotification(notification) {
        notification.classList.remove('show');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }

            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    /**
     * Muestra un efecto de daño
     */
    showDamageEffect() {
        const damageOverlay = this.elements.get('damageOverlay');
        if (!damageOverlay) return;

        damageOverlay.style.opacity = '0.5';

        setTimeout(() => {
            damageOverlay.style.opacity = '0';
        }, 200);
    }

    /**
     * Muestra la pantalla de game over
     */
    showGameOver() {
        const stats = this.game.getStats();

        // Actualizar estadísticas
        const finalScore = document.getElementById('final-score');
        const finalKills = document.getElementById('final-kills');
        const finalTime = document.getElementById('final-time');

        if (finalScore) finalScore.textContent = stats.score;
        if (finalKills) finalKills.textContent = stats.enemiesKilled;
        if (finalTime) finalTime.textContent = this.formatTime(stats.gameTime);

        this.showScreen('gameOver');
    }

    /**
     * Muestra la pantalla de victoria
     */
    showVictory() {
        const stats = this.game.getStats();
        const timeBonus = Math.max(0, 1000 - Math.floor(stats.gameTime));
        const totalScore = stats.score + timeBonus;

        // Actualizar estadísticas
        const victoryScore = document.getElementById('victory-score');
        const timeBonusEl = document.getElementById('time-bonus');
        const totalScoreEl = document.getElementById('total-score');

        if (victoryScore) victoryScore.textContent = stats.score;
        if (timeBonusEl) timeBonusEl.textContent = timeBonus;
        if (totalScoreEl) totalScoreEl.textContent = totalScore;

        this.showScreen('victory');
    }

    /**
     * Muestra una pantalla
     */
    showScreen(screenId) {
        this.hideAllScreens();

        const screen = this.screens.get(screenId);
        if (screen) {
            screen.style.display = 'flex';
            this.currentScreen = screenId;

            // Animar entrada
            setTimeout(() => {
                screen.classList.add('show');
            }, 10);
        }
    }

    /**
     * Oculta una pantalla
     */
    hideScreen(screenId) {
        const screen = this.screens.get(screenId);
        if (screen) {
            screen.classList.remove('show');

            setTimeout(() => {
                screen.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Oculta todas las pantallas
     */
    hideAllScreens() {
        for (const screen of this.screens.values()) {
            screen.classList.remove('show');
            screen.style.display = 'none';
        }
        this.currentScreen = null;
    }

    /**
     * Muestra/oculta el HUD
     */
    toggleHUD() {
        this.hudVisible = !this.hudVisible;
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.display = this.hudVisible ? 'block' : 'none';
        }
    }

    /**
     * Muestra/oculta la mira
     */
    toggleCrosshair() {
        this.crosshairVisible = !this.crosshairVisible;
        const crosshair = this.elements.get('crosshair');
        if (crosshair) {
            crosshair.style.display = this.crosshairVisible ? 'block' : 'none';
        }
    }

    /**
     * Anima un valor numérico
     */
    animateValue(element, start, end, duration) {
        const startTime = Date.now();

        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Formatea el tiempo
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Manejadores de eventos
     */
    onGameStart() {
        this.hideAllScreens();
        this.showNotification('¡Juego iniciado!', 'success');
    }

    onGameStop() {
        this.showScreen('mainMenu');
    }

    onGamePaused() {
        this.showScreen('pause');
    }

    onGameResumed() {
        this.hideScreen('pause');
    }

    onGameOver(data) {
        this.showGameOver();
    }

    onVictory(data) {
        this.showVictory();
    }

    onPlayerDamage() {
        this.showDamageEffect();
    }

    onPlayerDeath() {
        this.showNotification('Has muerto', 'error');
    }

    onWeaponSwitch(data) {
        this.showNotification(`Arma cambiada: ${data.weapon}`, 'info');
    }

    onAmmoChange(data) {
        if (data.ammo === 0) {
            this.showNotification('Sin munición', 'warning');
        }
    }

    onScoreChanged(data) {
        // La puntuación se actualiza en el HUD
    }

    onKeyDown(e) {
        // Pausar con ESC
        if (e.key === 'Escape' && this.game.isRunning && !this.game.isPaused) {
            this.game.togglePause();
        }
    }

    /**
     * Carga la configuración de UI
     */
    loadSettings() {
        const settings = localStorage.getItem('shooter_arena_ui_settings');
        if (settings) {
            const parsed = JSON.parse(settings);

            if (parsed.hudVisible !== undefined) {
                this.hudVisible = parsed.hudVisible;
                if (!this.hudVisible) {
                    this.toggleHUD();
                }
            }

            if (parsed.crosshairVisible !== undefined) {
                this.crosshairVisible = parsed.crosshairVisible;
                if (!this.crosshairVisible) {
                    this.toggleCrosshair();
                }
            }
        }
    }

    /**
     * Guarda la configuración de UI
     */
    saveSettings() {
        const settings = {
            hudVisible: this.hudVisible,
            crosshairVisible: this.crosshairVisible
        };

        localStorage.setItem('shooter_arena_ui_settings', JSON.stringify(settings));
    }

    /**
     * Actualiza las animaciones
     */
    updateAnimations() {
        for (const [id, animation] of this.animations) {
            animation.update();

            if (animation.finished) {
                this.animations.delete(id);
            }
        }
    }

    /**
     * Actualiza las notificaciones
     */
    updateNotifications() {
        // Las notificaciones se manejan con setTimeout
    }

    /**
     * Muestra los modos de juego
     */
    showGameModes() {
        // Implementar pantalla de selección de modos
        this.showNotification('Modos de juego - Próximamente', 'info');
    }

    /**
     * Muestra la tabla de posiciones
     */
    showLeaderboard() {
        // Implementar pantalla de tabla de posiciones
        this.showNotification('Tabla de posiciones - Próximamente', 'info');
    }

    /**
     * Muestra la configuración
     */
    showSettings() {
        // Implementar pantalla de configuración
        this.showNotification('Configuración - Próximamente', 'info');
    }

    /**
     * Sale del juego
     */
    quitGame() {
        if (confirm('¿Estás seguro de que quieres salir?')) {
            window.close();
        }
    }

    /**
     * Renderiza la UI
     */
    render(ctx) {
        // La UI se renderiza con elementos DOM, no con canvas
        // Pero aquí se podrían renderizar elementos adicionales si es necesario
    }
}

// Exportar clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UISystem;
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.UISystem = UISystem;
}