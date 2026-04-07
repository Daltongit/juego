/**
 * Configuración global del juego Shooter Arena
 * Contiene todas las constantes y variables de configuración
 */

// ===== CONFIGURACIÓN DEL JUEGO =====
const GameConfig = {
    // Información del juego
    GAME_TITLE: 'Shooter Arena',
    GAME_VERSION: '1.0.0',
    GAME_AUTHOR: 'DevTeam',

    // Configuración del canvas
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 700,
    CANVAS_BACKGROUND: '#0a0a0a',

    // Física y movimiento
    GRAVITY: 0,
    FRICTION: 0.9,
    MAX_VELOCITY: 15,

    // Configuración de FPS
    TARGET_FPS: 60,
    FRAME_DELAY: 1000 / 60,

    // Configuración de red
    NETWORK: {
        SERVER_URL: 'ws://localhost:8080',
        RECONNECT_DELAY: 3000,
        MAX_RECONNECT_ATTEMPTS: 5,
        PING_INTERVAL: 5000,
        TIMEOUT: 10000
    },

    // Configuración de audio
    AUDIO: {
        MASTER_VOLUME: 0.7,
        SFX_VOLUME: 0.8,
        MUSIC_VOLUME: 0.5,
        ENABLED: true
    },

    // Configuración de partículas
    PARTICLES: {
        MAX_PARTICLES: 500,
        EMIT_RATE: 5,
        FADE_SPEED: 0.02
    }
};

// ===== CONFIGURACIÓN DEL JUGADOR =====
const PlayerConfig = {
    // Estadísticas base
    BASE_HEALTH: 100,
    BASE_ARMOR: 0,
    BASE_SPEED: 5,
    BASE_DAMAGE: 10,

    // Dimensiones
    WIDTH: 40,
    HEIGHT: 40,

    // Movimiento
    ACCELERATION: 0.5,
    DECELERATION: 0.8,
    ROTATION_SPEED: 0.1,

    // Armas
    WEAPONS: {
        PISTOL: {
            name: 'Pistola',
            damage: 10,
            fireRate: 300,
            bulletSpeed: 12,
            magazineSize: 12,
            reloadTime: 1500,
            spread: 0.05
        },
        RIFLE: {
            name: 'Rifle',
            damage: 25,
            fireRate: 100,
            bulletSpeed: 18,
            magazineSize: 30,
            reloadTime: 2000,
            spread: 0.02
        },
        SHOTGUN: {
            name: 'Escopeta',
            damage: 15,
            fireRate: 800,
            bulletSpeed: 10,
            magazineSize: 8,
            reloadTime: 2500,
            spread: 0.3,
            pellets: 5
        },
        SNIPER: {
            name: 'Francotirador',
            damage: 75,
            fireRate: 1500,
            bulletSpeed: 25,
            magazineSize: 5,
            reloadTime: 3000,
            spread: 0
        },
        SMG: {
            name: 'Subfusil',
            damage: 8,
            fireRate: 50,
            bulletSpeed: 14,
            magazineSize: 40,
            reloadTime: 1800,
            spread: 0.08
        }
    },

    // Habilidades
    ABILITIES: {
        DASH: {
            name: 'Dash',
            cooldown: 3000,
            duration: 200,
            speed: 15,
            energyCost: 20
        },
        SHIELD: {
            name: 'Escudo',
            cooldown: 10000,
            duration: 3000,
            damage: 0,
            energyCost: 40
        },
        HEAL: {
            name: 'Curación',
            cooldown: 15000,
            amount: 30,
            energyCost: 30
        },
        RAGE: {
            name: 'Furia',
            cooldown: 20000,
            duration: 5000,
            damageMultiplier: 1.5,
            energyCost: 50
        }
    },

    // Niveles y experiencia
    LEVELS: {
        EXP_PER_LEVEL: 100,
        MAX_LEVEL: 50,
        SKILL_POINTS_PER_LEVEL: 1
    }
};

