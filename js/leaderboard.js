/**
 * Sistema de tablas de posiciones para Shooter Arena
 * Maneja puntuaciones, rankings y estadísticas
 */

class LeaderboardSystem {
    constructor() {
        this.entries = [];
        this.categories = new Map();
        this.filters = new Map();
        this.currentCategory = 'global';
        this.currentFilter = 'alltime';
        this.maxEntries = 100;

        // Inicializar categorías
        this.initCategories();

        // Cargar datos guardados
        this.loadLeaderboard();

        console.log('Sistema de tablas de posiciones inicializado');
    }

    /**
     * Inicializa las categorías de la tabla
     */
    initCategories() {
        // Categorías de puntuación
        this.categories.set('global', {
            name: 'Global',
            description: 'Todas las puntuaciones',
            fields: ['score', 'kills', 'deaths', 'kd', 'time']
        });

        this.categories.set('daily', {
            name: 'Diaria',
            description: 'Mejores puntuaciones del día',
            fields: ['score', 'kills', 'accuracy']
        });

        this.categories.set('weekly', {
            name: 'Semanal',
            description: 'Mejores puntuaciones de la semana',
            fields: ['score', 'kills', 'wins']
        });

        this.categories.set('mode', {
            name: 'Por Modo',
            description: 'Mejores puntuaciones por modo de juego',
            fields: ['score', 'wins', 'winrate']
        });

        // Filtros de tiempo
        this.filters.set('alltime', {
            name: 'Todos los tiempos',
            timeframe: null
        });

        this.filters.set('today', {
            name: 'Hoy',
            timeframe: 'day'
        });

        this.filters.set('week', {
            name: 'Esta semana',
            timeframe: 'week'
        });

        this.filters.set('month', {
            name: 'Este mes',
            timeframe: 'month'
        });
    }

    /**
     * Añade una entrada a la tabla
     */
    addEntry(data) {
        const entry = this.createEntry(data);

        // Validar entrada
        if (!this.validateEntry(entry)) {
            console.warn('Entrada inválida:', entry);
            return false;
        }

        // Añadir a la lista
        this.entries.push(entry);

        // Ordenar y limitar
        this.sortEntries();
        this.limitEntries();

        // Guardar cambios
        this.saveLeaderboard();

        // Emitir evento
        this.emit('entryAdded', { entry, rank: this.getEntryRank(entry) });

        console.log('Entrada añadida a la tabla:', entry);
        return true;
    }

    /**
     * Crea una entrada de la tabla
     */
    createEntry(data) {
        return {
            id: this.generateId(),
            player: data.player || 'Anonymous',
            score: data.score || 0,
            mode: data.mode || 'deathmatch',
            timestamp: data.timestamp || Date.now(),
            stats: {
                kills: data.kills || 0,
                deaths: data.deaths || 0,
                assists: data.assists || 0,
                wins: data.wins || 0,
                losses: data.losses || 0,
                time: data.time || 0,
                accuracy: data.accuracy || 0,
                headshots: data.headshots || 0
            },
            metadata: {
                version: data.version || '1.0.0',
                platform: data.platform || 'web',
                cheats: data.cheats || false
            }
        };
    }

