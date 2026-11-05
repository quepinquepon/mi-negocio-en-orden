// ========== STORAGE LAYER (localStorage + simple helpers) ==========
const Storage = {
  KEYS: {
    CLIENTS: 'mneo_clients',
    BUDGETS: 'mneo_budgets',
    TRANSACTIONS: 'mneo_transactions',
    SETTINGS: 'mneo_settings',
    LICENSE: 'mneo_license'
  },

  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Error reading storage', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error writing storage', e);
      return false;
    }
  },

  // Clients
  getClients() {
    return this.get(this.KEYS.CLIENTS) || [];
  },

  saveClients(clients) {
    return this.set(this.KEYS.CLIENTS, clients);
  },

  addClient(client) {
    const clients = this.getClients();
    client.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    client.createdAt = new Date().toISOString();
    clients.unshift(client);
    this.saveClients(clients);
    return client;
  },

  updateClient(id, data) {
    const clients = this.getClients();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return null;
    clients[idx] = { ...clients[idx], ...data, updatedAt: new Date().toISOString() };
    this.saveClients(clients);
    return clients[idx];
  },

  deleteClient(id) {
    const clients = this.getClients().filter(c => c.id !== id);
    this.saveClients(clients);
  },

  // Budgets
  getBudgets() {
    return this.get(this.KEYS.BUDGETS) || [];
  },

  saveBudgets(budgets) {
    return this.set(this.KEYS.BUDGETS, budgets);
  },

  addBudget(budget) {
    const budgets = this.getBudgets();
    budget.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    budget.createdAt = new Date().toISOString();
    budget.number = this._nextBudgetNumber();
    budgets.unshift(budget);
    this.saveBudgets(budgets);
    return budget;
  },

  updateBudget(id, data) {
    const budgets = this.getBudgets();
    const idx = budgets.findIndex(b => b.id === id);
    if (idx === -1) return null;
    budgets[idx] = { ...budgets[idx], ...data, updatedAt: new Date().toISOString() };
    this.saveBudgets(budgets);
    return budgets[idx];
  },

  deleteBudget(id) {
    const budgets = this.getBudgets().filter(b => b.id !== id);
    this.saveBudgets(budgets);
  },

  _nextBudgetNumber() {
    const budgets = this.getBudgets();
    if (budgets.length === 0) return 1;
    const max = Math.max(...budgets.map(b => b.number || 0));
    return max + 1;
  },

  // Transactions (income / expense)
  getTransactions() {
    return this.get(this.KEYS.TRANSACTIONS) || [];
  },

  saveTransactions(txs) {
    return this.set(this.KEYS.TRANSACTIONS, txs);
  },

  addTransaction(tx) {
    const txs = this.getTransactions();
    tx.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    tx.createdAt = new Date().toISOString();
    txs.unshift(tx);
    this.saveTransactions(txs);
    return tx;
  },

  deleteTransaction(id) {
    const txs = this.getTransactions().filter(t => t.id !== id);
    this.saveTransactions(txs);
  },

  // Settings
  getSettings() {
    return this.get(this.KEYS.SETTINGS) || {
      businessName: '',
      phone: '',
      email: ''
    };
  },

  saveSettings(settings) {
    return this.set(this.KEYS.SETTINGS, settings);
  },

  // Export all data
  exportAll() {
    return {
      clients: this.getClients(),
      budgets: this.getBudgets(),
      transactions: this.getTransactions(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };
  },

  clearAllData() {
    localStorage.removeItem(this.KEYS.CLIENTS);
    localStorage.removeItem(this.KEYS.BUDGETS);
    localStorage.removeItem(this.KEYS.TRANSACTIONS);
    // Keep settings and license
  }
};
