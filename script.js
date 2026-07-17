import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// --- ELEMENTOS DEL DOM ---
const container = document.getElementById('products-container');
const ofertasWrapper = document.getElementById('ofertas-container-wrapper');
const ofertasContainer = document.getElementById('ofertas-container');
const favoritosTiendaWrapper = document.getElementById('favoritos-tienda-wrapper');
const favoritosTiendaContainer = document.getElementById('favoritos-tienda-container');
const adminProductsList = document.getElementById('admin-products-list');
const uploadForm = document.getElementById('upload-form');
const formMensaje = document.getElementById('form-mensaje');
const sectionTitleText = document.getElementById('section-title-text');
const subNavbar = document.getElementById('sub-navbar');
const shopToolbar = document.getElementById('shop-toolbar');

const productModal = document.getElementById('product-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalImg = document.getElementById('modal-img');
const modalTag = document.getElementById('modal-tag');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalOldPrice = document.getElementById('modal-old-price');
const modalWhatsappBtn = document.getElementById('modal-whatsapp-btn');

// --- FILTROS Y SELECTORES ---
const sidebarSearchInput = document.getElementById('search-input');
const sidebarPriceRangeSelect = document.getElementById('price-range-select');
const sidebarSortSelect = document.getElementById('sidebar-sort');
const sidebarOnlyOffersCheckbox = document.getElementById('sidebar-only-offers');
const btnClearFilters = document.getElementById('btn-clear-filters');
const btnOpenSidebar = document.getElementById('btn-open-sidebar');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');

const navProyectos = document.getElementById('nav-proyectos');  
const navTienda = document.getElementById('nav-tienda');
const navFavoritos = document.getElementById('nav-favoritos');
const navSubir = document.getElementById('nav-subir');

const shopSidebar = document.getElementById('shop-sidebar');
const heroBanner = document.getElementById('hero-banner');
const sectionTienda = document.getElementById('section-tienda');
const sectionSubir = document.getElementById('section-subir');
const sectionSobreNosotros = document.getElementById('sobre-nosotros');

const authDualWrapper = document.getElementById('auth-dual-wrapper');
const adminLoginBox = document.getElementById('admin-login-box');
const adminProtectedContent = document.getElementById('admin-protected-content');
const loginForm = document.getElementById('login-form');
const loginMensaje = document.getElementById('login-mensaje');
const btnLogout = document.getElementById('btn-logout');

const clientLoginForm = document.getElementById('client-login-form');
const toggleClientView = document.getElementById('toggle-client-view');
const groupClientNombre = document.getElementById('group-client-nombre');
const clientAuthTitle = document.getElementById('client-auth-title');
const clientAuthSubtitle = document.getElementById('client-auth-subtitle');
const btnClientSubmit = document.getElementById('btn-client-submit');
const clientMensaje = document.getElementById('client-mensaje');
const clientProtectedContent = document.getElementById('client-protected-content');
const btnClientLogout = document.getElementById('btn-client-logout');
const txtWelcomeClient = document.getElementById('txt-welcome-client');

const modalDescripcion = document.getElementById('modal-descripcion');
const prodOfertaCheckbox = document.getElementById('prod-oferta');
const groupProdPorcentaje = document.getElementById('group-prod-porcentaje');

const categoryForm = document.getElementById('category-form');
const newCatNameInput = document.getElementById('new-cat-name');
const categoryMensaje = document.getElementById('category-mensaje');
const prodCategoriaSelect = document.getElementById('prod-categoria');
const categoriesContainer = document.querySelector('.categories-container');
const sidebarCategoriesList = document.querySelector('.sidebar-categories-list');

const deleteCategoriaSelect = document.getElementById('delete-categoria-select');
const btnEliminarCategoria = document.getElementById('btn-eliminar-categoria');
const linkVerMasProductos = document.getElementById('link-ver-mas-productos');

// --- VARIABLES GLOBALES ---
let currentCategory = "todos";
let isAdminLoggedIn = false; 
let isRegisterMode = false; 
let listaFavoritosUsuario = [];

let sidebarCategory = "todos";
let sidebarSearch = "";
let sidebarPriceRange = "todos";
let sidebarSort = "defecto";
let sidebarOnlyOffers = false;

let productosCache = [];

// --- ESTADO DE SESIÓN ---
// --- ESTADO DE SESIÓN (ACTUALIZADO) ---
// --- ESTADO DE SESIÓN (CORREGIDO) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Al recargar, verificamos si el usuario logueado es el admin asignado
        const adminDocRef = doc(db, "administradores", user.email);
        const adminDocSnap = await getDoc(adminDocRef);

        if (adminDocSnap.exists() && adminDocSnap.data().esAdmin === true) {
            isAdminLoggedIn = true;
            showAdminDashboard();
        } else {
            // Si es un cliente común logueado
            isAdminLoggedIn = false;
            if (txtWelcomeClient) txtWelcomeClient.innerText = `👋 ¡Bienvenido de nuevo, ${user.email}!`;
            await cargarFavoritosDesdeFirestore(user.uid);
            
            if (authDualWrapper) authDualWrapper.classList.add('hidden');
            if (adminProtectedContent) adminProtectedContent.classList.add('hidden');
            if (clientProtectedContent) clientProtectedContent.classList.remove('hidden');
        }
    } else {
        // Si NO hay ningún usuario logueado (Cerró sesión o visita anónima)
        isAdminLoggedIn = false;
        listaFavoritosUsuario = []; // Limpiamos favoritos de la sesión anterior
        
        if (txtWelcomeClient) txtWelcomeClient.innerText = "";
        
        // Mostramos las cajas de Login originales y ocultamos paneles privados
        if (authDualWrapper) authDualWrapper.classList.remove('hidden');
        if (adminProtectedContent) adminProtectedContent.classList.add('hidden');
        if (clientProtectedContent) clientProtectedContent.classList.add('hidden');
        
        // Mantener comportamiento de la sección Sobre Nosotros según tu estructura
        if (sectionSobreNosotros) sectionSobreNosotros.classList.remove('hidden');
    }
    loadProducts();
});

