import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs, writeBatch, where 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3MbLcdhXmMNoSd-BtLw2PfHLi6I4DIBI",
    authDomain: "electrica-36e1f.firebaseapp.com",
    projectId: "electrica-36e1f",
    storageBucket: "electrica-36e1f.firebasestorage.app",
    messagingSenderId: "803776128207",
    appId: "1:803776128207:web:6064158bbdaeea18a303ba",
    measurementId: "G-25TY1H35NF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let productos = [];
let mostrandoSoloBajo = false; // Estado para el filtro de stock
const productsContainer = document.getElementById('products-container');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Escuchar productos
    onSnapshot(collection(db, "productos"), (snapshot) => {
        productos = snapshot.docs.map(doc => ({ fireId: doc.id, ...doc.data() }));
        renderProducts(productos);
        updateStats();
    });

    // 2. Escuchar actividades
    onSnapshot(query(collection(db, "actividades"), orderBy("fecha", "desc")), (snapshot) => {
        const lista = document.getElementById('lista-actividades');
        if (lista) {
            lista.innerHTML = snapshot.docs.map(doc => {
                const data = doc.data();
                const fecha = data.fecha ? data.fecha.toDate().toLocaleString() : 'Ahora';
                return `<div style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                    <strong>${data.accion}</strong>: ${data.detalle} <br>
                    <small style="color:var(--text-muted)">${fecha}</small>
                </div>`;
            }).join('');
        }
    });

    // 3. Formulario Agregar Producto
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prod = {
        nombre: document.getElementById('prod-name').value,
        codigo: document.getElementById('prod-code').value,
        categoria: document.getElementById('prod-category').value,
        precio: parseFloat(document.getElementById('prod-price').value),
        stock: parseInt(document.getElementById('prod-stock').value)
    };

    // ... dentro del evento 'submit' de 'product-form' ...

// 1. Guardar el producto
const docRef = await addDoc(collection(db, "productos"), prod);

// 2. Registrar actividad
await registrarActividad("Nuevo Producto", `Se añadió: ${prod.nombre}`);

// 3. Registrar el movimiento con la CANTIDAD inicial
await addDoc(collection(db, "movimientos"), {
    productoId: docRef.id,
    tipo: 'compra',
    cantidad: prod.stock, // <--- AGREGA ESTO
    fecha: serverTimestamp()
});

    // 4. Limpiar formulario y cerrar modal
    document.getElementById('add-modal').style.display = 'none';
    e.target.reset();
    alert("Producto registrado correctamente.");
});

    // 4. Buscador
    document.getElementById('search-input').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        renderProducts(productos.filter(p => p.nombre.toLowerCase().includes(val)));
    });

    // Ejecutar gráfico general al cargar
    renderizarGraficoGeneral();
});

// --- FUNCIONES DE GESTIÓN DE STOCK Y PRODUCTOS ---

window.updateStock = async (fireId, change) => {
    const prod = productos.find(p => p.fireId === fireId);
    if (!prod) return;
    const nuevoStock = Math.max(0, prod.stock + change);
    await updateDoc(doc(db, "productos", fireId), { stock: nuevoStock });
    await registrarActividad("Stock", `${prod.nombre}: ${prod.stock} → ${nuevoStock}`);
    renderizarGraficoGeneral(); // Actualizar resumen
};

window.deleteProduct = async (fireId, nombre) => {
    if (confirm(`¿Eliminar "${nombre}"?`)) {
        await deleteDoc(doc(db, "productos", fireId));
        await registrarActividad("Eliminado", `Producto: ${nombre}`);
    }
};

window.toggleFiltro = () => {
    const btn = document.getElementById('btn-toggle-filter');
    if (mostrandoSoloBajo) {
        renderProducts(productos);
        btn.textContent = "Ver";
        mostrandoSoloBajo = false;
    } else {
        const bajas = productos.filter(p => p.stock < 5);
        renderProducts(bajas);
        btn.textContent = "Dejar de mostrar";
        mostrandoSoloBajo = true;
    }
};

// --- FUNCIONES DE CONFIGURACIÓN Y EXPORTACIÓN ---

window.limpiarHistorial = async () => {
    if (confirm("⚠️ ¿Borrar todo el historial de actividades?")) {
        const batch = writeBatch(db);
        const snapshot = await getDocs(collection(db, "actividades"));
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        alert("Historial limpiado.");
    }
};

