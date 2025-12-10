// ================= 1. CONFIGURACIÓN =================
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

// ================= 2. ESTADO =================
const state = {
    currentView: 1, history: [], futureHistory: [],
    isModerator: false, selectedCourse: null, currentCategory: null,
    currentAlbumId: null, currentAwardCategoryId: null, editingId: null
};

// ================= 3. NAVEGACIÓN =================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return showToast("⚠️ Selecciona un curso primero", "error");
    
    if(state.currentView !== viewId) { state.history.push(state.currentView); state.futureHistory = []; }
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    document.getElementById('loading-screen').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        // Header
        const header = document.getElementById('global-header');
        if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');
        
        // Search Bar (Solo en Dashboard - View 3)
        const searchBox = document.getElementById('search-bar-container');
        if(viewId === 3) {
            searchBox.classList.remove('hidden');
            // Reset search state
            document.getElementById('search-input').value = '';
            document.getElementById('dashboard-menu').classList.remove('hidden');
            document.getElementById('global-search-results').classList.add('hidden');
        } else {
            searchBox.classList.add('hidden');
        }

        // Renderizado
        if(viewId === 4) fetchAndRenderMembers();
        if(viewId === 5) fetchAndRenderAlbums();
        if(viewId === 6) fetchAndRenderGallery();
        if(viewId === 7) fetchAndRenderYoutube();
        if(viewId === 8) fetchAndRenderAwardCategories(); // Flujo Video -> Categorías
        if(viewId === 10) fetchAndRenderNominees(); // Flujo Categoría -> Detalle

        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        document.getElementById(`view-${viewId}`).classList.add('fade-in');
        state.currentView = viewId;
        updateUI();
    }, 500);
}

function selectCourse(name) {
    state.selectedCourse = name;
    document.getElementById('header-course-name').innerText = name.split(' ')[0];
    goToInterface(3);
}

// ================= 4. BÚSQUEDA GLOBAL INTELIGENTE (DASHBOARD) =================
function handleGlobalSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const menu = document.getElementById('dashboard-menu');
    const resultsContainer = document.getElementById('global-search-results');
    const list = document.getElementById('search-results-list');
    const noResults = document.getElementById('no-results-msg');

    if(term.length < 2) {
        menu.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        return;
    }

    menu.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    list.innerHTML = '';
    
    // Realizar búsqueda en múltiples colecciones (Simulación de búsqueda global eficiente)
    let found = false;

    // 1. Buscar en Miembros
    db.collection("members").where("courseId", "==", state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const fullName = `${d.name} ${d.last} ${d.nick} ${d.musicName || ''}`.toLowerCase();
            if(fullName.includes(term)) {
                found = true;
                const div = document.createElement('div');
                div.className = 'member-card'; // Reutilizamos estilo
                div.innerHTML = `
                    <img src="${d.photoUrl}" class="member-photo" style="width:60px;height:60px;">
                    <div>
                        <h4>${d.name} ${d.last} <span class="result-tag">Integrante</span></h4>
                        <p>${d.nick}</p>
                    </div>`;
                list.appendChild(div);
            }
        });

        // 2. Buscar en Premios (Categorías)
        return db.collection("award_categories").where("courseId", "==", state.selectedCourse).get();
    }).then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.name.toLowerCase().includes(term)) {
                found = true;
                const div = document.createElement('div');
                div.className = 'album-card'; // Reutilizamos estilo tarjeta
                div.style.padding = '10px';
                div.innerHTML = `<h4 style="color:var(--gold);"><i class="fas fa-trophy"></i> ${d.name} <span class="result-tag">Premio</span></h4>`;
                div.onclick = () => { state.currentAwardCategoryId = doc.id; document.getElementById('category-title-display').innerText = d.name; goToInterface(10); };
                list.appendChild(div);
            }
        });
        
        // Mostrar mensaje si no hay nada
        if(!found && list.children.length === 0) noResults.classList.remove('hidden');
        else noResults.classList.add('hidden');
    });
}

// ================= 5. GUARDADO (CORREGIDO Y OPTIMIZADO) =================

// GUARDAR INTEGRANTE
function saveMemberChanges() {
    const btn = document.getElementById('btn-save-member');
    const name = document.getElementById('edit-name').value;
    if(!name) return showToast("⚠️ Nombre requerido", "error");
    
    btn.innerText = "Guardando..."; btn.disabled = true;

    const data = {
        name: name,
        last: document.getElementById('edit-last').value,
        nick: document.getElementById('edit-nick').value,
        prof: document.getElementById('edit-prof').value,
        musicName: document.getElementById('edit-music-name').value,
        photoUrl: document.getElementById('url-photo-input').value || 'https://via.placeholder.com/150',
        musicUrl: document.getElementById('local-audio-file').value, // Solo el nombre del archivo
        courseId: state.selectedCourse,
        category: state.currentCategory
    };

    const action = state.editingId 
        ? db.collection("members").doc(state.editingId).set(data, {merge:true}) 
        : db.collection("members").add(data);

    action.then(() => { showToast("✅ Guardado"); closeModal('edit-member-modal'); fetchAndRenderMembers(); })
          .finally(() => { btn.innerText = "Guardar Perfil"; btn.disabled = false; });
}