async function cargarFavoritosDesdeFirestore(uid) {
    try {
        const docRef = doc(db, "clientes_favoritos", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().productosIds) {
            listaFavoritosUsuario = docSnap.data().productosIds;
        } else {
            listaFavoritosUsuario = [];
        }
    } catch (e) {
        console.error("Error cargando favoritos:", e);
    }
}

function esFavorito(id) {
    return listaFavoritosUsuario.includes(id);
}

async function toggleFavorito(id, event) {
    event.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
        alert("¡Debes iniciar sesión o crear una cuenta para guardar tus favoritos! ♥️");
        navSubir.click();
        return;
    }

    const yaEsFavorito = listaFavoritosUsuario.includes(id);
    if (yaEsFavorito) {
        listaFavoritosUsuario = listaFavoritosUsuario.filter(favId => favId !== id);
    } else {
        listaFavoritosUsuario.push(id);
    }

    const botonesCorazon = document.querySelectorAll(`.btn-favorito-heart[data-id="${id}"]`);
    botonesCorazon.forEach(btn => {
        const svg = btn.querySelector('svg');
        if (!yaEsFavorito) {
            btn.classList.add('is-fav');
            if (svg) svg.setAttribute('fill', 'currentColor');
        } else {
            btn.classList.remove('is-fav');
            if (svg) svg.setAttribute('fill', 'none');
        }
    });

    if (currentCategory === "favoritos" || currentCategory === "todos") {
        setTimeout(() => { renderizarProductosProcesados(productosCache); }, 150);
    }

    const docRef = doc(db, "clientes_favoritos", user.uid);
    setDoc(docRef, { productosIds: listaFavoritosUsuario }).catch(e => {
        console.error("Error guardando favorito:", e);
        if (yaEsFavorito) { listaFavoritosUsuario.push(id); } 
        else { listaFavoritosUsuario = listaFavoritosUsuario.filter(favId => favId !== id); }
        renderizarProductosProcesados(productosCache);
    });
}

// --- GESTIÓN LOGIN ADMIN ---
// --- GESTIÓN LOGIN ADMIN (ACTUALIZADO CON FIRESTORE) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Usamos el campo de usuario como Email para Firebase Auth
        const emailAdmin = document.getElementById('login-username').value.trim();
        const passAdmin = document.getElementById('login-password').value;

        loginMensaje.className = "loading-msg";
        loginMensaje.innerText = "Verificando credenciales de administrador...";

        try {
            // 1. Iniciamos sesión en Firebase Auth de forma normal
            const userCredential = await signInWithEmailAndPassword(auth, emailAdmin, passAdmin);
            const user = userCredential.user;

            // 2. Consultamos en Firestore si este correo existe en la colección de administradores
            const adminDocRef = doc(db, "administradores", user.email);
            const adminDocSnap = await getDoc(adminDocRef);

            if (adminDocSnap.exists() && adminDocSnap.data().esAdmin === true) {
                // Si existe y el flag es true, le damos acceso de Admin
                isAdminLoggedIn = true;
                
                loginMensaje.className = "msg-success";
                loginMensaje.innerText = "¡Acceso de Administrador verificado con éxito!";
                
                setTimeout(() => {
                    loginForm.reset();
                    loginMensaje.innerText = "";
                    showAdminDashboard();
                }, 800);
            } else {
                // Si los datos de login son válidos pero NO es admin en la base de datos
                await signOut(auth); // Lo deslogueamos por seguridad
                isAdminLoggedIn = false;
                loginMensaje.className = "msg-error";
                loginMensaje.innerText = "Acceso denegado: Tu cuenta no tiene permisos de administrador.";
            }

        } catch (error) {
            console.error("Error en login de admin:", error);
            isAdminLoggedIn = false;
            loginMensaje.className = "msg-error";
            loginMensaje.innerText = "Usuario o contraseña incorrectos.";
        }
    });
}

