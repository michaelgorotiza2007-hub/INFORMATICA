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

// ================= ESTADO =================
const state = {
    currentView: 1, history: [], futureHistory: [],
    isModerator: false, selectedCourse: null, currentCategory: null,
    currentAlbumId: null, currentAwardCategoryId: null, editingId: null
};

// ================= NAVEGACIÓN =================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return showToast("Seleccione curso primero", "error");
    if(state.currentView !== viewId) { state.history.push(state.currentView); state.futureHistory = []; }
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    document.getElementById('loading-screen').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        const header = document.getElementById('global-header');
        if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');
        
        const searchBox = document.getElementById('search-bar-container');
        if([3,4,5,6,8,10].includes(viewId)) searchBox.classList.remove('hidden'); else searchBox.classList.add('hidden');

        if(viewId === 4) fetchAndRenderMembers();
        if(viewId === 5) fetchAndRenderAlbums();
        if(viewId === 6) fetchAndRenderGallery();
        if(viewId === 7) fetchAndRenderYoutube();
        if(viewId === 8) fetchAndRenderAwardCategories();
        if(viewId === 10) fetchAndRenderNominees();

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

// ================= PREVISUALIZAR IMAGEN (NUEVO) =================
function previewImage(inputId, imgId) {
    const url = document.getElementById(inputId).value;
    if(url) document.getElementById(imgId).src = url;
}

// ================= GUARDADO (SIN WIDGET, SOLO INPUTS) =================

// INTEGRANTES
function saveMemberChanges() {
    const btn = document.getElementById('btn-save-member');
    const name = document.getElementById('edit-name').value;
    if(!name) return showToast("Nombre requerido", "error");
    
    btn.innerText = "GUARDANDO..."; btn.disabled = true;

    // Leemos directamente del input de texto de URL
    const photoUrl = document.getElementById('url-photo-input').value || 'https://via.placeholder.com/100';
    
    // Música: Nombre local del archivo (ej: audio1.mp3)
    const localAudioFile = document.getElementById('local-audio-file').value; 
    
    const data = {
        name: name,
        last: document.getElementById('edit-last').value,
        nick: document.getElementById('edit-nick').value,
        prof: document.getElementById('edit-prof').value,
        musicName: document.getElementById('edit-music-name').value,
        photoUrl: photoUrl,
        // Guardamos el nombre del archivo local, asumiendo que está en una carpeta 'audio/' o raiz
        musicUrl: localAudioFile ? localAudioFile : '', 
        courseId: state.selectedCourse, category: state.currentCategory
    };

    const promise = state.editingId ? db.collection("members").doc(state.editingId).set(data, {merge:true}) : db.collection("members").add(data);
    promise.then(() => { showToast("Guardado"); closeModal('edit-member-modal'); fetchAndRenderMembers(); })
           .catch(err => showToast("Error: " + err.message, "error"))
           .finally(() => { btn.innerText = "GUARDAR DATOS"; btn.disabled = false; });
}

// ÁLBUMES
function saveAlbum() {
    const btn = document.getElementById('btn-save-album');
    const name = document.getElementById('album-name-input').value;
    if(!name) return showToast("Falta nombre", "error");
    btn.innerText = "..."; btn.disabled = true;

    const coverUrl = document.getElementById('url-album-cover-input').value || 'https://via.placeholder.com/200';

    db.collection("albums").add({ name, coverUrl, courseId: state.selectedCourse, type: state.currentCategory })
      .then(() => { showToast("Creado"); closeModal('album-modal'); fetchAndRenderAlbums(); })
      .finally(() => { btn.innerText = "CREAR"; btn.disabled = false; });
}

// MEDIA A ÁLBUM (Link directo)
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function saveMediaToAlbum() {
    const url = document.getElementById('media-url-input').value;
    if(!url) return showToast("URL requerida", "error");
    db.collection("media").add({ albumId: state.currentAlbumId, url, courseId: state.selectedCourse })
      .then(() => { showToast("Agregado"); closeModal('media-modal'); fetchAndRenderGallery(); });
}

// CATEGORÍAS
function saveCategory() {
    const btn = document.getElementById('btn-save-cat');
    const name = document.getElementById('cat-name-input').value;
    const cover = document.getElementById('url-cat-cover-input').value || 'https://via.placeholder.com/150';
    if(!name) return showToast("Falta nombre", "error");
    btn.innerText = "..."; btn.disabled = true;
    db.collection("award_categories").add({ name, cover, courseId: state.selectedCourse })
      .then(() => { showToast("Creada"); closeModal('category-modal'); fetchAndRenderAwardCategories(); })
      .finally(() => { btn.innerText = "CREAR"; btn.disabled = false; });
}

