// ================= CONFIGURACIÓN =================
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

// ================= ESTADO & SONIDOS =================
const state = {
    currentView: 1, history: [], futureHistory: [],
    isAdmin: false, selectedCourse: null, currentCategory: null, currentAlbumId: null, currentAwardCategoryId: null
};

// Sonido Global
document.addEventListener('click', () => {
    const audio = document.getElementById('click-sound');
    if(audio) { audio.currentTime=0; audio.play().catch(e=>{}); }
});

// ================= NAVEGACIÓN =================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return alert("Selecciona un curso primero");
    
    if(state.currentView !== viewId) {
        state.history.push(state.currentView);
        state.futureHistory = [];
    }
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    // UI Updates
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-1').classList.add('hidden');
    
    const header = document.getElementById('global-header');
    if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');

    // Mostrar buscador solo en menú principal (View 3)
    const search = document.getElementById('search-container');
    if(viewId === 3) search.classList.remove('hidden'); else search.classList.add('hidden');

    // Renderizar
    if(viewId === 4) fetchMembers();
    if(viewId === 5) fetchAlbums(); // Fotos o Videos
    if(viewId === 6) fetchMedia();  // Contenido
    if(viewId === 7) fetchMainVideo();
    if(viewId === 8) fetchCategories();
    if(viewId === 10) fetchAwards();

    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    document.getElementById(`view-${viewId}`).classList.add('fade-in');
    state.currentView = viewId;
    updateAdminUI();
}

function selectCourse(name) {
    state.selectedCourse = name;
    document.getElementById('current-course-title').innerText = name.split(' ')[0];
    goToInterface(3);
}

// ================= BÚSQUEDA AVANZADA (ANIMACIÓN + LÓGICA) =================
function handleSearchKeyPress(e) {
    if(e.key === 'Enter') {
        const term = document.getElementById('search-input').value.toLowerCase();
        if(term.length < 2) return alert("Escribe más...");
        
        // 1. Mostrar Loader
        const loader = document.getElementById('search-loading-overlay');
        loader.classList.remove('hidden');

        // 2. Esperar 1.5s para efecto visual y ejecutar búsqueda
        setTimeout(() => {
            performSearch(term);
            loader.classList.add('hidden');
            
            // Si estamos en menú, mostrar panel resultados
            if(state.currentView === 3) {
                document.getElementById('main-menu').classList.add('hidden');
                document.getElementById('search-results-panel').classList.remove('hidden');
            }
        }, 1500);
    }
}

function performSearch(term) {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = '';
    
    // Buscar Integrantes
    db.collection("members").where("courseId", "==", state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.name.toLowerCase().includes(term)) {
                grid.innerHTML += `<div class="member-card"><h4>${d.name}</h4><p>Integrante</p></div>`;
            }
        });
    });
    // Buscar Álbumes
    db.collection("albums").where("courseId", "==", state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.name.toLowerCase().includes(term)) {
                grid.innerHTML += `<div class="album-item" style="padding:10px;color:white;"><h4>${d.name}</h4><p>Álbum</p></div>`;
            }
        });
    });
}

function closeSearch() {
    document.getElementById('search-results-panel').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('search-input').value = '';
}

// ================= ELIMINACIÓN EN CASCADA (ÁLBUM + CONTENIDO) =================
async function deleteAlbumAndContent(albumId) {
    if(!confirm("¿ELIMINAR ÁLBUM Y TODAS SUS FOTOS/VIDEOS?")) return;
    
    try {
        // 1. Obtener todas las fotos/videos del álbum
        const mediaQ = await db.collection("media").where("albumId", "==", albumId).get();
        const batch = db.batch();
        
        // 2. Preparar borrado de cada foto
        mediaQ.forEach(doc => batch.delete(doc.ref));
        
        // 3. Preparar borrado del álbum
        batch.delete(db.collection("albums").doc(albumId));
        
        // 4. Ejecutar todo junto
        await batch.commit();
        alert("Álbum eliminado correctamente");
        fetchAlbums();
    } catch(e) {
        alert("Error: " + e.message);
    }
}

function deleteMedia(id) {
    if(confirm("¿Eliminar archivo?")) {
        db.collection("media").doc(id).delete().then(() => fetchMedia());
    }
}

// ================= CRUD & RENDERIZADO =================

// CREAR/LEER ÁLBUMES
function createAlbum() {
    const name = document.getElementById('new-album-name').value;
    const cover = document.getElementById('new-album-cover').value || 'https://via.placeholder.com/150';
    if(!name) return alert("Falta nombre");
    
    db.collection("albums").add({
        name, coverUrl: cover, courseId: state.selectedCourse, type: state.currentCategory
    }).then(() => { closeModal('album-modal'); fetchAlbums(); });
}

