/* ═══════════════════════════════════════════════════
   app.js — Los Consentidos
   Backend: Supabase (PostgreSQL en la nube)
   Sin PHP, sin servidor propio. Funciona en GitHub Pages.
═══════════════════════════════════════════════════ */

// ── Carrito de la orden activa ──────────────────────
let carrito = {};          // { id_platillo: { nombre, precio, cantidad } }
let allPlatillos    = [];
let allCategorias   = [];
let allIngredientes = [];
let currentFilter   = 'all';

/* ════════════════════════════════════════════════
   SUPABASE — Cliente HTTP mínimo
   Usamos la REST API directamente con fetch,
   sin necesidad de instalar el SDK de npm.
════════════════════════════════════════════════ */
const sb = {
  headers: () => ({
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
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
  const wrap = document.getElementById('carritoItems');
  const totalEl = document.getElementById('carritoTotal');
  const keys = Object.keys(carrito);

  if (!keys.length) {
    wrap.innerHTML = '<p class="carrito-empty">Selecciona platillos del menú →</p>';
    totalEl.textContent = '$0.00';
    return;
  }

  let total = 0;
  wrap.innerHTML = keys.map(id => {
    const item = carrito[id];
    const sub = item.precio * item.cantidad;
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
  wrap.innerHTML = lista.map(p => `
    <div class="plat-orden-item" onclick="agregarAlCarrito(${p.id_platillo}, '${esc(p.nombre)}', ${p.precio})">
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
    const [plat, ord, ing] = await Promise.all([
      sb.get('platillo', 'select=id_platillo'),
      sb.get('orden', 'select=id_orden,fecha&fecha=eq.' + new Date().toISOString().slice(0,10)),
      sb.get('ingrediente', 'select=id_ingrediente'),
    ]);
    document.getElementById('statPlatillos').textContent   = plat.length;
    document.getElementById('statOrdenes').textContent     = ord.length;
    document.getElementById('statIngredientes').textContent = ing.length;
  } catch(e) { console.warn('Stats no disponibles'); }
}

/* ════════════════════════════════════════════════
   CATEGORÍAS
════════════════════════════════════════════════ */
async function loadCategorias() {
  try {
    allCategorias = await sb.get('categoria', 'select=id_categoria,nombre&order=nombre.asc');
    
    // Llenar select del modal de platillo
    const sel = document.getElementById('plat-cat');
    sel.innerHTML = allCategorias.map(c =>
      `<option value="${c.id_categoria}">${esc(c.nombre)}</option>`
    ).join('');

    // Botones de filtro
    const wrap = document.getElementById('menuFilters');
    wrap.innerHTML = `<button class="filter-btn active" data-filter="all">Todo 🌟</button>`;
    allCategorias.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
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
    // Si no hay tabla CATEGORIA, dejamos un filtro genérico
    document.getElementById('menuFilters').innerHTML =
      `<button class="filter-btn active" data-filter="all">Todo 🌟</button>`;
  }
}

/* ════════════════════════════════════════════════
   MENÚ
════════════════════════════════════════════════ */
async function loadMenu() {
  try {
    // JOIN con CATEGORIA para traer el nombre de la categoría
    const data = await sb.get('platillo',
      'select=id_platillo,nombre,precio,frecuencia,CATEGORIA(nombre)&order=nombre.asc'
    );
    // Normalizar: aplanar el JOIN
    allPlatillos = data.map(p => ({
      ...p,
      categoria: p.CATEGORIA ? p.CATEGORIA.nombre : 'Sin categoría'
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
  'Tacos':      '🌮',
  'Quesadilla': '🧀',
  'Pozole':     '🍲',
  'Agua':       '🥤',
  'Enchilada':  '🌯',
  'Flauta':     '🌯',
  'Sopa':       '🍜',
  'Chile':      '🌶️',
  'default':    '🍽️'
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

  grid.innerHTML = list.map(p => `
    <div class="menu-card" onclick="agregarDesdeMenu(${p.id_platillo}, '${esc(p.nombre)}', ${p.precio})">
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
  // Si el modal ya está abierto no lo abras de nuevo
  const modal = document.getElementById('modalOrden');
  if (!modal.classList.contains('open')) {
    openModal('modalOrden');
  }
}

async function crearPlatillo() {
  const nombre = document.getElementById('plat-nombre').value.trim();
  const cat_id = document.getElementById('plat-cat').value;
  const precio = parseFloat(document.getElementById('plat-precio').value);

  if (!nombre)              return showToast('El nombre es obligatorio', 'error');
  if (isNaN(precio) || precio <= 0) return showToast('Ingresa un precio válido', 'error');

  try {
    await sb.post('platillo', {
      nombre,
      id_categorias: cat_id ? parseInt(cat_id) : null,
      precio,
      frecuencia: 0
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
════════════════════════════════════════════════ */
async function loadOrdenes() {
  const grid = document.getElementById('ordenesGrid');
  grid.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div><p style="margin-top:1rem">Cargando órdenes…</p></div>';
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const ordenes = await sb.get('orden',
      `select=id_orden,fecha,estado,cuenta_total,numero_empleado_mesero&fecha=gte.${hoy}&order=id_orden.desc`
    );
    if (!ordenes.length) {
      grid.innerHTML = '<div class="empty-state"><span class="empty-icon">🎉</span><p>Sin órdenes por ahora.</p></div>';
      return;
    }
    grid.innerHTML = ordenes.map(o => `
      <div class="orden-card ${o.estado ? 'servida' : ''}">
        <div class="orden-header">
          <div class="orden-mesa-num">Mesa — Emp. ${esc(String(o.numero_empleado_mesero))}</div>
          <span class="badge ${o.estado ? 'badge-cerrada' : 'badge-activa'}">
            ${o.estado ? '✓ Servida' : '● En proceso'}
          </span>
        </div>
        <div class="orden-total">${fmt(o.cuenta_total || 0)}</div>
        <div class="orden-fecha">📅 ${o.fecha}</div>
        ${!o.estado ? `<button class="action-btn" style="margin-top:0.75rem" onclick="marcarServida(${o.id_orden})">Marcar como servida ✓</button>` : ''}
      </div>
    `).join('');
  } catch(e) {
    grid.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Error al cargar las órdenes.</p></div>';
    console.error(e);
  }
}

async function crearOrden() {
  const empId   = document.getElementById('ord-empleado').value.trim();
  const mesaNum = document.getElementById('ord-mesa').value.trim();
  const items   = Object.entries(carrito);

  if (!empId)         return showToast('Ingresa el número de empleado', 'error');
  if (!mesaNum)       return showToast('Ingresa el número de mesa', 'error');
  if (!items.length)  return showToast('Agrega al menos un platillo', 'error');

  const cuenta_total = items.reduce((s, [, v]) => s + v.precio * v.cantidad, 0);

  try {
    // 1. Crear la orden
    const [orden] = await sb.post('orden', {
      numero_empleado_mesero: parseInt(empId),
      cuenta_total,
      estado: false
    });

    // 2. Crear el detalle de la orden (un registro por platillo)
    const detalles = items.map(([id, v]) => ({
      id_orden:    orden.id_orden,
      id_platillo: parseInt(id),
      cantidad:    v.cantidad
    }));
    await sb.post('detalle_orden', detalles);

    // 3. Incrementar frecuencia de cada platillo
    for (const [id, v] of items) {
      const plat = allPlatillos.find(p => p.id_platillo == id);
      if (plat) {
        await sb.patch('platillo', `id_platillo=eq.${id}`, {
          frecuencia: (plat.frecuencia || 0) + v.cantidad
        });
      }
    }

    showToast(`Orden #${orden.id_orden} creada — ${fmt(cuenta_total)} 🛒`);
    closeModal('modalOrden');
    limpiarCarrito();
    document.getElementById('ord-empleado').value = '';
    document.getElementById('ord-mesa').value = '';
    loadOrdenes();
    loadStats();
    loadMenu();
  } catch(e) {
    showToast('Error al crear la orden: ' + (e.message || JSON.stringify(e)), 'error');
    console.error(e);
  }
}

async function marcarServida(id) {
  try {
    await sb.patch('orden', `id_orden=eq.${id}`, { estado: true });
    showToast('Orden marcada como servida ✓');
    loadOrdenes();
  } catch(e) {
    showToast('Error al actualizar la orden', 'error');
  }
}

/* ════════════════════════════════════════════════
   INVENTARIO
════════════════════════════════════════════════ */
async function loadInventario() {
  try {
    const data = await sb.get('ingrediente',
      'select=id_ingrediente,nombre,existencia,minimo,unidad&order=nombre.asc'
    );
    allIngredientes = data;
    renderInventario(data);
    renderStockAlerts(data);
  } catch(e) {
    document.getElementById('invBody').innerHTML =
      '<tr><td colspan="6" class="table-empty">⚠️ Error al cargar el inventario.</td></tr>';
    console.error(e);
  }
}

function renderStockAlerts(items) {
  const wrap  = document.getElementById('stockAlerts');
  const low   = items.filter(i => parseFloat(i.existencia) > 0 && parseFloat(i.existencia) < parseFloat(i.minimo));
  const empty = items.filter(i => parseFloat(i.existencia) <= 0);
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
    if (ex <= 0)       { sc = 'empty'; sl = '❌ Agotado'; }
    else if (ex < mn)  { sc = 'low';   sl = '⚠️ Bajo'; }
    else               { sc = 'ok';    sl = '✅ OK'; }
    return `
      <tr>
        <td><strong>${esc(i.nombre)}</strong></td>
        <td>${i.existencia}</td>
        <td>${i.minimo}</td>
        <td>${esc(i.unidad)}</td>
        <td><span class="stock-pill ${sc}">${sl}</span></td>
        <td>
          <button class="action-btn" onclick="editarStock(${i.id_ingrediente}, ${i.existencia})">Ajustar</button>
          <button class="action-btn del" onclick="eliminarIngrediente(${i.id_ingrediente})">Eliminar</button>
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
  const nombre    = document.getElementById('ing-nombre').value.trim();
  const existencia = Number(document.getElementById('ing-existencia').value);
  const minimo    = Number(document.getElementById('ing-minimo').value);
  const unidad    = document.getElementById('ing-unidad').value;

  if (!nombre) return showToast('El nombre es obligatorio', 'error');

  try {
    await sb.post('ingrediente', { nombre, existencia, minimo, unidad });
    showToast('¡Ingrediente registrado! 🧺');
    closeModal('modalIngrediente');
    ['ing-nombre','ing-existencia','ing-minimo'].forEach(id =>
      document.getElementById(id).value = ''
    );
    loadInventario(); loadStats();
  } catch(e) {
    showToast('Error: ' + (e.message || JSON.stringify(e)), 'error');
  }
}

async function editarStock(id, actual) {
  const nuevo = prompt(`Stock actual: ${actual}\nIngresa el stock físico real:`);
  if (nuevo === null || nuevo.trim() === '') return;
  try {
    await sb.patch('ingrediente', `id_ingrediente=eq.${id}`, { existencia: Number(nuevo) });
    showToast('Ajuste aplicado ✓');
    loadInventario();
  } catch(e) {
    showToast('Error al ajustar', 'error');
  }
}

async function eliminarIngrediente(id) {
  if (!confirm('¿Eliminar este ingrediente del catálogo?')) return;
  try {
    await sb.delete('ingrediente', `id_ingrediente=eq.${id}`);
    showToast('Ingrediente eliminado');
    loadInventario(); loadStats();
  } catch(e) {
    showToast('Error al eliminar', 'error');
  }
}

/* ════════════════════════════════════════════════
   ARRANQUE
════════════════════════════════════════════════ */
async function init() {
  // Verificar que config.js tenga las credenciales reales
  if (SUPABASE_URL.includes('TU_PROYECTO') || SUPABASE_KEY.includes('TU_ANON_KEY')) {
    document.getElementById('menuGrid').innerHTML = `
      <div class="menu-loading" style="grid-column:1/-1;padding:4rem;text-align:center">
        <p style="font-size:2rem">⚙️</p>
        <p style="font-weight:700;margin-top:1rem;color:#E63946">Configura Supabase primero</p>
        <p style="color:#6B6558;margin-top:.5rem">Edita el archivo <code>config.js</code> con tus credenciales de Supabase.</p>
      </div>`;
    return;
  }
  await loadCategorias();
  loadMenu();
  loadStats();
  loadOrdenes();
}

document.addEventListener('DOMContentLoaded', init);
