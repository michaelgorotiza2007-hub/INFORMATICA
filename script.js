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

const cloudinaryConfig = {
    cloudName: 'db2pcykq3', // <<< TU CLOUD NAME AQUÍ
    uploadPreset: 'informatica' // <<< TU PRESET AQUÍ
};

// ================= ESTADO =================
const state = {
    currentView: 1,
    history: [],
    futureHistory: [],
    isModerator: false,
    selectedCourse: null,
    currentCategory: null,
    currentAlbumId: null,
    currentAwardCategoryId: null,
    editingId: null
};

// ================= NAVEGACIÓN =================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return showToast("Seleccione curso primero", "error");
    
    if(state.currentView !== viewId) {
        state.history.push(state.currentView);
        state.futureHistory = [];
    }
    
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    document.getElementById('loading-screen').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        const header = document.getElementById('global-header');
        if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');
        
        // Search bar logic
        const searchBox = document.getElementById('search-bar-container');
        if([3,4,5,6,8,10].includes(viewId)) searchBox.classList.remove('hidden'); else searchBox.classList.add('hidden');

        // Renderizado
        if(viewId === 4) fetchAndRenderMembers();
        if(viewId === 5) fetchAndRenderAlbums();
        if(viewId === 6) fetchAndRenderGallery();
        if(viewId === 7) fetchAndRenderYoutube();
        if(viewId === 8) fetchAndRenderAwardCategories();
        if(viewId === 10) fetchAndRenderNominees();

        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        // Efecto Fade In
        document.getElementById(`view-${viewId}`).classList.add('fade-in');
        
        state.currentView = viewId;
        updateUI();
    }, 600);
}

function selectCourse(name) {
    state.selectedCourse = name;
    document.getElementById('header-course-name').innerText = name.split(' ')[0];
    goToInterface(3);
}

// ================= GUARDADO (Lógica Corregida Anteriormente) =================

// --- INTEGRANTES ---
function saveMemberChanges() {
    const btn = document.getElementById('btn-save-member');
    btn.innerText = "PROCESANDO..."; btn.disabled = true;

    const name = document.getElementById('edit-name').value;
    if(!name) { showToast("Nombre requerido", "error"); btn.innerText = "GUARDAR DATOS"; btn.disabled = false; return; }

    const data = {
        name: name,
        last: document.getElementById('edit-last').value,
        nick: document.getElementById('edit-nick').value,
        prof: document.getElementById('edit-prof').value,
        musicName: document.getElementById('edit-music-name').value,
        photoUrl: document.getElementById('url-photo').value || 'https://via.placeholder.com/100',
        musicUrl: document.getElementById('url-music').value,
        courseId: state.selectedCourse,
        category: state.currentCategory
    };

    const promise = state.editingId ? db.collection("members").doc(state.editingId).set(data, {merge:true}) : db.collection("members").add(data);

    promise.then(() => {
        showToast("Guardado con éxito");
        closeModal('edit-member-modal');
        fetchAndRenderMembers();
    }).catch(err => showToast("Error: " + err.message, "error"))
      .finally(() => { btn.innerText = "GUARDAR DATOS"; btn.disabled = false; });
}

// --- OTROS GUARDADOS ---
function saveAlbum() {
    const btn = document.getElementById('btn-save-album');
    const name = document.getElementById('album-name-input').value;
    if(!name) return showToast("Nombre requerido", "error");
    btn.innerText = "..."; btn.disabled = true;
    db.collection("albums").add({
        name: name, coverUrl: document.getElementById('url-album-cover').value || 'https://via.placeholder.com/200',
        courseId: state.selectedCourse, type: state.currentCategory
    }).then(() => { showToast("Álbum creado"); closeModal('album-modal'); fetchAndRenderAlbums(); })
      .finally(() => { btn.innerText = "CREAR"; btn.disabled = false; });
}

function saveCategory() {
    const btn = document.getElementById('btn-save-cat');
    const name = document.getElementById('cat-name-input').value;
    if(!name) return showToast("Nombre requerido", "error");
    btn.innerText = "..."; btn.disabled = true;
    db.collection("award_categories").add({ name, cover: document.getElementById('url-cat-cover').value, courseId: state.selectedCourse })
    .then(() => { showToast("Categoría creada"); closeModal('category-modal'); fetchAndRenderAwardCategories(); })
    .finally(() => { btn.innerText = "CREAR"; btn.disabled = false; });
}

