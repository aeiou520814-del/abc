/* ═══════════════════════════════════════════════════
   app.js — Los Consentidos
   Backend: Supabase (PostgreSQL en la nube)
   Adaptado al esquema losconsentidos_ddl.sql
   
   MAPEO DE TABLAS:
   ┌──────────────────────────────────────────────────┐
   │  Tabla DDL          Columna PK / relevante        │
   │  categorias         id, nombre                    │
   │  platillo           id, nombre, precio, id_cate.. │
   │  ingredientes       id, nombre, unidad, minimo    │
   │  inventario         id, id_ingrediente, cantidad  │
   │  empleado           id, nombre, paterno, telefono │
   │  roles              id, nombre_rol                │
   │  orden              id, fecha, empleado (FK)      │
   │  detalle_orden      id, id_orden, id_platillo     │
   │  ingreso            id, id_orden, monto, fecha    │
   │  mesa*              id, numero, estado, ...       │
   │  resena*            id, numero_mesa, calificacion │
   │  (* tablas extra — ver TABLAS_SUPABASE_v2.sql)   │
   └──────────────────────────────────────────────────┘
═══════════════════════════════════════════════════ */

// ── Estado global ────────────────────────────────────
let carrito        = {};   // { id_platillo: { nombre, precio, cantidad } }
let allPlatillos   = [];
let allCategorias  = [];
let allIngredientes = [];
let currentFilter  = 'all';
let allMesas       = [];
let mesaSeleccionada = null;
let allEmpleados   = [];   // era "allMeseros" — ahora usa tabla empleado
let allRoles       = [];
let allOrdenes     = [];
let notifInterval  = null;
let pagoMetodoActual = 'Efectivo';
let pagoOrdenActual  = null;
let pagoMontoActual  = 0;
let estrellaSeleccionada = 0;

