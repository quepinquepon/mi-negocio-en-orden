// ========== INVENTARIO, VENTAS, CONTACTOS ==========
const InventoryUI = {
  productFilter: 'all',
  peopleTab: 'clients',

  bind() {
    // Product filters
    document.querySelectorAll('#product-filters .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#product-filters .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.productFilter = chip.dataset.pfilter;
        this.renderProducts();
      });
    });

    document.getElementById('search-products')?.addEventListener('input', () => this.renderProducts());
    document.getElementById('search-sales')?.addEventListener('input', () => this.renderSales());
    document.getElementById('search-people')?.addEventListener('input', () => this.renderPeople());

    document.querySelectorAll('#people-tabs .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#people-tabs .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.peopleTab = chip.dataset.ptab;
        this.renderPeople();
      });
    });

    document.getElementById('btn-new-people')?.addEventListener('click', () => {
      if (this.peopleTab === 'clients' || this.peopleTab === 'debtors') App.openClientModal();
      else if (this.peopleTab === 'suppliers') this.openSupplierModal();
      else if (this.peopleTab === 'sellers') this.openSellerModal();
    });

    document.querySelectorAll('[data-view-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.viewJump;
        // show internal views that are not in bottom nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.view').forEach(x => x.classList.add('hidden'));
        document.getElementById('view-' + v)?.classList.remove('hidden');
        const titles = { budgets: 'Presupuestos', finance: 'Caja', settings: 'Ajustes' };
        document.getElementById('page-title').textContent = titles[v] || v;
        if (v === 'budgets') App.renderBudgets();
        if (v === 'finance') App.renderFinance('income');
        if (v === 'settings') App.loadSettings();
      });
    });
  },

  // ----- PRODUCTS -----
  renderProducts() {
    let products = Storage.getProducts();
    const q = (document.getElementById('search-products')?.value || '').toLowerCase();
    if (q) products = products.filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));

    if (this.productFilter === 'low') {
      products = products.filter(p => Storage.getProductStock(p) <= (Number(p.minStock) || 0));
    } else if (this.productFilter === 'expiring') {
      const expIds = new Set(Storage.getExpiringProducts(30).map(e => e.productId));
      products = products.filter(p => expIds.has(p.id));
    }

    // Alerts
    const low = Storage.getLowStockProducts();
    const exp = Storage.getExpiringProducts(30);
    const alerts = document.getElementById('stock-alerts');
    if (alerts) {
      let html = '';
      if (low.length) html += `<div class="alert alert-warn">⚠️ ${low.length} producto(s) con stock bajo o en cero</div>`;
      if (exp.length) html += `<div class="alert alert-danger">🗓️ ${exp.length} lote(s) vencen en los próximos 30 días</div>`;
      alerts.innerHTML = html;
    }

    const container = document.getElementById('products-list');
    if (!products.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>No hay productos. Agregá el primero.</p></div>`;
      return;
    }

    container.innerHTML = products.map(p => {
      const stock = Storage.getProductStock(p);
      const lowStock = stock <= (Number(p.minStock) || 0);
      const batches = (p.batches || []).filter(b => (b.qty || 0) > 0);
      const avgCost = batches.length
        ? batches.reduce((s, b) => s + b.qty * b.cost, 0) / stock
        : 0;
      return `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${App.escape(p.name)}</div>
            <div class="list-item-sub">
              Stock: <strong style="color:${lowStock ? 'var(--danger)' : 'var(--success)'}">${stock}</strong>
              ${p.minStock ? ` · Mín: ${p.minStock}` : ''}
              · Precio: ${App.formatMoney(p.salePrice || 0)}
              ${stock ? ` · Costo prom.: ${App.formatMoney(avgCost)}` : ''}
            </div>
            <div class="action-bar">
              <button class="btn-icon-label" data-edit-product="${p.id}">✏️ Editar</button>
              <button class="btn-icon-label primary" data-buy-product="${p.id}">➕ Compra</button>
              <button class="btn-icon-label" data-batches-product="${p.id}">📋 Lotes</button>
            </div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('[data-edit-product]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this.openProductModal(btn.dataset.editProduct); };
    });
    container.querySelectorAll('[data-buy-product]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this.openPurchaseModal(btn.dataset.buyProduct); };
    });
    container.querySelectorAll('[data-batches-product]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this.showBatches(btn.dataset.batchesProduct); };
    });
  },

  openProductModal(id) {
    App.editingType = 'product';
    App.editingId = id;
    const p = id ? Storage.getProducts().find(x => x.id === id) : {};
    App.openModal(id ? 'Editar producto' : 'Nuevo producto');
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group"><label>Nombre *</label>
        <input type="text" id="f-pname" value="${App.escape(p.name || '')}" placeholder="Ej: Cable 2.5mm" /></div>
      <div class="form-group"><label>SKU / código</label>
        <input type="text" id="f-psku" value="${App.escape(p.sku || '')}" /></div>
      <div class="form-group"><label>Precio de venta</label>
        <input type="number" id="f-pprice" value="${p.salePrice || 0}" min="0" step="0.01" /></div>
      <div class="form-group"><label>Stock mínimo (alerta)</label>
        <input type="number" id="f-pmin" value="${p.minStock || 0}" min="0" />
        <p class="field-hint">Si el stock llega a este número, verás una alerta.</p></div>
      ${id ? '<button type="button" id="btn-delete-item" class="btn btn-danger" style="margin-top:12px">Eliminar producto</button>' : ''}
    `;
    if (id) {
      document.getElementById('btn-delete-item').onclick = () => {
        if (confirm('¿Eliminar producto y sus lotes?')) {
          Storage.deleteProduct(id);
          App.closeModal();
          this.renderProducts();
        }
      };
    }
  },

  openPurchaseModal(productId) {
    App.editingType = 'purchase';
    App.editingId = productId;
    const p = Storage.getProducts().find(x => x.id === productId);
    const suppliers = Storage.getSuppliers();
    const opts = suppliers.map(s => `<option value="${s.id}">${App.escape(s.name)}</option>`).join('');
    App.openModal('Ingresar compra — ' + (p?.name || ''));
    document.getElementById('modal-body').innerHTML = `
      <p class="field-hint" style="margin-bottom:12px">
        El nuevo costo se aplica solo a estas unidades. El stock anterior mantiene su costo (FIFO).
      </p>
      <div class="form-group"><label>Cantidad *</label>
        <input type="number" id="f-bqty" min="1" value="1" /></div>
      <div class="form-group"><label>Costo unitario *</label>
        <input type="number" id="f-bcost" min="0" step="0.01" value="0" /></div>
      <div class="form-group"><label>Vencimiento</label>
        <input type="date" id="f-bexp" />
        <p class="field-hint">Opcional. Para alertas de vencimiento.</p></div>
      <div class="form-group"><label>Proveedor / distribuidor</label>
        <select id="f-bsup"><option value="">— Sin proveedor —</option>${opts}</select></div>
    `;
  },

  showBatches(productId) {
    const p = Storage.getProducts().find(x => x.id === productId);
    if (!p) return;
    const batches = (p.batches || []).filter(b => (b.qty || 0) > 0);
    App.openModal('Lotes — ' + p.name);
    document.getElementById('modal-save').style.display = 'none';
    if (!batches.length) {
      document.getElementById('modal-body').innerHTML = '<p class="empty-state">Sin stock en lotes</p>';
      return;
    }
    document.getElementById('modal-body').innerHTML = batches.map(b => `
      <div class="list-item" style="margin-bottom:8px">
        <div class="list-item-main">
          <div class="list-item-title">${b.qty} u. · Costo ${App.formatMoney(b.cost)}</div>
          <div class="list-item-sub">
            Ingreso: ${App.formatDate(b.purchasedAt)}
            ${b.expiryDate ? ' · Vence: ' + App.formatDate(b.expiryDate) : ''}
            ${b.supplierName ? ' · ' + App.escape(b.supplierName) : ''}
          </div>
        </div>
      </div>
    `).join('');
    // restore save button when closing
    const close = () => { document.getElementById('modal-save').style.display = ''; };
    document.getElementById('modal-close').addEventListener('click', close, { once: true });
    document.getElementById('modal-cancel').addEventListener('click', close, { once: true });
  },

  saveProduct() {
    const name = document.getElementById('f-pname')?.value?.trim();
    if (!name) return alert('El nombre es obligatorio');
    const data = {
      name,
      sku: document.getElementById('f-psku')?.value?.trim() || '',
      salePrice: Number(document.getElementById('f-pprice')?.value) || 0,
      minStock: Number(document.getElementById('f-pmin')?.value) || 0
    };
    if (App.editingId) Storage.updateProduct(App.editingId, data);
    else Storage.addProduct(data);
    App.closeModal();
    this.renderProducts();
    App.refreshDashboard();
  },

  savePurchase() {
    const qty = Number(document.getElementById('f-bqty')?.value) || 0;
    const cost = Number(document.getElementById('f-bcost')?.value) || 0;
    if (qty <= 0) return alert('Cantidad inválida');
    const supId = document.getElementById('f-bsup')?.value || null;
    const sup = Storage.getSuppliers().find(s => s.id === supId);
    Storage.addPurchase(App.editingId, {
      qty, cost,
      expiryDate: document.getElementById('f-bexp')?.value || null,
      supplierId: supId,
      supplierName: sup ? sup.name : ''
    });
    // gasto en caja
    Storage.addTransaction({
      type: 'expense',
      description: 'Compra stock — ' + (Storage.getProducts().find(p => p.id === App.editingId)?.name || ''),
      amount: qty * cost,
      date: new Date().toISOString().slice(0, 10)
    });
    App.closeModal();
    this.renderProducts();
    App.refreshDashboard();
    alert('Compra registrada. Las unidades anteriores conservan su costo.');
  },

  // ----- SALES -----
  renderSales() {
    let sales = Storage.getSales();
    const q = (document.getElementById('search-sales')?.value || '').toLowerCase();
    if (q) sales = sales.filter(s =>
      (s.clientName || '').toLowerCase().includes(q) ||
      String(s.number).includes(q)
    );

    const stats = Storage.getStats();
    const statsEl = document.getElementById('sales-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card"><span class="stat-label">Ventas del mes</span><span class="stat-value">${App.formatMoney(stats.totalSales)}</span></div>
        <div class="stat-card"><span class="stat-label">Ganancia</span><span class="stat-value" style="color:var(--success)">${App.formatMoney(stats.totalProfit)}</span></div>
        <div class="stat-card"><span class="stat-label">Tickets</span><span class="stat-value">${stats.tickets}</span></div>
        <div class="stat-card"><span class="stat-label">Margen</span><span class="stat-value">${stats.margin.toFixed(1)}%</span></div>
      `;
    }

    const container = document.getElementById('sales-list');
    if (!sales.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">🛒</div><p>Todavía no hay ventas</p></div>`;
      return;
    }

    container.innerHTML = sales.map(s => `
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">#${s.number} — ${App.escape(s.clientName)}</div>
          <div class="list-item-sub">
            ${App.formatDate(s.date || s.createdAt)}
            ${s.sellerName ? ' · ' + App.escape(s.sellerName) : ''}
            · Ganancia ${App.formatMoney(s.profit || 0)}
            ${s.paymentStatus === 'debt' || s.paymentStatus === 'partial' ? ' · <span class="badge badge-rejected">Deuda</span>' : ''}
          </div>
        </div>
        <div class="list-item-right">
          <div class="amount">${App.formatMoney(s.total)}</div>
        </div>
      </div>
    `).join('');
  },

  openSaleModal() {
    const products = Storage.getProducts().filter(p => Storage.getProductStock(p) > 0);
    const clients = Storage.getClients();
    const sellers = Storage.getSellers().filter(s => s.active !== false);

    if (!products.length) {
      return alert('No hay productos con stock. Primero cargá productos y una compra.');
    }

    App.editingType = 'sale';
    App.editingId = null;
    this._saleCart = [];
    this._saleProducts = products;

    App.openModal('Nueva venta');

    const cOpts = clients.map(c => `<option value="${c.id}">${App.escape(c.name)}</option>`).join('');
    const sOpts = sellers.map(s => `<option value="${s.id}">${App.escape(s.name)}</option>`).join('');
    const pOpts = products.map(p =>
      `<option value="${p.id}" data-price="${p.salePrice || 0}" data-stock="${Storage.getProductStock(p)}">${App.escape(p.name)} (stock ${Storage.getProductStock(p)})</option>`
    ).join('');

    document.getElementById('modal-body').innerHTML = `
      <div class="form-group"><label>Cliente</label>
        <select id="f-sclient"><option value="">Cliente ocasional</option>${cOpts}</select></div>
      <div class="form-group"><label>Vendedor</label>
        <select id="f-sseller"><option value="">—</option>${sOpts}</select></div>

      <p class="section-title">Agregar productos</p>
      <div class="form-group"><label>Buscar producto</label>
        <input type="search" id="f-ssearch" placeholder="Escribí nombre o código..." autocomplete="off" /></div>
      <div class="form-group"><label>Producto</label>
        <select id="f-sproduct" size="4" style="height:auto;min-height:110px">${pOpts}</select>
        <p class="field-hint">Tocá un producto de la lista</p></div>
      <div style="display:flex;gap:8px">
        <div class="form-group" style="flex:1"><label>Cant.</label>
          <input type="number" id="f-sqty" min="1" value="1" /></div>
        <div class="form-group" style="flex:1"><label>Precio</label>
          <input type="number" id="f-sprice" min="0" step="0.01" /></div>
        <div class="form-group" style="flex:1"><label>Desc.%</label>
          <input type="number" id="f-sdisc" min="0" max="100" value="0" /></div>
      </div>
      <button type="button" id="btn-add-cart" class="btn btn-secondary btn-sm" style="margin-bottom:12px">+ Agregar al carrito</button>

      <div id="sale-cart" class="list" style="margin-bottom:12px"></div>
      <div class="total-row"><span>Subtotal</span><span id="sale-subtotal">$0</span></div>

      <div class="form-group" style="margin-top:12px"><label>Descuento global (%)</label>
        <input type="number" id="f-sgdisc" min="0" max="100" value="0" /></div>
      <div class="total-row"><span>Total</span><span id="sale-total">$0</span></div>

      <div class="form-group"><label>Pago</label>
        <select id="f-spay">
          <option value="paid">Cobrado total</option>
          <option value="partial">Pago parcial</option>
          <option value="debt">Deja deuda</option>
        </select></div>
      <div class="form-group" id="partial-wrap" style="display:none"><label>Monto cobrado</label>
        <input type="number" id="f-spaid" min="0" step="0.01" value="0" /></div>
      <div class="form-group"><label>Notas</label>
        <input type="text" id="f-snotes" placeholder="Opcional" /></div>
    `;

    const fillProducts = (list) => {
      const sel = document.getElementById('f-sproduct');
      sel.innerHTML = list.map(p =>
        `<option value="${p.id}" data-price="${p.salePrice || 0}" data-stock="${Storage.getProductStock(p)}">${App.escape(p.name)} (stock ${Storage.getProductStock(p)})</option>`
      ).join('');
      if (list.length) {
        sel.selectedIndex = 0;
        syncPrice();
      }
    };

    const syncPrice = () => {
      const sel = document.getElementById('f-sproduct');
      const opt = sel.options[sel.selectedIndex];
      if (opt) document.getElementById('f-sprice').value = opt.dataset.price || 0;
    };

    document.getElementById('f-sproduct').onchange = syncPrice;
    document.getElementById('f-sproduct').onclick = syncPrice;
    syncPrice();

    document.getElementById('f-ssearch').oninput = (e) => {
      const q = (e.target.value || '').toLowerCase().trim();
      const filtered = !q ? this._saleProducts : this._saleProducts.filter(p =>
        (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
      );
      fillProducts(filtered);
    };

    document.getElementById('f-spay').onchange = () => {
      document.getElementById('partial-wrap').style.display =
        document.getElementById('f-spay').value === 'partial' ? 'block' : 'none';
    };
    document.getElementById('f-sgdisc').oninput = () => this._refreshSaleTotals();

    document.getElementById('btn-add-cart').onclick = () => {
      const sel = document.getElementById('f-sproduct');
      const opt = sel.options[sel.selectedIndex];
      if (!opt) return alert('Elegí un producto');
      const productId = sel.value;
      const product = Storage.getProducts().find(p => p.id === productId);
      const qty = Number(document.getElementById('f-sqty').value) || 0;
      const unitPrice = Number(document.getElementById('f-sprice').value) || 0;
      const discountPercent = Number(document.getElementById('f-sdisc').value) || 0;
      const stock = Number(opt.dataset.stock) || 0;
      if (!product || qty <= 0) return alert('Cantidad inválida');
      const inCart = this._saleCart.filter(i => i.productId === productId).reduce((s, i) => s + i.qty, 0);
      if (qty + inCart > stock) return alert('Stock insuficiente. Disponible: ' + (stock - inCart));
      this._saleCart.push({
        productId, productName: product.name, qty, unitPrice, discountPercent,
        lineTotal: qty * unitPrice * (1 - discountPercent / 100)
      });
      this._renderSaleCart();
      document.getElementById('f-sqty').value = 1;
      document.getElementById('f-sdisc').value = 0;
      document.getElementById('f-ssearch').value = '';
      fillProducts(this._saleProducts);
    };

    this._renderSaleCart();
  },

  _renderSaleCart() {
    const el = document.getElementById('sale-cart');
    if (!el) return;
    if (!this._saleCart.length) {
      el.innerHTML = '<p class="field-hint">El carrito está vacío. Agregá uno o más productos.</p>';
    } else {
      el.innerHTML = this._saleCart.map((item, idx) => `
        <div class="list-item" style="margin-bottom:6px">
          <div class="list-item-main">
            <div class="list-item-title">${App.escape(item.productName)}</div>
            <div class="list-item-sub">${item.qty} x ${App.formatMoney(item.unitPrice)}${item.discountPercent ? ' (−' + item.discountPercent + '%)' : ''}</div>
          </div>
          <div class="list-item-right">
            <div class="amount">${App.formatMoney(item.lineTotal)}</div>
            <button type="button" class="icon-btn" data-rm-cart="${idx}">✕</button>
          </div>
        </div>
      `).join('');
      el.querySelectorAll('[data-rm-cart]').forEach(btn => {
        btn.onclick = () => {
          this._saleCart.splice(Number(btn.dataset.rmCart), 1);
          this._renderSaleCart();
        };
      });
    }
    this._refreshSaleTotals();
  },

  _refreshSaleTotals() {
    const sub = (this._saleCart || []).reduce((s, i) => s + i.lineTotal, 0);
    const gdisc = Number(document.getElementById('f-sgdisc')?.value) || 0;
    const total = sub * (1 - gdisc / 100);
    const subEl = document.getElementById('sale-subtotal');
    const totEl = document.getElementById('sale-total');
    if (subEl) subEl.textContent = App.formatMoney(sub);
    if (totEl) totEl.textContent = App.formatMoney(total);
  },

  saveSale() {
    if (!this._saleCart || !this._saleCart.length) {
      return alert('Agregá al menos un producto al carrito');
    }

    const globalDisc = Number(document.getElementById('f-sgdisc')?.value) || 0;
    const paymentStatus = document.getElementById('f-spay')?.value || 'paid';
    const clientId = document.getElementById('f-sclient')?.value || null;
    const client = clientId ? Storage.getClients().find(c => c.id === clientId) : null;
    const sellerId = document.getElementById('f-sseller')?.value || null;
    const seller = sellerId ? Storage.getSellers().find(s => s.id === sellerId) : null;

    const sub = this._saleCart.reduce((s, i) => s + i.lineTotal, 0);
    const total = sub * (1 - globalDisc / 100);
    let paidAmount = total;
    if (paymentStatus === 'debt') paidAmount = 0;
    if (paymentStatus === 'partial') paidAmount = Number(document.getElementById('f-spaid')?.value) || 0;

    // Validar stock otra vez
    for (const item of this._saleCart) {
      const p = Storage.getProducts().find(x => x.id === item.productId);
      const stock = Storage.getProductStock(p);
      if (item.qty > stock) {
        return alert('Stock insuficiente de ' + item.productName + ' (hay ' + stock + ')');
      }
    }

    const result = Storage.addSale({
      clientId,
      clientName: client ? client.name : 'Cliente ocasional',
      sellerId,
      sellerName: seller ? seller.name : '',
      items: this._saleCart.map(i => ({
        productId: i.productId,
        productName: i.productName,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent
      })),
      discountPercent: globalDisc,
      paymentStatus,
      paidAmount,
      notes: document.getElementById('f-snotes')?.value?.trim() || ''
    });

    if (!result.ok) return alert(result.error || 'Error al registrar venta');

    this._saleCart = [];
    App.closeModal();
    this.renderSales();
    this.renderProducts();
    App.refreshDashboard();
    alert(
      'Venta #' + result.sale.number + ' registrada\\n' +
      'Productos: ' + result.sale.items.length + '\\n' +
      'Total: ' + App.formatMoney(result.sale.total) + '\\n' +
      'Costo FIFO: ' + App.formatMoney(result.sale.cogs) + '\\n' +
      'Ganancia: ' + App.formatMoney(result.sale.profit)
    );
  },

  // ----- PEOPLE -----
  // ----- PEOPLE -----
  renderPeople() {
    const q = (document.getElementById('search-people')?.value || '').toLowerCase();
    const container = document.getElementById('people-list');
    let html = '';

    if (this.peopleTab === 'clients') {
      let list = Storage.getClients();
      if (q) list = list.filter(c => (c.name || '').toLowerCase().includes(q));
      if (!list.length) html = `<div class="empty-state"><div class="icon">👥</div><p>Sin clientes</p></div>`;
      else html = list.map(c => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${App.escape(c.name)}</div>
            <div class="list-item-sub">${App.escape(c.phone || c.email || '')}
              ${(c.balance || 0) > 0 ? ' · <span style="color:var(--danger)">Debe ' + App.formatMoney(c.balance) + '</span>' : ''}
            </div>
          </div>
          <button class="icon-btn" data-edit-client="${c.id}">✏️</button>
        </div>`).join('');
    } else if (this.peopleTab === 'debtors') {
      let list = Storage.getDebtors();
      if (q) list = list.filter(c => (c.name || '').toLowerCase().includes(q));
      if (!list.length) html = `<div class="empty-state"><div class="icon">💸</div><p>No hay deudores</p></div>`;
      else html = list.map(c => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${App.escape(c.name)}</div>
            <div class="list-item-sub">${App.escape(c.phone || '')}</div>
          </div>
          <div class="list-item-right"><div class="amount" style="color:var(--danger)">${App.formatMoney(c.balance)}</div>
            <button class="btn-icon-label" data-pay-debt="${c.id}">Cobrar</button>
          </div>
        </div>`).join('');
    } else if (this.peopleTab === 'suppliers') {
      let list = Storage.getSuppliers();
      if (q) list = list.filter(c => (c.name || '').toLowerCase().includes(q));
      if (!list.length) html = `<div class="empty-state"><div class="icon">🚚</div><p>Sin proveedores / distribuidores</p></div>`;
      else html = list.map(s => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${App.escape(s.name)}</div>
            <div class="list-item-sub">${App.escape(s.phone || s.notes || '')}</div>
          </div>
          <button class="icon-btn" data-edit-supplier="${s.id}">✏️</button>
        </div>`).join('');
    } else if (this.peopleTab === 'sellers') {
      let list = Storage.getSellers();
      if (q) list = list.filter(c => (c.name || '').toLowerCase().includes(q));
      if (!list.length) html = `<div class="empty-state"><div class="icon">🧑‍💼</div><p>Sin vendedores</p></div>`;
      else html = list.map(s => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${App.escape(s.name)}</div>
            <div class="list-item-sub">${s.active === false ? 'Inactivo' : 'Activo'} ${s.phone ? '· ' + App.escape(s.phone) : ''}</div>
          </div>
          <button class="icon-btn" data-edit-seller="${s.id}">✏️</button>
        </div>`).join('');
    }

    container.innerHTML = html;

    container.querySelectorAll('[data-edit-client]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); App.openClientModal(btn.dataset.editClient); };
    });
    container.querySelectorAll('[data-edit-supplier]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this.openSupplierModal(btn.dataset.editSupplier); };
    });
    container.querySelectorAll('[data-edit-seller]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this.openSellerModal(btn.dataset.editSeller); };
    });
    container.querySelectorAll('[data-pay-debt]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.openDebtModal(btn.dataset.payDebt);
      };
    });
  },

  openDebtModal(clientId) {
    const c = Storage.getClients().find(x => x.id === clientId);
    if (!c) return;
    const debt = Number(c.balance) || 0;
    App.editingType = 'debt';
    App.editingId = clientId;
    App.openModal('Cobrar deuda');
    document.getElementById('modal-body').innerHTML = `
      <div class="hero-card" style="margin-bottom:16px">
        <h2>${App.escape(c.name)}</h2>
        <p>Deuda actual: <strong>${App.formatMoney(debt)}</strong></p>
      </div>
      <div class="form-group"><label>Monto a cobrar *</label>
        <input type="number" id="f-debt-amount" min="0" step="0.01" value="${debt}" /></div>
      <div class="chip-row">
        <button type="button" class="chip" data-debt-fill="25">25%</button>
        <button type="button" class="chip" data-debt-fill="50">50%</button>
        <button type="button" class="chip" data-debt-fill="100">Todo</button>
      </div>
      <div class="form-group"><label>Fecha</label>
        <input type="date" id="f-debt-date" value="${new Date().toISOString().slice(0,10)}" /></div>
      <div class="form-group"><label>Medio / nota</label>
        <input type="text" id="f-debt-note" placeholder="Efectivo, transferencia, etc." /></div>
      <p class="field-hint">El cobro se registra en Caja como ingreso y baja la deuda del cliente.</p>
    `;
    document.querySelectorAll('[data-debt-fill]').forEach(chip => {
      chip.onclick = () => {
        const pct = Number(chip.dataset.debtFill);
        document.getElementById('f-debt-amount').value = (debt * pct / 100).toFixed(2);
      };
    });
  },

  saveDebtPayment() {
    const c = Storage.getClients().find(x => x.id === App.editingId);
    if (!c) return;
    const debt = Number(c.balance) || 0;
    let val = Number(document.getElementById('f-debt-amount')?.value) || 0;
    if (val <= 0) return alert('Ingresá un monto válido');
    if (val > debt) val = debt;
    const note = document.getElementById('f-debt-note')?.value?.trim() || '';
    const date = document.getElementById('f-debt-date')?.value || new Date().toISOString().slice(0, 10);
    const newBal = Math.max(0, debt - val);
    Storage.updateClient(c.id, { balance: newBal });
    Storage.addTransaction({
      type: 'income',
      description: 'Cobro deuda — ' + c.name + (note ? ' (' + note + ')' : ''),
      amount: val,
      date
    });
    App.closeModal();
    this.renderPeople();
    App.refreshDashboard();
    alert('Cobrado ' + App.formatMoney(val) + '.\nDeuda restante: ' + App.formatMoney(newBal));
  },


  openSupplierModal(id) {
    App.editingType = 'supplier';
    App.editingId = id;
    const s = id ? Storage.getSuppliers().find(x => x.id === id) : {};
    App.openModal(id ? 'Editar proveedor' : 'Nuevo proveedor / distribuidor');
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group"><label>Nombre *</label>
        <input type="text" id="f-supname" value="${App.escape(s.name || '')}" /></div>
      <div class="form-group"><label>Teléfono</label>
        <input type="tel" id="f-supphone" value="${App.escape(s.phone || '')}" /></div>
      <div class="form-group"><label>Notas</label>
        <textarea id="f-supnotes" rows="2">${App.escape(s.notes || '')}</textarea></div>
      ${id ? '<button type="button" id="btn-delete-item" class="btn btn-danger">Eliminar</button>' : ''}
    `;
    if (id) document.getElementById('btn-delete-item').onclick = () => {
      if (confirm('¿Eliminar?')) { Storage.deleteSupplier(id); App.closeModal(); this.renderPeople(); }
    };
  },

  openSellerModal(id) {
    App.editingType = 'seller';
    App.editingId = id;
    const s = id ? Storage.getSellers().find(x => x.id === id) : {};
    App.openModal(id ? 'Editar vendedor' : 'Nuevo vendedor');
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group"><label>Nombre *</label>
        <input type="text" id="f-selname" value="${App.escape(s.name || '')}" /></div>
      <div class="form-group"><label>Teléfono</label>
        <input type="tel" id="f-selphone" value="${App.escape(s.phone || '')}" /></div>
      <div class="form-group"><label>Activo</label>
        <select id="f-selactive"><option value="true" ${s.active !== false ? 'selected' : ''}>Sí</option>
        <option value="false" ${s.active === false ? 'selected' : ''}>No</option></select></div>
      ${id ? '<button type="button" id="btn-delete-item" class="btn btn-danger">Eliminar</button>' : ''}
    `;
    if (id) document.getElementById('btn-delete-item').onclick = () => {
      if (confirm('¿Eliminar?')) { Storage.deleteSeller(id); App.closeModal(); this.renderPeople(); }
    };
  },

  saveSupplier() {
    const name = document.getElementById('f-supname')?.value?.trim();
    if (!name) return alert('Nombre obligatorio');
    const data = { name, phone: document.getElementById('f-supphone')?.value?.trim() || '', notes: document.getElementById('f-supnotes')?.value?.trim() || '' };
    if (App.editingId) Storage.updateSupplier(App.editingId, data);
    else Storage.addSupplier(data);
    App.closeModal();
    this.renderPeople();
  },

  saveSeller() {
    const name = document.getElementById('f-selname')?.value?.trim();
    if (!name) return alert('Nombre obligatorio');
    const data = {
      name,
      phone: document.getElementById('f-selphone')?.value?.trim() || '',
      active: document.getElementById('f-selactive')?.value === 'true'
    };
    if (App.editingId) Storage.updateSeller(App.editingId, data);
    else Storage.addSeller(data);
    App.closeModal();
    this.renderPeople();
  },

  // PDF lista de productos
  pdfProductList() {
    const products = Storage.getProducts();
    if (!products.length) return alert('No hay productos');
    const settings = Storage.getSettings();
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('No se pudo cargar PDF');
    const doc = new jsPDF();
    const margin = 16;
    let y = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.businessName || 'Mi Negocio en Orden', margin, y);
    y += 8;
    doc.setFontSize(12);
    doc.text('Lista de productos y stock', margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Generado: ' + new Date().toLocaleString('es-AR'), margin, y);
    y += 10;

    products.forEach((p, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const stock = Storage.getProductStock(p);
      doc.setFont('helvetica', 'bold');
      doc.text((i + 1) + '. ' + (p.name || ''), margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`Stock: ${stock}  |  Precio: ${App.formatMoney(p.salePrice || 0)}  |  Mín: ${p.minStock || 0}`, margin, y);
      y += 5;
      const batches = (p.batches || []).filter(b => (b.qty || 0) > 0);
      batches.forEach(b => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setTextColor(100);
        doc.text(`   · ${b.qty} u. @ ${App.formatMoney(b.cost)} (ingreso ${App.formatDate(b.purchasedAt)}${b.expiryDate ? ', vence ' + App.formatDate(b.expiryDate) : ''})`, margin, y);
        doc.setTextColor(0);
        y += 4.5;
      });
      y += 4;
    });

    doc.save('Lista_productos.pdf');
  },

  renderMoreStats() {
    const s = Storage.getStats();
    const el = document.getElementById('more-stats');
    if (!el) return;
    el.innerHTML = `
      <p><strong>Ventas del mes:</strong> ${App.formatMoney(s.totalSales)}</p>
      <p><strong>Ganancia del mes:</strong> ${App.formatMoney(s.totalProfit)}</p>
      <p><strong>Costo de mercadería:</strong> ${App.formatMoney(s.totalCogs)}</p>
      <p><strong>Margen:</strong> ${s.margin.toFixed(1)}%</p>
      <p><strong>Tickets:</strong> ${s.tickets}</p>
      <p><strong>Deudores:</strong> ${s.debtorsCount} (${App.formatMoney(s.totalDebt)})</p>
      <p><strong>Alertas stock:</strong> ${s.lowStock}</p>
      <p><strong>Lotes por vencer (30 días):</strong> ${s.expiring}</p>
      <button type="button" id="btn-pdf-profit" class="btn btn-primary" style="margin-top:14px">📄 PDF ganancias del mes</button>
    `;
    document.getElementById('btn-pdf-profit')?.addEventListener('click', () => this.pdfProfitReport());
  },

  pdfProfitReport() {
    const sales = Storage.getSales();
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthSales = sales.filter(s => {
      const d = new Date(s.date || s.createdAt);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const settings = Storage.getSettings();
    const stats = Storage.getStats();
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('No se pudo cargar el generador de PDF');

    const doc = new jsPDF();
    const margin = 16;
    let y = 18;
    const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.businessName || 'Mi Negocio en Orden', margin, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const hi = [settings.phone, settings.email].filter(Boolean).join(' · ');
    if (hi) doc.text(hi, margin, 19);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de ganancias — ' + monthName, margin, 27);

    y = 40;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen del mes', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = [
      ['Total ventas', App.formatMoney(stats.totalSales)],
      ['Costo mercadería (FIFO)', App.formatMoney(stats.totalCogs)],
      ['Ganancia bruta', App.formatMoney(stats.totalProfit)],
      ['Margen', stats.margin.toFixed(1) + '%'],
      ['Cantidad de ventas', String(stats.tickets)],
      ['Deuda de clientes', App.formatMoney(stats.totalDebt)]
    ];
    lines.forEach(row => {
      doc.text(row[0], margin, y);
      doc.text(row[1], 190, y, { align: 'right' });
      y += 6;
    });

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Detalle de ventas', margin, y);
    y += 7;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('N°', margin, y);
    doc.text('Fecha', margin + 14, y);
    doc.text('Cliente', margin + 36, y);
    doc.text('Total', 130, y, { align: 'right' });
    doc.text('Costo', 155, y, { align: 'right' });
    doc.text('Ganancia', 190, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'normal');

    if (!monthSales.length) {
      doc.text('Sin ventas este mes', margin, y);
    } else {
      monthSales.forEach(s => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(s.number || ''), margin, y);
        doc.text(App.formatDate(s.date || s.createdAt), margin + 14, y);
        const cn = (s.clientName || '').slice(0, 22);
        doc.text(cn, margin + 36, y);
        doc.text(App.formatMoney(s.total || 0), 130, y, { align: 'right' });
        doc.text(App.formatMoney(s.cogs || 0), 155, y, { align: 'right' });
        doc.text(App.formatMoney(s.profit || 0), 190, y, { align: 'right' });
        y += 5;
      });
    }

    y = Math.max(y + 10, 280);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Generado con Mi Negocio en Orden — costos por FIFO (lotes)', 105, 290, { align: 'center' });

    const fname = 'Ganancias_' + year + '-' + String(month + 1).padStart(2, '0') + '.pdf';
    doc.save(fname);
  }
};