function saveNominee() {
    const btn = document.getElementById('btn-save-nominee');
    const name = document.getElementById('nominee-name').value;
    if(!name) return showToast("Nombre requerido", "error");
    btn.innerText = "..."; btn.disabled = true;
    db.collection("awards").add({
        name, photo: document.getElementById('url-nominee').value, type: document.getElementById('nominee-type').value,
        categoryId: state.currentAwardCategoryId, courseId: state.selectedCourse
    }).then(() => { showToast("Agregado"); closeModal('nominee-modal'); fetchAndRenderNominees(); })
    .finally(() => { btn.innerText = "GUARDAR"; btn.disabled = false; });
}

function saveYoutubeVideo() {
    const url = document.getElementById('yt-url-input').value;
    if(!url) return showToast("URL requerida", "error");
    db.collection("youtube").doc("video_" + state.selectedCourse).set({ url: url }).then(() => {
        showToast("Video actualizado"); closeModal('youtube-modal'); fetchAndRenderYoutube();
    });
}

// ================= RENDERIZADO =================
function fetchAndRenderMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();
    
    db.collection("members").where("courseId","==",state.selectedCourse).where("category","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const card = document.createElement('div');
            card.className = 'member-card filterable-item';
            card.dataset.search = `${d.name} ${d.nick} ${d.prof} ${d.musicName || ''}`.toLowerCase();
            
            const audioHTML = d.musicUrl ? `<audio controls src="${d.musicUrl}" style="width:100%;height:30px;margin-top:10px; opacity:0.7"></audio>` : '';
            
            card.innerHTML = `
                <img src="${d.photoUrl}" class="member-photo">
                <div class="member-info">
                    <h4>${d.name} ${d.last}</h4>
                    <p class="highlight-text">${d.nick}</p>
                    <p>${d.prof}</p>
                    ${d.musicName ? `<p style="font-size:0.8rem;color:#888; margin-top:5px;"><i class="fas fa-music"></i> ${d.musicName}</p>` : ''}
                    ${audioHTML}
                </div>
                ${state.isModerator ? `<div class="action-buttons"><button class="btn-mini" onclick="openEditModal('${doc.id}')"><i class="fas fa-pen"></i></button><button class="btn-mini danger" onclick="deleteItem('members','${doc.id}')"><i class="fas fa-trash"></i></button></div>` : ''}
            `;
            list.appendChild(card);
        });
    });
}

function fetchAndRenderAlbums() {
    const list = document.getElementById('album-list'); list.innerHTML = '';
    document.getElementById('view-5-title').innerText = "ÁLBUMES (" + state.currentCategory.toUpperCase() + ")";
    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'album-card filterable-item'; div.dataset.search = d.name.toLowerCase();
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
            const isVideo = url.endsWith('mp4') || url.includes('video');
            const item = document.createElement('div');
            if(isVideo) item.innerHTML = `<video src="${url}" class="gallery-item" controls></video>`;
            else item.innerHTML = `<img src="${url}" class="gallery-item">`;
            list.appendChild(item);
        });
    });
}

function fetchAndRenderAwardCategories() {
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_categories").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'card-3d filterable-item'; div.dataset.search = d.name.toLowerCase();
            div.innerHTML = `<div class="card-3d-content" style="background:url(${d.cover}) center/cover;"><div style="background:rgba(0,0,0,0.7);width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><h2>${d.name}</h2></div></div>`;
            div.onclick = () => { state.currentAwardCategoryId = doc.id; document.getElementById('category-title-display').innerText = d.name; goToInterface(10); };
            list.appendChild(div);
        });
    });
}

function fetchAndRenderNominees() {
    const noms = document.getElementById('col-nominados'); noms.innerHTML = '';
    const winner = document.getElementById('col-ganadores'); winner.innerHTML = '';
    db.collection("awards").where("categoryId","==",state.currentAwardCategoryId).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'nominee') noms.innerHTML += `<div class="nominee-card glass-effect" style="padding:10px; margin-bottom:10px; display:flex; align-items:center; gap:10px;"><img src="${d.photo}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;"><span>${d.name}</span></div>`;
            else winner.innerHTML = `<img src="${d.photo}" style="width:150px;height:150px;border-radius:50%;border:4px solid #D4AF37;display:block;margin:0 auto;"> <h3 style="text-align:center;margin-top:10px;color:#D4AF37;">${d.name}</h3>`;
        });
    });
}

