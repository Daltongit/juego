/**
 * Cliente de Supabase para Shooter Arena
 * Implementación completa del SDK de Supabase
 */

class SupabaseClient {
    constructor(url, key, options = {}) {
        this.url = url;
        this.key = key;
        this.options = {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            ...options
        };

        this.auth = new SupabaseAuth(this);
        this.db = new SupabaseDatabase(this);
        this.storage = new SupabaseStorage(this);
        this.functions = new SupabaseFunctions(this);
        this.realtime = new SupabaseRealtime(this);

        this.headers = {
            'apikey': this.key,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.key}`
        };

        this._initialize();
    }

    async _initialize() {
        // Intentar restaurar sesión
        if (this.options.persistSession) {
            await this.auth._recoverSession();
        }

        // Detectar sesión en URL
        if (this.options.detectSessionInUrl && typeof window !== 'undefined') {
            await this.auth._getSessionFromUrl();
        }
    }

    _buildUrl(path) {
        return `${this.url}/rest/v1/${path}`;
    }

    async _request(method, path, options = {}) {
        const url = this._buildUrl(path);
        const config = {
            method,
            headers: { ...this.headers, ...options.headers }
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        if (options.query) {
            const params = new URLSearchParams();
            Object.entries(options.query).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v));
                } else {
                    params.append(key, value);
                }
            });
            url += `?${params.toString()}`;
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json();
                throw new SupabaseError(error.message || 'Request failed', response.status, error);
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}

// ===== AUTENTICACIÓN =====
class SupabaseAuth {
    constructor(client) {
        this.client = client;
        this.currentUser = null;
        this.session = null;
        this.listeners = new Map();
    }

    async signUp(email, password, options = {}) {
        const url = `${this.client.url}/auth/v1/signup`;
        const payload = {
            email,
            password,
            data: options.data || {}
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.client.key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new SupabaseError(data.message || 'Signup failed', response.status, data);
            }

            if (this.client.options.persistSession) {
                await this._persistSession(data);
            }

            this._updateSession(data);
            this._emit('SIGNED_IN', data);

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async signIn(email, password) {
        const url = `${this.client.url}/auth/v1/token?grant_type=password`;
        const payload = { email, password };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.client.key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new SupabaseError(data.message || 'Sign in failed', response.status, data);
            }

            if (this.client.options.persistSession) {
                await this._persistSession(data);
            }

            this._updateSession(data);
            this._emit('SIGNED_IN', data);

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async signInWithOAuth(provider, options = {}) {
        const url = `${this.client.url}/auth/v1/authorize`;
        const params = new URLSearchParams({
            provider,
            client_id: this.client.key,
            redirect_to: options.redirectTo || window.location.href,
            scope: options.scopes || ''
        });

        window.location.href = `${url}?${params.toString()}`;
    }

    async signOut() {
        if (!this.session) {
            return { error: new Error('No active session') };
        }

        const url = `${this.client.url}/auth/v1/logout`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.client.key,
                    'Authorization': `Bearer ${this.session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            await this._removeSession();
            this._updateSession(null);
            this._emit('SIGNED_OUT', null);

            return { data: {}, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async updateUser(attributes) {
        if (!this.session) {
            return { error: new Error('No active session') };
        }

        const url = `${this.client.url}/auth/v1/user`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'apikey': this.client.key,
                    'Authorization': `Bearer ${this.session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(attributes)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new SupabaseError(data.message || 'Update failed', response.status, data);
            }

            this.currentUser = { ...this.currentUser, ...data };
            this._emit('USER_UPDATED', this.currentUser);

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async resetPassword(email) {
        const url = `${this.client.url}/auth/v1/recover`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.client.key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new SupabaseError(data.message || 'Reset failed', response.status, data);
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async refreshSession() {
        if (!this.session?.refresh_token) {
            return { error: new Error('No refresh token') };
        }

        const url = `${this.client.url}/auth/v1/token?grant_type=refresh_token`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.client.key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: this.session.refresh_token })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new SupabaseError(data.message || 'Refresh failed', response.status, data);
            }

            if (this.client.options.persistSession) {
                await this._persistSession(data);
            }

            this._updateSession(data);

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getSession() {
        return this.session;
    }

    onAuthStateChange(callback) {
        const id = Math.random().toString(36).substr(2, 9);
        this.listeners.set(id, callback);

        // Llamar inmediatamente con el estado actual
        if (this.session) {
            callback('SIGNED_IN', this.session);
        } else {
            callback('SIGNED_OUT', null);
        }

        return { data: { subscription: { id } } };
    }

    async _persistSession(session) {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('supabase.auth.token', JSON.stringify(session));
        }
    }

    async _recoverSession() {
        if (typeof window !== 'undefined' && window.localStorage) {
            const token = window.localStorage.getItem('supabase.auth.token');
            if (token) {
                try {
                    const session = JSON.parse(token);
                    this._updateSession(session);
                    return true;
                } catch (error) {
                    console.error('Failed to recover session:', error);
                }
            }
        }
        return false;
    }

    async _removeSession() {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('supabase.auth.token');
        }
    }

    async _getSessionFromUrl() {
        if (typeof window === 'undefined') return;

        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        if (accessToken && refreshToken) {
            const session = {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: Date.now() + (urlParams.get('expires_in') || 3600) * 1000
            };

            // Obtener información del usuario
            const userUrl = `${this.client.url}/auth/v1/user`;
            const response = await fetch(userUrl, {
                headers: {
                    'apikey': this.client.key,
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                session.user = user;

                if (this.client.options.persistSession) {
                    await this._persistSession(session);
                }

                this._updateSession(session);
                this._emit('SIGNED_IN', session);

                // Limpiar URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    _updateSession(session) {
        this.session = session;
        this.currentUser = session?.user || null;

        if (session) {
            this.client.headers['Authorization'] = `Bearer ${session.access_token}`;
        } else {
            delete this.client.headers['Authorization'];
        }
    }

    _emit(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Auth state change callback error:', error);
            }
        });
    }
}

// ===== BASE DE DATOS =====
class SupabaseDatabase {
    constructor(client) {
        this.client = client;
    }

    from(table) {
        return new SupabaseQueryBuilder(this.client, table);
    }

    rpc(functionName, params = {}) {
        const url = `${this.client.url}/rest/v1/rpc/${functionName}`;

        return this.client._request('POST', `rpc/${functionName}`, {
            body: params
        });
    }
}

class SupabaseQueryBuilder {
    constructor(client, table) {
        this.client = client;
        this.table = table;
        this.query = {};
        this.filters = [];
        this.ordering = [];
        this.limiting = null;
        this.offsetting = null;
        this.selecting = '*';
    }

    select(columns = '*') {
        this.selecting = columns;
        return this;
    }

    insert(values, options = {}) {
        return this.client._request('POST', this.table, {
            body: Array.isArray(values) ? values : [values],
            query: {
                returning: options.returning || 'representation',
                on_conflict: options.onConflict
            }
        });
    }

    update(values, options = {}) {
        return this.client._request('PATCH', this.table, {
            body: values,
            query: {
                returning: options.returning || 'representation'
            },
            ...this._buildQuery()
        });
    }

    delete(options = {}) {
        return this.client._request('DELETE', this.table, {
            query: {
                returning: options.returning || 'representation'
            },
            ...this._buildQuery()
        });
    }

    eq(column, value) {
        this.filters.push(`${column}=eq.${value}`);
        return this;
    }

    neq(column, value) {
        this.filters.push(`${column}=neq.${value}`);
        return this;
    }

    gt(column, value) {
        this.filters.push(`${column}=gt.${value}`);
        return this;
    }

    gte(column, value) {
        this.filters.push(`${column}=gte.${value}`);
        return this;
    }

    lt(column, value) {
        this.filters.push(`${column}=lt.${value}`);
        return this;
    }

    lte(column, value) {
        this.filters.push(`${column}=lte.${value}`);
        return this;
    }

    like(column, pattern) {
        this.filters.push(`${column}=like.${pattern}`);
        return this;
    }

    ilike(column, pattern) {
        this.filters.push(`${column}=ilike.${pattern}`);
        return this;
    }

    is(column, value) {
        this.filters.push(`${column}=is.${value}`);
        return this;
    }

    in(column, values) {
        this.filters.push(`${column}=in.(${values.join(',')})`);
        return this;
    }

    contains(column, value) {
        this.filters.push(`${column}=cs.${JSON.stringify(value)}`);
        return this;
    }

    containedBy(column, value) {
        this.filters.push(`${column}=cd.${JSON.stringify(value)}`);
        return this;
    }

    order(column, options = {}) {
        const ascending = options.ascending !== false;
        const nullsFirst = options.nullsFirst === true;

        let order = `${column}.${ascending ? 'asc' : 'desc'}`;
        if (nullsFirst) order += '.nullsfirst';

        this.ordering.push(order);
        return this;
    }

    limit(count) {
        this.limiting = count;
        return this;
    }

    offset(count) {
        this.offsetting = count;
        return this;
    }

    range(from, to) {
        this.limiting = to - from + 1;
        this.offsetting = from;
        return this;
    }

    single() {
        this.query.limit = 1;
        this.query.single = true;
        return this;
    }

    maybeSingle() {
        this.query.limit = 1;
        this.query.maybeSingle = true;
        return this;
    }

    csv() {
        this.query.format = 'csv';
        return this;
    }

    explain(options = {}) {
        this.query.explain = options.analyze ? 'analyze' : true;
        return this;
    }

    _buildQuery() {
        const query = {};

        if (this.selecting !== '*') {
            query.select = this.selecting;
        }

        if (this.filters.length > 0) {
            query.and = `(${this.filters.join(',')})`;
        }

        if (this.ordering.length > 0) {
            query.order = this.ordering.join(',');
        }

        if (this.limiting !== null) {
            query.limit = this.limiting;
        }

        if (this.offsetting !== null) {
            query.offset = this.offsetting;
        }

        return { query };
    }

    async then(resolve, reject) {
        const { data, error } = await this.client._request('GET', this.table, this._buildQuery());

        if (error) {
            if (reject) reject(error);
            throw error;
        }

        if (resolve) resolve(data);
        return data;
    }

    async catch(reject) {
        const { data, error } = await this.client._request('GET', this.table, this._buildQuery());

        if (error && reject) {
            reject(error);
        } else if (error) {
            throw error;
        }

        return data;
    }

    async finally(callback) {
        try {
            const result = await this;
            if (callback) callback();
            return result;
        } catch (error) {
            if (callback) callback();
            throw error;
        }
    }
}

// ===== ALMACENAMIENTO =====
class SupabaseStorage {
    constructor(client) {
        this.client = client;
    }

    from(bucketId) {
        return new SupabaseStorageApi(this.client, bucketId);
    }

    async listBuckets() {
        const url = `${this.client.url}/storage/v1/bucket`;

        try {
            const response = await fetch(url, {
                headers: this.client.headers
            });

            if (!response.ok) {
                throw new Error('Failed to list buckets');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async getBucket(bucketId) {
        const url = `${this.client.url}/storage/v1/bucket/${bucketId}`;

        try {
            const response = await fetch(url, {
                headers: this.client.headers
            });

            if (!response.ok) {
                throw new Error('Failed to get bucket');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async createBucket(bucketId, options = {}) {
        const url = `${this.client.url}/storage/v1/bucket`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.client.headers,
                body: JSON.stringify({
                    id: bucketId,
                    name: bucketId,
                    public: options.public !== false,
                    ...options
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create bucket');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async updateBucket(bucketId, options) {
        const url = `${this.client.url}/storage/v1/bucket/${bucketId}`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.client.headers,
                body: JSON.stringify(options)
            });

            if (!response.ok) {
                throw new Error('Failed to update bucket');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async deleteBucket(bucketId) {
        const url = `${this.client.url}/storage/v1/bucket/${bucketId}`;

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.client.headers
            });

            if (!response.ok) {
                throw new Error('Failed to delete bucket');
            }

            return { data: {}, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async emptyBucket(bucketId) {
        const url = `${this.client.url}/storage/v1/bucket/${bucketId}/empty`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.client.headers
            });

            if (!response.ok) {
                throw new Error('Failed to empty bucket');
            }

            return { data: {}, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}

class SupabaseStorageApi {
    constructor(client, bucketId) {
        this.client = client;
        this.bucketId = bucketId;
    }

    async upload(path, file, options = {}) {
        const url = `${this.client.url}/storage/v1/object/${this.bucketId}/${path}`;

        const formData = new FormData();
        formData.append('file', file);

        if (options.upsert) {
            formData.append('upsert', 'true');
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': this.client.key,
                    'Authorization': `Bearer ${this.client.headers.Authorization}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async update(path, file, options = {}) {
        const url = `${this.client.url}/storage/v1/object/${this.bucketId}/${path}`;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'apikey': this.client.key,
                    'Authorization': `Bearer ${this.client.headers.Authorization}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Update failed');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async move(fromPath, toPath) {
        const url = `${this.client.url}/storage/v1/object/move`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...this.client.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bucketId: this.bucketId,
                    sourceKey: fromPath,
                    destinationKey: toPath
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Move failed');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async copy(fromPath, toPath) {
        const url = `${this.client.url}/storage/v1/object/copy`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...this.client.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bucketId: this.bucketId,
                    sourceKey: fromPath,
                    destinationKey: toPath
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Copy failed');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async createSignedUrl(path, expiresIn, options = {}) {
        const url = `${this.client.url}/storage/v1/object/sign/${this.bucketId}/${path}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...this.client.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    expiresIn,
                    ...options
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create signed URL');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async createSignedUrls(paths, expiresIn, options = {}) {
        const url = `${this.client.url}/storage/v1/object/sign/${this.bucketId}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...this.client.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paths,
                    expiresIn,
                    ...options
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create signed URLs');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async getPublicUrl(path, options = {}) {
        const url = `${this.client.url}/storage/v1/object/public/${this.bucketId}/${path}`;

        if (options.download) {
            return `${url}?download=true`;
        }

        return url;
    }

    async download(path) {
        const url = `${this.client.url}/storage/v1/object/${this.bucketId}/${path}`;

        try {
            const response = await fetch(url, {
                headers: this.client.headers
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            return { data: blob, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async list(path = '', options = {}) {
        const url = `${this.client.url}/storage/v1/object/list/${this.bucketId}`;

        const params = new URLSearchParams({
            prefix: path,
            limit: options.limit || 100,
            offset: options.offset || 0,
            sortBy: options.sortBy || 'created_at',
            sortorder: options.sortOrder || 'asc',
            search: options.search || ''
        });

        try {
            const response = await fetch(`${url}?${params}`, {
                headers: this.client.headers
            });

            if (!response.ok) {
                throw new Error('List failed');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async remove(paths) {
        const url = `${this.client.url}/storage/v1/object/${this.bucketId}`;

        const prefixes = Array.isArray(paths) ? paths : [paths];

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    ...this.client.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prefixes })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Remove failed');
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}

// ===== FUNCIONES =====
class SupabaseFunctions {
    constructor(client) {
        this.client = client;
    }

    async invoke(functionName, options = {}) {
        const url = `${this.client.url}/functions/v1/${functionName}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...this.client.headers,
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Function invoke failed');
            }

            const isJson = response.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await response.json() : await response.text();

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}

// ===== REALTIME =====
class SupabaseRealtime {
    constructor(client) {
        this.client = client;
        this.channels = new Map();
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    channel(channelName) {
        if (!this.channels.has(channelName)) {
            const channel = new SupabaseChannel(this, channelName);
            this.channels.set(channelName, channel);
        }
        return this.channels.get(channelName);
    }

    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return;
        }

        const wsUrl = this.client.url.replace(/^https?/, 'wss') + '/realtime/v1/websocket';
        const url = `${wsUrl}?apikey=${this.client.key}&vsn=1.0.0`;

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('Supabase Realtime connected');

            // Reunir todos los canales
            this.channels.forEach(channel => {
                if (channel.state === 'joined') {
                    channel._join();
                }
            });
        };

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this._handleMessage(message);
        };

        this.socket.onclose = () => {
            this.isConnected = false;
            console.log('Supabase Realtime disconnected');

            // Intentar reconectar
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect();
                }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
            }
        };

