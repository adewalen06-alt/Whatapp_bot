const App = {
    ws: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    toastContainer: null,

    init(pageType) {
        this.pageType = pageType;
        this.toastContainer = document.getElementById('toast-container');
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadInitialData();
    },

    setupEventListeners() {
        document.getElementById('refresh-btn')?.addEventListener('click', () => this.loadInitialData());
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

        // Close sidebar on tab click on mobile
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            item.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (window.innerWidth <= 768) {
                    if (sidebar) sidebar.classList.remove('open');
                    if (overlay) overlay.classList.remove('active');
                }
                this.switchTab(item.dataset.tab);
            });
        });
    },

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.send({ type: 'requestUpdate' });
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handleMessage(msg);
            } catch (e) {
                console.error('WS message parse error:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            this.attemptReconnect();
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };
    },

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connectWebSocket(), delay);
        }
    },

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    },

    handleMessage(msg) {
        switch (msg.type) {
            case 'fullUpdate':
            case 'status':
                this.updateUI(msg.data);
                break;
            case 'connectedNumbers':
                this.updateConnectedNumbers(msg.data);
                break;
            case 'pong':
                break;
        }
    },

    async loadInitialData() {
        try {
            const response = await fetch('/api/bot/status');
            const data = await response.json();
            this.updateUI(data);
        } catch (e) {
            console.error('Failed to load initial data:', e);
        }
    },

    updateUI(data) {
        const connected = data.connected === true;

        this.updateConnectionBadge(connected);
        this.updateStats(data);

        if (connected && data.user) {
            this.updateBotInfo(data.user);
            this.updateMemory(data.memory);
        }

        if (data.groups) this.updateGroups(data.groups);
        if (data.contacts) this.updateContacts(data.contacts);
        if (data.connectedNumbers) this.updateConnectedNumbers(data.connectedNumbers);
    },

    updateConnectionBadge(connected) {
        const badge = document.getElementById('connection-badge') || document.getElementById('bot-status-badge');
        if (badge) {
            badge.textContent = connected ? 'Connected' : 'Disconnected';
            badge.className = `badge ${connected ? 'badge-success' : 'badge-danger'}`;
        }
    },

    updateStats(data) {
        const contactsEl = document.getElementById('stat-contacts');
        const groupsEl = document.getElementById('stat-groups');
        const numbersEl = document.getElementByid('stat-numbers');
        const uptimeEl = document.getElementById('stat-uptime');

        if (contactsEl) contactsEl.textContent = data.contacts?.length || '-';
        if (groupsEl) groupsEl.textContent = data.groups?.length || '-';
        if (numbersEl) numbersEl.textContent = data.connectedNumbers?.length || '-';
        if (uptimeEl && data.uptime) uptimeEl.textContent = this.formatUptime(data.uptime);
    },

    updateBotInfo(user) {
        const nameEl = document.getElementById('bot-name') || document.getElementById('info-name') || document.getElementById('user-bot-name');
        const phoneEl = document.getElementById('bot-phone') || document.getElementById('info-phone');
        const platformEl = document.getElementById('bot-platform') || document.getElementById('info-platform');
        const versionEl = document.getElementById('bot-version') || document.getElementById('info-version');
        const nodeEl = document.getElementById('info-node');

        if (nameEl) nameEl.textContent = user.name || 'Unknown';
        if (phoneEl) phoneEl.textContent = user.id?.split(':')[0] || '-';
        if (platformEl) platformEl.textContent = user.platform || '-';
        if (versionEl) versionEl.textContent = '3.0.8';
        if (nodeEl) nodeEl.textContent = process.version || 'Unknown';
    },

    updateMemory(mem) {
        if (!mem) return;

        const updateMem = (id, value, max = 512) => {
            const el = document.getElementById(id);
            const barEl = document.getElementById(id + '-bar');
            if (el) el.textContent = `${value} MB`;
            if (barEl) barEl.style.width = `${Math.min((value / max) * 100, 100)}%`;
        };

        updateMem('mem-rss', mem.rss);
        updateMem('mem-heap-used', mem.heapUsed);
        updateMem('mem-heap-total', mem.heapTotal);
        updateMem('mem-external', mem.external);

        const botMemEl = document.getElementById('bot-memory') || document.getElementById('user-bot-memory');
        if (botMemEl) {
            botMemEl.textContent = `${mem.rss} MB RSS / ${mem.heapUsed} MB Heap`;
        }
    },

    updateGroups(groups) {
        const tbody = document.querySelector('#groups-table tbody, #my-groups-table tbody');
        const emptyEl = document.getElementById('groups-empty') || document.getElementById('my-groups-empty');
        const countEl = document.getElementById('groups-count') || document.getElementById('my-groups-count');

        if (!tbody) return;

        if (groups.length === 0) {
            tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (countEl) countEl.textContent = groups.length;

        tbody.innerHTML = groups.map(g => `
            <tr>
                <td>${this.escapeHtml(g.name)}</td>
                <td><code>${this.escapeHtml(g.id)}</code></td>
                <td>${g.participants}</td>
                <td><span class="badge ${g.isAdmin ? 'badge-success' : 'badge-danger'}">${g.isAdmin ? 'Yes' : 'No'}</span></td>
                <td>${g.owner ? `<code>${this.escapeHtml(g.owner)}</code>` : '-'}</td>
            </tr>
        `).join('');
    },

    updateContacts(contacts) {
        const tbody = document.querySelector('#contacts-table tbody, #my-contacts-table tbody');
        const emptyEl = document.getElementById('contacts-empty') || document.getElementById('my-contacts-empty');
        const countEl = document.getElementById('contacts-count') || document.getElementById('my-contacts-count');

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
                <td>${this.escapeHtml(c.name)}</td>
                <td><code>${this.escapeHtml(c.id)}</code></td>
                <td><span class="badge ${c.isBusiness ? 'badge-info' : 'badge-secondary'}">${c.isBusiness ? 'Business' : 'Personal'}</span></td>
            </tr>
        `).join('');
    },

    updateConnectedNumbers(numbers) {
        const tbody = document.querySelector('#numbers-table tbody');
        const emptyEl = document.getElementById('numbers-empty');
        const statEl = document.getElementById('stat-numbers');
        const userStatEl = document.getElementById('user-stat-number');

        if (statEl) statEl.textContent = numbers.length;
        if (userStatEl) userStatEl.textContent = numbers.length;

        if (!tbody) return;

        if (numbers.length === 0) {
            tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        tbody.innerHTML = numbers.map(n => `
            <tr>
                <td><code>${this.escapeHtml(n.number)}</code></td>
                <td>${this.escapeHtml(n.name)}</td>
                <td><span class="badge ${n.isOwner ? 'badge-success' : 'badge-secondary'}">${n.isOwner ? 'Yes' : 'No'}</span></td>
                <td>${this.formatDate(n.connectedAt)}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-secondary btn-sm" onclick="this.parentElement.classList.toggle('open')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div class="dropdown-menu">
                            ${n.isOwner ? '' : `<a href="#" class="dropdown-item" onclick="App.setOwner('${n.number}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Set as Owner</a>`}
                            <a href="#" class="dropdown-item danger" onclick="App.deleteNumber('${n.number}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Remove</a>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.dropdown').forEach(dd => {
            dd.addEventListener('click', (e) => {
                if (!e.target.closest('.dropdown')) {
                    dd.classList.remove('open');
                }
            });
        });
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

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            overview: ['Overview', 'Admin dashboard overview'],
            connection: ['Connection', 'Manage WhatsApp connection'],
            numbers: ['Connected Numbers', 'Manage connected WhatsApp numbers'],
            groups: ['Groups', 'View connected groups'],
            contacts: ['Contacts', 'View WhatsApp contacts'],
            system: ['System Info', 'System and process information'],
            settings: ['Settings', 'Admin and GUI settings'],
            profile: ['Profile', 'Your account profile'],
            'my-groups': ['My Groups', 'Groups you are a member of'],
            'my-contacts': ['My Contacts', 'Your WhatsApp contacts']
        };

        const [title, subtitle] = titles[tabName] || ['Dashboard', ''];
        document.getElementById('page-title').textContent = title;
        document.getElementById('page-subtitle').textContent = subtitle;
    },

    async apiRequest(endpoint, options = {}) {
        const response = await fetch(endpoint, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        return response.json();
    }
};

window.App = App;