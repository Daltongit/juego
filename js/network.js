/**
 * Sistema de red para Shooter Arena
 * Maneja comunicación cliente-servidor, multijugador y sincronización
 */

class NetworkSystem {
    constructor(game) {
        this.game = game;

        // Conexión
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = GameConfig.NETWORK.MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = GameConfig.NETWORK.RECONNECT_DELAY;

        // Estado del cliente
        this.clientId = null;
        this.roomId = null;
        this.isHost = false;

        // Jugadores remotos
        this.remotePlayers = new Map();

        // Sincronización
        this.lastSyncTime = 0;
        this.syncInterval = 100; // ms
        this.pendingInputs = [];

        // Latencia
        this.ping = 0;
        this.lastPingTime = 0;
        this.pingInterval = GameConfig.NETWORK.PING_INTERVAL;

        // Eventos
        this.listeners = new Map();

        // Buffer de mensajes
        this.messageBuffer = [];
        this.bufferSize = 100;

        console.log('Sistema de red inicializado');
    }

    /**
     * Conecta al servidor
     */
    async connect(serverUrl = null) {
        const url = serverUrl || GameConfig.NETWORK.SERVER_URL;

        try {
            // Crear conexión WebSocket
            this.socket = new WebSocket(url);

            // Configurar eventos
            this.setupSocketEvents();

            // Esperar conexión
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout de conexión'));
                }, GameConfig.NETWORK.TIMEOUT);

                this.socket.onopen = () => {
                    clearTimeout(timeout);
                    resolve();
                };

