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
        await addDoc(collection(db, "productos"), prod);
        await registrarActividad("Nuevo Producto", `Se añadió: ${prod.nombre}`);
        document.getElementById('add-modal').style.display = 'none';
        e.target.reset();
    });

    // 4. Buscador
    document.getElementById('search-input').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        renderProducts(productos.filter(p => p.nombre.toLowerCase().includes(val)));
    });
});

// --- FUNCIONES DE GESTIÓN DE STOCK Y PRODUCTOS ---

window.updateStock = async (fireId, change) => {
    const prod = productos.find(p => p.fireId === fireId);
    if (!prod) return;
    const nuevoStock = Math.max(0, prod.stock + change);
    await updateDoc(doc(db, "productos", fireId), { stock: nuevoStock });
    await registrarActividad("Stock", `${prod.nombre}: ${prod.stock} → ${nuevoStock}`);
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
        // ... dentro de renderProducts ...
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
// ...
        productsContainer.appendChild(card);
    });
};

// Función para abrir modal y cargar datos
window.abrirModalModificar = (fireId) => {
    const prod = productos.find(p => p.fireId === fireId);
    if (!prod) return;

    // Llenar inputs del modal (asumiendo que los IDs de inputs son edit-...)
    document.getElementById('edit-id').value = prod.fireId;
    document.getElementById('edit-name').value = prod.nombre;
    document.getElementById('edit-price').value = prod.precio;
    document.getElementById('edit-stock').value = prod.stock;

    document.getElementById('edit-modal').style.display = 'flex';
};

window.actualizarGrafico = async () => {
    const code = document.getElementById('chart-filter').value;
    if (!code) return alert("Ingresa un código de producto");

    // 1. Obtener datos
    const q = query(collection(db, "movimientos"), where("productoId", "==", code));
    const snapshot = await getDocs(q);
    
    // 2. Inicializar arrays para 24 horas
    const horas = Array.from({length: 24}, (_, i) => i); // [0, 1, ..., 23]
    const ventasPorHora = new Array(24).fill(0);
    const comprasPorHora = new Array(24).fill(0);

    // 3. Procesar datos
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const fecha = data.fecha.toDate(); // Convertimos timestamp a fecha JS
        const hora = fecha.getHours(); // Obtenemos la hora (0-23)

        if (data.tipo === 'venta') ventasPorHora[hora]++;
        if (data.tipo === 'compra') comprasPorHora[hora]++;
    });

    // 4. Renderizar (Destruir previo)
    if (window.ventasChart) window.ventasChart.destroy();
    
    const ctx = document.getElementById('ventasChart').getContext('2d');
    window.ventasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: horas.map(h => `${h}:00`),
            datasets: [
                { label: 'Ventas', data: ventasPorHora, backgroundColor: '#ef4444' },
                { label: 'Compras', data: comprasPorHora, backgroundColor: '#2563eb' }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } } }
        }
    });
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
    alert("Producto actualizado correctamente");
});

function updateStats() {
    document.getElementById('stat-total').textContent = productos.length;
    document.getElementById('stat-low').textContent = productos.filter(p => p.stock < 5).length;
    const valorTotal = productos.reduce((acc, p) => acc + (p.precio * p.stock), 0);
    document.getElementById('stat-value').textContent = `$${valorTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

// Control Modales
document.getElementById('btn-add-product').onclick = () => document.getElementById('add-modal').style.display = 'flex';
document.getElementById('close-add-modal').onclick = () => document.getElementById('add-modal').style.display = 'none';