        this.socket.onerror = (error) => {
            console.error('Supabase Realtime error:', error);
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    _handleMessage(message) {
        if (message.event === 'phx_reply') {
            const [ref, topic] = message.payload.ref.split('.');
            const channel = this.channels.get(topic);

            if (channel) {
                channel._handleReply(message);
            }
        } else if (message.event === 'phx_close') {
            const channel = this.channels.get(message.topic);
            if (channel) {
                channel.state = 'closed';
                channel._emit('closed', {});
            }
        } else if (message.event === 'phx_error') {
            const channel = this.channels.get(message.topic);
            if (channel) {
                channel._emit('error', message.payload);
            }
        } else {
            const channel = this.channels.get(message.topic);
            if (channel) {
                channel._handleBroadcast(message);
            }
        }
    }
}

class SupabaseChannel {
    constructor(realtime, name) {
        this.realtime = realtime;
        this.name = name;
        this.topic = `realtime:${name}`;
        this.state = 'unjoined';
        this.listeners = new Map();
        this.joinRef = null;
        this.ref = 0;
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return this;
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        return this;
    }

    join(params = {}) {
        if (this.state === 'joined') {
            return this;
        }

        this.state = 'joining';
        this._join(params);
        return this;
    }

    leave() {
        if (this.state !== 'joined') {
            return this;
        }

        this.state = 'leaving';
        this.realtime.send({
            topic: this.topic,
            event: 'phx_leave',
            payload: {},
            ref: this._makeRef()
        });

        return this;
    }