    /**
     * Genera un ID único para la entrada
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Valida una entrada
     */
    validateEntry(entry) {
        // Validar campos requeridos
        if (!entry.player || !entry.score || !entry.timestamp) {
            return false;
        }

        // Validar puntuación
        if (entry.score < 0 || !isFinite(entry.score)) {
            return false;
        }

        // Validar timestamp
        if (entry.timestamp > Date.now() || entry.timestamp < 0) {
            return false;
        }

        // Validar estadísticas
        if (entry.stats) {
            for (const [key, value] of Object.entries(entry.stats)) {
                if (typeof value !== 'number' || value < 0) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Ordena las entradas
     */
    sortEntries() {
        this.entries.sort((a, b) => {
            // Ordenar por puntuación (descendente)
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            // Si hay empate, ordenar por kills (descendente)
            if (b.stats.kills !== a.stats.kills) {
                return b.stats.kills - a.stats.kills;
            }

            // Si todavía hay empate, ordenar por tiempo (ascendente)
            return a.stats.time - b.stats.time;
        });
    }

    /**
     * Limita el número de entradas
     */
    limitEntries() {
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
    }

    /**
     * Obtiene las entradas filtradas
     */
    getEntries(options = {}) {
        const category = options.category || this.currentCategory;
        const filter = options.filter || this.currentFilter;
        const mode = options.mode;
        const player = options.player;
        const limit = options.limit || 10;
        const offset = options.offset || 0;

        let filtered = [...this.entries];

        // Aplicar filtro de tiempo
        const filterConfig = this.filters.get(filter);
        if (filterConfig && filterConfig.timeframe) {
            filtered = this.filterByTimeframe(filtered, filterConfig.timeframe);
        }

        // Aplicar filtro de modo
        if (mode) {
            filtered = filtered.filter(entry => entry.mode === mode);
        }

        // Aplicar filtro de jugador
        if (player) {
            filtered = filtered.filter(entry =>
                entry.player.toLowerCase().includes(player.toLowerCase())
            );
        }

        // Aplicar lógica de categoría
        filtered = this.applyCategoryFilter(filtered, category);

        // Aplicar paginación
        const paginated = filtered.slice(offset, offset + limit);

        // Añadir rangos
        return paginated.map((entry, index) => ({
            ...entry,
            rank: offset + index + 1,
            kd: this.calculateKD(entry),
            winrate: this.calculateWinRate(entry),
            accuracy: entry.stats.accuracy || 0
        }));
    }

    /**
     * Filtra entradas por marco de tiempo
     */
    filterByTimeframe(entries, timeframe) {
        const now = Date.now();
        let cutoff;

        switch (timeframe) {
            case 'day':
                cutoff = now - (24 * 60 * 60 * 1000);
                break;
            case 'week':
                cutoff = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                cutoff = now - (30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return entries;
        }

        return entries.filter(entry => entry.timestamp >= cutoff);
    }

    /**
     * Aplica filtro de categoría
     */
    applyCategoryFilter(entries, category) {
        const categoryConfig = this.categories.get(category);
        if (!categoryConfig) {
            return entries;
        }

        // La lógica específica de categoría se implementaría aquí
        return entries;
    }

    /**
     * Calcula la relación K/D
     */
    calculateKD(entry) {
        if (entry.stats.deaths === 0) {
            return entry.stats.kills;
        }
        return (entry.stats.kills / entry.stats.deaths).toFixed(2);
    }

    /**
     * Calcula el porcentaje de victorias
     */
    calculateWinRate(entry) {
        const total = entry.stats.wins + entry.stats.losses;
        if (total === 0) {
            return 0;
        }
        return ((entry.stats.wins / total) * 100).toFixed(1);
    }

    /**
     * Obtiene el rango de una entrada
     */
    getEntryRank(entry) {
        return this.entries.findIndex(e => e.id === entry.id) + 1;
    }

    /**
     * Obtiene estadísticas de la tabla
     */
    getStats() {
        const stats = {
            totalEntries: this.entries.length,
            categories: {},
            modes: {},
            players: new Set()
        };

        // Analizar entradas
        for (const entry of this.entries) {
            // Contar jugadores únicos
            stats.players.add(entry.player);

            // Contar por modo
            if (!stats.modes[entry.mode]) {
                stats.modes[entry.mode] = 0;
            }
            stats.modes[entry.mode]++;
        }

        stats.uniquePlayers = stats.players.size;
        delete stats.players;

        // Estadísticas por categoría
        for (const [categoryId, category] of this.categories) {
            const categoryEntries = this.getEntries({ category, limit: 1 });
            stats.categories[categoryId] = {
                name: category.name,
                topScore: categoryEntries[0]?.score || 0,
                entryCount: this.getEntries({ category, limit: this.maxEntries }).length
            };
        }

        return stats;
    }

    /**
     * Busca entradas
     */
    search(query, options = {}) {
        const results = this.entries.filter(entry => {
            const searchString = `${entry.player} ${entry.mode}`.toLowerCase();
            return searchString.includes(query.toLowerCase());
        });

        // Ordenar resultados por relevancia (puntuación)
        results.sort((a, b) => b.score - a.score);

        // Aplicar paginación
        const limit = options.limit || 10;
        const offset = options.offset || 0;

        return results.slice(offset, offset + limit).map((entry, index) => ({
            ...entry,
            rank: index + 1,
            relevance: this.calculateRelevance(entry, query)
        }));
    }

    /**
     * Calcula la relevancia de una entrada para una búsqueda
     */
    calculateRelevance(entry, query) {
        const queryLower = query.toLowerCase();
        let relevance = 0;

        // Coincidencia exacta en el nombre
        if (entry.player.toLowerCase() === queryLower) {
            relevance += 100;
        }

        // El nombre comienza con la consulta
        if (entry.player.toLowerCase().startsWith(queryLower)) {
            relevance += 50;
        }

        // El nombre contiene la consulta
        if (entry.player.toLowerCase().includes(queryLower)) {
            relevance += 25;
        }

        // Coincidencia en el modo
        if (entry.mode.toLowerCase().includes(queryLower)) {
            relevance += 10;
        }

        return relevance;
    }

    /**
     * Exporta la tabla
     */
    export(format = 'json') {
        switch (format) {
            case 'json':
                return this.exportJSON();
            case 'csv':
                return this.exportCSV();
            case 'xml':
                return this.exportXML();
            default:
                throw new Error(`Formato de exportación no soportado: ${format}`);
        }
    }

    /**
     * Exporta en formato JSON
     */
    exportJSON() {
        const data = {
            version: '1.0',
            exported: new Date().toISOString(),
            totalEntries: this.entries.length,
            entries: this.entries
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Exporta en formato CSV
     */
    exportCSV() {
        const headers = [
            'Rank', 'Player', 'Score', 'Mode', 'Kills', 'Deaths', 'K/D',
            'Wins', 'Losses', 'Win Rate', 'Time', 'Date'
        ];

        const rows = this.entries.map((entry, index) => [
            index + 1,
            entry.player,
            entry.score,
            entry.mode,
            entry.stats.kills,
            entry.stats.deaths,
            this.calculateKD(entry),
            entry.stats.wins,
            entry.stats.losses,
            this.calculateWinRate(entry) + '%',
            this.formatTime(entry.stats.time),
            new Date(entry.timestamp).toLocaleDateString()
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    /**
     * Exporta en formato XML
     */
    exportXML() {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<leaderboard>\n';
        xml += `  <exported>${new Date().toISOString()}</exported>\n`;
        xml += `  <totalEntries>${this.entries.length}</totalEntries>\n`;
        xml += '  <entries>\n';

        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            xml += `    <entry rank="${i + 1}">\n`;
            xml += `      <player>${this.escapeXML(entry.player)}</player>\n`;
            xml += `      <score>${entry.score}</score>\n`;
            xml += `      <mode>${entry.mode}</mode>\n`;
            xml += `      <kills>${entry.stats.kills}</kills>\n`;
            xml += `      <deaths>${entry.stats.deaths}</deaths>\n`;
            xml += `      <wins>${entry.stats.wins}</wins>\n`;
            xml += `      <losses>${entry.stats.losses}</losses>\n`;
            xml += `      <time>${entry.stats.time}</time>\n`;
            xml += `      <timestamp>${entry.timestamp}</timestamp>\n`;
            xml += '    </entry>\n';
        }

        xml += '  </entries>\n';
        xml += '</leaderboard>';

        return xml;
    }

    /**
     * Escapa caracteres para XML
     */
    escapeXML(str) {
        return str.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    /**
     * Importa datos
     */
    import(data, format = 'json') {
        try {
            let entries;

            switch (format) {
                case 'json':
                    entries = this.importJSON(data);
                    break;
                case 'csv':
                    entries = this.importCSV(data);
                    break;
                default:
                    throw new Error(`Formato de importación no soportado: ${format}`);
            }

            // Validar y añadir entradas
            let addedCount = 0;
            for (const entryData of entries) {
                if (this.addEntry(entryData)) {
                    addedCount++;
                }
            }

            // Guardar cambios
            this.saveLeaderboard();

            this.emit('importComplete', {
                total: entries.length,
                added: addedCount
            });

            console.log(`Importación completada: ${addedCount}/${entries.length} entradas añadidas`);
            return addedCount;

        } catch (error) {
            console.error('Error al importar datos:', error);
            this.emit('importError', { error });
            return 0;
        }
    }

    /**
     * Importa desde JSON
     */
    importJSON(data) {
        const parsed = JSON.parse(data);
        return parsed.entries || [];
    }

    /**
     * Importa desde CSV
     */
    importCSV(data) {
        const lines = data.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        const entries = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;

            const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
            const entry = {};

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j].toLowerCase();
                const value = values[j];

                switch (header) {
                    case 'player':
                        entry.player = value;
                        break;
                    case 'score':
                        entry.score = parseInt(value);
                        break;
                    case 'mode':
                        entry.mode = value;
                        break;
                    case 'kills':
                        entry.kills = parseInt(value);
                        break;
                    case 'deaths':
                        entry.deaths = parseInt(value);
                        break;
                    case 'wins':
                        entry.wins = parseInt(value);
                        break;
                    case 'losses':
                        entry.losses = parseInt(value);
                        break;
                    case 'time':
                        entry.time = this.parseTime(value);
                        break;
                }
            }

            entries.push(entry);
        }

        return entries;
    }

    /**
     * Parsea un tiempo en formato MM:SS
     */
    parseTime(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0]);
            const seconds = parseInt(parts[1]);
            return minutes * 60 + seconds;
        }
        return 0;
    }

    /**
     * Formatea un tiempo en segundos a MM:SS
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Limpia la tabla
     */
    clear() {
        this.entries = [];
        this.saveLeaderboard();
        this.emit('cleared');
        console.log('Tabla de posiciones limpiada');
    }

    /**
     * Guarda la tabla en almacenamiento local
     */
    saveLeaderboard() {
        try {
            const data = {
                entries: this.entries,
                lastUpdated: Date.now(),
                version: '1.0'
            };

            localStorage.setItem('shooter_arena_leaderboard', JSON.stringify(data));
        } catch (error) {
            console.error('Error al guardar tabla:', error);
        }
    }

    /**
     * Carga la tabla desde almacenamiento local
     */
    loadLeaderboard() {
        try {
            const data = localStorage.getItem('shooter_arena_leaderboard');
            if (data) {
                const parsed = JSON.parse(data);

                // Validar versión
                if (parsed.version === '1.0') {
                    this.entries = parsed.entries || [];
                    this.sortEntries();
                    this.limitEntries();
                    console.log(`Tabla cargada: ${this.entries.length} entradas`);
                }
            }
        } catch (error) {
            console.error('Error al cargar tabla:', error);
        }
    }

    /**
     * Añade un event listener
     */
    on(event, callback) {
        if (!this.listeners) {
            this.listeners = new Map();
        }
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Elimina un event listener
     */
    off(event, callback) {
        if (this.listeners && this.listeners.has(event)) {
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
        if (this.listeners && this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error en event listener:', error);
                }
            });
        }
    }
}

// Crear instancia global del sistema de tablas
const leaderboardSystem = new LeaderboardSystem();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeaderboardSystem;
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.LeaderboardSystem = LeaderboardSystem;
    window.leaderboard = leaderboardSystem;
}