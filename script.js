import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwO9ilE4p4j7rXzzw2qaZa2drfxWljJWY",
  authDomain: "tienda-online-electrica.firebaseapp.com",
  projectId: "tienda-online-electrica",
  storageBucket: "tienda-online-electrica.firebasestorage.app",
  messagingSenderId: "722549242784",
  appId: "1:722549242784:web:05336977ccd3553ba3c2c5",
  measurementId: "G-9Y7FK8BQQS"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// --- ELEMENTOS DEL DOM ---
const container = document.getElementById('products-container');
const adminProductsList = document.getElementById('admin-products-list');
const uploadForm = document.getElementById('upload-form');
const formMensaje = document.getElementById('form-mensaje');
const sectionTitleText = document.getElementById('section-title-text');
const subNavbar = document.getElementById('sub-navbar');
const shopToolbar = document.getElementById('shop-toolbar');

const searchInput = document.getElementById('search-input');
const priceRangeSelect = document.getElementById('price-range-select');

const productModal = document.getElementById('product-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalImg = document.getElementById('modal-img');
const modalTag = document.getElementById('modal-tag');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalWhatsappBtn = document.getElementById('modal-whatsapp-btn');

const navTienda = document.getElementById('nav-tienda');
const navSubir = document.getElementById('nav-subir');

const sectionTienda = document.getElementById('section-tienda');
const sectionSubir = document.getElementById('section-subir');

// Elementos de Login y Autenticación de UI
const adminLoginBox = document.getElementById('admin-login-box');
const adminProtectedContent = document.getElementById('admin-protected-content');
const loginForm = document.getElementById('login-form');
const loginMensaje = document.getElementById('login-mensaje');
const btnLogout = document.getElementById('btn-logout');

// --- VARIABLES GLOBALES ---
let currentCategory = "todos";
let searchQuery = "";
let currentPriceRange = "todos";
let isAdminLoggedIn = false; 

// --- SISTEMA DE LOGIN DE CONTROL (HARDCODED) ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    if (user === "admin" && pass === "1234") {
        isAdminLoggedIn = true;
        loginMensaje.className = "msg-success";
        loginMensaje.innerText = "¡Ingreso correcto!";
        
        setTimeout(() => {
            loginForm.reset();
            loginMensaje.innerText = "";
            showAdminDashboard();
        }, 800);
    } else {
        loginMensaje.className = "msg-error";
        loginMensaje.innerText = "Usuario o contraseña incorrectos.";
    }
});

function showAdminDashboard() {
    adminLoginBox.classList.add('hidden');
    adminProtectedContent.classList.remove('hidden');
    loadAdminProductsList();
}

btnLogout.addEventListener('click', () => {
    isAdminLoggedIn = false;
    adminProtectedContent.classList.add('hidden');
    adminLoginBox.classList.remove('hidden');
});

// --- NAVEGACIÓN GENERAL ---
navTienda.addEventListener('click', (e) => {
    e.preventDefault();
    navSubir.classList.remove('active');
    navTienda.classList.add('active');
    sectionSubir.classList.add('hidden');
    sectionTienda.classList.remove('hidden');
    subNavbar.classList.remove('hidden'); 
    shopToolbar.classList.remove('hidden');
    loadProducts(); 
});

navSubir.addEventListener('click', (e) => {
    e.preventDefault();
    navTienda.classList.remove('active');
    navSubir.classList.add('active');
    sectionTienda.classList.add('hidden');
    subNavbar.classList.add('hidden');   
    shopToolbar.classList.add('hidden');   
    sectionSubir.classList.remove('hidden');
    
    if (isAdminLoggedIn) {
        showAdminDashboard();
    } else {
        adminProtectedContent.classList.add('hidden');
        adminLoginBox.classList.remove('hidden');
    }
});

// --- FILTRADO CATEGORÍAS ---
const catButtons = document.querySelectorAll('.cat-btn');
catButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        catButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-category');
        
        if(currentCategory === "todos") {
            sectionTitleText.innerText = "Nuestros Productos Destacados";
        } else {
            sectionTitleText.innerText = `Categoría: ${currentCategory}`;
        }
        loadProducts();
    });
});

// --- BUSCADOR ---
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    loadProducts(); 
});

// --- RANGO PRECIOS ---
priceRangeSelect.addEventListener('change', (e) => {
    currentPriceRange = e.target.value;
    loadProducts(); 
});

function matchesPriceRange(price, rangeKey) {
    if (rangeKey === "todos") return true;
    switch (rangeKey) {
        case "0-50": return price < 50;
        case "50-100": return price >= 50 && price <= 100;
        case "100-500": return price > 100 && price <= 500;
        case "500-up": return price > 500;
        default: return true;
    }
}

// --- VENTANA FLOTANTE (MODAL) ---
function openProductModal(product) {
    modalImg.src = product.imagen || 'https://via.placeholder.com/400';
    modalImg.alt = product.nombre;
    modalTag.innerText = product.categoria || 'General';
    modalTitle.innerText = product.nombre;
    modalPrice.innerText = `Q ${product.precio} Q`;

    const nroTelefono = "5493510000000"; 
    const mensajeTexto = encodeURIComponent(`¡Hola! Me interesa obtener más información sobre el producto "${product.nombre}" que vi en su catálogo web.`);
    modalWhatsappBtn.href = `https://wa.me/${nroTelefono}?text=${mensajeTexto}`;

    productModal.classList.remove('hidden');
}