// GUARDAR GENÉRICO (ÁLBUMES Y CATEGORÍAS)
function openGenericModal(type) {
    document.getElementById('generic-modal').classList.remove('hidden');
    document.getElementById('generic-type').value = type;
    document.getElementById('generic-modal-title').innerText = type === 'album' ? "NUEVO ÁLBUM" : "NUEVA CATEGORÍA";
    // Reset inputs...
    document.getElementById('generic-name-input').value = '';
    document.getElementById('generic-url-input').value = '';
    document.getElementById('preview-generic').src = 'https://via.placeholder.com/150';
}

function saveGenericItem() {
    const btn = document.getElementById('btn-save-generic');
    const type = document.getElementById('generic-type').value;
    const name = document.getElementById('generic-name-input').value;
    const cover = document.getElementById('generic-url-input').value || 'https://via.placeholder.com/150';
    
    if(!name) return showToast("Falta nombre", "error");
    btn.innerText = "..."; btn.disabled = true;

    const collection = type === 'album' ? 'albums' : 'award_categories';
    const payload = { name, courseId: state.selectedCourse };
    if(type === 'album') { payload.coverUrl = cover; payload.type = state.currentCategory; }
    else { payload.cover = cover; }

    db.collection(collection).add(payload).then(() => {
        showToast("✅ Creado");
        closeModal('generic-modal');
        if(type === 'album') fetchAndRenderAlbums();
        else fetchAndRenderAwardCategories();
    }).finally(() => { btn.innerText = "Crear"; btn.disabled = false; });
}

// GUARDAR NOMINADO/GANADOR
function saveNominee() {
    const name = document.getElementById('nominee-name').value;
    if(!name) return showToast("Falta nombre", "error");
    
    db.collection("awards").add({
        name,
        photo: document.getElementById('url-nominee-input').value || 'https://via.placeholder.com/100',
        type: document.getElementById('nominee-type').value,
        categoryId: state.currentAwardCategoryId,
        courseId: state.selectedCourse
    }).then(() => { showToast("Agregado"); closeModal('nominee-modal'); fetchAndRenderNominees(); });
}

// VIDEO Y MEDIA
function saveYoutubeVideo() {
    const url = document.getElementById('yt-url-input').value;
    db.collection("youtube").doc("video_" + state.selectedCourse).set({ url }).then(() => {
        showToast("Video actualizado"); closeModal('youtube-modal'); fetchAndRenderYoutube();
    });
}
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function saveMediaToAlbum() {
    const url = document.getElementById('media-url-input').value;
    if(!url) return showToast("Falta URL", "error");
    db.collection("media").add({ albumId: state.currentAlbumId, url, courseId: state.selectedCourse })
      .then(() => { showToast("Agregado"); closeModal('media-modal'); fetchAndRenderGallery(); });
}

// ================= 6. RENDERIZADO =================
function fetchAndRenderMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();
    
    db.collection("members").where("courseId","==",state.selectedCourse).where("category","==",state.currentCategory).get().then(snap => {
        if(snap.empty) list.innerHTML = `<p style="color:#666">No hay registros.</p>`;
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'member-card';
            
            // Audio Local: Asume que el archivo está en la misma carpeta o subcarpeta
            const audioHtml = d.musicUrl ? `<audio controls src="${d.musicUrl}" class="audio-player"></audio>` : '';

            div.innerHTML = `
                <img src="${d.photoUrl}" class="member-photo">
                <div class="member-info">
                    <h4>${d.name} ${d.last}</h4>
                    <p class="highlight-text">${d.nick}</p>
                    <p>${d.prof}</p>
                    ${d.musicName ? `<p style="font-size:0.8rem;color:#888;margin-top:5px;"><i class="fas fa-music"></i> ${d.musicName}</p>` : ''}
                    ${audioHtml}
                </div>
                ${state.isModerator ? `<div class="action-buttons"><button class="btn-mini" onclick="openEditModal('${doc.id}')"><i class="fas fa-pen"></i></button><button class="btn-mini danger" onclick="deleteItem('members','${doc.id}')"><i class="fas fa-trash"></i></button></div>`:''}
            `;
            list.appendChild(div);
        });
    });
}

