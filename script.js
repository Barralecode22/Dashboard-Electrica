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

const searchInput = document.getElementById('search-input');
const priceRangeSelect = document.getElementById('price-range-select');

const productModal = document.getElementById('product-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalImg = document.getElementById('modal-img');
const modalTag = document.getElementById('modal-tag');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalOldPrice = document.getElementById('modal-old-price');
const modalWhatsappBtn = document.getElementById('modal-whatsapp-btn');

const navTienda = document.getElementById('nav-tienda');
const navFavoritos = document.getElementById('nav-favoritos');
const navSubir = document.getElementById('nav-subir');

const sectionTienda = document.getElementById('section-tienda');
const sectionSubir = document.getElementById('section-subir');

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

// --- VARIABLES GLOBALES ---
let currentCategory = "todos";
let searchQuery = "";
let currentPriceRange = "todos";
let isAdminLoggedIn = false; 
let isRegisterMode = false; 
let listaFavoritosUsuario = []; // Lista local sincronizada con Firestore por cada usuario

// --- OBSERVAR ESTADO DE LA SESIÓN DE FIREBASE REAL ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        isAdminLoggedIn = false;
        txtWelcomeClient.innerText = `👋 ¡Bienvenido de nuevo, ${user.email}!`;
        
        // Al loguearse un usuario, cargamos sus favoritos guardados en la BD
        await cargarFavoritosDesdeFirestore(user.uid);
        
        authDualWrapper.classList.add('hidden');
        adminProtectedContent.classList.add('hidden');
        clientProtectedContent.classList.remove('hidden');
    } else {
        listaFavoritosUsuario = []; // Limpiamos favoritos al cerrar sesión
        clientProtectedContent.classList.add('hidden');
        if (!isAdminLoggedIn) {
            authDualWrapper.classList.remove('hidden');
        }
    }
    loadProducts(); // Recarga la tienda aplicando los favoritos correspondientes
});

// --- NUEVA LÓGICA DE FAVORITOS BASADA EN CUENTA (FIRESTORE) ---
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
    
    // Validamos que haya un cliente logueado
    const user = auth.currentUser;
    if (!user) {
        alert("¡Debes iniciar sesión o crear una cuenta para guardar tus favoritos! ❤️");
        // Redirigimos automáticamente al menú "Cuenta"
        navSubir.click();
        return;
    }

    if (listaFavoritosUsuario.includes(id)) {
        listaFavoritosUsuario = listaFavoritosUsuario.filter(favId => favId !== id);
    } else {
        listaFavoritosUsuario.push(id);
    }

    // Guardar o actualizar la lista en el documento privado del usuario en Firestore
    try {
        const docRef = doc(db, "clientes_favoritos", user.uid);
        await setDoc(docRef, { productosIds: listaFavoritosUsuario });
    } catch (e) {
        console.error("Error guardando favorito en la cuenta:", e);
    }

    loadProducts();
}

// --- GESTIÓN LOGIN DE CONTROL (ADMIN) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    if (user === "admin" && pass === "1234") {
        isAdminLoggedIn = true;
        await signOut(auth); // Desconecta cliente si entra el administrador
        
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
    authDualWrapper.classList.add('hidden');
    clientProtectedContent.classList.add('hidden');
    adminProtectedContent.classList.remove('hidden');
    loadAdminProductsList();
}

btnLogout.addEventListener('click', () => {
    isAdminLoggedIn = false;
    adminProtectedContent.classList.add('hidden');
    authDualWrapper.classList.remove('hidden');
    loadProducts();
});

// --- SISTEMA DE AUTENTICACIÓN (CLIENTE) ---
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

clientLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('client-email').value.trim();
    const password = document.getElementById('client-password').value;
    const nombre = document.getElementById('client-nombre').value.trim();

    clientMensaje.innerText = "Procesando, por favor espera...";
    clientMensaje.className = "loading-msg";

    try {
        if (isRegisterMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await addDoc(collection(db, "clientes_perfiles"), {
                uid: user.uid,
                nombre: nombre || "Cliente Registrado",
                email: email,
                fechaRegistro: new Date().toISOString()
            });

            clientMensaje.className = "msg-success";
            clientMensaje.innerText = "¡Cuenta creada y guardada con éxito!";
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            clientMensaje.className = "msg-success";
            clientMensaje.innerText = "¡Sesión iniciada correctamente!";
        }
        clientLoginForm.reset();
    } catch (error) {
        console.error(error);
        clientMensaje.className = "msg-error";
        if (error.code === 'auth/email-already-in-use') {
            clientMensaje.innerText = "Este correo ya se encuentra registrado.";
        } else if (error.code === 'auth/weak-password') {
            clientMensaje.innerText = "La contraseña debe tener al menos 6 caracteres.";
        } else if (error.code === 'auth/invalid-credential') {
            clientMensaje.innerText = "Credenciales incorrectas. Verifica tu correo o contraseña.";
        } else {
            clientMensaje.innerText = "Error: Ocurrió un problema en los servidores.";
        }
    }
});

btnClientLogout.addEventListener('click', async () => {
    await signOut(auth);
});

// --- NAVEGACIÓN GENERAL ---
navTienda.addEventListener('click', (e) => {
    e.preventDefault();
    navSubir.classList.remove('active');
    navFavoritos.classList.remove('active'); 
    navTienda.classList.add('active');
    sectionSubir.classList.add('hidden');
    sectionTienda.classList.remove('hidden');
    subNavbar.classList.remove('hidden'); 
    shopToolbar.classList.remove('hidden');
    
    currentCategory = "todos";
    sectionTitleText.innerText = "Nuestros Productos Destacados";
    
    const catButtons = document.querySelectorAll('.cat-btn');
    catButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-category="todos"]').classList.add('active');

    loadProducts(); 
});

navFavoritos.addEventListener('click', (e) => {
    e.preventDefault();
    navTienda.classList.remove('active');
    navSubir.classList.remove('active');
    navFavoritos.classList.add('active'); 
    
    sectionSubir.classList.add('hidden');
    sectionTienda.classList.remove('hidden');
    subNavbar.classList.remove('hidden'); 
    shopToolbar.classList.remove('hidden');
    
    currentCategory = "favoritos";
    sectionTitleText.innerText = "❤️ Favoritos Guardados";
    
    const catButtons = document.querySelectorAll('.cat-btn');
    catButtons.forEach(btn => btn.classList.remove('active'));

    loadProducts();
});

navSubir.addEventListener('click', (e) => {
    e.preventDefault();
    navTienda.classList.remove('active');
    navFavoritos.classList.remove('active'); 
    navSubir.classList.add('active');
    sectionTienda.classList.add('hidden');
    subNavbar.classList.add('hidden');   
    shopToolbar.classList.add('hidden');   
    sectionSubir.classList.remove('hidden');
    
    if (isAdminLoggedIn) {
        showAdminDashboard();
    } else if (auth.currentUser) {
        authDualWrapper.classList.add('hidden');
        adminProtectedContent.classList.add('hidden');
        clientProtectedContent.classList.remove('hidden');
    } else {
        adminProtectedContent.classList.add('hidden');
        clientProtectedContent.classList.add('hidden');
        authDualWrapper.classList.remove('hidden');
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
        } else if(currentCategory === "ofertas") {
            sectionTitleText.innerText = "🔥 ¡Productos en Oferta Imperdible!";
        } else if(currentCategory === "favoritos") {
            sectionTitleText.innerText = "❤️ Favoritos Guardados";
        } else {
            sectionTitleText.innerText = `Categoría: ${currentCategory}`;
        }
        loadProducts();
    });
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    loadProducts(); 
});

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

// --- RENDERS ---
function openProductModal(product) {
    modalImg.src = product.imagen || 'https://via.placeholder.com/400';
    modalImg.alt = product.nombre;
    modalTag.innerText = product.oferta ? `OFERTA ${product.porcentaje || 0}% 🔥` : (product.categoria || 'General');
    modalTitle.innerText = product.nombre;
    modalPrice.innerText = `$${product.precio} USD`;

    if (product.oferta && product.precioOriginal) {
        modalOldPrice.innerText = `$${product.precioOriginal} USD`;
        modalOldPrice.style.display = 'block';
    } else {
        modalOldPrice.style.display = 'none';
    }

    const nroTelefono = "5493510000000"; 
    const mensajeTexto = encodeURIComponent(`¡Hola! Me interesa obtener más información sobre el producto "${product.nombre}" que vi en su catálogo web.`);
    modalWhatsappBtn.href = `https://wa.me/${nroTelefono}?text=${mensajeTexto}`;

    productModal.classList.remove('hidden');
}

