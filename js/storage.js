// ========== STORAGE LAYER ==========
const Storage = {
  KEYS: {
    CLIENTS: 'mneo_clients',
    BUDGETS: 'mneo_budgets',
    TRANSACTIONS: 'mneo_transactions',
    SETTINGS: 'mneo_settings',
    LICENSE: 'mneo_license',
    PRODUCTS: 'mneo_products',
    SUPPLIERS: 'mneo_suppliers',
    SELLERS: 'mneo_sellers',
    SALES: 'mneo_sales'
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

  _id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  getClients() { return this.get(this.KEYS.CLIENTS) || []; },
  saveClients(list) { return this.set(this.KEYS.CLIENTS, list); },

  addClient(client) {
    const list = this.getClients();
    client.id = this._id();
    client.createdAt = new Date().toISOString();
    client.balance = client.balance || 0;
    list.unshift(client);
    this.saveClients(list);
    return client;
  },

  updateClient(id, data) {
    const list = this.getClients();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    this.saveClients(list);
    return list[idx];
  },

  deleteClient(id) {
    this.saveClients(this.getClients().filter(c => c.id !== id));
  },

  getDebtors() {
    return this.getClients().filter(c => (Number(c.balance) || 0) > 0)
      .sort((a, b) => (b.balance || 0) - (a.balance || 0));
  },

  getBudgets() { return this.get(this.KEYS.BUDGETS) || []; },
  saveBudgets(list) { return this.set(this.KEYS.BUDGETS, list); },

  addBudget(budget) {
    const list = this.getBudgets();
    budget.id = this._id();
    budget.createdAt = new Date().toISOString();
    budget.number = this._nextBudgetNumber();
    list.unshift(budget);
    this.saveBudgets(list);
    return budget;
  },

  updateBudget(id, data) {
    const list = this.getBudgets();
    const idx = list.findIndex(b => b.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    this.saveBudgets(list);
    return list[idx];
  },

  deleteBudget(id) {
    this.saveBudgets(this.getBudgets().filter(b => b.id !== id));
  },

  _nextBudgetNumber() {
    const list = this.getBudgets();
    if (list.length === 0) return 1;
    return Math.max(...list.map(b => b.number || 0)) + 1;
  },

  getTransactions() { return this.get(this.KEYS.TRANSACTIONS) || []; },
  saveTransactions(list) { return this.set(this.KEYS.TRANSACTIONS, list); },

  addTransaction(tx) {
    const list = this.getTransactions();
    tx.id = this._id();
    tx.createdAt = new Date().toISOString();
    list.unshift(tx);
    this.saveTransactions(list);
    return tx;
  },

  deleteTransaction(id) {
    this.saveTransactions(this.getTransactions().filter(t => t.id !== id));
  },

  getSettings() {
    return this.get(this.KEYS.SETTINGS) || { businessName: '', phone: '', email: '' };
  },
  saveSettings(settings) { return this.set(this.KEYS.SETTINGS, settings); },

  getSuppliers() { return this.get(this.KEYS.SUPPLIERS) || []; },
  saveSuppliers(list) { return this.set(this.KEYS.SUPPLIERS, list); },

  addSupplier(s) {
    const list = this.getSuppliers();
    s.id = this._id();
    s.createdAt = new Date().toISOString();
    list.unshift(s);
    this.saveSuppliers(list);
    return s;
  },

  updateSupplier(id, data) {
    const list = this.getSuppliers();
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this.saveSuppliers(list);
    return list[idx];
  },

  deleteSupplier(id) {
    this.saveSuppliers(this.getSuppliers().filter(x => x.id !== id));
  },

  getSellers() { return this.get(this.KEYS.SELLERS) || []; },
  saveSellers(list) { return this.set(this.KEYS.SELLERS, list); },

  addSeller(s) {
    const list = this.getSellers();
    s.id = this._id();
    s.createdAt = new Date().toISOString();
    s.active = s.active !== false;
    list.unshift(s);
    this.saveSellers(list);
    return s;
  },

  updateSeller(id, data) {
    const list = this.getSellers();
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this.saveSellers(list);
    return list[idx];
  },

  deleteSeller(id) {
    this.saveSellers(this.getSellers().filter(x => x.id !== id));
  },

  getProducts() { return this.get(this.KEYS.PRODUCTS) || []; },
  saveProducts(list) { return this.set(this.KEYS.PRODUCTS, list); },

  addProduct(p) {
    const list = this.getProducts();
    p.id = this._id();
    p.createdAt = new Date().toISOString();
    p.batches = p.batches || [];
    p.minStock = Number(p.minStock) || 0;
    p.salePrice = Number(p.salePrice) || 0;
    list.unshift(p);
    this.saveProducts(list);
    return p;
  },

  updateProduct(id, data) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    this.saveProducts(list);
    return list[idx];
  },

  deleteProduct(id) {
    this.saveProducts(this.getProducts().filter(p => p.id !== id));
  },

  getProductStock(product) {
    if (!product || !product.batches) return 0;
    return product.batches.reduce((s, b) => s + (Number(b.qty) || 0), 0);
  },

  addPurchase(productId, { qty, cost, expiryDate, supplierId, supplierName, note }) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === productId);
    if (idx === -1) return null;

    const batch = {
      id: this._id(),
      qty: Number(qty) || 0,
      cost: Number(cost) || 0,
      purchasedAt: new Date().toISOString(),
      expiryDate: expiryDate || null,
      supplierId: supplierId || null,
      supplierName: supplierName || '',
      note: note || ''
    };

    if (!list[idx].batches) list[idx].batches = [];
    list[idx].batches.push(batch);
    list[idx].batches.sort((a, b) => new Date(a.purchasedAt) - new Date(b.purchasedAt));
    this.saveProducts(list);
    return list[idx];
  },

  consumeStockFIFO(productId, qtyNeeded) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === productId);
    if (idx === -1) return { ok: false, error: 'Producto no encontrado', cogs: 0, layers: [] };

    let remaining = Number(qtyNeeded) || 0;
    const product = list[idx];
    const stock = this.getProductStock(product);
    if (stock < remaining) {
      return { ok: false, error: 'Stock insuficiente (hay ' + stock + ')', cogs: 0, layers: [] };
    }

    const layers = [];
    let cogs = 0;
    const batches = (product.batches || []).slice().sort((a, b) => new Date(a.purchasedAt) - new Date(b.purchasedAt));

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(Number(batch.qty) || 0, remaining);
      if (take <= 0) continue;
      batch.qty = (Number(batch.qty) || 0) - take;
      cogs += take * (Number(batch.cost) || 0);
      layers.push({ batchId: batch.id, qty: take, cost: Number(batch.cost) || 0 });
      remaining -= take;
    }

    product.batches = batches.filter(b => (Number(b.qty) || 0) > 0);
    list[idx] = product;
    this.saveProducts(list);

    return { ok: true, cogs, layers };
  },

  getLowStockProducts() {
    return this.getProducts().filter(p => {
      const stock = this.getProductStock(p);
      return stock <= (Number(p.minStock) || 0);
    });
  },

  getExpiringProducts(days) {
    days = days || 30;
    const limit = Date.now() + days * 24 * 60 * 60 * 1000;
    const result = [];
    this.getProducts().forEach(p => {
      (p.batches || []).forEach(b => {
        if (!b.expiryDate || (Number(b.qty) || 0) <= 0) return;
        const exp = new Date(b.expiryDate).getTime();
        if (exp <= limit) {
          result.push({
            productId: p.id,
            productName: p.name,
            qty: b.qty,
            expiryDate: b.expiryDate,
            cost: b.cost,
            batchId: b.id
          });
        }
      });
    });
    return result.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  },

  getSales() { return this.get(this.KEYS.SALES) || []; },
  saveSales(list) { return this.set(this.KEYS.SALES, list); },

  addSale(sale) {
    const list = this.getSales();
    const itemsDetail = [];
    let subtotal = 0;
    let totalCogs = 0;

    for (const item of (sale.items || [])) {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const disc = Number(item.discountPercent) || 0;
      const lineGross = qty * unitPrice;
      const lineNet = lineGross * (1 - disc / 100);

      const consume = this.consumeStockFIFO(item.productId, qty);
      if (!consume.ok) {
        return { ok: false, error: consume.error };
      }

      subtotal += lineNet;
      totalCogs += consume.cogs;
      itemsDetail.push({
        productId: item.productId,
        productName: item.productName,
        qty: qty,
        unitPrice: unitPrice,
        discountPercent: disc,
        lineTotal: lineNet,
        cogs: consume.cogs,
        layers: consume.layers
      });
    }

    const globalDisc = Number(sale.discountPercent) || 0;
    const total = subtotal * (1 - globalDisc / 100);
    const profit = total - totalCogs;

    const record = {
      id: this._id(),
      number: this._nextSaleNumber(),
      createdAt: new Date().toISOString(),
      date: sale.date || new Date().toISOString().slice(0, 10),
      clientId: sale.clientId || null,
      clientName: sale.clientName || 'Cliente ocasional',
      sellerId: sale.sellerId || null,
      sellerName: sale.sellerName || '',
      items: itemsDetail,
      subtotal: subtotal,
      discountPercent: globalDisc,
      total: total,
      cogs: totalCogs,
      profit: profit,
      paymentStatus: sale.paymentStatus || 'paid',
      paidAmount: sale.paymentStatus === 'paid' ? total : (Number(sale.paidAmount) || 0),
      notes: sale.notes || ''
    };

    if (record.paymentStatus !== 'paid' && record.clientId) {
      const debt = record.total - record.paidAmount;
      if (debt > 0) {
        const client = this.getClients().find(c => c.id === record.clientId);
        if (client) {
          this.updateClient(record.clientId, {
            balance: (Number(client.balance) || 0) + debt
          });
        }
      }
    }

    if (record.paidAmount > 0) {
      this.addTransaction({
        type: 'income',
        description: 'Venta #' + record.number + ' — ' + record.clientName,
        amount: record.paidAmount,
        date: record.date,
        saleId: record.id
      });
    }

    list.unshift(record);
    this.saveSales(list);
    return { ok: true, sale: record };
  },

  _nextSaleNumber() {
    const list = this.getSales();
    if (list.length === 0) return 1;
    return Math.max(...list.map(s => s.number || 0)) + 1;
  },

  getStats() {
    const sales = this.getSales();
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthSales = sales.filter(s => {
      const d = new Date(s.date || s.createdAt);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const totalSales = monthSales.reduce((s, x) => s + (Number(x.total) || 0), 0);
    const totalProfit = monthSales.reduce((s, x) => s + (Number(x.profit) || 0), 0);
    const totalCogs = monthSales.reduce((s, x) => s + (Number(x.cogs) || 0), 0);

    const debtors = this.getDebtors();
    const totalDebt = debtors.reduce((s, c) => s + (Number(c.balance) || 0), 0);

    return {
      totalSales: totalSales,
      totalProfit: totalProfit,
      totalCogs: totalCogs,
      tickets: monthSales.length,
      margin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
      lowStock: this.getLowStockProducts().length,
      expiring: this.getExpiringProducts(30).length,
      debtorsCount: debtors.length,
      totalDebt: totalDebt
    };
  },

  exportAll() {
    return {
      clients: this.getClients(),
      budgets: this.getBudgets(),
      transactions: this.getTransactions(),
      settings: this.getSettings(),
      products: this.getProducts(),
      suppliers: this.getSuppliers(),
      sellers: this.getSellers(),
      sales: this.getSales(),
      exportedAt: new Date().toISOString()
    };
  },

  clearAllData() {
    [
      this.KEYS.CLIENTS, this.KEYS.BUDGETS, this.KEYS.TRANSACTIONS,
      this.KEYS.PRODUCTS, this.KEYS.SUPPLIERS, this.KEYS.SELLERS, this.KEYS.SALES
    ].forEach(k => localStorage.removeItem(k));
  }
};