/* ════════════════════════════════════════════════
   SUPABASE — Cliente HTTP mínimo (sin SDK)
════════════════════════════════════════════════ */
const sb = {
  headers: () => ({
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  }),

  async get(table, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: sb.headers()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async post(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: sb.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async patch(table, filter, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: sb.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async delete(table, filter) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: 'DELETE',
      headers: sb.headers()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  }
};

/* ════════════════════════════════════════════════
   UTILIDADES
════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✅  ' : '❌  ') + msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3500);
}

function fmt(val) {
  return '$' + Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════════════
   MODALES
════════════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modalOrden') renderPlatillosOrden(allPlatillos);
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function closeModalOutside(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open')
    .forEach(m => m.classList.remove('open'));
});

/* ════════════════════════════════════════════════
   CARRITO
════════════════════════════════════════════════ */
function agregarAlCarrito(id, nombre, precio) {
  if (carrito[id]) {
    carrito[id].cantidad++;
  } else {
    carrito[id] = { nombre, precio: Number(precio), cantidad: 1 };
  }
  renderCarrito();
}

function cambiarCantidad(id, delta) {
  if (!carrito[id]) return;
  carrito[id].cantidad += delta;
  if (carrito[id].cantidad <= 0) delete carrito[id];
  renderCarrito();
}

function limpiarCarrito() {
  carrito = {};
  renderCarrito();
}

function renderCarrito() {
  const wrap    = document.getElementById('carritoItems');
  const totalEl = document.getElementById('carritoTotal');
  const keys    = Object.keys(carrito);

  if (!keys.length) {
    wrap.innerHTML = '<p class="carrito-empty">Selecciona platillos del menú →</p>';
    totalEl.textContent = '$0.00';
    return;
  }

  let total = 0;
  wrap.innerHTML = keys.map(id => {
    const item = carrito[id];
    const sub  = item.precio * item.cantidad;
    total += sub;
    return `
      <div class="carrito-item">
        <div class="ci-info">
          <span class="ci-nombre">${esc(item.nombre)}</span>
          <span class="ci-precio">${fmt(item.precio)} c/u</span>
        </div>
        <div class="ci-controls">
          <button class="ci-btn" onclick="cambiarCantidad('${id}', -1)">−</button>
          <span class="ci-cant">${item.cantidad}</span>
          <button class="ci-btn" onclick="cambiarCantidad('${id}', 1)">+</button>
        </div>
        <span class="ci-sub">${fmt(sub)}</span>
      </div>
    `;
  }).join('');
  totalEl.textContent = fmt(total);
}

function filtrarPlatillosOrden(q) {
  const lista = allPlatillos.filter(p =>
    p.nombre.toLowerCase().includes(q.toLowerCase())
  );
  renderPlatillosOrden(lista);
}

function renderPlatillosOrden(lista) {
  const wrap = document.getElementById('platillosOrdenList');
  if (!lista.length) {
    wrap.innerHTML = '<p class="carrito-empty">No se encontraron platillos.</p>';
    return;
  }
  // DDL: platillo.id (no id_platillo)
  wrap.innerHTML = lista.map(p => `
    <div class="plat-orden-item" onclick="agregarAlCarrito(${p.id}, '${esc(p.nombre)}', ${p.precio})">
      <div class="poi-info">
        <span class="poi-nombre">${esc(p.nombre)}</span>
        <span class="poi-cat">${esc(p.categoria || 'Sin categoría')}</span>
      </div>
      <div class="poi-right">
        <span class="poi-precio">${fmt(p.precio)}</span>
        <span class="poi-add">+</span>
      </div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════
   STATS
════════════════════════════════════════════════ */
async function loadStats() {
  try {
    // DDL: tabla "categorias" (plural), PK "id"
    // DDL: tabla "ingredientes" (plural), PK "id"
    // DDL: tabla "orden", PK "id"
    const [plat, ord, ing] = await Promise.all([
      sb.get('platillo',     'select=id'),
      sb.get('orden',        'select=id,fecha&fecha=gte.' + new Date().toISOString().slice(0, 10)),
      sb.get('ingredientes', 'select=id'),
    ]);
    document.getElementById('statPlatillos').textContent    = plat.length;
    document.getElementById('statOrdenes').textContent      = ord.length;
    document.getElementById('statIngredientes').textContent = ing.length;
  } catch(e) { console.warn('Stats no disponibles', e); }
}

/* ════════════════════════════════════════════════
   CATEGORÍAS
   DDL: tabla "categorias", PK "id", campo "nombre"
════════════════════════════════════════════════ */
async function loadCategorias() {
  try {
    // DDL usa "categorias" (plural)
    allCategorias = await sb.get('categorias', 'select=id,nombre&order=nombre.asc');

    // Llenar select del modal de platillo
    const sel = document.getElementById('plat-cat');
    sel.innerHTML = allCategorias.map(c =>
      `<option value="${c.id}">${esc(c.nombre)}</option>`
    ).join('');

    // Botones de filtro
    const wrap = document.getElementById('menuFilters');
    wrap.innerHTML = `<button class="filter-btn active" data-filter="all">Todo 🌟</button>`;
    allCategorias.forEach(c => {
      const btn = document.createElement('button');
      btn.className   = 'filter-btn';
      btn.dataset.filter = c.nombre;
      btn.textContent = c.nombre;
      wrap.appendChild(btn);
    });

    wrap.addEventListener('click', e => {
      if (!e.target.classList.contains('filter-btn')) return;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderMenu(allPlatillos);
    });
  } catch(e) {
    console.error('Error al cargar categorías:', e);
    document.getElementById('menuFilters').innerHTML =
      `<button class="filter-btn active" data-filter="all">Todo 🌟</button>`;
  }
}

/* ════════════════════════════════════════════════
   MENÚ
   DDL: platillo.id, platillo.precio, platillo.id_categorias → categorias.id
════════════════════════════════════════════════ */
async function loadMenu() {
  try {
    // DDL no tiene columna "frecuencia" — no la pedimos
    const [platillos, cats] = await Promise.all([
      sb.get('platillo',   'select=id,nombre,precio,id_categorias&order=nombre.asc'),
      sb.get('categorias', 'select=id,nombre')
    ]);

    // Mapear id_categorias → nombre de categoría
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c.nombre; });

    allPlatillos = platillos.map(p => ({
      ...p,
      categoria: catMap[p.id_categorias] || 'Sin categoría'
    }));
    renderMenu(allPlatillos);
    renderPlatillosOrden(allPlatillos);
  } catch(e) {
    document.getElementById('menuGrid').innerHTML =
      '<div class="menu-loading"><p>⚠️ No se pudo cargar el menú. Verifica config.js</p></div>';
    console.error(e);
  }
}

const EMOJIS = {
  'Tacos':      '🌮', 'Quesadilla': '🧀', 'Pozole': '🍲',
  'Agua':       '🥤', 'Enchilada':  '🌯', 'Flauta': '🌯',
  'Sopa':       '🍜', 'Chile':      '🌶️', 'default': '🍽️'
};
function getEmoji(nombre) {
  for (const [key, emoji] of Object.entries(EMOJIS)) {
    if (key !== 'default' && nombre.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return EMOJIS.default;
}
function catClass(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('entrada'))  return 'cat-entrada';
  if (c.includes('postre'))   return 'cat-postre';
  if (c.includes('bebida'))   return 'cat-bebida';
  return 'cat-principal';
}

function renderMenu(platillos) {
  const grid = document.getElementById('menuGrid');
  const list = currentFilter === 'all'
    ? platillos
    : platillos.filter(p => p.categoria === currentFilter);

  if (!list.length) {
    grid.innerHTML = '<div class="menu-loading"><p>No hay platillos en esta categoría 🍃</p></div>';
    return;
  }
  // DDL: platillo.id (no id_platillo)
  grid.innerHTML = list.map(p => `
    <div class="menu-card" onclick="agregarDesdeMenu(${p.id}, '${esc(p.nombre)}', ${p.precio})">
      <span class="menu-card-emoji">${getEmoji(p.nombre)}</span>
      <span class="menu-card-cat ${catClass(p.categoria)}">${esc(p.categoria)}</span>
      <h3>${esc(p.nombre)}</h3>
      <p>Delicioso platillo preparado al momento con ingredientes frescos.</p>
      <div class="menu-card-footer">
        <div class="menu-price">${fmt(p.precio)}</div>
        <span class="menu-add-hint">Toca para ordenar</span>
      </div>
    </div>
  `).join('');
}

function agregarDesdeMenu(id, nombre, precio) {
  agregarAlCarrito(id, nombre, precio);
  showToast(`${nombre} agregado a la orden`);
  const modal = document.getElementById('modalOrden');
  if (!modal.classList.contains('open')) openModal('modalOrden');
}

async function crearPlatillo() {
  const nombre  = document.getElementById('plat-nombre').value.trim();
  const cat_id  = document.getElementById('plat-cat').value;
  const precio  = parseFloat(document.getElementById('plat-precio').value);

  if (!nombre)                   return showToast('El nombre es obligatorio', 'error');
  if (isNaN(precio) || precio < 0) return showToast('Ingresa un precio válido', 'error');

  try {
    // DDL: no existe "frecuencia" en platillo — se omite
    await sb.post('platillo', {
      nombre,
      id_categorias: cat_id ? parseInt(cat_id) : null,
      precio
    });
    showToast('¡Platillo agregado al menú! 🎉');
    closeModal('modalPlatillo');
    document.getElementById('plat-nombre').value = '';
    document.getElementById('plat-precio').value = '';
    loadMenu(); loadStats();
  } catch(e) {
    showToast('Error al guardar: ' + (e.message || JSON.stringify(e)), 'error');
  }
}

/* ════════════════════════════════════════════════
   ÓRDENES
   DDL: orden.id (no id_orden), orden.empleado → empleado.id
        No existe orden.estado ni orden.cuenta_total
        El total se calcula desde detalle_orden × platillo.precio
        ingreso.id_orden registra el pago (reemplaza "pago" en v2)
════════════════════════════════════════════════ */
async function loadOrdenes() {
  const grid = document.getElementById('ordenesGrid');
  grid.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div><p style="margin-top:1rem">Cargando órdenes…</p></div>';
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    // Traer órdenes de hoy con su empleado y detalles
    const ordenes = await sb.get('orden',
      `select=id,fecha,empleado,detalle_orden(id,cantidad,platillo(id,nombre,precio))&fecha=gte.${hoy}&order=id.desc`
    );

    // IDs de órdenes ya cobradas (tienen ingreso)
    const ingresos = await sb.get('ingreso', `select=id_orden&fecha=gte.${hoy}T00:00:00`).catch(() => []);
    const cobradas = new Set(ingresos.map(i => i.id_orden));

    if (!ordenes.length) {
      grid.innerHTML = '<div class="empty-state"><span class="empty-icon">🎉</span><p>Sin órdenes por ahora.</p></div>';
      return;
    }

    // Mapeo de empleados para mostrar nombre
    const empMap = {};
    allEmpleados.forEach(e => { empMap[e.id] = `${e.nombre} ${e.paterno}`; });

    grid.innerHTML = ordenes.map(o => {
      const detalles  = o.detalle_orden || [];
      const total     = detalles.reduce((s, d) => s + (d.platillo?.precio || 0) * d.cantidad, 0);
      const cobrada   = cobradas.has(o.id);
      const empNombre = empMap[o.empleado] || `Emp. #${o.empleado}`;
      return `
        <div class="orden-card ${cobrada ? 'servida' : ''}">
          <div class="orden-header">
            <div class="orden-mesa-num">👨‍💼 ${esc(empNombre)}</div>
            <span class="badge ${cobrada ? 'badge-cerrada' : 'badge-activa'}">
              ${cobrada ? '✓ Cobrada' : '● Pendiente'}
            </span>
          </div>
          <div class="orden-total">${fmt(total)}</div>
          <div class="orden-fecha">📅 ${new Date(o.fecha).toLocaleString('es-MX')}</div>
          <div style="font-size:13px;color:var(--gris);margin-top:0.4rem">
            ${detalles.map(d => `${d.cantidad}× ${esc(d.platillo?.nombre || '?')}`).join(', ')}
          </div>
          ${!cobrada ? `<button class="action-btn" style="margin-top:0.75rem" onclick="abrirModalPago(${o.id}, ${total})">💳 Registrar cobro</button>` : ''}
        </div>
      `;
    }).join('');
  } catch(e) {
    grid.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Error al cargar las órdenes.</p></div>';
    console.error(e);
  }
}

