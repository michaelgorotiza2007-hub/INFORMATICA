// ==========================================
// 1. CONFIGURACIÓN FIREBASE & CLOUDINARY
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDX8LzYRES0o8t7szn_l6UjNnbA0XEAAoE",
    authDomain: "informatica-aea9a.firebaseapp.com",
    projectId: "informatica-aea9a",
    storageBucket: "informatica-aea9a.firebasestorage.app",
    messagingSenderId: "917780830590",
    appId: "1:917780830590:web:f35201bd8843f2f08f3b2f"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- CONFIGURACIÓN CLOUDINARY ---
const cloudinaryConfig = {
    cloudName: 'db2pcykq3', // <<< CAMBIA ESTO
    uploadPreset: 'informatica' // <<< CAMBIA ESTO (Debe ser Unsigned)
};

// ==========================================
// 2. LÓGICA DE UPLOAD (WIDGET)
// ==========================================

// Configurar los listeners para los botones de subida al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    
    // Botón para FOTOS
    document.getElementById("btn-upload-photo").addEventListener("click", function(){
        openCloudinaryWidget('image', (url) => {
            document.getElementById('url-photo').value = url;
            document.getElementById('status-photo').innerText = "¡Foto cargada!";
            document.getElementById('status-photo').style.color = "#00f3ff";
        });
    }, false);

    // Botón para MÚSICA (Audio)
    document.getElementById("btn-upload-music").addEventListener("click", function(){
        openCloudinaryWidget('video', (url) => { // Cloudinary trata audio como 'video' o 'auto'
            document.getElementById('url-music').value = url;
            document.getElementById('status-music').innerText = "¡Audio cargado!";
            document.getElementById('status-music').style.color = "#00f3ff";
        });
    }, false);

});

// Función genérica para abrir el widget
function openCloudinaryWidget(type, callback) {
    const myWidget = cloudinary.createUploadWidget({
        cloudName: cloudinaryConfig.cloudName, 
        uploadPreset: cloudinaryConfig.uploadPreset,
        sources: ['local', 'url', 'camera'],
        resourceType: type === 'image' ? 'image' : 'auto', // 'auto' detecta audio/video
        multiple: false,
        clientAllowedFormats: type === 'image' ? ['png', 'jpg', 'jpeg'] : ['mp3', 'wav', 'mp4'],
        theme: "minimal"
    }, (error, result) => { 
        if (!error && result && result.event === "success") { 
            console.log('Archivo subido: ', result.info.secure_url); 
            callback(result.info.secure_url);
        }
    });
    myWidget.open();
}

// ==========================================
// 3. ESTADO Y NAVEGACIÓN
// ==========================================
const state = {
    currentView: 1,
    history: [],
    futureHistory: [],
    isModerator: false,
    selectedCourse: null,
    currentCategory: null,
    editingId: null
};

// Sonidos
const clickSound = document.getElementById('click-sound');
function playClick() { if(clickSound) { clickSound.currentTime=0; clickSound.play().catch(()=>{}); } }

function goToInterface(viewId, param = null) {
    playClick();
    if(viewId > 2 && !state.selectedCourse) {
        showToast("Selecciona un curso primero", "error"); return;
    }
    if(state.currentView !== viewId) { state.history.push(state.currentView); state.futureHistory = []; }
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    document.getElementById('loading-screen').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        const header = document.getElementById('global-header');
        if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');
        
        const searchBar = document.getElementById('search-bar-container');
        if([3,4,5,6,8].includes(viewId)) searchBar.classList.remove('hidden'); else searchBar.classList.add('hidden');

        if(viewId === 4) fetchAndRenderMembers();
        if(viewId === 7) fetchAndRenderYoutube();
        
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        state.currentView = viewId;
        updateUI();
    }, 600);
}

function selectCourse(courseName) {
    state.selectedCourse = courseName;
    document.getElementById('header-course-name').innerText = courseName.split(' ')[0];
    goToInterface(3);
}

function goBack() {
    playClick();
    if(state.history.length > 0) {
        state.futureHistory.push(state.currentView);
        loadViewDirect(state.history.pop());
    }
}
function goForward() {
    playClick();
    if(state.futureHistory.length > 0) {
        state.history.push(state.currentView);
        loadViewDirect(state.futureHistory.pop());
    }
}
function goHome() { state.history=[]; state.futureHistory=[]; state.selectedCourse=null; goToInterface(2); }

function loadViewDirect(viewId) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-1').classList.add('hidden');
    if(viewId > 1) document.getElementById('global-header').classList.remove('hidden');
    if(viewId === 4) fetchAndRenderMembers();
    if(viewId === 7) fetchAndRenderYoutube();
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    state.currentView = viewId;
}

// ==========================================
// 4. GESTIÓN DE DATOS
// ==========================================

