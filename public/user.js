const UserApp = {
    userNumber: null,
    userData: null,

    async init() {
        App.init('user');
        this.setupUserListeners();
        await this.checkAuth();
    },

    setupUserListeners() {
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadData());
        document.getElementById('user-refresh-btn')?.addEventListener('click', () => this.loadData());
        document.getElementById('login-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.login(); });
        document.getElementById('login-modal-close')?.addEventListener('click', () => this.closeLoginModal());

        document.getElementById('my-groups-search')?.addEventListener('input', (e) => this.filterTable('my-groups-table', e.target.value));
        document.getElementById('my-contacts-search')?.addEventListener('input', (e) => this.filterTable('my-contacts-table', e.target.value));

        // Sidebar toggle for mobile
        document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) {
                sidebar.classList.toggle('open');
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

        // Close sidebar on tab click on mobile
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    const overlay = document.getElementById('sidebar-overlay');
                    if (sidebar) sidebar.classList.remove('open');
                    if (overlay) overlay.classList.remove('active');
                }
            });
        });
    },

    async checkAuth() {
        const response = await fetch('/api/auth/user/check');
        const data = await response.json();

        if (data.authenticated && data.number) {
            this.userNumber = data.number;
            this.showDashboard();
            await this.loadData();
        } else {
            this.showLoginModal();
        }
    },

    showLoginModal() {
        document.getElementById('login-modal').classList.add('active');
        document.getElementById('user-dashboard').style.display = 'none';
        document.getElementById('login-prompt').style.display = 'flex';
    },

    closeLoginModal() {
        document.getElementById('login-modal').classList.remove('active');
    },

    async login() {
        const number = document.getElementById('login-number').value.trim();

        if (!number) {
            App.showToast('Please enter your phone number', 'error');
            return;
        }

        if (!/^\d+$/.test(number)) {
            App.showToast('Phone number must contain only digits', 'error');
            return;
        }

        const btn = document.querySelector('#login-form button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Logging in...';

        try {
            const response = await fetch('/api/auth/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number })
            });
            const data = await response.json();

            if (data.success) {
                App.showToast('Logged in successfully', 'success');
                this.userNumber = data.number.number;
                this.userData = data.number;
                this.closeLoginModal();
                this.showDashboard();
                await this.loadData();
            } else {
                App.showToast(data.message || 'Number not connected', 'error');
            }
        } catch (e) {
            App.showToast('Error: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Login';
        }
    },

    async logout() {
        await fetch('/api/auth/user/logout', { method: 'POST' });
        this.userNumber = null;
        this.userData = null;
        window.location.reload();
    },

    showDashboard() {
        document.getElementById('login-prompt').style.display = 'none';
        document.getElementById('user-dashboard').style.display = 'block';
        this.updateProfile();
    },

    updateProfile() {
        if (!this.userData) return;

        document.getElementById('profile-name').textContent = this.userData.name || this.userNumber;
        document.getElementById('profile-number').textContent = this.userNumber;
        document.getElementById('profile-avatar').textContent = this.userData.name?.charAt(0)?.toUpperCase() || this.userNumber.charAt(0);

        document.getElementById('info-phone').textContent = this.userNumber;
        document.getElementById('info-name').textContent = this.userData.name || this.userNumber;
        document.getElementById('info-owner').innerHTML = this.userData.isOwner
            ? '<span class="badge badge-success">Yes</span>'
            : '<span class="badge badge-secondary">No</span>';
        document.getElementById('info-connected').textContent = this.userData.connectedAt
            ? App.formatDate(this.userData.connectedAt)
            : 'Unknown';

        if (this.userData.isOwner) {
            document.getElementById('profile-owner-badge').style.display = 'inline-flex';
        }
    },

    async loadData() {
        if (!this.userNumber) return;

        try {
            const [statusRes, groupsRes, contactsRes] = await Promise.all([
                fetch('/api/bot/status'),
                fetch('/api/bot/groups'),
                fetch('/api/bot/contacts')
            ]);

            const status = await statusRes.json();
            const groups = await groupsRes.json();
            const contacts = await contactsRes.json();

            this.updateBotStatus(status);
            this.updateMyGroups(groups.groups || []);
            this.updateMyContacts(contacts.contacts || []);
        } catch (e) {
            console.error('Failed to load data:', e);
        }
    },

    updateBotStatus(data) {
        const connected = data.connected === true;

        const statusBadge = document.getElementById('connection-badge');
        if (statusBadge) {
            statusBadge.textContent = connected ? 'Connected' : 'Disconnected';
            statusBadge.className = `badge ${connected ? 'badge-success' : 'badge-danger'}`;
        }

        const botStatus = document.getElementById('user-bot-status');
        if (botStatus) {
            botStatus.innerHTML = connected
                ? '<span class="badge badge-success">Connected</span>'
                : '<span class="badge badge-danger">Disconnected</span>';
        }

        document.getElementById('user-bot-name').textContent = data.user?.name || '-';
        document.getElementById('user-bot-uptime').textContent = data.uptime ? App.formatUptime(data.uptime) : '-';

        if (data.memory) {
            document.getElementById('user-bot-memory').textContent = `${data.memory.rss} MB RSS / ${data.memory.heapUsed} MB Heap`;
        }

        if (data.groups) {
            document.getElementById('user-stat-groups').textContent = data.groups.length;
        }
        if (data.contacts) {
            document.getElementById('user-stat-contacts').textContent = data.contacts.length;
        }
        document.getElementById('user-stat-number').textContent = this.userNumber;
    },

    updateMyGroups(groups) {
        const myGroups = groups.filter(g => {
            // In a real implementation, we'd check if the user is a participant
            // For now, show all groups if user is owner
            return this.userData?.isOwner || true;
        });

        const tbody = document.querySelector('#my-groups-table tbody');
        const emptyEl = document.getElementById('my-groups-empty');
        const countEl = document.getElementById('my-groups-count');

        if (!tbody) return;

        if (myGroups.length === 0) {
            tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (countEl) countEl.textContent = myGroups.length;

        tbody.innerHTML = myGroups.map(g => `
            <tr>
                <td>${App.escapeHtml(g.name)}</td>
                <td>${g.participants}</td>
                <td><span class="badge ${g.isAdmin ? 'badge-success' : 'badge-secondary'}">${g.isAdmin ? 'Yes' : 'No'}</span></td>
                <td><span class="badge badge-info">${this.userData?.isOwner ? 'Owner' : 'Member'}</span></td>
            </tr>
        `).join('');
    },

    updateMyContacts(contacts) {
        const tbody = document.querySelector('#my-contacts-table tbody');
        const emptyEl = document.getElementById('my-contacts-empty');
        const countEl = document.getElementById('my-contacts-count');

        if (!tbody) return;

        if (contacts.length === 0) {
            tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (countEl) countEl.textContent = contacts.length;

        tbody.innerHTML = contacts.map(c => `
            <tr>
                <td>${App.escapeHtml(c.name)}</td>
                <td><code>${App.escapeHtml(c.id)}</code></td>
            </tr>
        `).join('');
    },

    filterTable(tableId, query) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        const lowerQuery = query.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(lowerQuery) ? '' : 'none';
        });
    }
};

window.UserApp = UserApp;