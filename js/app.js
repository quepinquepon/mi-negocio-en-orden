// ========== MAIN APPLICATION ==========
const App = {
  currentView: 'dashboard',
  editingId: null,
  editingType: null, // 'client' | 'budget' | 'transaction'

  init() {
    // Check license first
    if (!License.isActivated()) {
      this.showLicenseScreen();
    } else {
      this.showMainApp();
    }

    this.bindEvents();
  },

  showLicenseScreen() {
    document.getElementById('license-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  },

  showMainApp() {
    document.getElementById('license-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    this.navigateTo('dashboard');
    this.refreshDashboard();
  },

  bindEvents() {
    // License activation
    document.getElementById('btn-activate').addEventListener('click', () => this.handleActivate());
    document.getElementById('license-key').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleActivate();
    });

    // Auto-format license key while typing
    document.getElementById('license-key').addEventListener('input', (e) => {
      const formatted = License.format(e.target.value.replace(/[^A-Za-z0-9]/g, ''));
      e.target.value = formatted;
    });

    // Bottom nav se enlaza más abajo (versión endurecida)

    // Quick actions & buttons with data-action (click + touch)
    const handleAction = (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      if (!action) return;
      e.preventDefault();
      try {
        if (action === 'new-client') this.openClientModal();
        else if (action === 'new-budget') this.openBudgetModal();
        else if (action === 'new-transaction') this.openTransactionModal();
        else if (action === 'new-product') InventoryUI.openProductModal();
        else if (action === 'new-purchase') {
          const products = Storage.getProducts();
          if (!products.length) return alert('Primero creá un producto');
          // Si hay varios, pedir el primero con stock o listar
          InventoryUI.openPurchaseModal(products[0].id);
        }
        else if (action === 'new-sale') InventoryUI.openSaleModal();
        else if (action === 'pdf-products') InventoryUI.pdfProductList();
      } catch (err) {
        console.error(err);
        alert('Error: ' + (err.message || err));
      }
    };
    document.addEventListener('click', handleAction);

    // Bottom nav - ensure works on mobile
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = btn.dataset.view;
        if (view) this.navigateTo(view);
      });
    });

    if (typeof InventoryUI !== 'undefined') {
      try { InventoryUI.bind(); } catch (err) { console.error('InventoryUI.bind', err); }
    }

    // Search
    document.getElementById('search-clients')?.addEventListener('input', (e) => {
      this.renderClients(e.target.value);
    });
    document.getElementById('search-budgets')?.addEventListener('input', (e) => {
      this.renderBudgets(e.target.value);
    });

    // Finance tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderFinance(tab.dataset.tab);
      });
    });

    // Settings
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('btn-reset-license')?.addEventListener('click', () => {
      if (confirm('¿Seguro que querés desactivar la licencia en este dispositivo?')) {
        License.deactivate();
        location.reload();
      }
    });
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportData());
    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
      if (confirm('¿Borrar TODOS los clientes, presupuestos y movimientos? Esta acción no se puede deshacer.')) {
        Storage.clearAllData();
        this.refreshAll();
        alert('Datos borrados.');
      }
    });

    // Modal
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-save').addEventListener('click', () => this.handleModalSave());
  },

  handleActivate() {
    const input = document.getElementById('license-key');
    const errorEl = document.getElementById('license-error');
    const result = License.activate(input.value);

    if (result.success) {
      errorEl.classList.add('hidden');
      this.showMainApp();
    } else {
      errorEl.textContent = result.message;
      errorEl.classList.remove('hidden');
    }
  },

  navigateTo(view) {
    this.currentView = view;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update title
    const titles = {
      dashboard: 'Inicio',
      products: 'Productos',
      sales: 'Ventas',
      people: 'Contactos',
      more: 'Más',
      clients: 'Clientes',
      budgets: 'Presupuestos',
      finance: 'Caja',
      settings: 'Ajustes'
    };
    document.getElementById('page-title').textContent = titles[view] || 'App';

    // Show view
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`)?.classList.remove('hidden');

    // Render content
    if (view === 'dashboard') this.refreshDashboard();
    if (view === 'clients') this.renderClients();
    if (view === 'budgets') this.renderBudgets();
    if (view === 'finance') this.renderFinance('income');
    if (view === 'settings') this.loadSettings();
    try {
      if (view === 'products') InventoryUI.renderProducts();
      if (view === 'sales') InventoryUI.renderSales();
      if (view === 'people') InventoryUI.renderPeople();
      if (view === 'more') InventoryUI.renderMoreStats();
    } catch (err) {
      console.error('render view', view, err);
      alert('Error al cargar la pantalla. Probá actualizar la app (borrá caché).\n' + (err.message || ''));
    }
  },

  refreshDashboard() {
    const clients = Storage.getClients();
    const budgets = Storage.getBudgets();
    const txs = Storage.getTransactions();
    const settings = Storage.getSettings();

    const now = new Date();
    const thisMonthIncome = txs
      .filter(t => t.type === 'income' && new Date(t.date || t.createdAt).getMonth() === now.getMonth())
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const pending = budgets.filter(b => b.status === 'sent' || b.status === 'draft').length;

    document.getElementById('stat-clients').textContent = clients.length;
    document.getElementById('stat-budgets').textContent = budgets.length;
    document.getElementById('stat-income').textContent = this.formatMoney(thisMonthIncome);
    document.getElementById('stat-pending').textContent = pending;

    const hero = document.getElementById('hero-greeting');
    const heroSub = document.getElementById('hero-sub');
    if (hero) {
      const name = settings.businessName || '';
      hero.textContent = name ? `Hola, ${name} 👋` : 'Hola 👋';
    }
    if (heroSub) {
      const inv = Storage.getStats();
      if (inv.lowStock > 0) {
        heroSub.textContent = `⚠️ ${inv.lowStock} producto(s) con stock bajo · Ganancia mes ${this.formatMoney(inv.totalProfit)}`;
      } else if (inv.expiring > 0) {
        heroSub.textContent = `🗓️ ${inv.expiring} lote(s) por vencer · Ventas mes ${this.formatMoney(inv.totalSales)}`;
      } else if (pending > 0) {
        heroSub.textContent = `Tenés ${pending} presupuesto${pending > 1 ? 's' : ''} pendiente${pending > 1 ? 's' : ''} de respuesta`;
      } else if (budgets.length === 0 && inv.tickets === 0) {
        heroSub.textContent = 'Cargá productos, registrá compras y empezá a vender';
      } else {
        heroSub.textContent = `Ventas del mes ${this.formatMoney(inv.totalSales)} · Ganancia ${this.formatMoney(inv.totalProfit)}`;
      }
    }

    // Recordatorios
    const rem = document.getElementById('reminders-box');
    if (rem) {
      const inv = Storage.getStats();
      const low = Storage.getLowStockProducts();
      const exp = Storage.getExpiringProducts(30);
      const debtors = Storage.getDebtors();
      let rh = '';
      if (low.length || exp.length || debtors.length) {
        rh += '<p class="section-title">Recordatorios</p>';
        low.slice(0, 3).forEach(p => {
          const st = Storage.getProductStock(p);
          rh += `<div class="alert alert-warn">⚠️ Stock bajo: <strong>${this.escape(p.name)}</strong> (${st} u., mín ${p.minStock || 0})</div>`;
        });
        exp.slice(0, 3).forEach(e => {
          rh += `<div class="alert alert-danger">🗓️ Por vencer: <strong>${this.escape(e.productName)}</strong> — ${e.qty} u. el ${this.formatDate(e.expiryDate)}</div>`;
        });
        debtors.slice(0, 3).forEach(d => {
          rh += `<div class="alert alert-warn">💸 Deuda: <strong>${this.escape(d.name)}</strong> — ${this.formatMoney(d.balance)}</div>`;
        });
      }
      rem.innerHTML = rh;
    }

    // Recent budgets
    const recent = budgets.slice(0, 5);
    const container = document.getElementById('recent-budgets');
    if (recent.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📄</div><p>Todavía no hay presupuestos</p></div>`;
    } else {
      container.innerHTML = recent.map(b => this.budgetItemHTML(b)).join('');
      container.querySelectorAll('[data-edit-budget]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openBudgetModal(btn.dataset.editBudget);
        });
      });
      container.querySelectorAll('[data-pdf-budget]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.generateBudgetPDF(btn.dataset.pdfBudget);
        });
      });
      container.querySelectorAll('[data-mail-budget]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sendBudgetEmail(btn.dataset.mailBudget);
        });
      });
      container.querySelectorAll('[data-share-budget]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.shareBudget(btn.dataset.shareBudget);
        });
      });
    }
  },


  renderClients(filter = '') {
    let clients = Storage.getClients();
    if (filter) {
      const q = filter.toLowerCase();
      clients = clients.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }

    const container = document.getElementById('clients-list');
    if (clients.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">👥</div><p>No hay clientes todavía</p></div>`;
      return;
    }

    container.innerHTML = clients.map(c => `
      <div class="list-item" data-id="${c.id}" data-type="client">
        <div class="list-item-main">
          <div class="list-item-title">${this.escape(c.name)}</div>
          <div class="list-item-sub">${this.escape(c.phone || c.email || 'Sin contacto')}</div>
        </div>
        <div class="list-item-right">
          <button class="icon-btn" data-edit-client="${c.id}">✏️</button>
        </div>
      </div>
    `).join('');

    // Bind edit
    container.querySelectorAll('[data-edit-client]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openClientModal(btn.dataset.editClient);
      });
    });
  },

  renderBudgets(filter = '') {
    let budgets = Storage.getBudgets();
    if (filter) {
      const q = filter.toLowerCase();
      budgets = budgets.filter(b =>
        (b.clientName || '').toLowerCase().includes(q) ||
        String(b.number).includes(q)
      );
    }

    const container = document.getElementById('budgets-list');
    if (budgets.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📄</div><p>No hay presupuestos todavía</p></div>`;
      return;
    }

    container.innerHTML = budgets.map(b => this.budgetItemHTML(b)).join('');

    container.querySelectorAll('[data-edit-budget]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBudgetModal(btn.dataset.editBudget);
      });
    });

    container.querySelectorAll('[data-pdf-budget]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.generateBudgetPDF(btn.dataset.pdfBudget);
      });
    });
    container.querySelectorAll('[data-mail-budget]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sendBudgetEmail(btn.dataset.mailBudget);
      });
    });
    container.querySelectorAll('[data-share-budget]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.shareBudget(btn.dataset.shareBudget);
      });
    });
  },


  budgetItemHTML(b) {
    const statusLabels = {
      draft: 'Borrador',
      sent: 'Enviado',
      accepted: 'Aceptado',
      rejected: 'Rechazado'
    };
    const statusClass = `badge-${b.status || 'draft'}`;
    return `
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">#${b.number} — ${this.escape(b.clientName || 'Sin cliente')}</div>
          <div class="list-item-sub">
            <span class="badge ${statusClass}">${statusLabels[b.status] || 'Borrador'}</span>
            · ${this.formatDate(b.createdAt)}
            ${b.validUntil ? ' · Válido hasta ' + this.formatDate(b.validUntil) : ''}
          </div>
          <div class="action-bar">
            <button class="btn-icon-label pdf" data-pdf-budget="${b.id}">📄 PDF</button>
            <button class="btn-icon-label mail" data-mail-budget="${b.id}">✉️ Mail</button>
            <button class="btn-icon-label whatsapp" data-share-budget="${b.id}">📤 Enviar</button>
            <button class="btn-icon-label" data-edit-budget="${b.id}">✏️ Editar</button>
          </div>
        </div>
        <div class="list-item-right">
          <div class="amount">${this.formatMoney(b.total || 0)}</div>
        </div>
      </div>
    `;
  },


  renderFinance(type = 'income') {
    const txs = Storage.getTransactions().filter(t => t.type === type);
    const container = document.getElementById('finance-list');

    if (txs.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">💰</div><p>No hay ${type === 'income' ? 'ingresos' : 'gastos'} registrados</p></div>`;
      return;
    }

    container.innerHTML = txs.map(t => `
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">${this.escape(t.description || 'Sin descripción')}</div>
          <div class="list-item-sub">${this.formatDate(t.date || t.createdAt)}</div>
        </div>
        <div class="list-item-right">
          <div class="amount" style="color:${type === 'income' ? 'var(--success)' : 'var(--danger)'}">
            ${type === 'income' ? '+' : '-'}${this.formatMoney(t.amount)}
          </div>
        </div>
      </div>
    `).join('');
  },

  // ========== MODALS ==========
  openModal(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
    this.editingId = null;
    this.editingType = null;
  },

  openClientModal(id = null) {
    this.editingType = 'client';
    this.editingId = id;
    const client = id ? Storage.getClients().find(c => c.id === id) : {};

    this.openModal(id ? 'Editar cliente' : 'Nuevo cliente');
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Nombre *</label>
        <input type="text" id="f-name" value="${this.escape(client.name || '')}" placeholder="Nombre completo o empresa" />
      </div>
      <div class="form-group">
        <label>Teléfono / WhatsApp</label>
        <input type="tel" id="f-phone" value="${this.escape(client.phone || '')}" placeholder="11 1234-5678" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="f-email" value="${this.escape(client.email || '')}" placeholder="cliente@email.com" />
      </div>
      <div class="form-group">
        <label>Dirección / Notas</label>
        <textarea id="f-notes" rows="3" placeholder="Dirección, observaciones...">${this.escape(client.notes || '')}</textarea>
      </div>
      ${id ? '<button type="button" id="btn-delete-item" class="btn btn-danger" style="margin-top:12px">Eliminar cliente</button>' : ''}
    `;

    if (id) {
      document.getElementById('btn-delete-item').addEventListener('click', () => {
        if (confirm('¿Eliminar este cliente?')) {
          Storage.deleteClient(id);
          this.closeModal();
          this.renderClients();
          this.refreshDashboard();
        }
      });
    }
  },

  openBudgetModal(id = null) {
    this.editingType = 'budget';
    this.editingId = id;
    const budget = id ? Storage.getBudgets().find(b => b.id === id) : { items: [{ desc: '', qty: 1, price: 0 }], status: 'draft' };
    const clients = Storage.getClients();

    this.openModal(id ? `Presupuesto #${budget.number}` : 'Nuevo presupuesto');

    const clientOptions = clients.map(c => 
      `<option value="${c.id}" ${budget.clientId === c.id ? 'selected' : ''}>${this.escape(c.name)}</option>`
    ).join('');

    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Cliente</label>
        <select id="f-client">
          <option value="">— Seleccionar cliente —</option>
          ${clientOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select id="f-status">
          <option value="draft" ${budget.status === 'draft' ? 'selected' : ''}>Borrador</option>
          <option value="sent" ${budget.status === 'sent' ? 'selected' : ''}>Enviado</option>
          <option value="accepted" ${budget.status === 'accepted' ? 'selected' : ''}>Aceptado</option>
          <option value="rejected" ${budget.status === 'rejected' ? 'selected' : ''}>Rechazado</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ítems</label>
        <div id="items-container"></div>
        <button type="button" id="add-item-btn" class="btn btn-secondary btn-sm">+ Agregar ítem</button>
      </div>
      <div class="total-row">
        <span>Total</span>
        <span id="budget-total">$0</span>
      </div>
      <div class="form-group" style="margin-top:16px">
        <label>Válido hasta</label>
        <input type="date" id="f-valid" value="${budget.validUntil || ''}" />
        <p class="field-hint">Opcional. Fecha de vencimiento del presupuesto.</p>
      </div>
      <div class="form-group">
        <label>Notas / condiciones</label>
        <textarea id="f-notes-budget" rows="3" placeholder="Forma de pago, materiales, plazos, observaciones...">${this.escape(budget.notes || '')}</textarea>
      </div>
      ${id ? `
        <div class="budget-actions-row">
          <button type="button" id="btn-pdf-item" class="btn btn-secondary">📄 PDF</button>
          <button type="button" id="btn-mail-item" class="btn btn-secondary">✉️ Mail</button>
          <button type="button" id="btn-share-item" class="btn btn-primary">📤 Enviar</button>
        </div>
        <button type="button" id="btn-delete-item" class="btn btn-danger" style="margin-top:8px">Eliminar presupuesto</button>
      ` : ''}
    `;


    // Render items
    const renderItems = (items) => {
      const container = document.getElementById('items-container');
      container.innerHTML = items.map((item, idx) => `
        <div class="item-row" data-idx="${idx}">
          <input type="text" class="item-desc" placeholder="Descripción" value="${this.escape(item.desc || '')}" />
          <input type="number" class="item-qty" placeholder="Cant" value="${item.qty || 1}" min="1" />
          <input type="number" class="item-price" placeholder="Precio" value="${item.price || 0}" min="0" step="0.01" />
          <button type="button" class="item-remove" data-idx="${idx}">✕</button>
        </div>
      `).join('');

      // Bind changes
      container.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => this.updateBudgetTotal());
      });
      container.querySelectorAll('.item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.idx);
          items.splice(idx, 1);
          if (items.length === 0) items.push({ desc: '', qty: 1, price: 0 });
          renderItems(items);
          this.updateBudgetTotal();
        });
      });
    };

    const items = budget.items && budget.items.length ? [...budget.items] : [{ desc: '', qty: 1, price: 0 }];
    renderItems(items);

    document.getElementById('add-item-btn').addEventListener('click', () => {
      items.push({ desc: '', qty: 1, price: 0 });
      renderItems(items);
    });

    this._currentItems = items;
    this.updateBudgetTotal();

    if (id) {
      document.getElementById('btn-pdf-item')?.addEventListener('click', () => this.generateBudgetPDF(id));
      document.getElementById('btn-mail-item')?.addEventListener('click', () => this.sendBudgetEmail(id));
      document.getElementById('btn-share-item')?.addEventListener('click', () => this.shareBudget(id));
      document.getElementById('btn-delete-item').addEventListener('click', () => {
        if (confirm('¿Eliminar este presupuesto?')) {
          Storage.deleteBudget(id);
          this.closeModal();
          this.renderBudgets();
          this.refreshDashboard();
        }
      });
    }
  },


  updateBudgetTotal() {
    const rows = document.querySelectorAll('.item-row');
    let total = 0;
    rows.forEach(row => {
      const qty = Number(row.querySelector('.item-qty').value) || 0;
      const price = Number(row.querySelector('.item-price').value) || 0;
      total += qty * price;
    });
    document.getElementById('budget-total').textContent = this.formatMoney(total);
  },

  openTransactionModal() {
    this.editingType = 'transaction';
    this.editingId = null;
    const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'income';

    this.openModal(activeTab === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto');
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Descripción *</label>
        <input type="text" id="f-desc" placeholder="Ej: Cobro trabajo Pérez" />
      </div>
      <div class="form-group">
        <label>Monto *</label>
        <input type="number" id="f-amount" placeholder="0" min="0" step="0.01" />
      </div>
      <div class="form-group">
        <label>Fecha</label>
        <input type="date" id="f-date" value="${new Date().toISOString().slice(0, 10)}" />
      </div>
      <input type="hidden" id="f-type" value="${activeTab}" />
    `;
  },

  handleModalSave() {
    if (this.editingType === 'client') {
      const name = document.getElementById('f-name').value.trim();
      if (!name) return alert('El nombre es obligatorio');

      const data = {
        name,
        phone: document.getElementById('f-phone').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        notes: document.getElementById('f-notes').value.trim()
      };

      if (this.editingId) {
        Storage.updateClient(this.editingId, data);
      } else {
        Storage.addClient(data);
      }
      this.closeModal();
      this.renderClients();
      this.refreshDashboard();
    }

    if (this.editingType === 'budget') {
      const clientId = document.getElementById('f-client').value;
      const status = document.getElementById('f-status').value;
      const client = Storage.getClients().find(c => c.id === clientId);

      // Collect items
      const items = [];
      document.querySelectorAll('.item-row').forEach(row => {
        const desc = row.querySelector('.item-desc').value.trim();
        const qty = Number(row.querySelector('.item-qty').value) || 0;
        const price = Number(row.querySelector('.item-price').value) || 0;
        if (desc || price > 0) {
          items.push({ desc, qty, price });
        }
      });

      const total = items.reduce((sum, i) => sum + (i.qty * i.price), 0);

      const validUntil = document.getElementById('f-valid')?.value || '';
      const notes = document.getElementById('f-notes-budget')?.value?.trim() || '';

      const data = {
        clientId: clientId || null,
        clientName: client ? client.name : 'Sin cliente',
        status,
        items,
        total,
        validUntil,
        notes
      };

      if (this.editingId) {
        Storage.updateBudget(this.editingId, data);
      } else {
        Storage.addBudget(data);
      }
      this.closeModal();
      this.renderBudgets();
      this.refreshDashboard();
    }

    if (this.editingType === 'transaction') {
      const description = document.getElementById('f-desc').value.trim();
      const amount = Number(document.getElementById('f-amount').value);
      const date = document.getElementById('f-date').value;
      const type = document.getElementById('f-type').value;

      if (!description || !amount) return alert('Completá descripción y monto');

      Storage.addTransaction({ description, amount, date, type });
      this.closeModal();
      this.renderFinance(type);
      this.refreshDashboard();
    }

    try {
      if (this.editingType === 'product') InventoryUI.saveProduct();
      if (this.editingType === 'purchase') InventoryUI.savePurchase();
      if (this.editingType === 'sale') InventoryUI.saveSale();
      if (this.editingType === 'supplier') InventoryUI.saveSupplier();
      if (this.editingType === 'seller') InventoryUI.saveSeller();
      if (this.editingType === 'debt') InventoryUI.saveDebtPayment();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + (err.message || err));
    }
  },

  // Settings
  loadSettings() {
    const s = Storage.getSettings();
    document.getElementById('business-name').value = s.businessName || '';
    document.getElementById('business-phone').value = s.phone || '';
    document.getElementById('business-email').value = s.email || '';
    const logoEl = document.getElementById('business-logo');
    if (logoEl) logoEl.value = s.logoUrl || '';
    
    const key = License.getActivatedKey();
    document.getElementById('license-info').textContent = key 
      ? `Licencia: ${key}` 
      : 'Sin licencia';
  },

  saveSettings() {
    Storage.saveSettings({
      businessName: document.getElementById('business-name').value.trim(),
      phone: document.getElementById('business-phone').value.trim(),
      email: document.getElementById('business-email').value.trim(),
      logoUrl: (document.getElementById('business-logo')?.value || '').trim()
    });
    alert('Datos guardados');
  },

  exportData() {
    const data = Storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi-negocio-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  refreshAll() {
    this.refreshDashboard();
    this.renderClients();
    this.renderBudgets();
    this.renderFinance('income');
  },

  // ========== ENVIAR / COMPARTIR PRESUPUESTO ==========
  _budgetSummaryText(budget, settings) {
    const lines = [];
    lines.push(`Presupuesto N° ${budget.number || '—'}`);
    lines.push(`Cliente: ${budget.clientName || 'Sin cliente'}`);
    lines.push(`Total: ${this.formatMoney(budget.total || 0)}`);
    if (budget.validUntil) lines.push(`Válido hasta: ${this.formatDate(budget.validUntil)}`);
    lines.push('');
    (budget.items || []).forEach(it => {
      const sub = (Number(it.qty) || 0) * (Number(it.price) || 0);
      lines.push(`• ${it.desc || 'Ítem'} x${it.qty || 1} = ${this.formatMoney(sub)}`);
    });
    if (budget.notes) {
      lines.push('');
      lines.push('Notas: ' + budget.notes);
    }
    lines.push('');
    lines.push(settings.businessName || 'Mi Negocio en Orden');
    if (settings.phone) lines.push('Tel: ' + settings.phone);
    if (settings.email) lines.push('Email: ' + settings.email);
    return lines.join('\n');
  },

  async _buildPdfBlob(budgetId) {
    // Genera el PDF y devuelve { blob, fileName, budget, settings }
    const budget = Storage.getBudgets().find(b => b.id === budgetId);
    if (!budget) return null;
    const settings = Storage.getSettings();

    // Reutilizamos la lógica generando a blob
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      alert('No se pudo cargar el generador de PDF. Revisá tu conexión.');
      return null;
    }

    // Llamamos a generateBudgetPDF en modo blob
    return this.generateBudgetPDF(budgetId, { returnBlob: true });
  },

  async sendBudgetEmail(budgetId) {
    const budget = Storage.getBudgets().find(b => b.id === budgetId);
    if (!budget) return alert('No se encontró el presupuesto');

    const settings = Storage.getSettings();
    const client = Storage.getClients().find(c => c.id === budget.clientId);
    const to = (client && client.email) ? client.email : '';
    const subject = encodeURIComponent(
      `Presupuesto N° ${budget.number || ''} — ${settings.businessName || 'Mi Negocio'}`
    );
    const body = encodeURIComponent(
      this._budgetSummaryText(budget, settings) +
      '\n\n---\nAdjuntá el PDF descargado desde la app si hace falta.\n(Podés tocar "PDF" antes de enviar el mail)'
    );

    // Descargar PDF automáticamente para que el usuario lo adjunte
    this.generateBudgetPDF(budgetId);

    // Abrir cliente de correo
    setTimeout(() => {
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    }, 400);

    // Marcar como enviado
    if (budget.status === 'draft') {
      Storage.updateBudget(budgetId, { status: 'sent' });
      this.renderBudgets();
      this.refreshDashboard();
    }
  },

  async shareBudget(budgetId) {
    const budget = Storage.getBudgets().find(b => b.id === budgetId);
    if (!budget) return alert('No se encontró el presupuesto');

    const settings = Storage.getSettings();
    const text = this._budgetSummaryText(budget, settings);
    const title = `Presupuesto N° ${budget.number || ''} — ${settings.businessName || 'Mi Negocio'}`;

    // Intentar compartir con Web Share API (ideal en celular: WhatsApp, Gmail, etc.)
    try {
      const result = await this.generateBudgetPDF(budgetId, { returnBlob: true });
      if (result && result.blob && navigator.share) {
        const file = new File([result.blob], result.fileName, { type: 'application/pdf' });
        const shareData = { title, text, files: [file] };
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          await navigator.share({ title, text });
        }
      } else if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        // Fallback escritorio: copiar texto + descargar PDF
        this.generateBudgetPDF(budgetId);
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          alert('Resumen copiado al portapapeles y PDF descargado. Pegalo donde quieras enviarlo.');
        } else {
          alert('PDF descargado. Compartilo desde tu carpeta de descargas.');
        }
      }

      if (budget.status === 'draft') {
        Storage.updateBudget(budgetId, { status: 'sent' });
        this.renderBudgets();
        this.refreshDashboard();
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return; // usuario canceló
      console.error(err);
      // Fallback
      this.generateBudgetPDF(budgetId);
      alert('Se descargó el PDF. Podés enviarlo por WhatsApp o mail desde tu galería de archivos.');
    }
  },

  // ========== GENERAR PDF DE PRESUPUESTO ==========
  async generateBudgetPDF(budgetId, options = {}) {
    const budget = Storage.getBudgets().find(b => b.id === budgetId);
    if (!budget) {
      alert('No se encontró el presupuesto');
      return;
    }

    const settings = Storage.getSettings();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = 20;

    const primary = [15, 118, 110];
    const dark = [15, 23, 42];
    const muted = [100, 116, 139];

    // Logo opcional
    let logoData = null;
    if (settings.logoUrl) {
      try {
        logoData = await this._loadImageData(settings.logoUrl);
      } catch (e) { console.warn('Logo no cargó', e); }
    }

    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 32, 'F');

    if (logoData) {
      try { doc.addImage(logoData, 'PNG', margin, 6, 18, 18); } catch (e) {}
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.businessName || 'Mi Negocio en Orden', margin + 22, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const hi = [settings.phone, settings.email].filter(Boolean).join('  ·  ');
      if (hi) doc.text(hi, margin + 22, 22);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.businessName || 'Mi Negocio en Orden', margin, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const hi = [settings.phone, settings.email].filter(Boolean).join('  ·  ');
      if (hi) doc.text(hi, margin, 22);
    }

    y = 44;

    // Título
    doc.setTextColor(...dark);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', margin, y);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(`N° ${budget.number || '—'}`, pageWidth - margin, y, { align: 'right' });

    y += 8;
    doc.setFontSize(9);
    doc.text(`Fecha: ${this.formatDate(budget.createdAt)}`, pageWidth - margin, y, { align: 'right' });

    y += 12;

    // Cliente
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'FD');

    doc.setTextColor(...muted);
    doc.setFontSize(8);
    doc.text('CLIENTE', margin + 4, y + 6);

    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(budget.clientName || 'Sin cliente', margin + 4, y + 13);

    y += 28;

    // Tabla de ítems
    const colDesc = margin;
    const colQty = pageWidth - margin - 70;
    const colPrice = pageWidth - margin - 40;
    const colSub = pageWidth - margin;

    // Header tabla
    doc.setFillColor(...primary);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCIÓN', colDesc + 2, y + 5.5);
    doc.text('CANT.', colQty, y + 5.5, { align: 'right' });
    doc.text('P.UNIT.', colPrice, y + 5.5, { align: 'right' });
    doc.text('SUBTOTAL', colSub - 2, y + 5.5, { align: 'right' });

    y += 10;

    // Ítems
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...dark);
    doc.setFontSize(9);

    const items = budget.items || [];
    items.forEach((item, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      const sub = qty * price;

      // Fondo alternado
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 9, 'F');
      }

      const desc = item.desc || '—';
      // Truncar descripción si es muy larga
      const maxDescWidth = colQty - colDesc - 8;
      let displayDesc = desc;
      while (doc.getTextWidth(displayDesc) > maxDescWidth && displayDesc.length > 3) {
        displayDesc = displayDesc.slice(0, -4) + '...';
      }

      doc.text(displayDesc, colDesc + 2, y + 2);
      doc.text(String(qty), colQty, y + 2, { align: 'right' });
      doc.text(this.formatMoney(price), colPrice, y + 2, { align: 'right' });
      doc.text(this.formatMoney(sub), colSub - 2, y + 2, { align: 'right' });

      y += 9;
    });

    y += 6;

    // Total
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dark);
    doc.text('TOTAL', colPrice - 10, y, { align: 'right' });
    doc.setTextColor(...primary);
    doc.text(this.formatMoney(budget.total || 0), colSub - 2, y, { align: 'right' });

    y += 16;

    // Estado
    const statusLabels = {
      draft: 'Borrador',
      sent: 'Enviado',
      accepted: 'Aceptado',
      rejected: 'Rechazado'
    };
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(`Estado: ${statusLabels[budget.status] || 'Borrador'}`, margin, y);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text('Documento generado con Mi Negocio en Orden', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Este presupuesto no es una factura', pageWidth / 2, footerY + 5, { align: 'center' });

    // Notas
    if (budget.notes) {
      y += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...dark);
      doc.text('Notas / condiciones', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...muted);
      const noteLines = doc.splitTextToSize(budget.notes, pageWidth - margin * 2);
      doc.text(noteLines, margin, y);
    }

    // Validez
    if (budget.validUntil) {
      y += 12;
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      doc.text('Válido hasta: ' + this.formatDate(budget.validUntil), margin, y);
    }

    // Descargar o devolver blob
    const safeClient = (budget.clientName || 'cliente').replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
    const fileName = `Presupuesto_${budget.number || 'SN'}_${safeClient}.pdf`;

    if (options && options.returnBlob) {
      const blob = doc.output('blob');
      return { blob, fileName, budget, settings };
    }

    doc.save(fileName);
    return null;
  },

  // Helpers
  formatMoney(n) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

  },

  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  },

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

// Start
document.addEventListener('DOMContentLoaded', () => App.init());