// ===== CONFIGURACIÓN DE ENEMIGOS =====
const EnemyConfig = {
    // Tipos de enemigos
    TYPES: {
        GRUNT: {
            name: 'Soldado',
            health: 50,
            speed: 2,
            damage: 5,
            score: 10,
            color: '#ff4444',
            size: { width: 35, height: 35 },
            ai: 'basic',
            dropRate: 0.3
        },
        HEAVY: {
            name: 'Tanque',
            health: 150,
            speed: 1,
            damage: 15,
            score: 25,
            color: '#ff8800',
            size: { width: 50, height: 50 },
            ai: 'aggressive',
            dropRate: 0.5
        },
        SNIPER: {
            name: 'Francotirador',
            health: 30,
            speed: 1.5,
            damage: 30,
            score: 20,
            color: '#ff00ff',
            size: { width: 30, height: 30 },
            ai: 'sniper',
            dropRate: 0.4
        },
        FAST: {
            name: 'Rápido',
            health: 25,
            speed: 5,
            damage: 3,
            score: 15,
            color: '#00ffff',
            size: { width: 25, height: 25 },
            ai: 'hitAndRun',
            dropRate: 0.35
        },
        BOSS: {
            name: 'Jefe',
            health: 500,
            speed: 0.8,
            damage: 25,
            score: 100,
            color: '#ff0000',
            size: { width: 80, height: 80 },
            ai: 'boss',
            dropRate: 1.0,
            phases: 3
        }
    },

    // Comportamiento IA
    AI: {
        DETECTION_RANGE: 300,
        ATTACK_RANGE: 200,
        RETREAT_HEALTH: 0.3,
        GROUP_BEHAVIOR: true,
        DODGE_CHANCE: 0.1
    },

    // Spawning
    SPAWNING: {
        WAVE_DELAY: 5000,
        ENEMY_PER_WAVE: 10,
        MAX_ENEMIES: 50,
        DIFFICULTY_SCALING: 1.2,
        BOSS_WAVE_INTERVAL: 5
    }
};

// ===== CONFIGURACIÓN DE BALAS =====
const BulletConfig = {
    // Tipos de balas
    TYPES: {
        NORMAL: {
            damage: 10,
            speed: 15,
            size: 4,
            color: '#ffff00',
            penetration: 1,
            lifetime: 1000
        },
        PIERCING: {
            damage: 15,
            speed: 18,
            size: 3,
            color: '#ff00ff',
            penetration: 3,
            lifetime: 1500
        },
        EXPLOSIVE: {
            damage: 30,
            speed: 12,
            size: 6,
            color: '#ff4444',
            penetration: 1,
            lifetime: 800,
            explosionRadius: 50
        },
        HOMING: {
            damage: 20,
            speed: 10,
            size: 5,
            color: '#00ff00',
            penetration: 1,
            lifetime: 2000,
            homingStrength: 0.1
        },
        LASER: {
            damage: 5,
            speed: 30,
            size: 2,
            color: '#00ffff',
            penetration: 5,
            lifetime: 500
        }
    },

    // Configuración física
    PHYSICS: {
        GRAVITY: 0,
        AIR_RESISTANCE: 0.99,
        RICOCHET_CHANCE: 0.2
    }
};