function fetchAndRenderMembers() {
    const list = document.getElementById('members-list');
    list.innerHTML = '';
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();

    db.collection("members")
        .where("courseId", "==", state.selectedCourse)
        .where("category", "==", state.currentCategory)
        .get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const card = document.createElement('div');
                card.className = 'member-card filterable-item';
                
                const audioHtml = data.musicUrl ? 
                    `<audio controls src="${data.musicUrl}" class="member-audio"></audio>` : 
                    `<small style="color:#555">Sin música</small>`;

                card.innerHTML = `
                    <img src="${data.photoUrl || 'https://via.placeholder.com/100'}" class="member-photo">
                    <div class="member-details">
                        <h4>${data.name} ${data.last}</h4>
                        <p style="color:var(--gold)">${data.nick}</p>
                        <p style="font-size:0.8rem">${data.prof}</p>
                        ${audioHtml}
                    </div>
                    ${state.isModerator ? `
                    <div class="card-actions">
                        <button class="action-btn" onclick="openEditModal('${doc.id}')"><i class="fas fa-pen"></i></button>
                        <button class="action-btn" onclick="deleteItem('members', '${doc.id}')"><i class="fas fa-trash"></i></button>
                    </div>` : ''}
                `;
                list.appendChild(card);
            });
        });
}

function saveMemberChanges() {
    const btn = document.querySelector('.btn-confirm');
    btn.disabled = true;

    // Obtenemos los valores de los campos
    const name = document.getElementById('edit-name').value;
    const last = document.getElementById('edit-last').value;
    const nick = document.getElementById('edit-nick').value;
    const prof = document.getElementById('edit-prof').value;
    
    // Obtenemos las URLs de los campos ocultos (llenados por el widget)
    let photoUrl = document.getElementById('url-photo').value;
    let musicUrl = document.getElementById('url-music').value;

    // Si no subió foto nueva y estamos editando, intenta no perder la anterior 
    // (Nota: En un sistema real deberíamos leer el documento actual primero, aquí asumimos que el usuario sube algo o se queda el placeholder si es nuevo)
    if(!photoUrl && !state.editingId) photoUrl = 'https://via.placeholder.com/100';

    const memberData = {
        name, last, nick, prof,
        courseId: state.selectedCourse,
        category: state.currentCategory
    };

    // Solo agregamos las URLs si existen, para no borrar datos antiguos al editar
    if(photoUrl) memberData.photoUrl = photoUrl;
    if(musicUrl) memberData.musicUrl = musicUrl;

    let promise;
    if(state.editingId) {
        promise = db.collection("members").doc(state.editingId).set(memberData, {merge: true});
    } else {
        promise = db.collection("members").add(memberData);
    }

    promise.then(() => {
        showToast("Datos guardados correctamente");
        closeModal('edit-member-modal');
        fetchAndRenderMembers();
        btn.disabled = false;
    }).catch(err => {
        console.error(err);
        showToast("Error al guardar", "error");
        btn.disabled = false;
    });
}

// ... (Resto de funciones: YouTube, Delete, Modales, Login son iguales al anterior) ...

// ==========================================
// 5. UTILIDADES Y MODALES RESTANTES
// ==========================================

function openEditModal(id) {
    state.editingId = id;
    document.getElementById('edit-member-modal').classList.remove('hidden');
    // Limpiar status
    document.getElementById('status-photo').innerText = "Sin archivo...";
    document.getElementById('status-photo').style.color = "#aaa";
    document.getElementById('status-music').innerText = "Sin archivo...";
    document.getElementById('status-music').style.color = "#aaa";
    
    if(!id) {
        document.getElementById('edit-name').value = '';
        document.getElementById('url-photo').value = '';
        document.getElementById('url-music').value = '';
        // limpiar otros campos...
    }
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function showToast(msg, type='success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.background = type === 'error' ? '#dc3545' : '#28a745';
    toast.style.color = 'white'; toast.style.padding = '15px'; toast.style.marginTop = '10px';
    toast.innerText = msg; container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function handleModeratorClick(e) {
    e.preventDefault();
    if(!document.getElementById('mod-checkbox').checked) {
        document.getElementById('password-modal').classList.remove('hidden');
    } else {
        document.getElementById('mod-checkbox').checked = false;
        state.isModerator = false;
        updateUI();
    }
}
function verifyPassword() {
    if(document.getElementById('admin-pass-input').value === 'admin2') {
        state.isModerator = true;
        document.getElementById('mod-checkbox').checked = true;
        closeModal('password-modal');
        updateUI();
        showToast("Modo Admin Activado");
    } else { showToast("Clave incorrecta", "error"); }
}
function updateUI() {
    document.querySelectorAll('.fab').forEach(el => el.classList.toggle('hidden', !state.isModerator));
    if(state.currentView === 4) fetchAndRenderMembers();
}
function filterContent() {
    const term = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.filterable-item').forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
    });
}
function deleteItem(collection, id) {
    if(confirm("¿Eliminar?")) {
        db.collection(collection).doc(id).delete().then(() => fetchAndRenderMembers());
    }
}
function fetchAndRenderYoutube() { /* ... Lógica existente ... */ }
function saveYoutubeVideo() { /* ... Lógica existente ... */ }
function addAlbum() { /* ... Lógica Cloudinary para álbumes ... */ }
function addContent() { /* ... Lógica Cloudinary para galería ... */ }
function addWinner() { /* ... Lógica Cloudinary para ganadores ... */ }