function fetchAlbums() {
    const list = document.getElementById('albums-list'); list.innerHTML = '';
    document.getElementById('v5-title').innerText = state.currentCategory === 'fotos' ? 'FOTOS' : 'VIDEOS';
    
    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'album-item';
            div.innerHTML = `
                ${state.isAdmin ? `<button class="btn-delete-float" onclick="event.stopPropagation(); deleteAlbumAndContent('${doc.id}')"><i class="fas fa-trash"></i></button>` : ''}
                <img src="${d.coverUrl}" class="album-cover"><div class="album-title">${d.name}</div>
            `;
            div.onclick = () => { state.currentAlbumId = doc.id; document.getElementById('album-title-display').innerText = d.name; goToInterface(6); };
            list.appendChild(div);
        });
    });
}

// SUBIR/LEER MEDIA
function uploadMedia() {
    const url = document.getElementById('new-media-url').value;
    if(!url) return alert("URL requerida");
    db.collection("media").add({ albumId: state.currentAlbumId, url, courseId: state.selectedCourse }).then(() => {
        closeModal('media-modal'); fetchMedia();
    });
}

function fetchMedia() {
    const list = document.getElementById('media-list'); list.innerHTML = '';
    db.collection("media").where("albumId","==",state.currentAlbumId).get().then(snap => {
        snap.forEach(doc => {
            const url = doc.data().url;
            const div = document.createElement('div'); div.className = 'media-item';
            
            // Delete Btn
            const delBtn = state.isAdmin ? `<button class="btn-delete-float" onclick="event.stopPropagation(); deleteMedia('${doc.id}')"><i class="fas fa-trash"></i></button>` : '';

            if(url.includes('youtu')) {
                const id = url.split('v=')[1] || url.split('/').pop();
                div.innerHTML = `${delBtn}<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" frameborder="0"></iframe>`;
            } else {
                div.innerHTML = `${delBtn}<img src="${url}" style="width:100%;height:150px;object-fit:cover" onclick="window.open('${url}')">`;
            }
            list.appendChild(div);
        });
    });
}

// INTEGRANTES
function saveMember() {
    const name = document.getElementById('mem-name').value;
    if(!name) return alert("Falta nombre");
    const data = {
        name, last: document.getElementById('mem-last').value, nick: document.getElementById('mem-nick').value,
        prof: document.getElementById('mem-prof').value, photoUrl: document.getElementById('mem-photo').value || 'https://via.placeholder.com/150',
        musicUrl: document.getElementById('mem-music').value, courseId: state.selectedCourse, category: state.currentCategory
    };
    db.collection("members").add(data).then(()=>{ closeModal('member-modal'); fetchMembers(); });
}
function fetchMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('v4-title').innerText = state.currentCategory.toUpperCase();
    db.collection("members").where("courseId","==",state.selectedCourse).where("category","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="member-card">
                ${state.isAdmin ? `<button class="btn-delete-float" onclick="db.collection('members').doc('${doc.id}').delete().then(()=>fetchMembers())">X</button>` : ''}
                <img src="${d.photoUrl}" class="mem-pic">
                <div class="mem-info"><h4>${d.name}</h4><p>${d.nick}</p>${d.musicUrl ? '<i class="fab fa-youtube" style="color:red"></i>':''}</div>
            </div>`;
        });
    });
}

// VIDEO PRINCIPAL
function saveMainVideo() {
    const url = document.getElementById('main-video-input').value;
    db.collection("youtube").doc("main_"+state.selectedCourse).set({url}).then(()=>fetchMainVideo());
}
function fetchMainVideo() {
    db.collection("youtube").doc("main_"+state.selectedCourse).get().then(doc => {
        if(doc.exists && doc.data().url) {
            const id = doc.data().url.split('v=')[1];
            document.getElementById('main-video-box').innerHTML = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${id}" frameborder="0"></iframe>`;
        }
    });
}

// ================= UTILIDADES =================
function toggleAdmin() {
    if(state.isAdmin) { state.isAdmin=false; document.getElementById('admin-toggle').innerText="MODO ADMIN: OFF"; updateAdminUI(); }
    else document.getElementById('password-modal').classList.remove('hidden');
}
function verifyPassword() {
    if(document.getElementById('admin-pass-input').value === 'admin2') {
        state.isAdmin = true; closeModal('password-modal');
        document.getElementById('admin-toggle').innerText="MODO ADMIN: ON"; updateAdminUI();
    } else alert("Error");
}
function updateAdminUI() {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !state.isAdmin));
}
// Modales
function openAlbumModal() { document.getElementById('album-modal').classList.remove('hidden'); }
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function openMemberModal() { document.getElementById('member-modal').classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
// Historial
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); goToInterface(state.history.pop()); } }
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); goToInterface(state.futureHistory.pop()); } }
function goHome() { state.history=[]; goToInterface(2); }