// ===== CONFIGURACIÓN DE POWER-UPS =====
const PowerUpConfig = {
    // Tipos de power-ups
    TYPES: {
        HEALTH: {
            name: 'Salud',
            icon: '❤️',
            color: '#ff0000',
            duration: 0,
            effect: { health: 25 },
            rarity: 'common',
            spawnChance: 0.3
        },
        ARMOR: {
            name: 'Armadura',
            icon: '🛡️',
            color: '#0088ff',
            duration: 0,
            effect: { armor: 25 },
            rarity: 'common',
            spawnChance: 0.25
        },
        SPEED: {
            name: 'Velocidad',
            icon: '⚡',
            color: '#ffff00',
            duration: 10000,
            effect: { speedMultiplier: 1.5 },
            rarity: 'uncommon',
            spawnChance: 0.2
        },
        DAMAGE: {
            name: 'Daño',
            icon: '💪',
            color: '#ff8800',
            duration: 15000,
            effect: { damageMultiplier: 2 },
            rarity: 'uncommon',
            spawnChance: 0.15
        },
        RAPID_FIRE: {
            name: 'Disparo Rápido',
            icon: '🔥',
            color: '#ff00ff',
            duration: 8000,
            effect: { fireRateMultiplier: 0.5 },
            rarity: 'rare',
            spawnChance: 0.1
        },
        INVINCIBILITY: {
            name: 'Inmunidad',
            icon: '⭐',
            color: '#00ffff',
            duration: 5000,
            effect: { invincible: true },
            rarity: 'legendary',
            spawnChance: 0.05
        },
        AMMO: {
            name: 'Munición',
            icon: '🔫',
            color: '#888888',
            duration: 0,
            effect: { refillAmmo: true },
            rarity: 'common',
            spawnChance: 0.2
        },
        MULTI_SHOT: {
            name: 'Multi-disparo',
            icon: '💫',
            color: '#00ff00',
            duration: 10000,
            effect: { multiShot: 3 },
            rarity: 'epic',
            spawnChance: 0.08
        }
    },

    // Configuración de spawn
    SPAWNING: {
        RESPAWN_TIME: 15000,
        MAX_POWERUPS: 10,
        DESPAWN_TIME: 30000,
        SPAWN_RADIUS: 200
    },

    // Rareza
    RARITY: {
        common: { color: '#ffffff', weight: 50 },
        uncommon: { color: '#00ff00', weight: 30 },
        rare: { color: '#0088ff', weight: 15 },
        epic: { color: '#ff00ff', weight: 4 },
        legendary: { color: '#ff8800', weight: 1 }
    }
};

// ===== CONFIGURACIÓN DE PARTÍCULAS =====
const ParticleConfig = {
    // Tipos de partículas
    TYPES: {
        EXPLOSION: {
            count: 20,
            speed: { min: 2, max: 8 },
            size: { min: 2, max: 6 },
            color: ['#ff4444', '#ff8800', '#ffff00'],
            lifetime: { min: 500, max: 1500 },
            gravity: 0.1
        },
        BLOOD: {
            count: 15,
            speed: { min: 1, max: 4 },
            size: { min: 1, max: 3 },
            color: ['#ff0000', '#cc0000', '#990000'],
            lifetime: { min: 1000, max: 2000 },
            gravity: 0.2
        },
        SPARK: {
            count: 10,
            speed: { min: 3, max: 10 },
            size: { min: 1, max: 2 },
            color: ['#ffff00', '#ff8800', '#ffffff'],
            lifetime: { min: 200, max: 800 },
            gravity: 0
        },
        SMOKE: {
            count: 5,
            speed: { min: 0.5, max: 2 },
            size: { min: 10, max: 20 },
            color: ['#666666', '#888888', '#aaaaaa'],
            lifetime: { min: 2000, max: 4000 },
            gravity: -0.05
        },
        HEAL: {
            count: 8,
            speed: { min: 1, max: 3 },
            size: { min: 3, max: 5 },
            color: ['#00ff00', '#00ff88', '#88ff00'],
            lifetime: { min: 1000, max: 2000 },
            gravity: -0.1
        }
    },

    // Configuración del emisor
    EMITTER: {
        MAX_PARTICLES: 500,
        EMIT_RATE: 60,
        POOL_SIZE: 1000
    }
};