function fetchAndRenderAwardCategories() {
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_categories").where("courseId","==",state.selectedCourse).get().then(snap => {
        if(snap.empty) list.innerHTML = `<p style="color:#666">No hay categorías.</p>`;
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'album-card'; // Reutilizamos estilo
            div.innerHTML = `<img src="${d.cover}" class="album-cover"><div class="album-title">${d.name}</div>`;
            div.onclick = () => { 
                state.currentAwardCategoryId = doc.id; 
                document.getElementById('category-title-display').innerText = d.name; 
                goToInterface(10); 
            };
            list.appendChild(div);
        });
    });
}

// Resto de funciones de renderizado (Albums, Youtube, Nominees) mantienen lógica similar pero actualizada visualmente
function fetchAndRenderAlbums() {
    const list = document.getElementById('album-list'); list.innerHTML = '';
    document.getElementById('view-5-title').innerText = "ÁLBUMES (" + state.currentCategory.toUpperCase() + ")";
    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'album-card';
            div.innerHTML = `<img src="${d.coverUrl}" class="album-cover"><div class="album-title">${d.name}</div>`;
            div.onclick = () => { state.currentAlbumId = doc.id; document.getElementById('view-6-title').innerText = d.name; goToInterface(6); };
            list.appendChild(div);
        });
    });
}

function fetchAndRenderGallery() {
    const list = document.getElementById('gallery-list'); list.innerHTML = '';
    db.collection("media").where("albumId","==",state.currentAlbumId).get().then(snap => {
        snap.forEach(doc => {
            const url = doc.data().url;
            const isVideo = url.includes('.mp4') || url.includes('video');
            const item = document.createElement('div');
            item.innerHTML = isVideo ? `<video src="${url}" class="gallery-item" controls></video>` : `<img src="${url}" class="gallery-item" onclick="window.open('${url}')">`;
            list.appendChild(item);
        });
    });
}

function fetchAndRenderNominees() {
    const n = document.getElementById('col-nominados'); n.innerHTML = '';
    const w = document.getElementById('col-ganadores'); w.innerHTML = '';
    db.collection("awards").where("categoryId","==",state.currentAwardCategoryId).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'nominee') n.innerHTML += `<div class="nominee-item"><img src="${d.photo}" class="nominee-img"><span>${d.name}</span></div>`;
            else w.innerHTML += `<div><img src="${d.photo}" class="winner-img-big"><h3 style="text-align:center;color:var(--gold)">${d.name}</h3></div>`;
        });
    });
}

function fetchAndRenderYoutube() {
    const c = document.getElementById('main-video-container');
    db.collection("youtube").doc("video_" + state.selectedCourse).get().then(doc => {
        if(doc.exists && doc.data().url) {
            let id = doc.data().url.split('v=')[1];
            if(id) {
                const amp = id.indexOf('&'); if(amp!==-1) id=id.substring(0,amp);
                c.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
            }
        }
    });
}

// ================= 7. UTILIDADES =================
function updatePreview(url, imgId) { if(url) document.getElementById(imgId).src = url; }
function openEditModal(id) { 
    state.editingId = id; document.getElementById('edit-member-modal').classList.remove('hidden');
    document.getElementById('preview-member').src = "https://via.placeholder.com/150";
    if(!id) { document.getElementById('edit-name').value = ''; document.getElementById('url-photo-input').value = ''; document.getElementById('local-audio-file').value = ''; }
}
function openNomineeModal(type) { document.getElementById('nominee-modal').classList.remove('hidden'); document.getElementById('nominee-type').value = type; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg, type='success') {
    const t = document.createElement('div'); t.style.cssText = `background:${type==='error'?'#d00':'#0a0'};color:white;padding:15px;margin-top:10px;border-radius:5px;box-shadow:0 5px 15px black;`;
    t.innerText = msg; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 4000);
}
// Admin
function handleModeratorClick(e) { e.preventDefault(); if(state.isModerator) { state.isModerator=false; updateUI(); } else { document.getElementById('password-modal').classList.remove('hidden'); } }
function verifyPassword() { if(document.getElementById('admin-pass-input').value === 'admin2') { state.isModerator=true; closeModal('password-modal'); updateUI(); } else showToast("Incorrecto","error"); }
function updateUI() {
    const disp = state.isModerator;
    document.querySelectorAll('.fab').forEach(el => el.classList.toggle('hidden', !disp));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !disp));
    document.getElementById('video-controls').classList.toggle('hidden', !disp);
    document.getElementById('mod-checkbox').checked = disp;
    if(state.currentView===4) fetchAndRenderMembers();
}
function deleteItem(col, id) { if(confirm("¿Eliminar?")) db.collection(col).doc(id).delete().then(()=>updateUI()); }
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); goToInterface(state.history.pop()); } } // Fixed back nav logic
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); goToInterface(state.futureHistory.pop()); } }
function goHome() { state.history=[]; goToInterface(2); }