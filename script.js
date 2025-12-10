// ==========================================
// 1. CONFIGURACIÓN
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

const cloudinaryConfig = {
    cloudName: 'db2pcykq3', // <<< TU CLOUD NAME
    uploadPreset: 'informatica' // <<< TU PRESET UNSIGNED
};

// ==========================================
// 2. ESTADO
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

// ==========================================
// 3. MANEJO DEL INTERRUPTOR MODERADOR (CORREGIDO)
// ==========================================
function handleModeratorClick(e) {
    // Detener propagación para manejarlo manualmente
    e.preventDefault(); 
    
    // Si ya es moderador, lo apagamos
    if(state.isModerator) {
        state.isModerator = false;
        // Quitar clase visual
        document.querySelector('.toggle-wrapper').classList.remove('toggle-active');
        document.getElementById('mod-checkbox').checked = false;
        showToast("Modo Admin Desactivado");
        updateUI();
    } else {
        // Si no es moderador, pedimos clave
        document.getElementById('password-modal').classList.remove('hidden');
        document.getElementById('admin-pass-input').value = '';
        document.getElementById('admin-pass-input').focus();
    }
}

function verifyPassword() {
    const input = document.getElementById('admin-pass-input');
    if(input.value === 'admin2') {
        state.isModerator = true;
        // Activar visualmente el switch
        document.querySelector('.toggle-wrapper').classList.add('toggle-active');
        document.getElementById('mod-checkbox').checked = true;
        
        closeModal('password-modal');
        showToast("¡Bienvenido Admin!", "success");
        updateUI();
    } else {
        showToast("Clave incorrecta", "error");
        input.value = '';
    }
}

// ==========================================
// 4. CLOUDINARY WIDGET
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Foto
    const btnPhoto = document.getElementById("btn-upload-photo");
    if(btnPhoto) btnPhoto.addEventListener("click", () => {
        openCloudinaryWidget('image', (url) => {
            document.getElementById('url-photo').value = url;
            document.getElementById('status-photo').innerText = "Imagen cargada";
            document.getElementById('status-photo').style.color = "#00f3ff";
        });
    }, false);

    // Audio
    const btnMusic = document.getElementById("btn-upload-music");
    if(btnMusic) btnMusic.addEventListener("click", () => {
        openCloudinaryWidget('video', (url) => {
            document.getElementById('url-music').value = url;
            document.getElementById('status-music').innerText = "Audio cargado";
            document.getElementById('status-music').style.color = "#00f3ff";
        });
    }, false);
});

function openCloudinaryWidget(type, callback) {
    const myWidget = cloudinary.createUploadWidget({
        cloudName: cloudinaryConfig.cloudName, 
        uploadPreset: cloudinaryConfig.uploadPreset,
        sources: ['local', 'url'],
        resourceType: type === 'image' ? 'image' : 'video', // Audio es video en Cloudinary
        multiple: false,
        theme: "minimal"
    }, (error, result) => { 
        if (!error && result && result.event === "success") { 
            callback(result.info.secure_url);
        }
    });
    myWidget.open();
}

// ==========================================
// 5. NAVEGACIÓN
// ==========================================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) {
        showToast("Seleccione un curso primero", "error"); return;
    }
    
    // Historial
    if(state.currentView !== viewId) {
        state.history.push(state.currentView);
        state.futureHistory = [];
    }
    
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    // Animación de carga
    document.getElementById('loading-screen').classList.remove('hidden');
    
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        // Header logic
        const header = document.getElementById('global-header');
        if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');
        
        // Renderizado
        if(viewId === 4) fetchAndRenderMembers();
        if(viewId === 7) fetchAndRenderYoutube();
        
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        state.currentView = viewId;
        updateUI();
    }, 500);
}

function selectCourse(courseName) {
    state.selectedCourse = courseName;
    document.getElementById('header-course-name').innerText = courseName.split(' ')[0];
    goToInterface(3);
}

function goBack() {
    if(state.history.length > 0) {
        state.futureHistory.push(state.currentView);
        loadDirect(state.history.pop());
    }
}
function goForward() {
    if(state.futureHistory.length > 0) {
        state.history.push(state.currentView);
        loadDirect(state.futureHistory.pop());
    }
}
function goHome() { state.history=[]; state.futureHistory=[]; state.selectedCourse=null; goToInterface(2); }
function loadDirect(viewId) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-1').classList.add('hidden');
    if(viewId > 1) document.getElementById('global-header').classList.remove('hidden');
    if(viewId === 4) fetchAndRenderMembers();
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    state.currentView = viewId;
}

// ==========================================
// 6. RENDERIZADO & CRUD
// ==========================================
function fetchAndRenderMembers() {
    const list = document.getElementById('members-list');
    list.innerHTML = '';
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();

    db.collection("members")
        .where("courseId", "==", state.selectedCourse)
        .where("category", "==", state.currentCategory)
        .get().then((snap) => {
            snap.forEach((doc) => {
                const d = doc.data();
                const card = document.createElement('div');
                card.className = 'member-card filterable-item';
                
                const audioPlayer = d.musicUrl ? 
                    `<audio controls src="${d.musicUrl}" style="height:30px; width:100%; margin-top:5px;"></audio>` : '';

                card.innerHTML = `
                    <img src="${d.photoUrl || 'https://via.placeholder.com/100'}" class="member-photo">
                    <div class="member-info">
                        <h4>${d.name} ${d.last}</h4>
                        <p style="color:var(--gold)">${d.nick}</p>
                        <p style="font-size:0.8rem">${d.prof}</p>
                        ${audioPlayer}
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
    const name = document.getElementById('edit-name').value;
    const last = document.getElementById('edit-last').value;
    const nick = document.getElementById('edit-nick').value;
    const prof = document.getElementById('edit-prof').value;
    let photoUrl = document.getElementById('url-photo').value;
    let musicUrl = document.getElementById('url-music').value;

    if(!photoUrl && !state.editingId) photoUrl = 'https://via.placeholder.com/100';

    const data = { name, last, nick, prof, courseId: state.selectedCourse, category: state.currentCategory };
    if(photoUrl) data.photoUrl = photoUrl;
    if(musicUrl) data.musicUrl = musicUrl;

    const promise = state.editingId ? 
        db.collection("members").doc(state.editingId).set(data, {merge:true}) :
        db.collection("members").add(data);

    promise.then(() => {
        showToast("Guardado con éxito");
        closeModal('edit-member-modal');
        fetchAndRenderMembers();
    });
}

// Helpers
function openEditModal(id) {
    state.editingId = id;
    document.getElementById('edit-member-modal').classList.remove('hidden');
    document.getElementById('status-photo').innerText = "Sin archivo";
    document.getElementById('status-music').innerText = "Sin archivo";
    if(!id) {
        document.getElementById('edit-name').value = '';
        document.getElementById('url-photo').value = '';
        document.getElementById('url-music').value = '';
    }
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg, type='success') {
    const box = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.style.cssText = `background:${type==='error'?'#d00':'#0a0'};padding:15px;color:white;margin-top:10px;border-radius:5px;box-shadow:0 5px 15px black;`;
    t.innerText = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}
function updateUI() {
    document.querySelectorAll('.fab').forEach(el => el.classList.toggle('hidden', !state.isModerator));
    document.querySelectorAll('.admin-controls-center').forEach(el => el.classList.toggle('hidden', !state.isModerator));
    if(state.currentView===4) fetchAndRenderMembers();
}
function deleteItem(col, id) { if(confirm('¿Borrar?')) db.collection(col).doc(id).delete().then(()=>updateUI()); }