// ===== CONFIGURACIÓN DE MODOS DE JUEGO =====
const GameModeConfig = {
    // Modos disponibles
    MODES: {
        DEATHMATCH: {
            name: 'Deathmatch',
            description: 'Todos contra todos. El jugador con más puntos gana.',
            maxPlayers: 8,
            timeLimit: 300, // 5 minutos
            scoreLimit: 50,
            respawnTime: 3000,
            friendlyFire: true
        },
        TEAM_DEATHMATCH: {
            name: 'Team Deathmatch',
            description: 'Equipos compiten por obtener más puntos.',
            maxPlayers: 10,
            timeLimit: 600, // 10 minutos
            scoreLimit: 100,
            respawnTime: 3000,
            friendlyFire: false,
            teams: 2
        },
        CAPTURE_FLAG: {
            name: 'Capture the Flag',
            description: 'Captura la bandera enemiga y llévala a tu base.',
            maxPlayers: 8,
            timeLimit: 900, // 15 minutos
            scoreLimit: 3,
            respawnTime: 5000,
            friendlyFire: false,
            teams: 2
        },
        SURVIVAL: {
            name: 'Survival',
            description: 'Sobrevive a oleadas de enemigos. ¿Cuánto tiempo puedes durar?',
            maxPlayers: 4,
            timeLimit: 0, // Sin límite
            scoreLimit: 0,
            respawnTime: 10000,
            friendlyFire: false,
            waves: true
        },
        ZOMBIES: {
            name: 'Zombie Mode',
            description: 'Sobrevive a hordas de zombis. El último en pie gana.',
            maxPlayers: 12,
            timeLimit: 0,
            scoreLimit: 0,
            respawnTime: 0, // No respawn
            friendlyFire: false,
            specialInfected: true
        },
        ARMS_RACE: {
            name: 'Arms Race',
            description: 'Avanza a través de todas las armas. La primera kill con el cuchillo gana.',
            maxPlayers: 10,
            timeLimit: 0,
            scoreLimit: 16, // Número de armas
            respawnTime: 1000,
            friendlyFire: true,
            weaponProgression: true
        }
    },

    // Configuración de equipos
    TEAMS: {
        RED: {
            name: 'Equipo Rojo',
            color: '#ff4444',
            spawn: { x: 100, y: 350 }
        },
        BLUE: {
            name: 'Equipo Azul',
            color: '#4444ff',
            spawn: { x: 1100, y: 350 }
        }
    },

    // Configuración de oleadas
    WAVES: {
        START_DELAY: 10000,
        WAVE_DURATION: 60000,
        ENEMY_SCALING: 1.2,
        BOSS_EVERY: 5,
        REWARD_TIME: 15000
    }
};

// ===== CONFIGURACIÓN DE UI =====
const UIConfig = {
    // Animaciones
    ANIMATIONS: {
        FADE_IN: 300,
        FADE_OUT: 300,
        SLIDE_IN: 400,
        SLIDE_OUT: 400,
        SCALE_IN: 200,
        SCALE_OUT: 200
    },

    // Notificaciones
    NOTIFICATIONS: {
        DURATION: 3000,
        MAX_VISIBLE: 5,
        TYPES: {
            SUCCESS: { color: '#00ff00', icon: '✓' },
            ERROR: { color: '#ff0000', icon: '✗' },
            WARNING: { color: '#ffaa00', icon: '!' },
            INFO: { color: '#0088ff', icon: 'i' }
        }
    },

    // HUD
    HUD: {
        POSITION: 'top-left',
        OPACITY: 0.8,
        FONT_SIZE: 14,
        FONT_FAMILY: 'Orbitron, monospace'
    },

    // Menús
    MENUS: {
        TRANSITION_SPEED: 300,
        BLUR_BACKGROUND: true,
        SHOW_CURSOR: true
    }
};

// ===== CONFIGURACIÓN DE ALMACENAMIENTO =====
const StorageConfig = {
    // Claves de almacenamiento
    KEYS: {
        PLAYER_DATA: 'shooter_arena_player',
        SETTINGS: 'shooter_arena_settings',
        STATS: 'shooter_arena_stats',
        ACHIEVEMENTS: 'shooter_arena_achievements',
        UNLOCKS: 'shooter_arena_unlocks'
    },

    // Configuración de respaldo
    BACKUP: {
        ENABLED: true,
        INTERVAL: 300000, // 5 minutos
        MAX_BACKUPS: 5
    }
};