function showAdminDashboard() {
    if (authDualWrapper) authDualWrapper.classList.add('hidden');
    if (clientProtectedContent) clientProtectedContent.classList.add('hidden');
    if (adminProtectedContent) adminProtectedContent.classList.remove('hidden');
    loadAdminProductsList();
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        isAdminLoggedIn = false;
        adminProtectedContent.classList.add('hidden');
        authDualWrapper.classList.remove('hidden');
        loadProducts();
    });
}

// --- LOGIN CLIENTE ---
if (toggleClientView) {
    toggleClientView.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        clientMensaje.innerText = "";
        clientMensaje.className = "";

        if (isRegisterMode) {
            clientAuthTitle.innerText = "Crear Cuenta Cliente";
            clientAuthSubtitle.innerText = "Regístrate de forma gratuita para guardar tus productos preferidos.";
            groupClientNombre.style.display = "block";
            btnClientSubmit.innerText = "Registrarse Gratuitamente";
            toggleClientView.innerText = "¿Ya posees una cuenta? Inicia Sesión";
        } else {
            clientAuthTitle.innerText = "Acceso Clientes";
            clientAuthSubtitle.innerText = "Inicia sesión para realizar tus compras y revisar tus pedidos.";
            groupClientNombre.style.display = "none";
            btnClientSubmit.innerText = "Iniciar Sesión";
            toggleClientView.innerText = "¿No tienes cuenta? Regístrate aquí";
        }
    });
}

if (clientLoginForm) {
    clientLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('client-email').value.trim();
        const password = document.getElementById('client-password').value;
        const nombre = document.getElementById('client-nombre').value.trim();

        clientMensaje.innerText = "Procesando...";
        clientMensaje.className = "loading-msg";

        try {
            if (isRegisterMode) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await addDoc(collection(db, "clientes_perfiles"), {
                    uid: userCredential.user.uid,
                    nombre: nombre || "Cliente Registrado",
                    email: email,
                    fechaRegistro: new Date().toISOString()
                });
                clientMensaje.className = "msg-success";
                clientMensaje.innerText = "¡Cuenta creada con éxito!";
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                clientMensaje.className = "msg-success";
                clientMensaje.innerText = "¡Sesión iniciada correctamente!";
            }
            clientLoginForm.reset();
        } catch (error) {
            clientMensaje.className = "msg-error";
            if (error.code === 'auth/email-already-in-use') clientMensaje.innerText = "Este correo ya se encuentra registrado.";
            else if (error.code === 'auth/weak-password') clientMensaje.innerText = "La contraseña debe tener al menos 6 caracteres.";
            else clientMensaje.innerText = "Verifica tu correo o contraseña.";
        }
    });
}

if (btnClientLogout) {
    btnClientLogout.addEventListener('click', async () => { await signOut(auth); });
}

// --- NAVEGACIÓN GENERAL ---
// --- NAVEGACIÓN GENERAL (ACTUALIZADA) ---
if (navTienda) {
    navTienda.addEventListener('click', (e) => {
        e.preventDefault();
        navSubir.classList.remove('active');
        navFavoritos.classList.remove('active');
        navProyectos.classList.remove('active');
        navTienda.classList.add('active');

        sectionTienda.classList.remove('hidden');
        sectionSubir.classList.add('hidden');
        
        // MOSTRAR Sobre Nosotros en el Inicio
        if (sectionSobreNosotros) sectionSobreNosotros.classList.remove('hidden');

        if (shopSidebar) shopSidebar.style.display = "none";
        if (ofertasWrapper) ofertasWrapper.classList.remove('hidden');
        if (sectionTitleText) sectionTitleText.innerText = "Nuestros Productos Destacados";
        if (favoritosTiendaWrapper) favoritosTiendaWrapper.classList.add('hidden');

        // MUESTRA el enlace "Ver más productos" solo en el Inicio
        if (linkVerMasProductos) linkVerMasProductos.classList.remove('hidden');

        heroBanner.classList.remove('hidden');
        subNavbar.classList.remove('hidden');

        currentCategory = "todos";
        sidebarCategory = "todos";
        resetCategoryActiveStates();
        renderizarProductosProcesados(productosCache);
    });
}