    send(event, payload) {
        if (this.state !== 'joined') {
            console.warn('Cannot send to unjoined channel');
            return this;
        }

        this.realtime.send({
            topic: this.topic,
            event: event,
            payload: payload,
            ref: this._makeRef()
        });

        return this;
    }

    _join(params = {}) {
        const payload = {
            config: {
                broadcast: { self: true },
                presence: { key: '' },
                postgres_changes: []
            },
            ...params
        };

        this.joinRef = this._makeRef();

        this.realtime.send({
            topic: this.topic,
            event: 'phx_join',
            payload: payload,
            ref: this.joinRef
        });
    }

    _handleReply(message) {
        if (message.payload.status === 'ok') {
            this.state = 'joined';
            this._emit('joined', message.payload);
        } else {
            this.state = 'error';
            this._emit('error', message.payload);
        }
    }

    _handleBroadcast(message) {
        const event = message.event;
        const payload = message.payload;

        if (event === 'postgres_changes') {
            this._emit('postgres_changes', payload);
        } else if (event === 'broadcast') {
            this._emit('broadcast', payload);
        } else if (event === 'presence') {
            this._emit('presence', payload);
        } else {
            this._emit(event, payload);
        }
    }

    _emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Channel callback error:', error);
                }
            });
        }
    }

    _makeRef() {
        return (this.ref++).toString();
    }
}

// ===== ERROR =====
class SupabaseError extends Error {
    constructor(message, status, details) {
        super(message);
        this.name = 'SupabaseError';
        this.status = status;
        this.details = details;
    }
}

// ===== CREACIÓN DEL CLIENTE =====
function createClient(url, key, options = {}) {
    return new SupabaseClient(url, key, options);
}

// Exportar para diferentes entornos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createClient, SupabaseClient };
}

if (typeof window !== 'undefined') {
    window.supabase = { createClient, SupabaseClient };
}