async function crearOrden() {
  // DDL: orden.empleado es el ID (INT) del empleado en la tabla empleado
  const empId  = document.getElementById('ord-empleado').value.trim();
  const items  = Object.entries(carrito);

  if (!empId)        return showToast('Selecciona un empleado', 'error');
  if (!items.length) return showToast('Agrega al menos un platillo', 'error');

  try {
    // 1. Crear la cabecera de la orden — DDL: solo id, fecha, empleado
    const [orden] = await sb.post('orden', {
      empleado: parseInt(empId)
      // fecha se pone sola con DEFAULT NOW()
    });

    // 2. Crear el detalle — DDL: id_orden refs orden.id, id_platillo refs platillo.id
    const detalles = items.map(([id, v]) => ({
      id_orden:    orden.id,
      id_platillo: parseInt(id),
      cantidad:    v.cantidad
    }));
    await sb.post('detalle_orden', detalles);

    const total = items.reduce((s, [, v]) => s + v.precio * v.cantidad, 0);
    showToast(`Orden #${orden.id} creada — ${fmt(total)} 🛒`);
    closeModal('modalOrden');
    limpiarCarrito();
    document.getElementById('ord-empleado').value = '';
    loadOrdenes();
    loadStats();
  } catch(e) {
    showToast('Error al crear la orden: ' + (e.message || JSON.stringify(e)), 'error');
    console.error(e);
  }
}

/* ════════════════════════════════════════════════
   INVENTARIO
   DDL: tabla "ingredientes" (plural), PK "id"
        tabla "inventario": id, id_ingrediente, fecha, cantidad
        No existe columna "existencia" — se suma desde inventario
════════════════════════════════════════════════ */
async function loadInventario() {
  try {
    // Traer ingredientes + suma de inventario agrupada
    const [ings, inv] = await Promise.all([
      sb.get('ingredientes', 'select=id,nombre,unidad,minimo&order=nombre.asc'),
      sb.get('inventario',   'select=id_ingrediente,cantidad')
    ]);

    // Agrupar existencia total por ingrediente
    const stockMap = {};
    inv.forEach(r => {
      stockMap[r.id_ingrediente] = (stockMap[r.id_ingrediente] || 0) + parseFloat(r.cantidad);
    });

    allIngredientes = ings.map(i => ({
      ...i,
      existencia: stockMap[i.id] || 0
    }));

    renderInventario(allIngredientes);
    renderStockAlerts(allIngredientes);
  } catch(e) {
    document.getElementById('invBody').innerHTML =
      '<tr><td colspan="6" class="table-empty">⚠️ Error al cargar el inventario.</td></tr>';
    console.error(e);
  }
}

function renderStockAlerts(items) {
  const wrap  = document.getElementById('stockAlerts');
  const low   = items.filter(i => i.existencia > 0 && i.existencia < parseFloat(i.minimo));
  const empty = items.filter(i => i.existencia <= 0);
  let html = '';
  empty.forEach(i => { html += `<div class="alert-card danger">❌ <strong>${esc(i.nombre)}</strong> — AGOTADO</div>`; });
  low.forEach(i =>   { html += `<div class="alert-card">⚠️ <strong>${esc(i.nombre)}</strong> — Bajo (${i.existencia} ${i.unidad})</div>`; });
  wrap.innerHTML = html;
}

