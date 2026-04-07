/**
 * Sistema de autenticación de Shooter Arena
 * Maneja login, registro, sesiones y perfiles de usuario
 */

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.sessionToken = null;
        this.isLoggedIn = false;
        this.rememberMe = false;
        this.listeners = new Map();

        // Inicializar sistema
        this.init();
    }

    /**
     * Inicializa el sistema de autenticación
     */
    init() {
        // Verificar si hay una sesión activa
        this.checkExistingSession();

        // Configurar eventos de formulario
        this.setupFormEvents();

        // Configurar listeners de almacenamiento
        this.setupStorageListeners();

        console.log('Sistema de autenticación inicializado');
    }

    /**
     * Verifica si existe una sesión activa
     */
    async checkExistingSession() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');

            if (token && userData) {
                // Validar token con el servidor
                const isValid = await this.validateToken(token);

                if (isValid) {
                    this.sessionToken = token;
                    this.currentUser = JSON.parse(userData);
                    this.isLoggedIn = true;
                    this.emit('login', this.currentUser);

                    // Actualizar UI
                    this.updateAuthUI(true);
                } else {
                    // Token inválido, limpiar sesión
                    this.clearSession();
                }
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            this.clearSession();
        }
    }

    /**
     * Configura los eventos de los formularios
     */
    setupFormEvents() {
        // Formulario de login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(loginForm);
            });
        }

        // Formulario de registro
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(registerForm);
            });
        }

        // Botón de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Checkbox de recordar
        const rememberCheckbox = document.getElementById('remember-me');
        if (rememberCheckbox) {
            rememberCheckbox.addEventListener('change', (e) => {
                this.rememberMe = e.target.checked;
            });
        }
    }

    /**
     * Configura los listeners de almacenamiento
     */
    setupStorageListeners() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_token' || e.key === 'user_data') {
                if (!e.newValue) {
                    // Sesión cerrada en otra pestaña
                    this.handleLogout();
                }
            }
        });
    }

    /**
     * Maneja el proceso de login
     */
    async handleLogin(form) {
        const formData = new FormData(form);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password'),
            remember: formData.get('remember') === 'on'
        };

        // Validar formulario
        const validation = this.validateLoginForm(credentials);
        if (!validation.isValid) {
            this.showError(validation.message);
            return;
        }

        // Mostrar estado de carga
        this.setLoadingState(form, true);

        try {
            // Intentar login
            const response = await this.login(credentials);

            if (response.success) {
                // Login exitoso
                this.sessionToken = response.token;
                this.currentUser = response.user;
                this.isLoggedIn = true;
                this.rememberMe = credentials.remember;

                // Guardar sesión
                this.saveSession(response.token, response.user, credentials.remember);

                // Emitir evento
                this.emit('login', this.currentUser);

                // Actualizar UI
                this.updateAuthUI(true);

                // Redirigir al juego
                this.redirectToGame();

                // Mostrar mensaje de éxito
                this.showSuccess('¡Bienvenido de vuelta, ' + response.user.username + '!');
            } else {
                // Login fallido
                this.showError(response.message || 'Credenciales incorrectas');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showError('Error de conexión. Inténtalo de nuevo.');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    /**
     * Maneja el proceso de registro
     */
    async handleRegister(form) {
        const formData = new FormData(form);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirm-password'),
            terms: formData.get('terms') === 'on'
        };

        // Validar formulario
        const validation = this.validateRegisterForm(userData);
        if (!validation.isValid) {
            this.showError(validation.message);
            return;
        }

        // Mostrar estado de carga
        this.setLoadingState(form, true);

        try {
            // Intentar registro
            const response = await this.register(userData);

            if (response.success) {
                // Registro exitoso
                this.showSuccess('¡Cuenta creada exitosamente! Por favor inicia sesión.');

                // Cambiar a formulario de login
                this.switchToLoginForm();

                // Limpiar formulario
                form.reset();
            } else {
                // Registro fallido
                this.showError(response.message || 'Error al crear la cuenta');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.showError('Error de conexión. Inténtalo de nuevo.');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    /**
     * Maneja el proceso de logout
     */
    async handleLogout() {
        try {
            // Notificar al servidor
            if (this.sessionToken) {
                await this.logout(this.sessionToken);
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        } finally {
            // Limpiar sesión local
            this.clearSession();

            // Emitir evento
            this.emit('logout');

            // Actualizar UI
            this.updateAuthUI(false);

            // Redirigir al menú principal
            this.redirectToMenu();

            // Mostrar mensaje
            this.showSuccess('Sesión cerrada correctamente');
        }
    }

    /**
     * Realiza el login con el servidor
     */
    async login(credentials) {
        // Simulación de llamada al servidor
        return new Promise((resolve) => {
            setTimeout(() => {
                // Validación simulada
                if (credentials.username === 'demo' && credentials.password === 'demo123') {
                    resolve({
                        success: true,
                        token: 'demo_token_' + Date.now(),
                        user: {
                            id: 1,
                            username: 'demo',
                            email: 'demo@shooterarena.com',
                            level: 5,
                            xp: 2500,
                            avatar: 'default',
                            stats: {
                                kills: 150,
                                deaths: 80,
                                wins: 25,
                                losses: 15
                            }
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Usuario o contraseña incorrectos'
                    });
                }
            }, 1000);
        });
    }

    /**
     * Realiza el registro con el servidor
     */
    async register(userData) {
        // Simulación de llamada al servidor
        return new Promise((resolve) => {
            setTimeout(() => {
                // Validación simulada
                if (userData.username === 'demo') {
                    resolve({
                        success: false,
                        message: 'El nombre de usuario ya está en uso'
                    });
                } else {
                    resolve({
                        success: true,
                        message: 'Cuenta creada exitosamente'
                    });
                }
            }, 1500);
        });
    }

    /**
     * Valida el token con el servidor
     */
    async validateToken(token) {
        // Simulación de validación
        return new Promise((resolve) => {
            setTimeout(() => {
                // Token de demo siempre válido
                if (token.startsWith('demo_token_')) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 500);
        });
    }

    /**
     * Cierra la sesión en el servidor
     */
    async logout(token) {
        // Simulación de logout
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 500);
        });
    }

    /**
     * Guarda la sesión en el almacenamiento
     */
    saveSession(token, user, remember) {
        const storage = remember ? localStorage : sessionStorage;

        storage.setItem('auth_token', token);
        storage.setItem('user_data', JSON.stringify(user));

        // Sincronizar entre pestañas
        if (remember) {
            sessionStorage.setItem('auth_token', token);
            sessionStorage.setItem('user_data', JSON.stringify(user));
        }
    }

    /**
     * Limpia la sesión actual
     */
    clearSession() {
        // Limpiar almacenamiento
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_data');

        // Resetear estado
        this.currentUser = null;
        this.sessionToken = null;
        this.isLoggedIn = false;
        this.rememberMe = false;
    }

    /**
     * Valida el formulario de login
     */
    validateLoginForm(credentials) {
        if (!credentials.username || credentials.username.trim().length < 3) {
            return {
                isValid: false,
                message: 'El nombre de usuario debe tener al menos 3 caracteres'
            };
        }

        if (!credentials.password || credentials.password.length < 6) {
            return {
                isValid: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            };
        }

        return { isValid: true };
    }

    /**
     * Valida el formulario de registro
     */
    validateRegisterForm(userData) {
        // Validar username
        if (!userData.username || userData.username.trim().length < 3) {
            return {
                isValid: false,
                message: 'El nombre de usuario debe tener al menos 3 caracteres'
            };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
            return {
                isValid: false,
                message: 'El nombre de usuario solo puede contener letras, números y guiones bajos'
            };
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!userData.email || !emailRegex.test(userData.email)) {
            return {
                isValid: false,
                message: 'El email no es válido'
            };
        }

        // Validar contraseña
        if (!userData.password || userData.password.length < 6) {
            return {
                isValid: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            };
        }

        if (userData.password !== userData.confirmPassword) {
            return {
                isValid: false,
                message: 'Las contraseñas no coinciden'
            };
        }

        // Validar términos
        if (!userData.terms) {
            return {
                isValid: false,
                message: 'Debes aceptar los términos y condiciones'
            };
        }

        return { isValid: true };
    }

    /**
     * Actualiza la UI según el estado de autenticación
     */
    updateAuthUI(loggedIn) {
        // Elementos a mostrar/ocultar
        const authElements = document.querySelectorAll('.auth-required');
        const guestElements = document.querySelectorAll('.guest-only');
        const userElements = document.querySelectorAll('.user-only');

        if (loggedIn) {
            // Mostrar elementos para usuarios autenticados
            authElements.forEach(el => el.style.display = 'block');
            userElements.forEach(el => el.style.display = 'block');
            guestElements.forEach(el => el.style.display = 'none');

            // Actualizar información del usuario
            this.updateUserInfo();
        } else {
            // Mostrar elementos para invitados
            authElements.forEach(el => el.style.display = 'none');
            userElements.forEach(el => el.style.display = 'none');
            guestElements.forEach(el => el.style.display = 'block');
        }
    }

    /**
     * Actualiza la información del usuario en la UI
     */
    updateUserInfo() {
        if (!this.currentUser) return;

        // Nombre de usuario
        const usernameElements = document.querySelectorAll('.user-name');
        usernameElements.forEach(el => {
            el.textContent = this.currentUser.username;
        });

        // Nivel
        const levelElements = document.querySelectorAll('.user-level');
        levelElements.forEach(el => {
            el.textContent = 'Nivel ' + this.currentUser.level;
        });

        // Avatar
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(el => {
            el.src = `/assets/avatars/${this.currentUser.avatar}.png`;
        });

        // Estadísticas
        const statsElements = document.querySelectorAll('.user-stats');
        statsElements.forEach(el => {
            el.innerHTML = `
                <div class="stat">
                    <span class="stat-label">K/D:</span>
                    <span class="stat-value">${this.calculateKD()}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Victorias:</span>
                    <span class="stat-value">${this.currentUser.stats.wins}</span>
                </div>
            `;
        });
    }

    /**
     * Calcula la relación K/D
     */
    calculateKD() {
        if (!this.currentUser || this.currentUser.stats.deaths === 0) {
            return this.currentUser ? this.currentUser.stats.kills : 0;
        }
        return (this.currentUser.stats.kills / this.currentUser.stats.deaths).toFixed(2);
    }

    /**
     * Establece el estado de carga en un formulario
     */
    setLoadingState(form, loading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input');

        if (loading) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Cargando...';
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || 'Enviar';
            inputs.forEach(input => input.disabled = false);
        }
    }

    /**
     * Cambia al formulario de login
     */
    switchToLoginForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const switchBtn = document.getElementById('switch-to-register');

        if (loginForm && registerForm) {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';

            if (switchBtn) {
                switchBtn.textContent = '¿No tienes cuenta? Regístrate';
            }
        }
    }

    /**
     * Cambia al formulario de registro
     */
    switchToRegisterForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const switchBtn = document.getElementById('switch-to-register');

        if (loginForm && registerForm) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';

            if (switchBtn) {
                switchBtn.textContent = '¿Ya tienes cuenta? Inicia sesión';
            }
        }
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Muestra un mensaje de éxito
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Muestra un mensaje al usuario
     */
    showMessage(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Añadir al DOM
        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remover después de un tiempo
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    /**
     * Redirige al juego
     */
    redirectToGame() {
        window.location.href = '#game';
    }

    /**
     * Redirige al menú principal
     */
    redirectToMenu() {
        window.location.href = '#menu';
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
     * Obtiene el usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verifica si el usuario está autenticado
     */
    isAuthenticated() {
        return this.isLoggedIn;
    }

    /**
     * Obtiene el token de sesión
     */
    getSessionToken() {
        return this.sessionToken;
    }
}

// Crear instancia global del sistema de autenticación
const authSystem = new AuthSystem();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}

// Configuración global (para navegadores)
if (typeof window !== 'undefined') {
    window.AuthSystem = AuthSystem;
    window.auth = authSystem;
}