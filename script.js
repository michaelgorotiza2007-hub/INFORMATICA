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
    cloudName: 'db2pcykq3', // <<< REEMPLAZA CON TU CLOUD NAME
    uploadPreset: 'informatica' // <<< REEMPLAZA CON TU PRESET
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
    if(viewId > 2 && !state.selectedCourse) { showToast("Seleccione curso", "error"); return; }
    
    if(state.currentView !== viewId) { state.history.push(state.currentView); state.futureHistory = []; }
    
    // Configuración específica según vista
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    document.getElementById('loading-screen').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        // Header
        const header = document.getElementById('global-header');
        if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');
        
        // Search Bar (Solo en vistas relevantes)
        const searchBox = document.getElementById('search-bar-container');
        if([3,4,5,6,8,10].includes(viewId)) searchBox.classList.remove('hidden'); else searchBox.classList.add('hidden');

        // Renders
        if(viewId === 4) fetchAndRenderMembers();
        if(viewId === 5) fetchAndRenderAlbums();
        if(viewId === 6) fetchAndRenderGallery(); // Dentro de álbum
        if(viewId === 7) fetchAndRenderYoutube();
        if(viewId === 8) fetchAndRenderAwardCategories();
        if(viewId === 10) fetchAndRenderNominees();

        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        state.currentView = viewId;
        updateUI();
    }, 500);
}

function selectCourse(name) {
    state.selectedCourse = name;
    document.getElementById('header-course-name').innerText = name.split(' ')[0];
    goToInterface(3);
}

// ================= LÓGICA DE DATOS (CRUD) =================

// --- 1. MIEMBROS & BÚSQUEDA ---
function fetchAndRenderMembers() {
    const list = document.getElementById('members-list');
    list.innerHTML = '';
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();

    db.collection("members")
        .where("courseId", "==", state.selectedCourse)
        .where("category", "==", state.currentCategory)
        .get().then(snap => {
            snap.forEach(doc => {
                const d = doc.data();
                const card = document.createElement('div');
                card.className = 'member-card filterable-item';
                // DATOS OCULTOS PARA BÚSQUEDA
                card.dataset.search = `${d.name} ${d.last} ${d.nick} ${d.prof} ${d.musicName || ''}`.toLowerCase();
                
                const audioPlayer = d.musicUrl ? `<audio controls src="${d.musicUrl}" style="height:30px;width:100%;margin-top:5px;"></audio>` : '';
                const musicText = d.musicName ? `<p style="font-size:0.8rem; color:#aaa"><i class="fas fa-music"></i> ${d.musicName}</p>` : '';

                card.innerHTML = `
                    <img src="${d.photoUrl || 'https://via.placeholder.com/100'}" class="member-photo">
                    <div class="member-info">
                        <h4>${d.name} ${d.last}</h4>
                        <p style="color:var(--gold)">${d.nick}</p>
                        <p>${d.prof}</p>
                        ${musicText}
                        ${audioPlayer}
                    </div>
                    ${state.isModerator ? `<div class="card-actions"><button class="action-btn" onclick="openEditModal('${doc.id}')"><i class="fas fa-pen"></i></button><button class="action-btn" onclick="deleteItem('members','${doc.id}')"><i class="fas fa-trash"></i></button></div>`:''}
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
    const musicName = document.getElementById('edit-music-name').value;
    let photoUrl = document.getElementById('url-photo').value;
    let musicUrl = document.getElementById('url-music').value;

    if(!photoUrl && !state.editingId) photoUrl = 'https://via.placeholder.com/100';

    const data = { name, last, nick, prof, musicName, courseId: state.selectedCourse, category: state.currentCategory };
    if(photoUrl) data.photoUrl = photoUrl;
    if(musicUrl) data.musicUrl = musicUrl;

    const promise = state.editingId ? db.collection("members").doc(state.editingId).set(data, {merge:true}) : db.collection("members").add(data);
    promise.then(() => { showToast("Guardado"); closeModal('edit-member-modal'); fetchAndRenderMembers(); });
}

// --- 2. ÁLBUMES & GALERÍA ---
function saveAlbum() {
    const name = document.getElementById('album-name-input').value;
    const coverUrl = document.getElementById('url-album-cover').value || 'https://via.placeholder.com/200';
    if(!name) return showToast("Nombre requerido", "error");
    
    db.collection("albums").add({ name, coverUrl, courseId: state.selectedCourse, type: state.currentCategory }).then(() => {
        showToast("Álbum creado"); closeModal('album-modal'); fetchAndRenderAlbums();
    });
}

function fetchAndRenderAlbums() {
    const list = document.getElementById('album-list'); list.innerHTML = '';
    document.getElementById('view-5-title').innerText = "ÁLBUMES (" + state.currentCategory.toUpperCase() + ")";
    
    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'album-card filterable-item'; div.dataset.search = d.name.toLowerCase();
            div.innerHTML = `<img src="${d.coverUrl}" class="album-cover"><h4>${d.name}</h4>`;
            div.onclick = () => openAlbumContent(doc.id, d.name);
            list.appendChild(div);
        });
    });
}

function openAlbumContent(albumId, albumName) {
    state.currentAlbumId = albumId;
    document.getElementById('view-6-title').innerText = albumName;
    goToInterface(6);
}

function uploadMediaToAlbum() {
    openCloudinaryWidget('auto', (url) => { // 'auto' allows video and image
        db.collection("media").add({ albumId: state.currentAlbumId, url: url, courseId: state.selectedCourse }).then(() => {
            showToast("Archivo subido"); fetchAndRenderGallery();
        });
    });
}

function fetchAndRenderGallery() {
    const list = document.getElementById('gallery-list'); list.innerHTML = '';
    db.collection("media").where("albumId", "==", state.currentAlbumId).get().then(snap => {
        snap.forEach(doc => {
            const url = doc.data().url;
            const isVideo = url.endsWith('mp4') || url.endsWith('mov') || url.includes('video');
            const item = document.createElement('div');
            
            if(isVideo) {
                item.innerHTML = `<div class="gallery-video-wrapper"><video src="${url}"></video><div class="play-overlay"><i class="fas fa-play-circle"></i></div></div>`;
            } else {
                item.innerHTML = `<img src="${url}" class="gallery-item">`;
            }
            // Simple lightbox logic could go here
            item.onclick = () => window.open(url, '_blank');
            list.appendChild(item);
        });
    });
}

// --- 3. PREMIOS (CATEGORÍAS Y NOMINADOS) ---
function saveCategory() {
    const name = document.getElementById('cat-name-input').value;
    const cover = document.getElementById('url-cat-cover').value;
    db.collection("award_categories").add({ name, cover, courseId: state.selectedCourse }).then(() => {
        showToast("Categoría creada"); closeModal('category-modal'); fetchAndRenderAwardCategories();
    });
}

function fetchAndRenderAwardCategories() {
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_categories").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'course-card-3d filterable-item'; div.dataset.search = d.name.toLowerCase();
            // Reuse course card style but smaller or adapted
            div.style.backgroundImage = `url(${d.cover})`; 
            div.style.backgroundSize = 'cover';
            div.innerHTML = `<div class="card-content" style="background:rgba(0,0,0,0.7);width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><h2>${d.name}</h2></div>`;
            div.onclick = () => openAwardCategory(doc.id, d.name);
            list.appendChild(div);
        });
    });
}