                this.socket.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(error);
                };
            });

            this.connected = true;
            this.reconnectAttempts = 0;

            // Iniciar sincronización
            this.startSync();

            // Iniciar medición de ping
            this.startPingMeasurement();

            this.emit('connected');
            console.log('Conectado al servidor');

        } catch (error) {
            console.error('Error al conectar:', error);
            this.emit('connectionError', error);

            // Intentar reconectar
            this.scheduleReconnect();
        }
    }

    /**
     * Desconecta del servidor
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.connected = false;
        this.clientId = null;
        this.roomId = null;
        this.isHost = false;

        // Detener sincronización
        this.stopSync();

        // Limpiar jugadores remotos
        this.remotePlayers.clear();

        this.emit('disconnected');
        console.log('Desconectado del servidor');
    }

    /**
     * Configura los eventos del socket
     */
    setupSocketEvents() {
        this.socket.onopen = () => {
            console.log('Socket abierto');
        };

        this.socket.onclose = (event) => {
            console.log('Socket cerrado:', event.code, event.reason);
            this.connected = false;

            // Intentar reconectar si no fue una desconexión intencional
            if (event.code !== 1000) {
                this.scheduleReconnect();
            }

            this.emit('disconnected');
        };

        this.socket.onerror = (error) => {
            console.error('Error de socket:', error);
            this.emit('socketError', error);
        };

        this.socket.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }

    /**
     * Maneja mensajes recibidos
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);

            // Procesar mensaje según tipo
            switch (message.type) {
                case 'connected':
                    this.handleConnected(message.data);
                    break;
                case 'roomJoined':
                    this.handleRoomJoined(message.data);
                    break;
                case 'playerJoined':
                    this.handlePlayerJoined(message.data);
                    break;
                case 'playerLeft':
                    this.handlePlayerLeft(message.data);
                    break;
                case 'gameState':
                    this.handleGameState(message.data);
                    break;
                case 'playerUpdate':
                    this.handlePlayerUpdate(message.data);
                    break;
                case 'enemyUpdate':
                    this.handleEnemyUpdate(message.data);
                    break;
                case 'bulletCreated':
                    this.handleBulletCreated(message.data);
                    break;
                case 'powerUpCollected':
                    this.handlePowerUpCollected(message.data);
                    break;
                case 'chat':
                    this.handleChat(message.data);
                    break;
                case 'ping':
                    this.handlePing(message.data);
                    break;
                default:
                    console.warn('Tipo de mensaje no reconocido:', message.type);
            }

        } catch (error) {
            console.error('Error al procesar mensaje:', error);
        }
    }

    /**
     * Envía un mensaje al servidor
     */
    send(type, data = {}) {
        if (!this.connected || !this.socket) {
            console.warn('No conectado, no se puede enviar mensaje');
            return false;
        }

        const message = {
            type: type,
            data: data,
            timestamp: Date.now(),
            clientId: this.clientId
        };

        try {
            this.socket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            return false;
        }
    }

    /**
     * Maneja conexión exitosa
     */
    handleConnected(data) {
        this.clientId = data.clientId;
        console.log('Cliente ID:', this.clientId);

        this.emit('connected', data);
    }

    /**
     * Maneja unión a sala
     */
    handleRoomJoined(data) {
        this.roomId = data.roomId;
        this.isHost = data.isHost;

        // Sincronizar jugadores existentes
        for (const playerData of data.players) {
            if (playerData.clientId !== this.clientId) {
                this.addRemotePlayer(playerData);
            }
        }

        this.emit('roomJoined', data);
        console.log('Unido a sala:', this.roomId, 'Host:', this.isHost);
    }

    /**
     * Maneja jugador que se une
     */
    handlePlayerJoined(data) {
        if (data.clientId !== this.clientId) {
            this.addRemotePlayer(data);
            this.emit('playerJoined', data);
        }
    }

    /**
     * Maneja jugador que se va
     */
    handlePlayerLeft(data) {
        this.removeRemotePlayer(data.clientId);
        this.emit('playerLeft', data);
    }

    /**
     * Maneja actualización del estado del juego
     */
    handleGameState(data) {
        // Actualizar estado del juego
        if (data.gameTime) {
            this.game.gameTime = data.gameTime;
        }

        if (data.score) {
            this.game.score = data.score;
        }

        if (data.waveNumber) {
            this.game.waveNumber = data.waveNumber;
        }

        this.emit('gameStateUpdate', data);
    }

    /**
     * Maneja actualización de jugador
     */
    handlePlayerUpdate(data) {
        if (data.clientId === this.clientId) {
            // Actualización del jugador local (reconciliación)
            this.reconcilePlayer(data);
        } else {
            // Actualización de jugador remoto
            this.updateRemotePlayer(data);
        }
    }

    /**
     * Maneja actualización de enemigo
     */
    handleEnemyUpdate(data) {
        // Encontrar enemigo y actualizar su estado
        for (const enemy of this.game.enemies) {
            if (enemy.id === data.enemyId) {
                // Sincronizar posición
                if (data.position) {
                    enemy.x = data.position.x;
                    enemy.y = data.position.y;
                }

                // Sincronizar salud
                if (data.health !== undefined) {
                    enemy.health = data.health;
                }

                // Sincronizar estado
                if (data.state) {
                    enemy.state = data.state;
                }

                break;
            }
        }
    }

    /**
     * Maneja creación de bala
     */
    handleBulletCreated(data) {
        // Crear bala en el cliente
        const bullet = new Bullet(
            data.x,
            data.y,
            data.angle,
            data.damage,
            data.speed,
            data.owner,
            this.game,
            data.type
        );

        this.game.bullets.push(bullet);
    }

    /**
     * Maneja recolección de power-up
     */
    handlePowerUpCollected(data) {
        // Remover power-up recolectado
        this.game.powerUps = this.game.powerUps.filter(powerUp => {
            return !(powerUp.x === data.x && powerUp.y === data.y);
        });

        this.emit('powerUpCollected', data);
    }

    /**
     * Maneja mensaje de chat
     */
    handleChat(data) {
        this.emit('chatMessage', data);
    }

    /**
     * Maneja respuesta de ping
     */
    handlePing(data) {
        const now = Date.now();
        this.ping = now - data.timestamp;

        this.emit('pingUpdate', this.ping);
    }

    /**
     * Añade un jugador remoto
     */
    addRemotePlayer(playerData) {
        const remotePlayer = {
            clientId: playerData.clientId,
            name: playerData.name,
            x: playerData.x || 0,
            y: playerData.y || 0,
            rotation: playerData.rotation || 0,
            health: playerData.health || 100,
            maxHealth: playerData.maxHealth || 100,
            weapon: playerData.weapon || 'pistol',
            team: playerData.team || null,
            score: playerData.score || 0,
            lastUpdate: Date.now()
        };

        this.remotePlayers.set(playerData.clientId, remotePlayer);
        console.log('Jugador remoto añadido:', playerData.name);
    }

    /**
     * Remueve un jugador remoto
     */
    removeRemotePlayer(clientId) {
        const removed = this.remotePlayers.delete(clientId);
        if (removed) {
            console.log('Jugador remoto removido:', clientId);
        }
    }

    /**
     * Actualiza un jugador remoto
     */
    updateRemotePlayer(data) {
        const player = this.remotePlayers.get(data.clientId);
        if (!player) return;

        // Interpolar posición
        if (data.position) {
            player.targetX = data.position.x;
            player.targetY = data.position.y;

            // Si es la primera actualización, establecer posición actual
            if (player.x === undefined || player.y === undefined) {
                player.x = data.position.x;
                player.y = data.position.y;
            }
        }

        // Actualizar otras propiedades
        if (data.rotation !== undefined) player.rotation = data.rotation;
        if (data.health !== undefined) player.health = data.health;
        if (data.weapon !== undefined) player.weapon = data.weapon;
        if (data.score !== undefined) player.score = data.score;

        player.lastUpdate = Date.now();
    }

    /**
     * Reconcilia al jugador local
     */
    reconcilePlayer(data) {
        if (!this.game.player) return;

        // Comparar estado del servidor con el local
        const serverState = {
            x: data.position.x,
            y: data.position.y,
            health: data.health
        };

        const localState = {
            x: this.game.player.x,
            y: this.game.player.y,
            health: this.game.player.health
        };

        // Si hay una gran discrepancia, corregir
        const positionThreshold = 50;
        const healthThreshold = 10;

        if (Math.abs(serverState.x - localState.x) > positionThreshold ||
            Math.abs(serverState.y - localState.y) > positionThreshold) {
            // Corregir posición (suavemente)
            this.game.player.x += (serverState.x - localState.x) * 0.1;
            this.game.player.y += (serverState.y - localState.y) * 0.1;
        }

        if (Math.abs(serverState.health - localState.health) > healthThreshold) {
            // Corregir salud
            this.game.player.health = serverState.health;
        }
    }

    /**
     * Inicia la sincronización
     */
    startSync() {
        this.syncInterval = setInterval(() => {
            this.sync();
        }, this.syncInterval);
    }

    /**
     * Detiene la sincronización
     */
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Sincroniza el estado del juego
     */
    sync() {
        if (!this.connected || !this.game.player) return;

        // Enviar actualización del jugador
        this.send('playerUpdate', {
            position: {
                x: this.game.player.x,
                y: this.game.player.y
            },
            rotation: this.game.player.rotation,
            health: this.game.player.health,
            weapon: this.game.player.currentWeapon,
            score: this.game.score
        });

        // Enviar inputs pendientes
        while (this.pendingInputs.length > 0) {
            const input = this.pendingInputs.shift();
            this.send('playerInput', input);
        }
    }

    /**
     * Inicia la medición de ping
     */
    startPingMeasurement() {
        this.pingInterval = setInterval(() => {
            this.measurePing();
        }, this.pingInterval);
    }

    /**
     * Mide el ping
     */
    measurePing() {
        if (!this.connected) return;

        this.lastPingTime = Date.now();
        this.send('ping', { timestamp: this.lastPingTime });
    }

    /**
     * Se une a una sala
     */
    joinRoom(roomId, mode = 'deathmatch') {
        if (!this.connected) {
            console.error('No conectado, no se puede unir a sala');
            return false;
        }

        return this.send('joinRoom', {
            roomId: roomId,
            mode: mode,
            playerName: this.getPlayerName()
        });
    }

    /**
     * Crea una sala
     */
    createRoom(mode = 'deathmatch', options = {}) {
        if (!this.connected) {
            console.error('No conectado, no se puede crear sala');
            return false;
        }

        return this.send('createRoom', {
            mode: mode,
            maxPlayers: options.maxPlayers || 8,
            private: options.private || false,
            password: options.password || null,
            playerName: this.getPlayerName()
        });
    }

    /**
     * Sale de la sala actual
     */
    leaveRoom() {
        if (!this.connected || !this.roomId) {
            return false;
        }

        return this.send('leaveRoom');
    }

    /**
     * Envía un mensaje de chat
     */
    sendChatMessage(message) {
        if (!this.connected || !this.roomId) {
            return false;
        }

        return this.send('chat', {
            message: message,
            roomId: this.roomId
        });
    }

    /**
     * Envía un input del jugador
     */
    sendPlayerInput(input) {
        // Añadir a la cola de inputs pendientes
        this.pendingInputs.push({
            ...input,
            timestamp: Date.now(),
            sequence: this.pendingInputs.length
        });

        // Limitar tamaño de la cola
        if (this.pendingInputs.length > 10) {
            this.pendingInputs.shift();
        }
    }

    /**
     * Notifica una acción del juego
     */
    notifyGameAction(action, data) {
        if (!this.connected) return;

        switch (action) {
            case 'shoot':
                this.send('playerShoot', {
                    position: data.position,
                    angle: data.angle,
                    weapon: data.weapon
                });
                break;

            case 'reload':
                this.send('playerReload', {
                    weapon: data.weapon
                });
                break;

            case 'useAbility':
                this.send('playerUseAbility', {
                    ability: data.ability,
                    position: data.position
                });
                break;

            case 'enemyKilled':
                this.send('enemyKilled', {
                    enemyId: data.enemy.id,
                    enemyType: data.enemy.type,
                    weapon: data.weapon
                });
                break;
        }
    }

    /**
     * Interpola jugadores remotos
     */
    interpolateRemotePlayers(deltaTime) {
        for (const player of this.remotePlayers.values()) {
            if (player.targetX !== undefined && player.targetY !== undefined) {
                // Interpolación suave
                const interpolationSpeed = 0.2;
                player.x += (player.targetX - player.x) * interpolationSpeed;
                player.y += (player.targetY - player.y) * interpolationSpeed;
            }
        }
    }

    /**
     * Programa una reconexión
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Máximo número de intentos de reconexión alcanzado');
            this.emit('reconnectFailed');
            return;
        }

        this.reconnectAttempts++;

        console.log(`Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
    }

    /**
     * Obtiene el nombre del jugador
     */
    getPlayerName() {
        // Obtener desde autenticación o usar un nombre por defecto
        if (window.auth && window.auth.isAuthenticated()) {
            return window.auth.getCurrentUser().username;
        }

        return `Player_${Math.floor(Math.random() * 10000)}`;
    }

    /**
     * Obtiene el estado de la conexión
     */
    getConnectionState() {
        return {
            connected: this.connected,
            clientId: this.clientId,
            roomId: this.roomId,
            isHost: this.isHost,
            ping: this.ping,
            remotePlayers: this.remotePlayers.size,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Renderiza jugadores remotos
     */
    renderRemotePlayers(ctx) {
        for (const player of this.remotePlayers.values()) {
            ctx.save();

            // Trasladar a la posición del jugador
            ctx.translate(player.x, player.y);
            ctx.rotate(player.rotation);

            // Renderizar jugador
            ctx.fillStyle = player.team === 'RED' ? '#ff4444' : '#4444ff';
            ctx.fillRect(-20, -20, 40, 40);

            // Renderizar nombre
            ctx.restore();
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, player.x, player.y - 30);

            // Renderizar barra de salud
            const barWidth = 40;
            const barHeight = 4;
            const healthPercent = player.health / player.maxHealth;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(player.x - barWidth / 2, player.y - 35, barWidth, barHeight);

            ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : '#ff0000';
            ctx.fillRect(player.x - barWidth / 2, player.y - 35, barWidth * healthPercent, barHeight);
        }
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
                    console.error('Error en event listener de red:', error);
                }
            });
        }
    }
}

// Exportar clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkSystem;
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.NetworkSystem = NetworkSystem;
}