// NOMINADOS
function saveNominee() {
    const btn = document.getElementById('btn-save-nominee');
    const name = document.getElementById('nominee-name').value;
    const photo = document.getElementById('url-nominee-input').value || 'https://via.placeholder.com/100';
    if(!name) return showToast("Falta nombre", "error");
    btn.innerText = "..."; btn.disabled = true;
    db.collection("awards").add({
        name, photo, type: document.getElementById('nominee-type').value,
        categoryId: state.currentAwardCategoryId, courseId: state.selectedCourse
    }).then(() => { showToast("Guardado"); closeModal('nominee-modal'); fetchAndRenderNominees(); })
      .finally(() => { btn.innerText = "GUARDAR"; btn.disabled = false; });
}

// YOUTUBE
function saveYoutubeVideo() {
    const url = document.getElementById('yt-url-input').value;
    if(!url) return showToast("URL requerida", "error");
    db.collection("youtube").doc("video_" + state.selectedCourse).set({ url }).then(() => {
        showToast("Actualizado"); closeModal('youtube-modal'); fetchAndRenderYoutube();
    });
}

// ================= RENDERIZADO =================
function fetchAndRenderMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();
    db.collection("members").where("courseId","==",state.selectedCourse).where("category","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const card = document.createElement('div'); card.className = 'member-card filterable-item';
            card.dataset.search = `${d.name} ${d.nick} ${d.prof} ${d.musicName||''}`.toLowerCase();
            // Audio local logic
            const audioHtml = d.musicUrl ? `<audio controls src="${d.musicUrl}" style="width:100%;height:30px;margin-top:10px;opacity:0.7"></audio>` : '';
            card.innerHTML = `
                <img src="${d.photoUrl}" class="member-photo">
                <div class="member-info">
                    <h4>${d.name} ${d.last}</h4>
                    <p class="highlight-text">${d.nick}</p>
                    <p>${d.prof}</p>
                    ${d.musicName ? `<p style="font-size:0.8rem;color:#888;margin-top:5px;"><i class="fas fa-music"></i> ${d.musicName}</p>` : ''}
                    ${audioHtml}
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
            const div = document.createElement('div'); div.className = 'album-card filterable-item'; div.dataset.search = d.name.toLowerCase();
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
            else item.innerHTML = `<img src="${url}" class="gallery-item" onclick="window.open('${url}')">`;
            list.appendChild(item);
        });
    });
}

function fetchAndRenderAwardCategories() {
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_categories").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'card-3d filterable-item'; div.dataset.search = d.name.toLowerCase();
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
            if(d.type === 'nominee') noms.innerHTML += `<div class="member-card" style="padding:10px; margin-bottom:10px;"><img src="${d.photo}" class="member-photo" style="width:50px;height:50px;"><span>${d.name}</span></div>`;
            else winner.innerHTML = `<img src="${d.photo}" style="width:150px;height:150px;border-radius:50%;border:4px solid #D4AF37;display:block;margin:0 auto;"> <h3 style="text-align:center;margin-top:10px;color:#D4AF37;">${d.name}</h3>`;
        });
    });
}

function fetchAndRenderYoutube() {
    db.collection("youtube").doc("video_" + state.selectedCourse).get().then(doc => {
        if(doc.exists) {
            let id = doc.data().url.split('v=')[1];
            if(id) { const amp = id.indexOf('&'); if(amp !== -1) id = id.substring(0, amp);
            document.getElementById('main-video-container').innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`; }
        }
    });
}

// ================= UTILIDADES =================
function openEditModal(id) {
    state.editingId = id; document.getElementById('edit-member-modal').classList.remove('hidden');
    document.getElementById('preview-member').src = "https://via.placeholder.com/100?text=Vista+Previa";
    if(!id) {
        document.getElementById('edit-name').value = ''; document.getElementById('url-photo-input').value = '';
        document.getElementById('local-audio-file').value = '';
    }
}
function openAlbumModal() { document.getElementById('album-modal').classList.remove('hidden'); }
function openCategoryModal() { document.getElementById('category-modal').classList.remove('hidden'); }
function openNomineeModal(type) { document.getElementById('nominee-modal').classList.remove('hidden'); document.getElementById('nominee-type').value = type; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg, type='success') {
    const t = document.createElement('div'); t.style.cssText = `background:${type==='error'?'#d00':'#0a0'};color:white;padding:15px;margin-top:10px;border-radius:5px;`;
    t.innerText = msg; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 4000);
}
function handleModeratorClick(e) { e.preventDefault(); if(state.isModerator) { state.isModerator=false; updateUI(); } else { document.getElementById('password-modal').classList.remove('hidden'); } }
function verifyPassword() { if(document.getElementById('admin-pass-input').value === 'admin2') { state.isModerator=true; closeModal('password-modal'); updateUI(); showToast("Admin ON"); } else showToast("Clave incorrecta","error"); }
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
function filterContent() {
    const term = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.filterable-item').forEach(el => el.style.display = (el.dataset.search || "").includes(term) ? "flex" : "none");
}