function openAwardCategory(catId, catName) {
    state.currentAwardCategoryId = catId;
    document.getElementById('category-title-display').innerText = catName;
    goToInterface(10);
}

function saveNominee() {
    const name = document.getElementById('nominee-name').value;
    const photo = document.getElementById('url-nominee').value;
    const type = document.getElementById('nominee-type').value; // 'nominee' or 'winner'
    
    db.collection("awards").add({ 
        categoryId: state.currentAwardCategoryId, 
        name, photo, type, 
        courseId: state.selectedCourse 
    }).then(() => {
        showToast("Guardado"); closeModal('nominee-modal'); fetchAndRenderNominees();
    });
}

function fetchAndRenderNominees() {
    const noms = document.getElementById('col-nominados'); noms.innerHTML = '';
    const winner = document.getElementById('col-ganadores'); winner.innerHTML = '';
    
    db.collection("awards").where("categoryId", "==", state.currentAwardCategoryId).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'nominee') {
                noms.innerHTML += `<div class="nominee-card"><img src="${d.photo}" class="nominee-img"><span>${d.name}</span></div>`;
            } else {
                winner.innerHTML = `<img src="${d.photo}" class="winner-img-large"><h3>${d.name}</h3>`;
            }
        });
    });
}

// --- 4. BÚSQUEDA GLOBAL ---
function filterContent() {
    const term = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.filterable-item').forEach(item => {
        const keywords = item.dataset.search || "";
        item.style.display = keywords.includes(term) ? "flex" : "none"; // flex or block depending on item
        // Fix for specific layouts like grid
        if(item.classList.contains('member-card')) item.style.display = keywords.includes(term) ? "flex" : "none";
        else if(item.classList.contains('course-card-3d')) item.style.display = keywords.includes(term) ? "flex" : "none";
        else if(item.classList.contains('album-card')) item.style.display = keywords.includes(term) ? "block" : "none";
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

function openEditModal(id) { 
    state.editingId = id; document.getElementById('edit-member-modal').classList.remove('hidden'); 
    document.getElementById('status-photo').innerText = "Sin archivo"; document.getElementById('status-music').innerText = "Sin archivo";
    if(!id) { document.getElementById('edit-name').value = ''; document.getElementById('url-photo').value = ''; }
}
function openAlbumModal() { document.getElementById('album-modal').classList.remove('hidden'); }
function openCategoryModal() { document.getElementById('category-modal').classList.remove('hidden'); }
function openNomineeModal(type) { 
    document.getElementById('nominee-modal').classList.remove('hidden'); 
    document.getElementById('nominee-type').value = type;
    document.getElementById('nominee-modal-title').innerText = type === 'winner' ? "AGREGAR GANADOR" : "AGREGAR NOMINADO";
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg, type='success') {
    const c = document.getElementById('toast-container'); const t = document.createElement('div');
    t.style.cssText = `background:${type==='error'?'#d00':'#0a0'};padding:15px;color:white;margin-top:10px;border-radius:5px;`;
    t.innerText = msg; c.appendChild(t); setTimeout(() => t.remove(), 4000);
}

// Listeners Botones Upload
document.addEventListener('DOMContentLoaded', () => {
    const bindUpload = (btnId, inputId, statusId, type) => {
        const btn = document.getElementById(btnId);
        if(btn) btn.onclick = () => openCloudinaryWidget(type, (url) => {
            document.getElementById(inputId).value = url;
            document.getElementById(statusId).innerText = "¡Cargado!";
            document.getElementById(statusId).style.color = "#00f3ff";
        });
    };
    bindUpload('btn-upload-photo', 'url-photo', 'status-photo', 'image');
    bindUpload('btn-upload-music', 'url-music', 'status-music', 'video'); // Cloudinary usa video para audio
    bindUpload('btn-upload-album-cover', 'url-album-cover', 'status-album-cover', 'image');
    bindUpload('btn-upload-cat-cover', 'url-cat-cover', 'status-cat-cover', 'image');
    bindUpload('btn-upload-nominee', 'url-nominee', 'status-nominee', 'image');
});

// Moderador
function handleModeratorClick(e) {
    e.preventDefault();
    if(state.isModerator) {
        state.isModerator = false; document.querySelector('.toggle-wrapper').classList.remove('toggle-active');
        updateUI(); showToast("Modo Admin OFF");
    } else {
        document.getElementById('password-modal').classList.remove('hidden');
    }
}
function verifyPassword() {
    if(document.getElementById('admin-pass-input').value === 'admin2') {
        state.isModerator = true; document.querySelector('.toggle-wrapper').classList.add('toggle-active');
        closeModal('password-modal'); updateUI(); showToast("Modo Admin ON");
    } else { showToast("Clave incorrecta", "error"); }
}
function updateUI() {
    const disp = state.isModerator;
    document.querySelectorAll('.fab').forEach(el => el.classList.toggle('hidden', !disp));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !disp));
    document.getElementById('video-controls').classList.toggle('hidden', !disp);
    if(state.currentView===4) fetchAndRenderMembers();
    if(state.currentView===5) fetchAndRenderAlbums();
}
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); loadDirect(state.history.pop()); } }
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); loadDirect(state.futureHistory.pop()); } }
function goHome() { state.history=[]; goToInterface(2); }
function loadDirect(id) { 
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden')); 
    document.getElementById(`view-${id}`).classList.remove('hidden'); 
    state.currentView = id; 
}
function deleteItem(col, id) { if(confirm('¿Borrar?')) db.collection(col).doc(id).delete().then(() => fetchAndRenderMembers()); }
function saveYoutubeVideo() { 
    const url = document.getElementById('yt-url-input').value;
    db.collection("youtube").doc("video_" + state.selectedCourse).set({url}).then(() => { closeModal('youtube-modal'); fetchAndRenderYoutube(); });
}
function fetchAndRenderYoutube() {
    db.collection("youtube").doc("video_" + state.selectedCourse).get().then(doc => {
        if(doc.exists) {
            let vId = doc.data().url.split('v=')[1];
            if(vId) { const amp = vId.indexOf('&'); if(amp !== -1) vId = vId.substring(0, amp);
            document.getElementById('main-video-container').innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vId}" frameborder="0" allowfullscreen></iframe>`; }
        }
    });
}