if (navProyectos) {
    navProyectos.addEventListener('click', (e) => {
        e.preventDefault();
        navSubir.classList.remove('active');
        navFavoritos.classList.remove('active'); 
        navTienda.classList.remove('active');
        navProyectos.classList.add('active'); 
        
        sectionTienda.classList.remove('hidden');
        sectionSubir.classList.add('hidden');
        
        // OCULTAR Sobre Nosotros en Productos
        if (sectionSobreNosotros) sectionSobreNosotros.classList.add('hidden');
        
        if (shopSidebar) shopSidebar.style.display = "block";
        if (heroBanner) heroBanner.classList.add('hidden');    
        if (ofertasWrapper) ofertasWrapper.classList.add('hidden');
        if (favoritosTiendaWrapper) favoritosTiendaWrapper.classList.add('hidden');
        
        if (sectionTitleText) sectionTitleText.innerText = "Catálogo de Productos Completo";
        
        // OCULTA el enlace "Ver más productos" en la sección de catálogo
        if (linkVerMasProductos) linkVerMasProductos.classList.add('hidden');
        
        currentCategory = "todos";
        sidebarCategory = "todos";
        renderizarProductosProcesados(productosCache);
    });
}

if (navFavoritos) {
    navFavoritos.addEventListener('click', (e) => {
        e.preventDefault();
        navTienda.classList.remove('active');
        navSubir.classList.remove('active');
        navProyectos.classList.remove('active'); 
        navFavoritos.classList.add('active'); 
        
        sectionSubir.classList.add('hidden');
        sectionTienda.classList.remove('hidden');
        
        // OCULTAR Sobre Nosotros en Favoritos
        if (sectionSobreNosotros) sectionSobreNosotros.classList.add('hidden');

        if (heroBanner) heroBanner.classList.add('hidden'); 
        if (shopSidebar) shopSidebar.style.display = "block";
        if (ofertasWrapper) ofertasWrapper.classList.add('hidden');
        
        currentCategory = "favoritos";
        sidebarCategory = "favoritos";
        if (sectionTitleText) sectionTitleText.innerText = "♥️ Favoritos Guardados";

        renderizarProductosProcesados(productosCache);
    });
}

if (navSubir) {
    navSubir.addEventListener('click', (e) => {
        e.preventDefault();
        navTienda.classList.remove('active');
        navFavoritos.classList.remove('active'); 
        navProyectos.classList.remove('active'); 
        navSubir.classList.add('active');
        
        sectionTienda.classList.add('hidden');
        if (subNavbar) subNavbar.classList.add('hidden');   
        sectionSubir.classList.remove('hidden');
        
        // OCULTAR Sobre Nosotros en Mi Cuenta
        if (sectionSobreNosotros) sectionSobreNosotros.classList.add('hidden');
        
        if (isAdminLoggedIn) showAdminDashboard();
    });
}

function resetCategoryActiveStates() {
    const allCatButtons = document.querySelectorAll('.cat-btn, .cat-btn-sidebar');
    allCatButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('[data-category="todos"]').forEach(btn => btn.classList.add('active'));
}

function matchesPriceRange(price, rangeKey) {
    if (rangeKey === "todos") return true;
    switch (rangeKey) {
        case "0-50": return price < 50;
        case "50-100": return price >= 50 && price <= 100;
        case "100-500": return price > 100 && price <= 500;
        case "500-up": return price > 500;
        case "bajo": return price < 10000;
        case "medio": return price >= 10000 && price <= 50000;
        case "alto": return price > 50000;
        default: return true;
    }
}

// --- RENDER TARJETAS ---
function openProductModal(product) {
    if (modalImg) { modalImg.src = product.imagen || 'https://via.placeholder.com/400'; modalImg.alt = product.nombre; }
    if (modalTag) modalTag.innerText = product.oferta ? `OFERTA ${product.porcentaje || 0}% 🔥` : (product.categoria || 'General');
    if (modalTitle) modalTitle.innerText = product.nombre;
    if (modalPrice) modalPrice.innerText = `Q ${product.precio}`;
    if (modalDescripcion) modalDescripcion.innerText = product.descripcion || 'No hay descripción disponible para este producto.';

    if (product.oferta && product.precioOriginal) {
        if (modalOldPrice) { modalOldPrice.innerText = `Q ${product.precioOriginal}`; modalOldPrice.style.display = 'block'; }
    } else {
        if (modalOldPrice) modalOldPrice.style.display = 'none';
    }

    if (modalWhatsappBtn) {
        const mensajeTexto = encodeURIComponent(`¡Hola! Me interesa obtener más información sobre "${product.nombre}" visto en su catálogo.`);
        modalWhatsappBtn.href = `https://wa.me/5493510000000?text=${mensajeTexto}`;
    }
    if (productModal) productModal.classList.remove('hidden');
}

