const AdminApp = {
    confirmCallback: null,
    currentSessionNumber: null,
    ws: null,
    autoRefreshInterval: null,

    async init() {
        this.toastContainer = document.getElementById('toast-container');
        this.setupAdminEventListeners();
        this.setupTabNavigation();
        await this.checkAuth();
        this.loadData();
        this.setupAutoRefresh();
    },

    setupAdminEventListeners() {
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadData());
        document.getElementById('refresh-sessions')?.addEventListener('click', () => this.loadData());
        document.getElementById('add-session-btn')?.addEventListener('click', () => this.switchTab('add-session'));
        document.getElementById('add-session-quick')?.addEventListener('click', () => this.switchTab('add-session'));
        document.getElementById('add-session-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.createSession(); });
        document.getElementById('pair-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.generatePairCode(); });
        document.getElementById('change-password-btn')?.addEventListener('click', () => this.changePassword());
        document.getElementById('new-password')?.addEventListener('input', (e) => this.validatePassword(e.target.value));
        document.getElementById('auto-refresh')?.addEventListener('change', (e) => this.toggleAutoRefresh(e.target.checked));
        document.getElementById('show-notifications')?.addEventListener('change', (e) => this.toggleNotifications(e.target.checked));
        document.getElementById('refresh-connected')?.addEventListener('click', () => this.loadConnectedNumbers());
        document.getElementById('refresh-commands')?.addEventListener('click', () => this.loadCommands());
        document.getElementById('command-session-filter')?.addEventListener('change', () => this.loadCommands());
        document.getElementById('command-search')?.addEventListener('input', () => this.loadCommands());

        // Modal close handlers
        document.getElementById('session-modal-close')?.addEventListener('click', () => this.closeSessionModal());
        document.getElementById('session-modal-close-btn')?.addEventListener('click', () => this.closeSessionModal());
        document.getElementById('pair-modal-close')?.addEventListener('click', () => this.closePairModal());
        document.getElementById('pair-modal-close-btn')?.addEventListener('click', () => this.closePairModal());
        document.getElementById('qr-modal-close')?.addEventListener('click', () => this.closeQRModal());
        document.getElementById('qr-modal-close-btn')?.addEventListener('click', () => this.closeQRModal());
        document.getElementById('qr-refresh-btn')?.addEventListener('click', () => this.refreshQRCode());
        document.getElementById('confirm-modal-close')?.addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirm-modal-cancel')?.addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirm-modal-confirm')?.addEventListener('click', () => this.executeConfirm());

        // Sidebar toggle
        document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) {
                sidebar.classList.toggle('open');
                sidebar.classList.toggle('collapsed');
            }
            if (overlay) {
                overlay.classList.toggle('active');
            }
        });
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        });
    },

    setupTabNavigation() {
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(item.dataset.tab);
            });
        });
    },

    async checkAuth() {
        const response = await fetch('/api/auth/admin/check');
        const data = await response.json();

        if (!data.configured) {
            this.showSetupModal();
            return;
        }

        if (!data.authenticated) {
            this.showLoginModal();
            return;
        }

        // Check if using default password
        const configRes = await fetch('/api/admin/config');
        const config = await configRes.json();
        if (config.isDefault) {
            document.getElementById('default-password-alert').style.display = 'flex';
        }

        this.setupAutoRefresh();
    },

    showSetupModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width: 480px;">
                <div class="modal-header">
                    <h3 class="modal-title">Admin Setup Required</h3>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">No admin password configured. Please set a strong password to secure the admin panel.</p>
                    <div class="alert alert-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        <div>Password must be at least 12 characters with uppercase, lowercase, number, and special character.</div>
                    </div>
                    <form id="setup-form">
                        <div class="form-group">
                            <label class="label">Admin Password</label>
                            <input type="password" class="input" id="setup-password" placeholder="Min 12 chars, upper, lower, number, special" required>
                            <div style="margin-top: 8px; display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap;">
                                <span id="setup-req-length">✗ 12+ characters</span>
                                <span id="setup-req-upper">✗ Uppercase</span>
                                <span id="setup-req-lower">✗ Lowercase</span>
                                <span id="setup-req-number">✗ Number</span>
                                <span id="setup-req-special">✗ Special char</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="label">Confirm Password</label>
                            <input type="password" class="input" id="setup-confirm" placeholder="Confirm password" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Setup Admin</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('setup-password')?.addEventListener('input', (e) => this.validatePassword(e.target.value, 'setup-'));
        document.getElementById('setup-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pass = document.getElementById('setup-password').value;
            const confirm = document.getElementById('setup-confirm').value;

            if (pass !== confirm) {
                this.showToast('Passwords do not match', 'error');
                return;
            }

            const response = await fetch('/api/admin/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass })
            });
            const data = await response.json();

            if (data.success) {
                this.showToast('Admin configured successfully', 'success');
                modal.remove();
                this.checkAuth();
            } else {
                this.showToast(data.message || 'Setup failed', 'error');
            }
        });
    },

    showLoginModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">Admin Login</h3>
                </div>
                <div class="modal-body">
                    <form id="login-form">
                        <div class="form-group">
                            <label class="label">Password</label>
                            <input type="password" class="input" id="login-password" placeholder="Enter admin password" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Login</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('login-password').value;

            const response = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await response.json();

            if (data.success) {
                this.showToast('Logged in successfully', 'success');
                modal.remove();
                this.loadData();
            } else {
                this.showToast(data.message || 'Invalid password', 'error');
            }
        });
    },

    async logout() {
        await fetch('/api/auth/admin/logout', { method: 'POST' });
        window.location.reload();
    },

    validatePassword(password, prefix = '') {
        const checks = {
            length: password.length >= 12,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        Object.entries(checks).forEach(([key, pass]) => {
            const el = document.getElementById(`${prefix}req-${key}`);
            if (el) {
                el.textContent = `${pass ? '✓' : '✗'} ${key === 'length' ? '12+ characters' : key.charAt(0).toUpperCase() + key.slice(1)}`;
                el.style.color = pass ? 'var(--success)' : 'var(--text-muted)';
            }
        });

        return Object.values(checks).every(v => v);
    },

    async changePassword() {
        const current = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;

        if (!current || !newPass || !confirm) {
            this.showToast('Please fill all fields', 'error');
            return;
        }

        if (newPass !== confirm) {
            this.showToast('New passwords do not match', 'error');
            return;
        }

        if (!this.validatePassword(newPass)) {
            this.showToast('Password does not meet requirements', 'error');
            return;
        }

        const response = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: current, newPassword: newPass })
        });
        const data = await response.json();

        if (data.success) {
            this.showToast('Password changed successfully', 'success');
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            document.getElementById('default-password-alert').style.display = 'none';
            this.validatePassword('');
        } else {
            this.showToast(data.message || 'Failed to change password', 'error');
        }
    },

    toggleAutoRefresh(enabled) {
        if (enabled) this.setupAutoRefresh();
        else this.clearAutoRefresh();
    },

    toggleNotifications(enabled) {
        localStorage.setItem('showNotifications', enabled);
    },

    setupAutoRefresh() {
        this.clearAutoRefresh();
        this.autoRefreshInterval = setInterval(() => this.loadData(), 3000);
    },

    clearAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    },

    async loadData() {
        try {
            const [sessionsRes, systemRes] = await Promise.all([
                fetch('/api/bot/sessions'),
                fetch('/api/system/info')
            ]);

            const sessionsData = await sessionsRes.json();
            const systemData = await systemRes.json();

            if (sessionsData.success) {
                this.renderSessions(sessionsData.sessions);
                this.updateStats(sessionsData.sessions);
            }

            if (systemData.success) {
                this.updateSystemInfo(systemData);
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }
    },

    renderSessions(sessions) {
        const container = document.getElementById('sessions-list');
        const emptyEl = document.getElementById('sessions-empty');

        if (!sessions || sessions.length === 0) {
            container.innerHTML = '';
            emptyEl.style.display = 'block';
            return;
        }

        emptyEl.style.display = 'none';
        container.innerHTML = sessions.map(s => this.renderSessionCard(s)).join('');

        // Add event listeners for session cards
        container.querySelectorAll('.session-card').forEach(card => {
            const number = card.dataset.number;
            card.querySelector('.session-action-start')?.addEventListener('click', () => this.startSession(number));
            card.querySelector('.session-action-stop')?.addEventListener('click', () => this.stopSession(number));
            card.querySelector('.session-action-pair')?.addEventListener('click', () => this.openPairModal(number));
            card.querySelector('.session-action-qr')?.addEventListener('click', () => this.openQRModal(number));
            card.querySelector('.session-action-qr-start')?.addEventListener('click', () => this.startAndOpenQR(number));
            card.querySelector('.session-action-pair-start')?.addEventListener('click', () => this.startAndOpenPair(number));
            card.querySelector('.session-action-delete')?.addEventListener('click', () => this.deleteSession(number));
            card.querySelector('.session-action-details')?.addEventListener('click', () => this.openSessionModal(number));
        });
    },

    renderSessionCard(session) {
        const statusClass = {
            'connected': 'badge-success',
            'connecting': 'badge-warning',
            'starting': 'badge-info',
            'stopped': 'badge-secondary',
            'error': 'badge-danger'
        }[session.status] || 'badge-secondary';

        const statusText = {
            'connected': 'Connected',
            'connecting': 'Connecting',
            'starting': 'Starting',
            'stopped': 'Stopped',
            'error': 'Error'
        }[session.status] || session.status;

        const isConnected = session.status === 'connected';
        const isConnecting = session.status === 'connecting' || session.status === 'starting';

        return `
            <div class="card session-card" data-number="${session.number}" style="padding: 20px;">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${this.escapeHtml(session.name)}</h4>
                        <div style="display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 13px;">
                            <code>${this.escapeHtml(session.number)}</code>
                            ${session.isOwner ? '<span class="badge badge-success">Owner</span>' : ''}
                        </div>
                    </div>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>

                ${session.user ? `
                    <div style="display: flex; gap: 16px; margin-bottom: 16px; padding: 12px; background: var(--background); border-radius: var(--radius-sm);">
                        <div style="font-size: 12px; color: var(--text-secondary);">Bot Name</div>
                        <div style="font-weight: 600;">${this.escapeHtml(session.user.name)}</div>
                    </div>
                ` : ''}

                ${session.error ? `
                    <div class="alert alert-danger" style="margin-bottom: 16px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <div>${this.escapeHtml(session.error)}</div>
                    </div>
                ` : ''}

                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${isConnected ? `
                        <button class="btn btn-secondary btn-sm session-action-stop" data-number="${session.number}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="12" height="16" rx="2"/></svg>
                            Stop
                        </button>
                    ` : session.status === 'stopped' ? `
                        <button class="btn btn-info btn-sm session-action-qr-start" data-number="${session.number}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            QR Code
                        </button>
                        <button class="btn btn-success btn-sm session-action-pair-start" data-number="${session.number}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Pair Code
                        </button>
                    ` : `
                        <button class="btn btn-info btn-sm session-action-qr" data-number="${session.number}" ${session.qrCode ? '' : 'disabled'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            QR Code
                        </button>
                        <button class="btn btn-success btn-sm session-action-pair" data-number="${session.number}" ${session.pairCode ? '' : 'disabled'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Pair Code
                        </button>
                    `}
                    <button class="btn btn-secondary btn-sm session-action-details" data-number="${session.number}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        Details
                    </button>
                    <button class="btn btn-danger btn-sm session-action-delete" data-number="${session.number}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    },

    updateStats(sessions) {
        const total = sessions.length;
        const connected = sessions.filter(s => s.status === 'connected').length;
        const connecting = sessions.filter(s => s.status === 'connecting' || s.status === 'starting').length;
        const error = sessions.filter(s => s.status === 'error').length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-connected').textContent = connected;
        document.getElementById('stat-connecting').textContent = connecting;
        document.getElementById('stat-error').textContent = error;
        document.getElementById('session-count').textContent = `${total} Session${total !== 1 ? 's' : ''}`;
    },

    updateSystemInfo(data) {
        const mem = data.memory;
        document.getElementById('sys-ram').textContent = `${mem.rss} MB`;
        document.getElementById('sys-ram-bar').style.width = `${Math.min((mem.rss / 512) * 100, 100)}%`;
        document.getElementById('sys-heap').textContent = `${mem.heapUsed} MB`;
        document.getElementById('sys-heap-bar').style.width = `${Math.min((mem.heapUsed / 512) * 100, 100)}%`;
        document.getElementById('sys-uptime').textContent = this.formatUptime(data.uptime);
        document.getElementById('sys-platform').textContent = `${data.platform} ${data.arch}`;

        const sysEl = document.getElementById('system-info');
        sysEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                <span class="label">Total RAM</span>
                <span style="font-weight: 600;">${mem.rss} MB</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                <span class="label">Heap Used</span>
                <span style="font-weight: 600;">${mem.heapUsed} MB</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                <span class="label">Heap Total</span>
                <span style="font-weight: 600;">${mem.heapTotal} MB</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span class="label">Uptime</span>
                <span style="font-weight: 600;">${this.formatUptime(data.uptime)}</span>
            </div>
        `;

        const procEl = document.getElementById('process-info');
        procEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                <span class="label">PID</span>
                <span style="font-weight: 600;">${data.pid}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                <span class="label">Node.js</span>
                <span style="font-weight: 600;">${data.nodeVersion}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                <span class="label">Platform</span>
                <span style="font-weight: 600;">${data.platform} ${data.arch}</span>
            </div>
        `;
    },

    async createSession() {
        const number = document.getElementById('session-number').value.trim();
        const name = document.getElementById('session-name').value.trim() || number;
        const isOwner = document.getElementById('session-owner').checked;
        const autoStart = document.getElementById('session-auto-start').checked;

        if (!number || !/^\d+$/.test(number)) {
            this.showToast('Valid phone number required', 'error');
            return;
        }

        const btn = document.querySelector('#add-session-form button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Creating...';

        try {
            const response = await fetch('/api/bot/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number, name, isOwner })
            });
            const data = await response.json();

            if (data.success) {
                this.showToast('Session created successfully', 'success');
                document.getElementById('add-session-form').reset();
                this.switchTab('sessions');
                this.loadData();
            } else {
                this.showToast(data.message || 'Failed to create session', 'error');
            }
        } catch (e) {
            this.showToast('Error: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Session';
        }
    },

    async startSession(number) {
        const response = await fetch(`/api/bot/sessions/${number}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start' })
        });
        const data = await response.json();
        if (data.success) {
            this.showToast('Session started', 'success');
            this.loadData();
        } else {
            this.showToast(data.message || 'Failed to start', 'error');
        }
    },

    async startAndOpenQR(number) {
        // Start the session first
        const startResponse = await fetch(`/api/bot/sessions/${number}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start' })
        });
        const startData = await startResponse.json();
        if (!startData.success) {
            this.showToast(startData.message || 'Failed to start session', 'error');
            return;
        }
        this.showToast('Starting session...', 'info');
        // Wait a bit for QR to generate
        setTimeout(() => {
            this.openQRModal(number);
        }, 1500);
    },

    async startAndOpenPair(number) {
        // Start the session first
        const startResponse = await fetch(`/api/bot/sessions/${number}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start' })
        });
        const startData = await startResponse.json();
        if (!startData.success) {
            this.showToast(startData.message || 'Failed to start session', 'error');
            return;
        }
        this.showToast('Starting session...', 'info');
        // Wait a bit for connection to be ready
        setTimeout(() => {
            this.openPairModal(number);
        }, 1500);
    },

    async stopSession(number) {
        const response = await fetch(`/api/bot/sessions/${number}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
        });
        const data = await response.json();
        if (data.success) {
            this.showToast('Session stopped', 'success');
            this.loadData();
        } else {
            this.showToast(data.message || 'Failed to stop', 'error');
        }
    },

    async deleteSession(number) {
        this.showConfirm(`Delete session ${number}? This will remove all session data.`, async () => {
            const response = await fetch(`/api/bot/sessions/${number}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                this.showToast('Session deleted', 'success');
                this.loadData();
            } else {
                this.showToast(data.message || 'Failed to delete', 'error');
            }
        });
    },

    openPairModal(number) {
        this.currentSessionNumber = number;
        document.getElementById('pair-session-number').value = number;
        document.getElementById('pair-form').reset();
        document.getElementById('pair-result').style.display = 'none';
        document.getElementById('pair-modal').classList.add('active');
    },

    closePairModal() {
        document.getElementById('pair-modal').classList.remove('active');
        this.currentSessionNumber = null;
    },

    async generatePairCode() {
        const number = document.getElementById('pair-session-number').value;
        const phoneNumber = document.getElementById('pair-phone').value.trim().replace(/\D/g, '');

        if (!/^\d{7,15}$/.test(phoneNumber)) {
            this.showToast('Valid phone number with country code required', 'error');
            return;
        }

        const btn = document.getElementById('pair-submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Generating...';

        try {
            const response = await fetch('/api/bot/sessions/pair-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number, phoneNumber })
            });
            const data = await response.json();

            if (data.success) {
                document.getElementById('pair-code-display').textContent = data.code;
                document.getElementById('pair-result').style.display = 'block';
                this.showToast('Pair code generated', 'success');
            } else {
                this.showToast(data.message || 'Failed to generate pair code', 'error');
            }
        } catch (e) {
            this.showToast('Error: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Generate Pair Code';
        }
    },

    openQRModal(number) {
        this.currentSessionNumber = number;
        document.getElementById('qr-modal').classList.add('active');
        this.loadQRCode(number);
    },

    closeQRModal() {
        document.getElementById('qr-modal').classList.remove('active');
    },

    async loadQRCode(number) {
        try {
            const response = await fetch('/api/bot/sessions/qr-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number })
            });
            const data = await response.json();

            if (data.success && data.qr) {
                document.getElementById('qr-code').innerHTML = `<img src="${data.qr}" alt="QR Code" style="width: 256px; height: 256px;">`;
            } else {
                document.getElementById('qr-code').innerHTML = '<p style="color: var(--text-muted);">QR code not available. Use Pair Code instead.</p>';
            }
        } catch (e) {
            document.getElementById('qr-code').innerHTML = '<p style="color: var(--danger);">Failed to load QR code</p>';
        }
    },

    async refreshQRCode() {
        if (!this.currentSessionNumber) return;
        const btn = document.getElementById('qr-refresh-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading"></span> Refreshing...';
        }
        await this.loadQRCode(this.currentSessionNumber);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Refresh QR Code';
        }
    },

    async openSessionModal(number) {
        this.currentSessionNumber = number;
        const response = await fetch('/api/bot/sessions');
        const data = await response.json();
        const session = data.sessions.find(s => s.number === number);
        if (!session) return;

        document.getElementById('session-modal-title').textContent = `${session.name} (${session.number})`;
        document.getElementById('session-modal-body').innerHTML = this.renderSessionDetails(session);
        document.getElementById('session-modal').classList.add('active');
    },

    closeSessionModal() {
        document.getElementById('session-modal').classList.remove('active');
    },

    renderSessionDetails(session) {
        return `
            <div style="display: grid; gap: 16px;">
                <div style="display: grid; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                        <span class="label">Number</span>
                        <code style="font-weight: 600;">${this.escapeHtml(session.number)}</code>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                        <span class="label">Name</span>
                        <span style="font-weight: 600;">${this.escapeHtml(session.name)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                        <span class="label">Owner</span>
                        <span class="badge ${session.isOwner ? 'badge-success' : 'badge-secondary'}">${session.isOwner ? 'Yes' : 'No'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                        <span class="label">Status</span>
                        <span class="badge ${this.getStatusBadgeClass(session.status)}">${session.status}</span>
                    </div>
                    ${session.user ? `
                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                            <span class="label">Bot Name</span>
                            <span style="font-weight: 600;">${this.escapeHtml(session.user.name)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                            <span class="label">Platform</span>
                            <span style="font-weight: 600;">${this.escapeHtml(session.user.platform)}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between;">
                        <span class="label">Uptime</span>
                        <span style="font-weight: 600;">${session.uptime ? this.formatUptime(session.uptime / 1000) : 'N/A'}</span>
                    </div>
                </div>
                ${session.error ? `
                    <div class="alert alert-danger">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <div><strong>Error:</strong> ${this.escapeHtml(session.error)}</div>
                    </div>
                ` : ''}
                ${session.pairCode ? `
                    <div class="alert alert-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        <div><strong>Pair Code:</strong> <code style="font-size: 14px; background: var(--background); padding: 4px 8px; border-radius: 4px;">${this.escapeHtml(session.pairCode)}</code></div>
                    </div>
                ` : ''}
                ${session.qrCode ? `
                    <div class="alert alert-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        <div><strong>QR Code available</strong> - Click "QR Code" button to view</div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    getStatusBadgeClass(status) {
        return {
            'connected': 'badge-success',
            'connecting': 'badge-warning',
            'starting': 'badge-info',
            'stopped': 'badge-secondary',
            'error': 'badge-danger'
        }[status] || 'badge-secondary';
    },

    showConfirm(message, callback) {
        this.confirmCallback = callback;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-modal').classList.add('active');
    },

    closeConfirmModal() {
        document.getElementById('confirm-modal').classList.remove('active');
        this.confirmCallback = null;
    },

    executeConfirm() {
        if (this.confirmCallback) {
            this.confirmCallback();
            this.confirmCallback = null;
        }
        this.closeConfirmModal();
    },

    // Utility methods (copied from App to avoid dependency)
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (days > 0) return `${days}d ${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    },

    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    showToast(message, type = 'info') {
        if (!this.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : ''}
                ${type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : ''}
                ${type === 'warning' ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' : ''}
                ${type === 'info' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' : ''}
            </svg>
            <span class="toast-message">${this.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        this.toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item[data-tab]').forEach(i => i.classList.remove('active'));
        const panel = document.getElementById('tab-' + tabName);
        const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
        if (panel) panel.classList.add('active');
        if (navItem) navItem.classList.add('active');
        const titles = {
            overview: ['Overview', 'Multi-session bot management'],
            sessions: ['Sessions', 'Manage WhatsApp bot sessions'],
            'add-session': ['Add Session', 'Create a new bot session'],
            'connected-numbers': ['Connected Numbers', 'Manage connected WhatsApp numbers'],
            commands: ['Command Manager', 'Enable/disable commands globally or per session'],
            system: ['System Info', 'System and process information'],
            settings: ['Settings', 'Admin and GUI settings']
        };
        const [title, subtitle] = titles[tabName] || ['Dashboard', ''];
        document.getElementById('page-title').textContent = title;
        document.getElementById('page-subtitle').textContent = subtitle;
        
        // Load tab-specific data
        if (tabName === 'connected-numbers') {
            this.loadConnectedNumbers();
        } else if (tabName === 'commands') {
            this.loadCommands();
        }
    },

    async loadConnectedNumbers() {
        try {
            const response = await fetch('/api/bot/connected-numbers');
            const data = await response.json();
            if (data.success) {
                this.renderConnectedNumbers(data.numbers);
            }
        } catch (e) {
            console.error('Failed to load connected numbers:', e);
        }
    },

renderConnectedNumbers(numbers) {
        const container = document.getElementById('connected-list');
        const emptyEl = document.getElementById('connected-empty');
        
        if (!numbers || numbers.length === 0) {
            container.innerHTML = '';
            emptyEl.style.display = 'block';
            return;
        }
        
        emptyEl.style.display = 'none';
        container.innerHTML = numbers.map(n => this.renderConnectedNumberCard(n)).join('');
        
        // Add event listeners
        container.querySelectorAll('.connected-card').forEach(card => {
            const number = card.dataset.number;
            card.querySelector('.connected-action-edit')?.addEventListener('click', () => this.editConnectedNumber(number));
            card.querySelector('.connected-action-session')?.addEventListener('click', () => this.switchTab('sessions'));
            card.querySelector('.connected-action-pair-start')?.addEventListener('click', () => this.startAndOpenPair(number));
            card.querySelector('.connected-action-qr-start')?.addEventListener('click', () => this.startAndOpenQR(number));
        });
    },

    renderConnectedNumberCard(number) {
        const statusClass = {
            'connected': 'badge-success',
            'connecting': 'badge-warning',
            'stopped': 'badge-secondary',
            'error': 'badge-danger'
        }[number.status] || 'badge-secondary';
        
        const statusText = {
            'connected': 'Connected',
            'connecting': 'Connecting',
            'stopped': 'Stopped',
            'error': 'Error'
        }[number.status] || number.status;
        
        const connectedAt = number.connectedAt ? this.formatDate(number.connectedAt) : 'Unknown';
        
        // Determine actions based on status
        let actionsHtml = `
            <button class="btn btn-secondary btn-sm connected-action-edit" data-number="${number.number}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
            </button>
        `;
        
        if (number.status === 'connected') {
            actionsHtml += `
                <button class="btn btn-primary btn-sm connected-action-session" data-number="${number.number}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
                    View Session
                </button>
            `;
        } else if (number.status === 'stopped') {
            actionsHtml += `
                <button class="btn btn-success btn-sm connected-action-pair-start" data-number="${number.number}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Pair Code
                </button>
                <button class="btn btn-info btn-sm connected-action-qr-start" data-number="${number.number}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    QR Code
                </button>
            `;
        }
        
        return `
            <div class="card connected-card" data-number="${number.number}" style="padding: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                    <div>
                        <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${this.escapeHtml(number.name)}</h4>
                        <div style="display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 13px;">
                            <code>${this.escapeHtml(number.number)}</code>
                            ${number.isOwner ? '<span class="badge badge-success">Owner</span>' : '<span class="badge badge-secondary">User</span>'}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="badge ${statusClass}">${statusText}</span>
                        ${actionsHtml}
                    </div>
                </div>
                <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
                    <span>Connected: ${connectedAt}</span>
                    ${number.isOwner ? '<span style="margin-left: 16px;">Can manage other sessions</span>' : ''}
                </div>
            </div>
        `;
    },

    async editConnectedNumber(number) {
        try {
            const response = await fetch('/api/bot/sessions');
            const data = await response.json();
            const session = data.sessions.find(s => s.number === number);
            if (!session) return;
            
            const newName = prompt('Enter new name:', session.name);
            if (newName === null) return;
            
            const isOwner = confirm('Set as bot owner? (Can manage other sessions)');
            
            const updateResponse = await fetch(`/api/bot/sessions/${number}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', name: newName, isOwner })
            });
            const updateData = await updateResponse.json();
            
            if (updateData.success) {
                this.showToast('Connected number updated', 'success');
                this.loadConnectedNumbers();
            } else {
                this.showToast(updateData.message || 'Failed to update', 'error');
            }
        } catch (e) {
            this.showToast('Error: ' + e.message, 'error');
        }
    },

    async loadCommands() {
        try {
            const filter = document.getElementById('command-session-filter').value;
            const response = await fetch(`/api/commands${filter !== 'global' ? '?session=' + filter : ''}`);
            const data = await response.json();
            
            if (data.success) {
                // Update session filter dropdown
                const sessionsRes = await fetch('/api/bot/sessions');
                const sessionsData = await sessionsRes.json();
                if (sessionsData.success) {
                    const filterEl = document.getElementById('command-session-filter');
                    const currentValue = filterEl.value;
                    filterEl.innerHTML = '<option value="global">Global (All Sessions)</option>' + 
                        sessionsData.sessions.map(s => `<option value="${s.number}">${s.name} (${s.number})</option>`).join('');
                    filterEl.value = currentValue;
                }
                
                this.renderCommands(data.commands);
            }
        } catch (e) {
            console.error('Failed to load commands:', e);
        }
    },

    renderCommands(commands) {
        const container = document.getElementById('commands-list');
        const emptyEl = document.getElementById('commands-empty');
        const search = document.getElementById('command-search').value.toLowerCase();
        
        const filtered = commands.filter(c => c.name.toLowerCase().includes(search));
        
        if (!filtered || filtered.length === 0) {
            container.innerHTML = '';
            emptyEl.style.display = 'block';
            return;
        }
        
        emptyEl.style.display = 'none';
        container.innerHTML = filtered.map(c => this.renderCommandCard(c)).join('');
        
        // Add event listeners for toggles
        container.querySelectorAll('.command-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const command = e.target.dataset.command;
                const session = e.target.dataset.session;
                const enabled = e.target.checked;
                this.toggleCommand(command, session, enabled);
            });
        });
    },

    renderCommandCard(command) {
        const filter = document.getElementById('command-session-filter').value;
        const isGlobal = filter === 'global';
        const enabled = command.effectiveEnabled;
        
        return `
            <div class="card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                    <code style="font-size: 13px; background: var(--background); padding: 4px 8px; border-radius: 4px;">${this.escapeHtml(command.name)}</code>
                    <span style="font-size: 11px; color: var(--text-muted);">
                        ${command.globalEnabled ? '✓ Global' : ''} ${command.globalDisabled ? '✗ Global' : ''}
                        ${command.sessionEnabled ? ' ✓ Session' : ''} ${command.sessionDisabled ? ' ✗ Session' : ''}
                    </span>
                </div>
                <label class="toggle">
                    <input type="checkbox" class="command-toggle" data-command="${command.name}" data-session="${filter}" ${enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
    },

    async toggleCommand(command, session, enabled) {
        try {
            let response;
            if (session === 'global') {
                response = await fetch('/api/commands/global', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command, enabled })
                });
            } else {
                response = await fetch(`/api/commands/session/${session}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command, enabled })
                });
            }
            const data = await response.json();
            if (data.success) {
                this.showToast(`Command ${enabled ? 'enabled' : 'disabled'}`, 'success');
            } else {
                this.showToast(data.message || 'Failed to update', 'error');
                this.loadCommands(); // Refresh to show correct state
            }
        } catch (e) {
            this.showToast('Error: ' + e.message, 'error');
            this.loadCommands();
        }
    },
};

window.AdminApp = AdminApp;