window.ejecutarOferta = async () => {
    const cat = document.getElementById('offer-cat').value;
    const perc = parseFloat(document.getElementById('offer-perc').value);
    if (!cat || isNaN(perc)) return alert("Completa los campos de oferta");

    const q = query(collection(db, "productos"), where("categoria", "==", cat));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(d => {
        const precioOriginal = d.data().precio;
        const nuevoPrecio = precioOriginal * (1 - (perc / 100));
        batch.update(d.ref, { precio: nuevoPrecio, descuento: perc });
    });
    
    await batch.commit();
    await registrarActividad("Oferta", `${perc}% desc. en ${cat}`);
    alert(`Oferta aplicada a ${cat}`);
};

window.exportarPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Reporte de Inventario - Electrica", 14, 15);
    const tableData = productos.map(p => [p.nombre, p.codigo, `$${p.precio.toFixed(2)}`, p.stock]);
    doc.autoTable({
        head: [['Producto', 'Código', 'Precio', 'Stock']],
        body: tableData,
        startY: 25
    });
    doc.save('inventario.pdf');
};

async function registrarActividad(accion, detalle) {
    await addDoc(collection(db, "actividades"), { accion, detalle, fecha: serverTimestamp() });
}

// --- RENDERIZADO Y ESTADÍSTICAS ---