if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => productModal.classList.add('hidden'));

function createProductCard(product, productId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const favActivo = esFavorito(productId);

    card.innerHTML = `
        <div class="product-image-wrapper">
            ${product.oferta ? `<span class="badge-oferta-card">-${product.porcentaje || 0}%</span>` : ''}
            <button class="btn-favorito-heart ${favActivo ? 'is-fav' : ''}" data-id="${productId}">
                <svg viewBox="0 0 24 24" fill="${favActivo ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" class="icon-minimal">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
            </button>
            <img src="${product.imagen || 'https://via.placeholder.com/300'}" alt="${product.nombre}">
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.nombre}</h3>
            <div style="display: flex; gap: 8px; align-items: center;">
                <p class="product-price">Q${product.precio}</p>
                ${product.oferta && product.precioOriginal ? `<p style="text-decoration: line-through; color: #64748b; font-size: 0.85rem;">Q${product.precioOriginal}</p>` : ''}
            </div>
        </div>
    `;
    card.addEventListener('click', () => openProductModal(product));
    card.querySelector('.btn-favorito-heart').addEventListener('click', (e) => toggleFavorito(productId, e));
    return card;
}

function createOfferProductCard(product, productId) {
    const card = document.createElement('div');
    card.className = 'product-card-offer';
    const favActivo = esFavorito(productId);

    card.innerHTML = `
        <div class="product-image-wrapper">
            <span class="offer-diagonal-badge">-${product.porcentaje || 0}%</span>
            <img src="${product.imagen || 'https://via.placeholder.com/150'}" alt="${product.nombre}">
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.nombre}</h3>
            <div class="price-group">
                <span class="product-price">Q${product.precio}</span>
                <span class="original-price-strike">Q${product.precioOriginal || product.precio}</span>
            </div>
        </div>
        <button class="btn-favorito-heart ${favActivo ? 'is-fav' : ''}" data-id="${productId}">
            <svg viewBox="0 0 24 24" fill="${favActivo ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" class="icon-minimal">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
        </button>
    `;
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-favorito-heart')) openProductModal(product);
    });
    card.querySelector('.btn-favorito-heart').addEventListener('click', (e) => toggleFavorito(productId, e));
    return card;
}

// --- RENDERS PROCESADOS ---
function renderizarProductosProcesados(listaProductos) {
    if (!container) return;
    container.innerHTML = "";
    if (ofertasContainer) ofertasContainer.innerHTML = "";
    
    let productosFiltrados = [...listaProductos];
    const isProyectosActive = navProyectos && navProyectos.classList.contains('active');

    if (sidebarSearch !== "") {
        productosFiltrados = productosFiltrados.filter(p => (p.nombre || "").toLowerCase().includes(sidebarSearch));
    }
    if (sidebarCategory !== "todos" && sidebarCategory !== "ofertas" && sidebarCategory !== "favoritos") {
        productosFiltrados = productosFiltrados.filter(p => p.categoria === sidebarCategory);
    }
    if (sidebarPriceRange !== "todos") {
        productosFiltrados = productosFiltrados.filter(p => matchesPriceRange(parseFloat(p.precio) || 0, sidebarPriceRange));
    }
    if (sidebarOnlyOffers || sidebarCategory === "ofertas") {
        productosFiltrados = productosFiltrados.filter(p => p.oferta === true);
    }
    if (sidebarCategory === "favoritos") {
        productosFiltrados = productosFiltrados.filter(p => esFavorito(p.id));
    }

    if (sidebarSort === "precio-asc") productosFiltrados.sort((a, b) => (parseFloat(a.precio) || 0) - (parseFloat(b.precio) || 0));
    else if (sidebarSort === "precio-desc") productosFiltrados.sort((a, b) => (parseFloat(b.precio) || 0) - (parseFloat(a.precio) || 0));
    else if (sidebarSort === "nombre-asc") productosFiltrados.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

    let hasDestacados = false;
    let hasOfertas = false;

    productosFiltrados.forEach((product) => {
        if (sidebarCategory === "todos" && !isProyectosActive) {
            if (product.oferta === true) {
                hasOfertas = true;
                if (ofertasContainer) ofertasContainer.appendChild(createOfferProductCard(product, product.id));
            } else {
                hasDestacados = true;
                container.appendChild(createProductCard(product, product.id));
            }
        } else { 
            hasDestacados = true;
            container.appendChild(createProductCard(product, product.id));
        }
    });

    if (sidebarCategory === "todos" && !isProyectosActive && !hasOfertas && ofertasContainer) {
        ofertasContainer.innerHTML = "<p class='loading'>No hay ofertas disponibles.</p>";
    }
    if (!hasDestacados) {
        container.innerHTML = "<p class='loading'>No se encontraron productos.</p>";
    }
}

