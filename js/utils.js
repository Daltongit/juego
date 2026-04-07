/**
 * Utilidades generales para Shooter Arena
 * Funciones helper y herramientas comunes
 */

// ===== MATEMÁTICAS =====
class MathUtils {
    /**
     * Genera un número aleatorio entre min y max
     */
    static randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Genera un entero aleatorio entre min y max (inclusive)
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Clampa un valor entre min y max
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Interpola linealmente entre a y b
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Interpola suavemente entre a y b
     */
    static smoothStep(a, b, t) {
        t = this.clamp(t, 0, 1);
        t = t * t * (3 - 2 * t);
        return a + (b - a) * t;
    }

    /**
     * Calcula la distancia entre dos puntos
     */
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calcula el ángulo entre dos puntos
     */
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    /**
     * Normaliza un ángulo a [-π, π]
     */
    static normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    /**
     * Convierte grados a radianes
     */
    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Convierte radianes a grados
     */
    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * Verifica si un punto está dentro de un rectángulo
     */
    static pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }

    /**
     * Verifica si dos rectángulos colisionan
     */
    static rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    /**
     * Verifica si dos círculos colisionan
     */
    static circleCollision(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < r1 + r2;
    }
}

// ===== COLORES =====
class ColorUtils {
    /**
     * Convierte hex a RGB
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Convierte RGB a hex
     */
    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /**
     * Convierte RGB a HSL
     */
    static rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    /**
     * Convierte HSL a RGB
     */
    static hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;

        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * Mezcla dos colores
     */
    static blendColors(color1, color2, ratio) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);

        if (!rgb1 || !rgb2) return color1;

        const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
        const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
        const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

        return this.rgbToHex(r, g, b);
    }

    /**
     * Aclara un color
     */
    static lighten(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.l = Math.min(100, hsl.l + amount);

        const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    }

    /**
     * Oscurece un color
     */
    static darken(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.l = Math.max(0, hsl.l - amount);

        const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    }
}

// ===== CADENAS =====
class StringUtils {
    /**
     * Capitaliza la primera letra
     */
    static capitalize(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Convierte a camelCase
     */
    static toCamelCase(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
    }

    /**
     * Convierte a snake_case
     */
    static toSnakeCase(str) {
        return str.replace(/\W+/g, ' ')
            .split(/ |\B(?=[A-Z])/)
            .map(word => word.toLowerCase())
            .join('_');
    }

    /**
     * Trunca una cadena
     */
    static truncate(str, length, suffix = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length - suffix.length) + suffix;
    }