function renderInventario(items) {
  const tbody = document.getElementById('invBody');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">🧺 Sin ingredientes registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(i => {
    const ex = parseFloat(i.existencia), mn = parseFloat(i.minimo);
    let sc, sl;
    if (ex <= 0)      { sc = 'empty'; sl = '❌ Agotado'; }
    else if (ex < mn) { sc = 'low';   sl = '⚠️ Bajo'; }
    else              { sc = 'ok';    sl = '✅ OK'; }
    return `
      <tr>
        <td><strong>${esc(i.nombre)}</strong></td>
        <td>${i.existencia}</td>
        <td>${i.minimo}</td>
        <td>${esc(i.unidad)}</td>
        <td><span class="stock-pill ${sc}">${sl}</span></td>
        <td>
          <button class="action-btn" onclick="agregarStock(${i.id}, ${i.existencia})">+ Stock</button>
          <button class="action-btn del" onclick="eliminarIngrediente(${i.id})">Eliminar</button>
        </td>
      </tr>`;
  }).join('');
}

function filterInventario(q) {
  renderInventario(allIngredientes.filter(i =>
    i.nombre.toLowerCase().includes(q.toLowerCase())
  ));
}

async function crearIngrediente() {
  const nombre   = document.getElementById('ing-nombre').value.trim();
  const cantidad = Number(document.getElementById('ing-existencia').value);
  const minimo   = Number(document.getElementById('ing-minimo').value);
  const unidad   = document.getElementById('ing-unidad').value;

  if (!nombre) return showToast('El nombre es obligatorio', 'error');

  try {
    // DDL: insertar en "ingredientes" (catálogo)
    const [ing] = await sb.post('ingredientes', { nombre, unidad, minimo });

    // Si hay stock inicial, crear registro en inventario
    if (cantidad > 0) {
      await sb.post('inventario', { id_ingrediente: ing.id, cantidad });
    }

    showToast('¡Ingrediente registrado! 🧺');
    closeModal('modalIngrediente');
    ['ing-nombre', 'ing-existencia', 'ing-minimo'].forEach(id =>
      document.getElementById(id).value = ''
    );
    loadInventario(); loadStats();
  } catch(e) {
    showToast('Error: ' + (e.message || JSON.stringify(e)), 'error');
  }
}

async function agregarStock(idIngrediente, actual) {
  // En lugar de editar directamente, se inserta un nuevo registro en inventario
  const entrada = prompt(`Stock actual acumulado: ${actual}\nIngresa la cantidad a AÑADIR:`);
  if (entrada === null || entrada.trim() === '') return;
  const cant = Number(entrada);
  if (cant <= 0) return showToast('La cantidad debe ser mayor a 0', 'error');
  try {
    await sb.post('inventario', { id_ingrediente: idIngrediente, cantidad: cant });
    showToast('Stock actualizado ✓');
    loadInventario();
  } catch(e) {
    showToast('Error al ajustar stock', 'error');
  }
}

async function eliminarIngrediente(id) {
  if (!confirm('¿Eliminar este ingrediente? Se borrarán también sus entradas de inventario.')) return;
  try {
    // inventario tiene ON DELETE CASCADE desde ingredientes
    await sb.delete('ingredientes', `id=eq.${id}`);
    showToast('Ingrediente eliminado');
    loadInventario(); loadStats();
  } catch(e) {
    showToast('Error al eliminar', 'error');
  }
}

/* ════════════════════════════════════════════════
   NOTIFICACIONES
════════════════════════════════════════════════ */
function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) checkNotificaciones();
}