// --- CARGA DE PRODUCTOS ---
async function loadProducts() {
    const localData = localStorage.getItem('productos_cache');
    if (localData) {
        try {
            productosCache = JSON.parse(localData);
            renderizarProductosProcesados(productosCache);
        } catch (e) { console.error(e); }
    }

    try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        const productosNuevos = [];
        querySnapshot.forEach((doc) => { productosNuevos.push({ id: doc.id, ...doc.data() }); });
        localStorage.setItem('productos_cache', JSON.stringify(productosNuevos));
        productosCache = productosNuevos;
        renderizarProductosProcesados(productosCache);
    } catch (error) { console.error(error); }
}

// --- GESTIÓN PRODUCTOS ADMIN ---
async function loadAdminProductsList() {
    if (!adminProductsList) return;
    try {
        adminProductsList.innerHTML = "<div class='loading'>Cargando inventario...</div>";
        const querySnapshot = await getDocs(collection(db, "productos"));
        adminProductsList.innerHTML = "";

        querySnapshot.forEach((queryDoc) => {
            const product = queryDoc.data();
            const productId = queryDoc.id; 
            const row = document.createElement('div');
            row.className = 'product-row-horizontal';

            // Si está en oferta, mostramos su porcentaje actual, si no, vacío o 0
            const porcentajeActual = product.oferta ? (product.porcentaje || 0) : 0;

            row.innerHTML = `
                <div class="row-img-wrapper"><img src="${product.imagen || ''}"></div>
                <div class="row-details">
                    <div class="row-info-left" id="info-trigger-${productId}">
                        <span class="row-title">${product.nombre}</span>
                        <span class="row-category">${product.categoria}</span>
                    </div>
                    
                    <!-- Gestión interactiva de la oferta -->
                    <div class="row-offer-management">
                        <label style="font-size:0.75rem; font-weight:600; color:#64748b;">Oferta (%):</label>
                        <input type="number" class="input-admin-oferta" id="input-oferta-${productId}" min="0" max="99" value="${porcentajeActual}">
                        <button class="btn-update-offer" data-id="${productId}">Actualizar</button>
                    </div>

                    <span class="row-price">Q ${product.precio}</span>
                </div>
                <div>
                    <button class="btn-delete-row" data-id="${productId}">Eliminar</button>
                </div>
            `;

            // Evento para actualizar u omitir la oferta del producto
            row.querySelector('.btn-update-offer').addEventListener('click', async (e) => {
                const nuevoPorcentaje = parseInt(document.getElementById(`input-oferta-${productId}`).value) || 0;
                const prodRef = doc(db, "productos", productId);
                
                let updateData = {};

                if (nuevoPorcentaje > 0) {
                    // Si antes no tenía oferta, el precio actual pasa a ser el original
                    // Si ya tenía, mantenemos el precioOriginal original
                    const precioViejo = product.precioOriginal || product.precio;
                    const nuevoPrecioDescontado = parseFloat((precioViejo * (1 - nuevoPorcentaje / 100)).toFixed(2));
                    
                    updateData = {
                        oferta: true,
                        porcentaje: nuevoPorcentaje,
                        precioOriginal: precioViejo,
                        precio: nuevoPrecioDescontado
                    };
                } else {
                    // Si se pone 0, removemos la oferta por completo y restauramos el precio base
                    updateData = {
                        oferta: false,
                        porcentaje: null,
                        precioOriginal: null,
                        precio: product.precioOriginal || product.precio
                    };
                }

                try {
                    e.target.innerText = "⏳";
                    await updateDoc(prodRef, updateData);
                    loadAdminProductsList();
                    loadProducts(); // Sincroniza el catálogo del cliente
                } catch (err) {
                    console.error("Error actualizando oferta:", err);
                    alert("No se pudo actualizar la oferta.");
                }
            });

            // Evento para eliminar
            row.querySelector('.btn-delete-row').addEventListener('click', async () => {
                if (confirm(`¿Estás seguro de que deseas eliminar "${product.nombre}"?`)) {
                    await deleteDoc(doc(db, "productos", productId));
                    loadAdminProductsList();
                    loadProducts();
                }
            });

            adminProductsList.appendChild(row);
        });
    } catch (e) { console.error(e); }
}