    /**
     * Formatea tiempo en segundos a MM:SS
     */
    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Formatea números grandes
     */
    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Genera un string aleatorio
     */
    static random(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Escapa HTML
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ===== FECHAS =====
class DateUtils {
    /**
     * Formatea una fecha
     */
    static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * Obtiene tiempo relativo (hace 2 horas, etc.)
     */
    static getRelativeTime(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) {
            return 'hace un momento';
        } else if (diffMins < 60) {
            return `hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
        } else if (diffHours < 24) {
            return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
        } else if (diffDays < 7) {
            return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
        } else {
            return this.formatDate(date, 'DD/MM/YYYY');
        }
    }

    /**
     * Añade tiempo a una fecha
     */
    static addTime(date, amount, unit) {
        const d = new Date(date);

        switch (unit) {
            case 'seconds':
                d.setSeconds(d.getSeconds() + amount);
                break;
            case 'minutes':
                d.setMinutes(d.getMinutes() + amount);
                break;
            case 'hours':
                d.setHours(d.getHours() + amount);
                break;
            case 'days':
                d.setDate(d.getDate() + amount);
                break;
            case 'weeks':
                d.setDate(d.getDate() + (amount * 7));
                break;
            case 'months':
                d.setMonth(d.getMonth() + amount);
                break;
            case 'years':
                d.setFullYear(d.getFullYear() + amount);
                break;
        }

        return d;
    }
}

// ===== ALMACENAMIENTO =====
class StorageUtils {
    /**
     * Guarda datos en localStorage
     */
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
            return false;
        }
    }

    /**
     * Obtiene datos de localStorage
     */
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error al leer de localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Elimina datos de localStorage
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error al eliminar de localStorage:', error);
            return false;
        }
    }

    /**
     * Limpia localStorage
     */
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error al limpiar localStorage:', error);
            return false;
        }
    }

    /**
     * Verifica si localStorage está disponible
     */
    static isAvailable() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// ===== VALIDACIÓN =====
class ValidationUtils {
    /**
     * Valida un email
     */
    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Valida un nombre de usuario
     */
    static isValidUsername(username) {
        // Al menos 3 caracteres, solo letras, números y guiones bajos
        const regex = /^[a-zA-Z0-9_]{3,}$/;
        return regex.test(username);
    }

    /**
     * Valida una contraseña
     */
    static isValidPassword(password) {
        // Al menos 6 caracteres
        return password && password.length >= 6;
    }

    /**
     * Valida que un campo no esté vacío
     */
    static isNotEmpty(value) {
        return value && value.trim().length > 0;
    }

    /**
     * Valida un número
     */
    static isNumber(value) {
        return !isNaN(value) && isFinite(value);
    }

    /**
     * Valida un rango numérico
     */
    static isInRange(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }
}

// ===== ANIMACIÓN =====
class AnimationUtils {
    /**
     * Crea una animación con easing
     */
    static animate(duration, easing, onUpdate, onComplete) {
        const startTime = Date.now();

        const frame = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = this.easing[easing](progress);

            if (onUpdate) {
                onUpdate(easedProgress);
            }

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else if (onComplete) {
                onComplete();
            }
        };

        requestAnimationFrame(frame);
    }

    /**
     * Funciones de easing
     */
    static easing = {
        linear: t => t,
        easeIn: t => t * t,
        easeOut: t => t * (2 - t),
        easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        bounce: t => {
            const n1 = 7.5625;
            const d1 = 2.75;

            if (t < 1 / d1) {
                return n1 * t * t;
            } else if (t < 2 / d1) {
                return n1 * (t -= 1.5 / d1) * t + 0.75;
            } else if (t < 2.5 / d1) {
                return n1 * (t -= 2.25 / d1) * t + 0.9375;
            } else {
                return n1 * (t -= 2.625 / d1) * t + 0.984375;
            }
        }
    };

    /**
     * Anima el valor de un elemento
     */
    static animateValue(element, start, end, duration, suffix = '') {
        this.animate(duration, 'easeOut', (progress) => {
            const current = start + (end - start) * progress;
            element.textContent = Math.round(current) + suffix;
        });
    }
}

// ===== DISPOSITIVO =====
class DeviceUtils {
    /**
     * Verifica si es un dispositivo móvil
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Verifica si es una tablet
     */
    static isTablet() {
        return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    }

    /**
     * Verifica si es un escritorio
     */
    static isDesktop() {
        return !this.isMobile() && !this.isTablet();
    }

    /**
     * Obtiene información del dispositivo
     */
    static getDeviceInfo() {
        return {
            mobile: this.isMobile(),
            tablet: this.isTablet(),
            desktop: this.isDesktop(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: screen.width,
            screenHeight: screen.height,
            pixelRatio: window.devicePixelRatio || 1
        };
    }
}

// ===== RENDIMIENTO =====
class PerformanceUtils {
    /**
     * Mide el tiempo de ejecución de una función
     */
    static measureTime(fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        return { result, time: end - start };
    }

    /**
     * Crea un debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Crea una throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Optimiza el bucle de animación
     */
    static optimizeAnimationLoop(callback) {
        let rafId;
        let lastTime = 0;
        const targetFPS = 60;
        const frameInterval = 1000 / targetFPS;

        const loop = (currentTime) => {
            rafId = requestAnimationFrame(loop);

            const deltaTime = currentTime - lastTime;

            if (deltaTime >= frameInterval) {
                callback(deltaTime);
                lastTime = currentTime - (deltaTime % frameInterval);
            }
        };

        rafId = requestAnimationFrame(loop);

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }
}

// ===== CARGA DE RECURSOS =====
class ResourceUtils {
    /**
     * Carga una imagen
     */
    static loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    /**
     * Carga múltiples imágenes
     */
    static loadImages(sources) {
        const promises = sources.map(src => this.loadImage(src));
        return Promise.all(promises);
    }

    /**
     * Carga un audio
     */
    static loadAudio(src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
            audio.src = src;
        });
    }

    /**
     * Carga múltiples audios
     */
    static loadAudios(sources) {
        const promises = sources.map(src => this.loadAudio(src));
        return Promise.all(promises);
    }

    /**
     * Carga un archivo JSON
     */
    static loadJSON(src) {
        return fetch(src)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            });
    }

    /**
     * Carga un archivo de texto
     */
    static loadText(src) {
        return fetch(src)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            });
    }
}

// Exportar todas las utilidades
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MathUtils,
        ColorUtils,
        StringUtils,
        DateUtils,
        StorageUtils,
        ValidationUtils,
        AnimationUtils,
        DeviceUtils,
        PerformanceUtils,
        ResourceUtils
    };
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.Utils = {
        MathUtils,
        ColorUtils,
        StringUtils,
        DateUtils,
        StorageUtils,
        ValidationUtils,
        AnimationUtils,
        DeviceUtils,
        PerformanceUtils,
        ResourceUtils
    };
}