async function checkNotificaciones() {
  try {
    const alertas = [];
    const hoy     = new Date().toISOString().slice(0, 10);

    // Ingredientes con stock bajo (calculado desde inventario)
    const [ings, inv] = await Promise.all([
      sb.get('ingredientes', 'select=id,nombre,unidad,minimo').catch(() => []),
      sb.get('inventario',   'select=id_ingrediente,cantidad').catch(() => [])
    ]);
    const stockMap = {};
    inv.forEach(r => { stockMap[r.id_ingrediente] = (stockMap[r.id_ingrediente] || 0) + parseFloat(r.cantidad); });
    ings.forEach(i => {
      const ex = stockMap[i.id] || 0;
      const mn = parseFloat(i.minimo);
      if (ex <= 0)      alertas.push({ tipo: 'danger',  titulo: `❌ ${i.nombre} — AGOTADO`,    sub: 'Reabastecer urgente' });
      else if (ex < mn) alertas.push({ tipo: 'warning', titulo: `⚠️ ${i.nombre} — Stock bajo`, sub: `${ex} ${i.unidad} (mín ${mn})` });
    });

    // Órdenes de hoy sin ingreso asociado (pendientes de cobro)
    const ordenes  = await sb.get('orden',   `select=id&fecha=gte.${hoy}`).catch(() => []);
    const ingresos = await sb.get('ingreso', `select=id_orden&fecha=gte.${hoy}T00:00:00`).catch(() => []);
    const cobradas = new Set(ingresos.map(i => i.id_orden));
    const pendientes = ordenes.filter(o => !cobradas.has(o.id));
    if (pendientes.length > 0) {
      alertas.push({ tipo: 'warning', titulo: `💳 ${pendientes.length} orden(es) sin cobrar`, sub: 'Revisa la sección Órdenes' });
    }

    renderNotificaciones(alertas);
    const badge = document.getElementById('notifBadge');
    if (alertas.length > 0) {
      badge.textContent = alertas.length;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  } catch(e) { console.warn('Error en notificaciones:', e); }
}

function renderNotificaciones(alertas) {
  const body = document.getElementById('notifBody');
  if (!alertas.length) {
    body.innerHTML = '<p class="notif-empty">✅ Sin alertas por ahora</p>';
    return;
  }
  body.innerHTML = alertas.map(a => `
    <div class="notif-item ${a.tipo}">
      <strong>${a.titulo}</strong>
      <span>${a.sub}</span>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════
   EMPLEADOS (antes "Meseros")
   DDL: empleado.id, nombre, paterno, materno, telefono,
        fecha_ingreso, fecha_egreso, rol (FK a roles.id)
   ⚠️  No existe "turno" en DDL — se agrega como columna
       adicional en TABLAS_SUPABASE_v2.sql
════════════════════════════════════════════════ */
async function loadMeseros() {
  const grid = document.getElementById('mesesGrid');
  grid.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div><p style="margin-top:1rem">Cargando meseros…</p></div>';
  try {
    const [empleados, roles, ordenes] = await Promise.all([
      sb.get('empleado', 'select=id,nombre,paterno,telefono,fecha_ingreso,turno,rol&fecha_egreso=is.null&order=nombre.asc'),
      sb.get('roles',    'select=id,nombre_rol'),
      sb.get('orden',    `select=id,empleado&fecha=gte.${new Date().toISOString().slice(0,10)}`)
    ]);

    allEmpleados = empleados;
    const rolMap = {};
    roles.forEach(r => { rolMap[r.id] = r.nombre_rol; });

    // Contar órdenes por empleado hoy
    const countMap = {};
    ordenes.forEach(o => { countMap[o.empleado] = (countMap[o.empleado] || 0) + 1; });

    // Stats bar
    const stats  = document.getElementById('mesesStats');
    const turnos = { 'Mañana': 0, 'Tarde': 0, 'Noche': 0 };
    empleados.forEach(m => { if (m.turno && turnos[m.turno] !== undefined) turnos[m.turno]++; });
    stats.innerHTML = `
      <div class="mesero-stat"><span class="ms-icon">👥</span> <span>${empleados.length} meseros activos</span></div>
      <div class="mesero-stat"><span class="ms-icon">🌅</span> <span>${turnos['Mañana']} Mañana</span></div>
      <div class="mesero-stat"><span class="ms-icon">🌤️</span> <span>${turnos['Tarde']} Tarde</span></div>
      <div class="mesero-stat"><span class="ms-icon">🌙</span> <span>${turnos['Noche']} Noche</span></div>
    `;

    if (!empleados.length) {
      grid.innerHTML = '<div class="empty-state"><span class="empty-icon">👨‍💼</span><p>No hay meseros activos.</p></div>';
      return;
    }

    const turnoClass = { 'Mañana': 'turno-M', 'Tarde': 'turno-T', 'Noche': 'turno-N' };
    grid.innerHTML = empleados.map(m => `
      <div class="mesero-card">
        <button class="mesero-delete" onclick="darBajaEmpleado(${m.id})" title="Dar de baja">🗑️</button>
        <div class="mesero-avatar">👨‍💼</div>
        <div class="mesero-nombre">${esc(m.nombre)} ${esc(m.paterno)}</div>
        <div class="mesero-num">Tel: ${esc(m.telefono)}</div>
        <span class="mesero-turno ${turnoClass[m.turno] || 'turno-M'}">${m.turno || '—'}</span>
        <div style="font-size:12px;color:var(--gris);margin-top:0.3rem">${esc(rolMap[m.rol] || 'Sin rol')}</div>
        <div class="mesero-ordenes">📋 ${countMap[m.id] || 0} órdenes hoy</div>
      </div>
    `).join('');

    // Poblar selector de empleado en modal de orden
    poblarSelectorEmpleado(empleados);
    poblarSelectores();
  } catch(e) {
    grid.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Error al cargar meseros.</p></div>';
    console.error(e);
  }
}

function poblarSelectorEmpleado(empleados) {
  const sel = document.getElementById('ord-empleado-sel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecciona empleado —</option>' +
    empleados.map(e => `<option value="${e.id}">${esc(e.nombre)} ${esc(e.paterno)}</option>`).join('');
}

async function crearMesero() {
  const nombre   = document.getElementById('mes-nombre').value.trim();
  const paterno  = document.getElementById('mes-paterno').value.trim();
  const telefono = document.getElementById('mes-telefono').value.trim();
  const turno    = document.getElementById('mes-turno').value;
  const rolId    = document.getElementById('mes-rol').value;

  if (!nombre)   return showToast('El nombre es obligatorio', 'error');
  if (!paterno)  return showToast('El apellido es obligatorio', 'error');
  if (!telefono || telefono.length !== 10) return showToast('Ingresa un teléfono de 10 dígitos', 'error');
  if (!rolId)    return showToast('Selecciona un rol', 'error');

  try {
    // DDL: empleado requiere nombre, paterno, telefono, fecha_ingreso, rol
    // turno se agrega en TABLAS_SUPABASE_v2.sql como ALTER TABLE
    await sb.post('empleado', {
      nombre,
      paterno,
      materno:       null,
      telefono,
      fecha_ingreso: new Date().toISOString().slice(0, 10),
      rol:           parseInt(rolId),
      turno
    });
    showToast(`¡Mesero ${nombre} registrado! 👨‍💼`);
    closeModal('modalMesero');
    ['mes-nombre', 'mes-paterno', 'mes-telefono'].forEach(id =>
      document.getElementById(id).value = ''
    );
    loadMeseros();
  } catch(e) {
    showToast('Error: ' + (e.message || JSON.stringify(e)), 'error');
  }
}

async function darBajaEmpleado(id) {
  if (!confirm('¿Dar de baja a este empleado? Se registrará la fecha de egreso.')) return;
  try {
    // DDL: baja lógica — se llena fecha_egreso en lugar de borrar
    await sb.patch('empleado', `id=eq.${id}`, {
      fecha_egreso: new Date().toISOString().slice(0, 10)
    });
    showToast('Empleado dado de baja');
    loadMeseros();
  } catch(e) {
    showToast('Error al dar de baja', 'error');
  }
}

async function cargarRolesEnModal() {
  try {
    const roles = await sb.get('roles', 'select=id,nombre_rol&order=nombre_rol.asc');
    const sel   = document.getElementById('mes-rol');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Selecciona rol —</option>' +
      roles.map(r => `<option value="${r.id}">${esc(r.nombre_rol)}</option>`).join('');
  } catch(e) { console.warn('Error al cargar roles', e); }
}

/* ════════════════════════════════════════════════
   MESAS — Mapa visual
   DDL: tabla "mesa" — ver TABLAS_SUPABASE_v2.sql
════════════════════════════════════════════════ */
async function loadMesas() {
  try {
    allMesas = await sb.get('mesa', 'select=id_mesa,numero,estado,id_orden_activa,hora_ocupada&order=numero.asc');
    renderMesas();
  } catch(e) {
    console.error('Error al cargar mesas:', e);
    showToast('Error al cargar mesas. ¿Corriste TABLAS_SUPABASE_v2.sql?', 'error');
  }
}

function renderMesas() {
  const wrap = document.getElementById('mapaMesas');
  if (!allMesas.length) {
    wrap.innerHTML = '<p style="text-align:center;color:var(--gris);grid-column:1/-1">No hay mesas. Haz clic en "Inicializar 12 mesas".</p>';
    poblarQRSelector();
    return;
  }
  wrap.innerHTML = allMesas.map(m => {
    const ocupada = m.estado;
    let tiempoStr = '';
    if (ocupada && m.hora_ocupada) {
      const mins = Math.floor((Date.now() - new Date(m.hora_ocupada)) / 60000);
      tiempoStr = `<div class="mesa-tiempo">⏱ ${mins} min</div>`;
    }
    return `
      <div class="mesa-card ${ocupada ? 'ocupada' : 'libre'}" onclick="clickMesa(${m.id_mesa})">
        <div class="mesa-icon">${ocupada ? '🍽️' : '⬜'}</div>
        <div class="mesa-num">Mesa ${m.numero}</div>
        <div class="mesa-estado">${ocupada ? 'Ocupada' : 'Libre'}</div>
        ${tiempoStr}
      </div>
    `;
  }).join('');
  poblarQRSelector();
}

function clickMesa(idMesa) {
  const mesa = allMesas.find(m => m.id_mesa === idMesa);
  if (!mesa) return;
  mesaSeleccionada = mesa;
  if (mesa.estado) {
    const mins = mesa.hora_ocupada
      ? Math.floor((Date.now() - new Date(mesa.hora_ocupada)) / 60000) : 0;
    document.getElementById('mesaModalNum').textContent    = `Mesa ${mesa.numero}`;
    document.getElementById('mesaModalTiempo').textContent = mesa.hora_ocupada
      ? `Ocupada hace ${mins} minutos` : 'Ocupada';
    openModal('modalMesa');
  } else {
    if (confirm(`¿Ocupar Mesa ${mesa.numero}?`)) ocuparMesa(idMesa);
  }
}

async function ocuparMesa(idMesa) {
  try {
    await sb.patch('mesa', `id_mesa=eq.${idMesa}`, {
      estado:      true,
      hora_ocupada: new Date().toISOString()
    });
    showToast('Mesa marcada como ocupada 🍽️');
    loadMesas();
  } catch(e) { showToast('Error al actualizar la mesa', 'error'); }
}

async function liberarMesaActual() {
  if (!mesaSeleccionada) return;
  try {
    await sb.patch('mesa', `id_mesa=eq.${mesaSeleccionada.id_mesa}`, {
      estado:          false,
      id_orden_activa: null,
      hora_ocupada:    null
    });
    showToast(`Mesa ${mesaSeleccionada.numero} liberada ✅`);
    closeModal('modalMesa');
    loadMesas();
  } catch(e) { showToast('Error al liberar la mesa', 'error'); }
}

async function inicializarMesas() {
  if (!confirm('¿Crear 12 mesas en la base de datos? (Solo si no existen)')) return;
  try {
    const datos = Array.from({ length: 12 }, (_, i) => ({ numero: i + 1, estado: false }));
    await sb.post('mesa', datos);
    showToast('12 mesas creadas ✅');
    loadMesas();
  } catch(e) {
    showToast('Error (quizás ya existen): ' + (e.message || ''), 'error');
    loadMesas();
  }
}

/* ════════════════════════════════════════════════
   CAJA / COBRO
   DDL: tabla "ingreso" (no "pago")
        ingreso.id_orden → orden.id
        ingreso.monto, ingreso.fecha
   Tabla "pago" en TABLAS_SUPABASE_v2.sql es alias
   de ingreso con columna extra "metodo"
════════════════════════════════════════════════ */
async function loadCaja() {
  const grid = document.getElementById('cajaGrid');
  grid.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div><p style="margin-top:1rem">Cargando órdenes…</p></div>';
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    // Traer órdenes de hoy con detalle para calcular total
    const ordenes = await sb.get('orden',
      `select=id,fecha,empleado,detalle_orden(id,cantidad,platillo(id,nombre,precio))&fecha=gte.${hoy}&order=id.desc`
    );

    // Órdenes ya con ingreso registrado
    const ingresos   = await sb.get('ingreso', `select=id_orden&fecha=gte.${hoy}T00:00:00`).catch(() => []);
    const cobradas   = new Set(ingresos.map(i => i.id_orden));
    const pendientes = ordenes.filter(o => !cobradas.has(o.id));

    if (!pendientes.length) {
      grid.innerHTML = '<div class="empty-state"><span class="empty-icon">🎉</span><p>Sin órdenes pendientes de cobro.</p></div>';
      return;
    }

    const empMap = {};
    allEmpleados.forEach(e => { empMap[e.id] = `${e.nombre} ${e.paterno}`; });

    grid.innerHTML = pendientes.map(o => {
      const detalles = o.detalle_orden || [];
      const total    = detalles.reduce((s, d) => s + (d.platillo?.precio || 0) * d.cantidad, 0);
      return `
        <div class="caja-card">
          <div class="caja-card-header">
            <div class="caja-orden-num">Orden #${o.id}</div>
            <span class="caja-badge">⏳ Pendiente</span>
          </div>
          <div class="caja-info">👨‍💼 ${esc(empMap[o.empleado] || 'Emp. #' + o.empleado)}</div>
          <div class="caja-info">📅 ${new Date(o.fecha).toLocaleString('es-MX')}</div>
          <div class="caja-total">${fmt(total)}</div>
          <div class="caja-actions">
            <button class="btn-primary" onclick="abrirModalPago(${o.id}, ${total})">💳 Cobrar</button>
            <button class="btn-secondary" onclick="verTicket(${o.id}, ${total})">🧾 Ticket</button>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {
    grid.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Error al cargar la caja.</p></div>';
    console.error(e);
  }
}

function abrirModalPago(idOrden, total) {
  pagoOrdenActual = idOrden;
  pagoMontoActual = total;
  pagoMetodoActual = 'Efectivo';
  document.getElementById('pagoTotal').textContent = fmt(total);
  document.getElementById('pagoComensales').value  = 1;
  actualizarDivision();
  document.querySelectorAll('.pago-metodo-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector('.pago-metodo-btn[data-metodo="Efectivo"]').classList.add('selected');
  openModal('modalPago');
}

function seleccionarMetodo(metodo) {
  pagoMetodoActual = metodo;
  document.querySelectorAll('.pago-metodo-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`.pago-metodo-btn[data-metodo="${metodo}"]`).classList.add('selected');
}

function actualizarDivision() {
  const comensales = parseInt(document.getElementById('pagoComensales').value) || 1;
  const porPersona = pagoMontoActual / comensales;
  document.getElementById('pagoPorPersona').textContent =
    comensales > 1 ? `${fmt(porPersona)} por persona (${comensales})` : '';
}

async function procesarPago() {
  if (!pagoOrdenActual) return;
  const comensales = parseInt(document.getElementById('pagoComensales').value) || 1;
  try {
    // DDL: tabla "ingreso" tiene id_orden y monto
    // metodo y comensales se guardan si se añadió la columna extra (ver TABLAS_SUPABASE_v2.sql)
    await sb.post('ingreso', {
      id_orden: pagoOrdenActual,
      monto:    pagoMontoActual,
      metodo:   pagoMetodoActual,   // columna extra — ver SQL
      comensales                     // columna extra — ver SQL
    });
    showToast(`✅ Cobro registrado — ${pagoMetodoActual} — ${fmt(pagoMontoActual)}`);
    closeModal('modalPago');
    loadCaja();
    loadOrdenes();
  } catch(e) {
    showToast('Error al registrar el cobro: ' + (e.message || JSON.stringify(e)), 'error');
  }
}

async function verTicket(idOrden, total) {
  const ticket = document.getElementById('ticketContenido');

  // Traer detalle de la orden para imprimir cada platillo
  let lineasDetalle = '';
  try {
    const detalles = await sb.get('detalle_orden',
      `select=cantidad,platillo(nombre,precio)&id_orden=eq.${idOrden}`
    );
    lineasDetalle = detalles.map(d =>
      `<div class="ticket-line"><span>${d.cantidad}× ${esc(d.platillo?.nombre || '?')}</span><span>${fmt((d.platillo?.precio || 0) * d.cantidad)}</span></div>`
    ).join('');
  } catch(e) { lineasDetalle = ''; }

  ticket.innerHTML = `
    <div style="text-align:center;margin-bottom:0.5rem">
      <strong>🌮 LOS CONSENTIDOS</strong><br>
      Sistema de Meseros · ESCOM IPN<br>
      ${new Date().toLocaleString('es-MX')}
    </div>
    <hr class="ticket-divider">
    <div class="ticket-line"><span>Orden:</span><span>#${idOrden}</span></div>
    <hr class="ticket-divider">
    ${lineasDetalle}
    <hr class="ticket-divider">
    <div class="ticket-line ticket-total"><span>TOTAL</span><span>${fmt(total)}</span></div>
    <hr class="ticket-divider">
    <div style="text-align:center;margin-top:0.5rem">¡Gracias por su visita! 😊</div>
  `;
  openModal('modalTicket');
}

function imprimirTicket() {
  const contenido = document.getElementById('ticketContenido').innerHTML;
  const ventana   = window.open('', '_blank', 'width=400,height=500');
  ventana.document.write(`
    <html><head><title>Ticket</title>
    <style>body{font-family:'Courier New',monospace;font-size:14px;padding:20px}hr{border:none;border-top:1px dashed #999;margin:8px 0}.ticket-line{display:flex;justify-content:space-between}.ticket-total{font-weight:700}</style>
    </head><body>${contenido}</body></html>
  `);
  ventana.document.close();
  ventana.print();
}

/* ════════════════════════════════════════════════
   RESEÑAS / QR
   DDL: tabla "resena" — ver TABLAS_SUPABASE_v2.sql
════════════════════════════════════════════════ */
function poblarQRSelector() {
  const sel = document.getElementById('qrMesaSelect');
  if (!sel) return;
  const nums = allMesas.length
    ? allMesas.map(m => m.numero)
    : Array.from({ length: 12 }, (_, i) => i + 1);
  sel.innerHTML = '<option value="">— elige una mesa —</option>' +
    nums.map(n => `<option value="${n}">Mesa ${n}</option>`).join('');
}

function poblarSelectores() {
  poblarQRSelector();
}

function generarQR(numMesa) {
  const wrap = document.getElementById('qrDisplay');
  if (!numMesa) {
    wrap.innerHTML = '<p class="qr-placeholder">Selecciona una mesa para ver su QR</p>';
    return;
  }
  const baseUrl = window.location.href.split('?')[0];
  const url     = `${baseUrl}?resena=true&mesa=${numMesa}`;
  const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&color=E63946&bgcolor=FFFBF0`;
  wrap.innerHTML = `
    <img src="${qrUrl}" alt="QR Mesa ${numMesa}" width="200" height="200"/>
    <p style="font-weight:700;margin-top:0.5rem">Mesa ${numMesa}</p>
    <p class="qr-url">${url}</p>
    <button class="btn-secondary" style="margin-top:0.5rem" onclick="window.open('${url}','_blank')">🔗 Abrir enlace</button>
  `;
}

async function loadResenas() {
  const lista      = document.getElementById('resenasLista');
  const statsWrap  = document.getElementById('resenasStats');
  lista.innerHTML  = '<div class="spinner" style="margin:2rem auto"></div>';
  try {
    const data = await sb.get('resena',
      'select=id_resena,numero_mesa,calificacion,comentario,fecha&order=fecha.desc&limit=20'
    );
    if (!data.length) {
      lista.innerHTML   = '<p style="color:var(--gris);text-align:center;padding:2rem">Sin reseñas aún. ¡Comparte los QRs!</p>';
      statsWrap.innerHTML = '';
      return;
    }
    const total    = data.length;
    const promedio = (data.reduce((s, r) => s + r.calificacion, 0) / total).toFixed(1);
    const dist     = [5, 4, 3, 2, 1].map(n => ({ stars: n, count: data.filter(r => r.calificacion === n).length }));
    statsWrap.innerHTML = `
      <div class="resena-stat-card"><div class="rsc-num">${promedio}⭐</div><div class="rsc-label">Promedio</div></div>
      <div class="resena-stat-card"><div class="rsc-num">${total}</div><div class="rsc-label">Reseñas</div></div>
      ${dist.map(d => `<div class="resena-stat-card"><div class="rsc-num">${d.count}</div><div class="rsc-label">${'⭐'.repeat(d.stars)}</div></div>`).join('')}
    `;
    lista.innerHTML = data.map(r => `
      <div class="resena-item">
        <div class="resena-stars">${'⭐'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
        <div class="resena-comentario">${esc(r.comentario || '(sin comentario)')}</div>
        <div class="resena-meta">Mesa ${r.numero_mesa} · ${new Date(r.fecha).toLocaleString('es-MX')}</div>
      </div>
    `).join('');
  } catch(e) {
    lista.innerHTML = '<p style="color:var(--rojo)">Error al cargar reseñas. ¿Corriste TABLAS_SUPABASE_v2.sql?</p>';
  }
}

/* ── Reseña pública (cliente que escanea el QR) ── */
function iniciarFormularioResena(numMesa) {
  const overlay = document.getElementById('resenaPublicaOverlay');
  document.getElementById('resenaPublicaMesa').textContent = `Mesa ${numMesa}`;
  overlay.style.display = 'flex';
  document.querySelectorAll('.star-btn').forEach(b => { b.textContent = '☆'; });
  estrellaSeleccionada = 0;
  document.getElementById('resenaComentario').value = '';
}

function seleccionarEstrella(n) {
  estrellaSeleccionada = n;
  document.querySelectorAll('.star-btn').forEach((b, i) => {
    b.textContent = i < n ? '⭐' : '☆';
  });
}

async function enviarResenaPublica() {
  const mesa       = new URLSearchParams(window.location.search).get('mesa');
  const comentario = document.getElementById('resenaComentario').value.trim();
  if (!estrellaSeleccionada) return showToast('Selecciona una calificación', 'error');
  try {
    await sb.post('resena', {
      numero_mesa:  parseInt(mesa),
      calificacion: estrellaSeleccionada,
      comentario
    });
    document.getElementById('resenaPublicaOverlay').innerHTML = `
      <div class="resena-publica-card">
        <div style="font-size:4rem">🎉</div>
        <h2>¡Gracias!</h2>
        <p style="color:var(--gris);margin-top:1rem">Tu opinión nos ayuda a mejorar. ¡Vuelve pronto!</p>
      </div>`;
    showToast('¡Reseña enviada! Gracias 🙏');
  } catch(e) {
    showToast('Error al enviar: ' + (e.message || JSON.stringify(e)), 'error');
  }
}

function checkResenaPublica() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('resena') === 'true' && params.get('mesa')) {
    const mesa = params.get('mesa');
    document.getElementById('resenaPublicaOverlay').style.display = 'flex';
    document.getElementById('resenaPublicaMesa').textContent = `Mesa ${mesa}`;
  }
}

/* ════════════════════════════════════════════════
   ARRANQUE
════════════════════════════════════════════════ */
async function init() {
  if (SUPABASE_URL.includes('TU_PROYECTO') || SUPABASE_KEY.includes('TU_ANON_KEY')) {
    document.getElementById('menuGrid').innerHTML = `
      <div class="menu-loading" style="grid-column:1/-1;padding:4rem;text-align:center">
        <p style="font-size:2rem">⚙️</p>
        <p style="font-weight:700;margin-top:1rem;color:#E63946">Configura Supabase primero</p>
        <p style="color:#6B6558;margin-top:.5rem">Edita el archivo <code>config.js</code> con tus credenciales.</p>
      </div>`;
    return;
  }

  // Carga en paralelo lo que no depende de otros datos
  await Promise.all([
    loadCategorias(),
    loadMeseros(),    // necesario para poblar selector de empleado
  ]);
  loadMenu();
  loadStats();
  loadOrdenes();
  loadMesas();
  poblarQRSelector();
  checkResenaPublica();
  cargarRolesEnModal();

  // Auto-check notificaciones cada 60 segundos
  checkNotificaciones();
  notifInterval = setInterval(checkNotificaciones, 60000);
}

document.addEventListener('DOMContentLoaded', init);