if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnGuardar = document.getElementById('btn-guardar');
        btnGuardar.disabled = true;

        try {
            const precioBase = parseFloat(document.getElementById('prod-precio').value);
            const tieneOferta = document.getElementById('prod-oferta').checked;
            const porcentajeInput = parseInt(document.getElementById('prod-porcentaje').value) || 0;

            let precioFinal = precioBase;
            let precioOriginal = null;
            let porcentajeFinal = null;

            if (tieneOferta && porcentajeInput > 0) {
                porcentajeFinal = porcentajeInput;
                precioOriginal = precioBase;
                // Calculamos el precio con descuento ya aplicado para la base de datos
                precioFinal = parseFloat((precioBase * (1 - porcentajeFinal / 100)).toFixed(2));
            }

            await addDoc(collection(db, "productos"), {
                nombre: document.getElementById('prod-nombre').value,
                precio: precioFinal, // Precio público en la tienda
                precioOriginal: precioOriginal, // Precio viejo si aplica
                categoria: document.getElementById('prod-categoria').value,
                imagen: document.getElementById('prod-imagen').value,
                oferta: tieneOferta && porcentajeInput > 0,
                descripcion: document.getElementById('prod-descripcion').value,
                porcentaje: porcentajeFinal
            });

            formMensaje.className = "msg-success";
            formMensaje.innerText = "¡Publicado con éxito!";
            uploadForm.reset();
            if (groupProdPorcentaje) groupProdPorcentaje.classList.add('hidden');
            loadAdminProductsList();
            loadProducts(); // Recarga la tienda de fondo
        } catch (e) { 
            console.error(e);
            formMensaje.innerText = "Error al guardar."; 
        } finally { 
            btnGuardar.disabled = false; 
        }
    });
}

// --- FILTROS LISTENERS ---
// --- FILTROS LISTENERS ---
if (sidebarSearchInput) sidebarSearchInput.addEventListener('input', (e) => { sidebarSearch = e.target.value.toLowerCase().trim(); renderizarProductosProcesados(productosCache); });
if (sidebarPriceRangeSelect) sidebarPriceRangeSelect.addEventListener('change', (e) => { sidebarPriceRange = e.target.value; renderizarProductosProcesados(productosCache); });
if (sidebarSortSelect) sidebarSortSelect.addEventListener('change', (e) => { sidebarSort = e.target.value; renderizarProductosProcesados(productosCache); });
if (sidebarOnlyOffersCheckbox) sidebarOnlyOffersCheckbox.addEventListener('change', (e) => { sidebarOnlyOffers = e.target.checked; renderizarProductosProcesados(productosCache); });

if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
        if (sidebarSearchInput) sidebarSearchInput.value = "";
        sidebarSearch = ""; 
        sidebarPriceRange = "todos"; 
        sidebarSort = "defecto";
        if (sidebarPriceRangeSelect) sidebarPriceRangeSelect.value = "todos";
        if (sidebarSortSelect) sidebarSortSelect.value = "defecto";
        if (sidebarOnlyOffersCheckbox) sidebarOnlyOffersCheckbox.checked = false;
        sidebarOnlyOffers = false;
        renderizarProductosProcesados(productosCache);
    });
}

if (btnOpenSidebar && shopSidebar) btnOpenSidebar.addEventListener('click', () => shopSidebar.classList.add('open'));
if (btnCloseSidebar && shopSidebar) btnCloseSidebar.addEventListener('click', () => shopSidebar.classList.remove('open'));

// Manejo del checkbox de porcentaje de oferta en el panel de subida
if (prodOfertaCheckbox && groupProdPorcentaje) {
    prodOfertaCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            groupProdPorcentaje.classList.remove('hidden');
        } else {
            groupProdPorcentaje.classList.add('hidden');
            const pctInput = document.getElementById('prod-porcentaje');
            if (pctInput) pctInput.value = "";
        }
    });
}