modalCloseBtn.addEventListener('click', () => productModal.classList.add('hidden'));
productModal.addEventListener('click', (e) => { if (e.target === productModal) productModal.classList.add('hidden'); });

function createProductCard(product, productId) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const favActivo = esFavorito(productId);

    card.innerHTML = `
        <div class="product-image-wrapper" style="position: relative;">
            ${product.oferta ? `<span class="badge-oferta-card">-${product.porcentaje || 0}%</span>` : ''}
            <button class="btn-favorito-heart ${favActivo ? 'is-fav' : ''}" data-id="${productId}">
                ${favActivo ? '❤️' : '🤍'}
            </button>
            <img src="${product.imagen || 'https://via.placeholder.com/300'}" alt="${product.nombre}">
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.nombre}</h3>
            <div style="display: flex; gap: 8px; align-items: center;">
                <p class="product-price">$${product.precio}</p>
                ${product.oferta && product.precioOriginal ? `<p style="text-decoration: line-through; color: #64748b; font-size: 0.85rem; margin-bottom: 0.5rem;">$${product.precioOriginal}</p>` : ''}
            </div>
        </div>
    `;

    card.addEventListener('click', () => openProductModal(product));
    card.querySelector('.btn-favorito-heart').addEventListener('click', (e) => toggleFavorito(productId, e));
    return card;
}

async function loadProducts() {
    try {
        container.innerHTML = "<div class='loading'>Cargando productos...</div>";
        ofertasContainer.innerHTML = "";
        favoritosTiendaContainer.innerHTML = "";
        
        const querySnapshot = await getDocs(collection(db, "productos"));
        container.innerHTML = "";
        
        let hasDestacados = false;
        let hasOfertas = false;
        let hasFavoritosEnInicio = false;

        if (currentCategory === "todos") {
            ofertasWrapper.classList.remove('hidden');
            favoritosTiendaWrapper.classList.remove('hidden');
        } else {
            ofertasWrapper.classList.add('hidden');
            favoritosTiendaWrapper.classList.add('hidden');
        }

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id; 
            const precioProducto = parseFloat(product.precio) || 0;
            const nombreProducto = (product.nombre || "").toLowerCase();

            const searchMatch = (searchQuery === "" || nombreProducto.includes(searchQuery));
            const priceMatch = matchesPriceRange(precioProducto, currentPriceRange);

            if (searchMatch && priceMatch) {
                if (currentCategory === "todos") {
                    if (product.oferta === true) {
                        hasOfertas = true;
                        ofertasContainer.appendChild(createProductCard(product, productId));
                    } else {
                        hasDestacados = true;
                        container.appendChild(createProductCard(product, productId));
                    }

                    if (esFavorito(productId)) {
                        hasFavoritosEnInicio = true;
                        favoritosTiendaContainer.appendChild(createProductCard(product, productId));
                    }
                } 
                else if (currentCategory === "ofertas") {
                    if (product.oferta === true) {
                        hasDestacados = true;
                        container.appendChild(createProductCard(product, productId));
                    }
                } 
                else if (currentCategory === "favoritos") {
                    if (esFavorito(productId)) {
                        hasDestacados = true;
                        container.appendChild(createProductCard(product, productId));
                    }
                }
                else {
                    if (product.categoria === currentCategory) {
                        hasDestacados = true;
                        container.appendChild(createProductCard(product, productId));
                    }
                }
            }
        });

        if (currentCategory === "todos") {
            if (!hasOfertas) {
                ofertasContainer.innerHTML = "<p class='loading'>No hay ofertas disponibles en este momento.</p>";
            }
            if (!hasFavoritosEnInicio) {
                favoritosTiendaWrapper.classList.add('hidden');
            }
        }

        if (!hasDestacados) {
            if (currentCategory === "favoritos") {
                if (!auth.currentUser) {
                    container.innerHTML = "<p class='loading'>Inicia sesión en tu cuenta para visualizar tus favoritos ❤️.</p>";
                } else {
                    container.innerHTML = "<p class='loading'>Aún no has añadido ningún producto a tus favoritos ❤️.</p>";
                }
            } else {
                container.innerHTML = "<p class='loading'>No se encontraron productos.</p>";
            }
        }
        
    } catch (error) {
        console.error(error);
        container.innerHTML = "<p class='loading'>Error al conectar con la tienda.</p>";
    }
}