function fetchAndRenderYoutube() {
    db.collection("youtube").doc("video_" + state.selectedCourse).get().then(doc => {
        if(doc.exists) {
            let id = doc.data().url.split('v=')[1];
            if(id) { const amp = id.indexOf('&'); if(amp!==-1) id=id.substring(0,amp);
            document.getElementById('main-video-container').innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`; }
        }
    });
}

// ================= UTILIDADES =================
function openCloudinaryWidget(type, callback) {
    cloudinary.createUploadWidget({
        cloudName: cloudinaryConfig.cloudName, uploadPreset: cloudinaryConfig.uploadPreset,
        sources: ['local', 'url'], resourceType: type, multiple: false, theme: "minimal"
    }, (error, result) => { 
        if (!error && result && result.event === "success") callback(result.info.secure_url);
    }).open();
}

// Listeners Botones
document.addEventListener('DOMContentLoaded', () => {
    const bindBtn = (btnId, inputId, statusId, type) => {
        const b = document.getElementById(btnId);
        if(b) b.onclick = () => openCloudinaryWidget(type, (url) => {
            document.getElementById(inputId).value = url;
            document.getElementById(statusId).innerText = "¡Cargado!";
            document.getElementById(statusId).style.color = "#00F3FF";
            document.getElementById(statusId).classList.add('glow-text');
        });
    };
    bindBtn('btn-upload-photo', 'url-photo', 'status-photo', 'image');
    bindBtn('btn-upload-music', 'url-music', 'status-music', 'video');
    bindBtn('btn-upload-album-cover', 'url-album-cover', 'status-album-cover', 'image');
    bindBtn('btn-upload-cat-cover', 'url-cat-cover', 'status-cat-cover', 'image');
    bindBtn('btn-upload-nominee', 'url-nominee', 'status-nominee', 'image');
});

// Helpers
function openEditModal(id) {
    state.editingId = id; document.getElementById('edit-member-modal').classList.remove('hidden');
    document.getElementById('status-photo').innerText = "Sin foto";
    if(!id) { document.getElementById('edit-name').value = ''; document.getElementById('url-photo').value = ''; }
}
function openAlbumModal() { document.getElementById('album-modal').classList.remove('hidden'); }
function openCategoryModal() { document.getElementById('category-modal').classList.remove('hidden'); }
function openNomineeModal(type) { document.getElementById('nominee-modal').classList.remove('hidden'); document.getElementById('nominee-type').value = type; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg, type='success') {
    const t = document.createElement('div'); t.style.cssText = `background:${type==='error'?'#d00':'#0a0'};color:white;padding:15px;margin-top:10px;border-radius:5px;box-shadow:0 5px 15px black;`;
    t.innerText = msg; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 4000);
}
function filterContent() {
    const term = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.filterable-item').forEach(el => {
        el.style.display = (el.dataset.search || "").includes(term) ? "flex" : "none";
    });
}
function handleModeratorClick(e) { e.preventDefault(); if(state.isModerator) { state.isModerator=false; updateUI(); } else { document.getElementById('password-modal').classList.remove('hidden'); } }
function verifyPassword() { if(document.getElementById('admin-pass-input').value === 'admin2') { state.isModerator=true; closeModal('password-modal'); updateUI(); showToast("Modo Admin Activado"); } else showToast("Clave incorrecta","error"); }
function updateUI() {
    const disp = state.isModerator;
    document.querySelectorAll('.fab').forEach(el => el.classList.toggle('hidden', !disp));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !disp));
    document.getElementById('video-controls').classList.toggle('hidden', !disp);
    document.getElementById('mod-checkbox').checked = disp;
    if(state.currentView===4) fetchAndRenderMembers();
}
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); loadDirect(state.history.pop()); } }
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); loadDirect(state.futureHistory.pop()); } }
function goHome() { state.history=[]; goToInterface(2); }
function loadDirect(id) { document.querySelectorAll('section').forEach(el=>el.classList.add('hidden')); document.getElementById(`view-${id}`).classList.remove('hidden'); state.currentView=id; }
function deleteItem(col, id) { if(confirm("¿Eliminar?")) db.collection(col).doc(id).delete().then(() => updateUI()); }
function uploadMediaToAlbum() {
    openCloudinaryWidget('auto', (url) => {
        db.collection("media").add({ albumId: state.currentAlbumId, url, courseId: state.selectedCourse }).then(() => { showToast("Subido"); fetchAndRenderGallery(); });
    });
}