// --- CARGAR Y RENDERIZAR CATEGORÍAS DINÁMICAS ---
async function loadCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, "categorias"));
        let categoriasFiltro = [];
        let categoriasCompletas = []; 

        querySnapshot.forEach((doc) => {
            categoriasFiltro.push(doc.data().nombre);
            categoriasCompletas.push({ id: doc.id, nombre: doc.data().nombre });
        });

        // Actualizar Selectores de Categorías del Admin
        actualizarSelectoresCategorias(categoriasCompletas);

        // Actualizar la barra superior del menú de Inicio (Sub-Navbar)
        if (categoriesContainer) {
            categoriesContainer.innerHTML = `
                <button class="cat-btn ${currentCategory === 'todos' ? 'active' : ''}" data-category="todos">Todos los productos</button>
                ${categoriasFiltro.map(cat => `
                    <button class="cat-btn ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>
                `).join('')}
                <button class="cat-btn cat-oferta-btn ${currentCategory === 'ofertas' ? 'active' : ''}" data-category="ofertas" style="color: #ef4444; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem;">
                    <svg class="icon-minimal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.39.39 1.02.39 1.41 0l7.59-7.59c.39-.39.39-1.02 0-1.41L12 2z"/><path d="M7 7h.01"/></svg>
                    Ofertas
                </button>
            `;
        }

        // Actualizar la lista de categorías del Sidebar izquierdo (Productos)
        if (sidebarCategoriesList) {
            sidebarCategoriesList.innerHTML = `
                <button class="cat-btn-sidebar ${sidebarCategory === 'todos' ? 'active' : ''}" data-category="todos">Todos los Productos</button>
                <button class="cat-btn-sidebar ${sidebarCategory === 'favoritos' ? 'active' : ''}" data-category="favoritos"><svg class="icon-minimal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> Mis Favoritos</button>
                <button class="cat-btn-sidebar ${sidebarCategory === 'ofertas' ? 'active' : ''}" data-category="ofertas"><svg class="icon-minimal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.39.39 1.02.39 1.41 0l7.59-7.59c.39-.39.39-1.02 0-1.41L12 2z"/><path d="M7 7h.01"/></svg> Ofertas Especiales</button>
                ${categoriasFiltro.map(cat => `
                    <button class="cat-btn-sidebar ${sidebarCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>
                `).join('')}
            `;
        }

        // Volver a enlazar los clicks de los botones dinámicos generados
        revinculacionEventosCategorias();

    } catch (e) {
        console.error("Error cargando categorías:", e);
    }
}

function actualizarSelectoresCategorias(listaCategorias) {
    if (prodCategoriaSelect) prodCategoriaSelect.innerHTML = '';
    if (deleteCategoriaSelect) deleteCategoriaSelect.innerHTML = '<option value="" disabled selected>Selecciona una categoría...</option>';

    listaCategorias.forEach(categoria => {
        const opt1 = document.createElement('option');
        opt1.value = categoria.nombre;
        opt1.textContent = categoria.nombre;
        if (prodCategoriaSelect) prodCategoriaSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = categoria.id; 
        opt2.textContent = categoria.nombre;
        if (deleteCategoriaSelect) deleteCategoriaSelect.appendChild(opt2);
    });
}

function revinculacionEventosCategorias() {
    document.querySelectorAll('.cat-btn, .cat-btn-sidebar').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target.closest('[data-category]');
            const cat = target.getAttribute('data-category');
            
            sidebarCategory = cat;
            currentCategory = cat;

            document.querySelectorAll('.cat-btn, .cat-btn-sidebar').forEach(b => b.classList.remove('active'));
            document.querySelectorAll(`[data-category="${cat}"]`).forEach(b => b.classList.add('active'));

            renderizarProductosProcesados(productosCache);
        });
    });
}

// --- GUARDAR NUEVA CATEGORÍA (ADMIN) ---
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreCat = newCatNameInput.value.trim();
        if (!nombreCat) return;

        categoryMensaje.innerText = "Guardando...";
        categoryMensaje.className = "loading-msg";

        try {
            await addDoc(collection(db, "categorias"), {
                nombre: nombreCat,
                fechaCreacion: new Date().toISOString()
            });

            categoryMensaje.className = "msg-success";
            categoryMensaje.innerText = "¡Categoría añadida con éxito!";
            categoryForm.reset();
            await loadCategories();
        } catch (err) {
            console.error(err);
            categoryMensaje.className = "msg-error";
            categoryMensaje.innerText = "Error al guardar la categoría.";
        }
    });
}

// --- ELIMINAR CATEGORÍA (ADMIN) ---
if (btnEliminarCategoria) {
    btnEliminarCategoria.addEventListener('click', async () => {
        const categoriaId = deleteCategoriaSelect.value;
        if (!categoriaId) {
            alert('❌ Por favor, selecciona una categoría válida para eliminar.');
            return;
        }

        const confirmar = confirm('¿Estás seguro de que deseas eliminar esta categoría? Esto no afectará a los productos existentes de manera automática.');
        if (confirmar) {
            try {
                await deleteDoc(doc(db, "categorias", categoriaId));
                alert('🗑️ Categoría eliminada con éxito.');
                await loadCategories();
            } catch (error) {
                console.error("Error al eliminar la categoría:", error);
                alert('Hubo un error al intentar eliminar la categoría.');
            }
        }
    });
}

// --- INITIALIZATION RUN (Único punto de entrada seguro) ---
if (shopSidebar) shopSidebar.style.display = "none";
loadProducts();
loadCategories();