// --- GESTIÓN DE PRODUCTOS ADMINISTRADOR ---
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
            row.style.flexWrap = 'wrap';
            row.style.gap = '1rem';

            row.innerHTML = `
                <div class="row-img-wrapper">
                    <img src="${product.imagen || 'https://via.placeholder.com/100'}" alt="${product.nombre}">
                </div>
                <div class="row-details" style="flex: 2; min-width: 250px;">
                    <div class="row-info-left" id="info-trigger-${productId}">
                        <span class="row-title">${product.nombre} ${product.oferta ? `<strong style="color: #ef4444;">(-${product.porcentaje || 0}%)</strong>` : ''}</span>
                        <span class="row-category">${product.categoria || 'Sin categoría'}</span>
                    </div>
                    <span class="row-price">$${precio} USD</span>
                </div>
                
                <div class="row-actions-oferta" style="display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; padding: 0.5rem; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <input type="number" id="input-pct-${productId}" min="0" max="99" placeholder="%" value="${product.porcentaje || ''}" style="width: 60px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
                    <button class="btn-apply-oferta" id="btn-oferta-${productId}" style="background: #4169e1; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                        ${product.oferta ? 'Quitar' : 'Ofertar'}
                    </button>
                    <button class="btn-delete-row" data-id="${productId}" style="margin-left: 0.5rem;">Eliminar</button>
                </div>
            `;
            
            row.querySelector(`#info-trigger-${productId}`).addEventListener('click', () => openProductModal(product));
            
            const btnOferta = row.querySelector(`#btn-oferta-${productId}`);
            const inputPct = row.querySelector(`#input-pct-${productId}`);

            btnOferta.addEventListener('click', async () => {
                const docRef = doc(db, "productos", productId);
                
                if (product.oferta) {
                    btnOferta.innerText = "Quitando...";
                    await updateDoc(docRef, {
                        oferta: false,
                        porcentaje: null,
                        precio: product.precioOriginal || product.precio,
                        precioOriginal: null
                    });
                } else {
                    const porcentaje = parseInt(inputPct.value);
                    if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje >= 100) {
                        alert("Por favor introduce un porcentaje de descuento válido (1 a 99).");
                        return;
                    }
                    
                    btnOferta.innerText = "Aplicando...";
                    const precioOriginal = product.precioOriginal || product.precio;
                    const nuevoPrecio = parseFloat((precioOriginal * (1 - porcentaje / 100)).toFixed(2));

                    await updateDoc(docRef, {
                        oferta: true,
                        porcentaje: porcentaje,
                        precioOriginal: precioOriginal,
                        precio: nuevoPrecio
                    });
                }
                loadAdminProductsList();
            });

            row.querySelector('.btn-delete-row').addEventListener('click', async (e) => {
                const idABorrar = e.target.getAttribute('data-id');
                const confirmacion = confirm(`¿Estás seguro de que quieres eliminar "${product.nombre}"?`);
                
                if (confirmacion) {
                    try {
                        e.target.innerText = "Borrando...";
                        await deleteDoc(doc(db, "productos", idABorrar));
                        loadAdminProductsList();
                    } catch (err) {
                        console.error("Error al eliminar:", err);
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

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const nombre = document.getElementById('prod-nombre').value;
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const categorySelector = document.getElementById('prod-categoria').value; 
    const urlImagen = document.getElementById('prod-imagen').value;
    const enOferta = document.getElementById('prod-oferta').checked;

    const btnGuardar = document.getElementById('btn-guardar');
    btnGuardar.innerText = "Publicando...";
    btnGuardar.disabled = true;

    try {
        await addDoc(collection(db, "productos"), {
            nombre: nombre,
            precio: precio,
            categoria: categorySelector, 
            imagen: urlImagen,
            oferta: enOferta,
            porcentaje: enOferta ? 0 : null,
            precioOriginal: enOferta ? precio : null
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