// ===== CONFIGURACIÓN DE LOGROS =====
const AchievementConfig = {
    // Categorías
    CATEGORIES: {
        COMBAT: 'Combate',
        SURVIVAL: 'Supervivencia',
        EXPLORATION: 'Exploración',
        SOCIAL: 'Social',
        MASTERY: 'Maestría'
    },

    // Logros
    ACHIEVEMENTS: [
        {
            id: 'first_kill',
            name: 'Primera Sangre',
            description: 'Realiza tu primera eliminación',
            category: 'COMBAT',
            points: 10,
            icon: '🎯',
            condition: { kills: 1 }
        },
        {
            id: 'kill_streak_5',
            name: 'Racha Asesina',
            description: 'Elimina 5 enemigos sin morir',
            category: 'COMBAT',
            points: 25,
            icon: '🔥',
            condition: { killStreak: 5 }
        },
        {
            id: 'survive_10_min',
            name: 'Superviviente',
            description: 'Sobrevive durante 10 minutos',
            category: 'SURVIVAL',
            points: 20,
            icon: '⏱️',
            condition: { survivalTime: 600 }
        },
        {
            id: 'collect_50_powerups',
            name: 'Coleccionista',
            description: 'Recoge 50 power-ups',
            category: 'EXPLORATION',
            points: 30,
            icon: '💎',
            condition: { powerupsCollected: 50 }
        },
        {
            id: 'reach_level_10',
            name: 'Veterano',
            description: 'Alcanza el nivel 10',
            category: 'MASTERY',
            points: 50,
            icon: '⭐',
            condition: { level: 10 }
        }
    ]
};

// ===== CONFIGURACIÓN DE DEBUG =====
const DebugConfig = {
    // Opciones de debug
    ENABLED: false,
    SHOW_FPS: false,
    SHOW_COLLISION_BOXES: false,
    SHOW_PATHFINDING: false,
    SHOW_NETWORK_STATS: false,
    LOG_LEVEL: 'info', // debug, info, warn, error

    // Comandos de consola
    CONSOLE_COMMANDS: {
        god: 'Activar modo dios',
        noclip: 'Activar noclip',
        give_weapon: 'Dar arma (give_weapon <nombre>)',
        spawn_enemy: 'Generar enemigo (spawn_enemy <tipo>)',
        clear_level: 'Limpiar nivel',
        level_up: 'Subir de nivel'
    }
};

// ===== EXPORTACIÓN =====
// Exportar configuraciones para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameConfig,
        PlayerConfig,
        EnemyConfig,
        BulletConfig,
        PowerUpConfig,
        ParticleConfig,
        GameModeConfig,
        UIConfig,
        StorageConfig,
        AchievementConfig,
        DebugConfig
    };
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.ShooterArenaConfig = {
        GameConfig,
        PlayerConfig,
        EnemyConfig,
        BulletConfig,
        PowerUpConfig,
        ParticleConfig,
        GameModeConfig,
        UIConfig,
        StorageConfig,
        AchievementConfig,
        DebugConfig
    };
}

// Validación de configuración
function validateConfig() {
    const errors = [];

    // Validar configuración del juego
    if (GameConfig.CANVAS_WIDTH <= 0 || GameConfig.CANVAS_HEIGHT <= 0) {
        errors.push('Las dimensiones del canvas deben ser positivas');
    }

    if (GameConfig.TARGET_FPS <= 0) {
        errors.push('El FPS objetivo debe ser positivo');
    }

    // Validar configuración del jugador
    if (PlayerConfig.BASE_HEALTH <= 0) {
        errors.push('La salud base del jugador debe ser positiva');
    }

    if (PlayerConfig.BASE_SPEED <= 0) {
        errors.push('La velocidad base del jugador debe ser positiva');
    }

    // Mostrar errores si hay
    if (errors.length > 0) {
        console.error('Errores en la configuración:', errors);
        return false;
    }

    console.log('Configuración validada correctamente');
    return true;
}

// Auto-validación al cargar
if (DebugConfig.ENABLED) {
    validateConfig();
}