modalCloseBtn.addEventListener('click', () => productModal.classList.add('hidden'));
productModal.addEventListener('click', (e) => { if (e.target === productModal) productModal.classList.add('hidden'); });

// --- RENDERIZAR TIENDA (CUADRADOS/GRID) ---
async function loadProducts() {
    try {
        container.innerHTML = "<div class='loading'>Cargando productos...</div>";
        const querySnapshot = await getDocs(collection(db, "productos"));
        container.innerHTML = "";
        let hasProducts = false;

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const precioProducto = parseFloat(product.precio) || 0;
            const nombreProducto = (product.nombre || "").toLowerCase();

            const categoryMatch = (currentCategory === "todos" || product.categoria === currentCategory);
            const searchMatch = (searchQuery === "" || nombreProducto.includes(searchQuery));
            const priceMatch = matchesPriceRange(precioProducto, currentPriceRange);

            if (categoryMatch && searchMatch && priceMatch) {
                hasProducts = true;
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="product-image-wrapper">
                        <img src="${product.imagen || 'https://via.placeholder.com/300'}" alt="${product.nombre}">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.nombre}</h3>
                        <p class="product-price">Q ${precioProducto}</p>
                    </div>
                `;
                card.addEventListener('click', () => openProductModal(product));
                container.appendChild(card);
            }
        });

        if (!hasProducts) {
            container.innerHTML = "<p class='loading'>No se encontraron productos.</p>";
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = "<p class='loading'>Error al conectar con la tienda.</p>";
    }
}

// --- RENDERIZAR LISTA ADM CON BOTÓN ELIMINAR ---
async function loadAdminProductsList() {
    try {
        adminProductsList.innerHTML = "<div class='loading'>Cargando inventario...</div>";
        const querySnapshot = await getDocs(collection(db, "productos"));
        adminProductsList.innerHTML = "";

        if (querySnapshot.empty) {
            adminProductsList.innerHTML = "<p class='loading'>No hay productos publicados.</p>";
            return;
        }

        querySnapshot.forEach((queryDoc) => {
            const product = queryDoc.data();
            const precio = parseFloat(product.precio) || 0;
            const productId = queryDoc.id; 

            const row = document.createElement('div');
            row.className = 'product-row-horizontal';
            row.innerHTML = `
                <div class="row-img-wrapper">
                    <img src="${product.imagen || 'https://via.placeholder.com/100'}" alt="${product.nombre}">
                </div>
                <div class="row-details">
                    <div class="row-info-left" id="info-trigger-${productId}">
                        <span class="row-title">${product.nombre}</span>
                        <span class="row-category">${product.categoria || 'Sin categoría'}</span>
                    </div>
                    <span class="row-price">$ ${precio} </span>
                    <button class="btn-delete-row" data-id="${productId}">Eliminar</button>
                </div>
            `;
            
            row.querySelector(`#info-trigger-${productId}`).addEventListener('click', () => openProductModal(product));
            
            row.querySelector('.btn-delete-row').addEventListener('click', async (e) => {
                const idABorrar = e.target.getAttribute('data-id');
                const confirmacion = confirm(`¿Estás seguro de que quieres eliminar "${product.nombre}" del catálogo por completo?`);
                
                if (confirmacion) {
                    try {
                        e.target.innerText = "Borrando...";
                        e.target.disabled = true;
                        
                        await deleteDoc(doc(db, "productos", idABorrar));
                        loadAdminProductsList();
                    } catch (err) {
                        console.error("Error al eliminar documento: ", err);
                        alert("Hubo un problema al intentar borrar el producto.");
                        e.target.innerText = "Eliminar";
                        e.target.disabled = false;
                    }
                }
            });

            adminProductsList.appendChild(row);
        });

    } catch (error) {
        console.error("Error al cargar lista horizontal:", error);
        adminProductsList.innerHTML = "<p class='loading'>Error al cargar inventario.</p>";
    }
}

// --- SUBIR NUEVO PRODUCTO ---
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const nombre = document.getElementById('prod-nombre').value;
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const categoria = document.getElementById('prod-categoria').value; 
    const urlImagen = document.getElementById('prod-imagen').value;

    const btnGuardar = document.getElementById('btn-guardar');
    btnGuardar.innerText = "Publicando...";
    btnGuardar.disabled = true;

    try {
        await addDoc(collection(db, "productos"), {
            nombre: nombre,
            precio: precio,
            categoria: categoria, 
            imagen: urlImagen
        });

        formMensaje.className = "msg-success";
        formMensaje.innerText = "¡Producto publicado con éxito!";
        uploadForm.reset();
        
        loadAdminProductsList();

    } catch (error) {
        console.error(error);
        formMensaje.className = "msg-error";
        formMensaje.innerText = "Hubo un error al guardar.";
    } finally {
        btnGuardar.innerText = "Publicar Producto";
        btnGuardar.disabled = false;
        setTimeout(() => { formMensaje.innerText = ""; }, 4000);
    }
});

loadProducts();