window.renderProducts = (lista) => {
    productsContainer.innerHTML = '';
    lista.forEach(prod => {
        const descuento = prod.descuento || 0;
        const badgeDescuento = descuento > 0 ? `<span class="badge-discount">-${descuento}% OFF</span>` : '';
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            ${badgeDescuento}
            <small style="color:var(--text-muted)">${prod.codigo}</small>
            <h3>${prod.nombre}</h3>
            <span class="product-category">${prod.categoria}</span>
            <div class="product-price">$${prod.precio.toFixed(2)}</div>
            <div class="stock-management">
                <div class="stock-controls">
                    <button class="btn-stock" onclick="updateStock('${prod.fireId}', -1)">-</button>
                    <span class="stock-value">${prod.stock}</span>
                    <button class="btn-stock" onclick="updateStock('${prod.fireId}', 1)">+</button>
                </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button class="btn-action btn-delete" onclick="deleteProduct('${prod.fireId}', '${prod.nombre}')">Eliminar</button>
                <button class="btn-action btn-edit" onclick="abrirModalModificar('${prod.fireId}')">Modificar</button>
            </div>
        `;
        productsContainer.appendChild(card);
    });
};

// --- CORRECCIÓN PARA EL GRÁFICO DE BARRAS ---
window.actualizarGrafico = async () => {
    const input = document.getElementById('chart-filter').value.trim();
    if (!input) return alert("Ingresa el nombre o código del producto");
    const prod = productos.find(p => p.codigo === input || p.nombre.toLowerCase() === input.toLowerCase());
    if (!prod) return alert("Producto no encontrado.");

    const q = query(collection(db, "movimientos"), where("productoId", "==", prod.fireId));
    const snapshot = await getDocs(q);
    const vH = new Array(24).fill(0);
    const cH = new Array(24).fill(0);

    snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.fecha && typeof data.fecha.toDate === 'function') {
        const h = data.fecha.toDate().getHours();
        // Sumamos la cantidad o 1 si es un registro antiguo sin cantidad
        const cant = data.cantidad || 1; 
        if (data.tipo === 'venta') vH[h] += cant;
        else if (data.tipo === 'compra') cH[h] += cant;
    }
});

    const ctx = document.getElementById('ventasChart').getContext('2d');
    
    // VERIFICACIÓN SEGURA: solo destruye si existe y tiene el método destroy
    if (window.ventasChart && typeof window.ventasChart.destroy === 'function') {
        window.ventasChart.destroy();
    }
    
    window.ventasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [
                { label: 'Ventas', data: vH, backgroundColor: '#ef4444' },
                { label: 'Compras', data: cH, backgroundColor: '#2563eb' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

window.renderizarGraficoGeneral = async (filtro = 'mes') => { // Por defecto 'mes'
    const canvas = document.getElementById('generalChart');
    if (!canvas) return;

    // Actualizamos el título visualmente
    const titulos = { 'dia': 'Hoy', 'semana': 'Esta Semana', 'mes': 'Este Mes', 'anio': 'Este Año' };
    document.getElementById('titulo-periodo').textContent = `Mostrando: ${titulos[filtro]}`;

    const snapshot = await getDocs(collection(db, "movimientos"));
    let v = 0, c = 0;
    const ahora = new Date();

    snapshot.docs.forEach(d => {
        const data = d.data();
        if (!data.fecha) return;

        const fechaMov = data.fecha.toDate();
        let esValido = false;

        // Lógica de filtrado
        if (filtro === 'dia') {
            esValido = fechaMov.toDateString() === ahora.toDateString();
        } else if (filtro === 'semana') {
            const haceUnaSemana = new Date();
            haceUnaSemana.setDate(ahora.getDate() - 7);
            esValido = fechaMov >= haceUnaSemana;
        } else if (filtro === 'mes') {
            esValido = fechaMov.getMonth() === ahora.getMonth() && fechaMov.getFullYear() === ahora.getFullYear();
        } else if (filtro === 'anio') {
            esValido = fechaMov.getFullYear() === ahora.getFullYear();
        }

        if (esValido) {
            const cant = data.cantidad || 1;
            data.tipo === 'venta' ? v += cant : c += cant;
        }
    });

    const ctx = canvas.getContext('2d');
    if (window.generalChart && typeof window.generalChart.destroy === 'function') {
        window.generalChart.destroy();
    }
    
    window.generalChart = new Chart(ctx, {
        type: 'pie',
        data: { 
            labels: ['Ventas', 'Compras'], 
            datasets: [{ data: [v, c], backgroundColor: ['#ef4444', '#2563eb'] }] 
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

window.abrirModalModificar = (fireId) => {
    const prod = productos.find(p => p.fireId === fireId);
    if (!prod) return;
    document.getElementById('edit-id').value = prod.fireId;
    document.getElementById('edit-name').value = prod.nombre;
    document.getElementById('edit-price').value = prod.precio;
    document.getElementById('edit-stock').value = prod.stock;
    document.getElementById('edit-modal').style.display = 'flex';
};

window.registrarMovimiento = async (tipo) => {
    const input = document.getElementById('move-search').value.trim();
    const cantidad = parseInt(document.getElementById('move-qty').value);
    
    if (!input) return alert("Ingresa nombre o código");
    if (isNaN(cantidad) || cantidad <= 0) return alert("Ingresa una cantidad válida");

    // BUSCAR EL PRODUCTO EXISTENTE
    const prod = productos.find(p => p.nombre.toLowerCase() === input.toLowerCase() || p.codigo === input);
    
    // VALIDACIÓN: El botón solo funciona si el producto existe
    if (!prod) {
        return alert("Error: El producto no existe en el inventario. Debes crearlo primero.");
    }

    // REGISTRAR EN MOVIMIENTOS
    await addDoc(collection(db, "movimientos"), {
        productoId: prod.fireId,
        tipo: tipo,
        cantidad: cantidad, // Guardamos la cantidad
        fecha: serverTimestamp()
    });

    // ACTUALIZAR STOCK EN LA COLECCIÓN PRODUCTOS
    const cambio = (tipo === 'venta') ? -cantidad : cantidad;
    await updateStock(prod.fireId, cambio);

    alert(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} de ${cantidad} unidades registrada.`);
    
    // Limpiar campos
    document.getElementById('move-search').value = '';
    document.getElementById('move-qty').value = '1';
    
    // Actualizar gráficos
    renderizarGraficoGeneral();
};

document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fireId = document.getElementById('edit-id').value;
    const datosActualizados = {
        nombre: document.getElementById('edit-name').value,
        precio: parseFloat(document.getElementById('edit-price').value),
        stock: parseInt(document.getElementById('edit-stock').value)
    };
    await updateDoc(doc(db, "productos", fireId), datosActualizados);
    await registrarActividad("Modificación", `Se editó: ${datosActualizados.nombre}`);
    document.getElementById('edit-modal').style.display = 'none';
    alert("Producto actualizado");
});

function updateStats() {
    document.getElementById('stat-total').textContent = productos.length;
    document.getElementById('stat-low').textContent = productos.filter(p => p.stock < 5).length;
    const valorTotal = productos.reduce((acc, p) => acc + (p.precio * p.stock), 0);
    document.getElementById('stat-value').textContent = `$${valorTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

document.getElementById('btn-add-product').onclick = () => document.getElementById('add-modal').style.display = 'flex';
document.getElementById('close-add-modal').onclick = () => document.getElementById('add-modal').style.display = 'none';