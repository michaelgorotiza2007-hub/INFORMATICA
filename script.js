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
        
        // Search
        const searchBox = document.getElementById('search-bar-container');
        if(viewId === 3) {
            searchBox.classList.remove('hidden');
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

// ================= UTILIDADES VISUALES =================

// Actualizar vista previa de imagen genérica
function updatePreview(url, imgId) {
    if(url) document.getElementById(imgId).src = url;
}

// Extraer ID de YouTube y mostrar miniatura en Modal
function previewYoutubeThumbnail(url) {
    const thumbContainer = document.getElementById('music-thumb-preview');
    const thumbImg = document.getElementById('yt-thumb-img');
    const videoId = extractVideoID(url);

    if(videoId) {
        thumbImg.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        thumbContainer.classList.remove('hidden');
    } else {
        thumbContainer.classList.add('hidden');
    }
}

// Helper para sacar ID de cualquier link de YT
function extractVideoID(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

// ================= GUARDADO =================

function saveMemberChanges() {
    const btn = document.getElementById('btn-save-member');
    const name = document.getElementById('edit-name').value;
    if(!name) return showToast("Nombre requerido", "error");
    
    btn.innerText = "Guardando..."; btn.disabled = true;

    const data = {
        name: name,
        last: document.getElementById('edit-last').value,
        nick: document.getElementById('edit-nick').value,
        prof: document.getElementById('edit-prof').value,
        musicName: document.getElementById('edit-music-name').value,
        photoUrl: document.getElementById('url-photo-input').value || 'https://via.placeholder.com/150',
        musicUrl: document.getElementById('yt-music-input').value, // URL DE YOUTUBE
        courseId: state.selectedCourse,
        category: state.currentCategory
    };

    const action = state.editingId 
        ? db.collection("members").doc(state.editingId).set(data, {merge:true}) 
        : db.collection("members").add(data);

    action.then(() => { showToast("✅ Guardado"); closeModal('edit-member-modal'); fetchAndRenderMembers(); })
          .finally(() => { btn.innerText = "GUARDAR"; btn.disabled = false; });
}

// (El resto de funciones saveAlbum, saveCategory, etc. permanecen iguales a la versión anterior estable, solo se aseguran IDs)
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
        showToast("✅ Creado"); closeModal('generic-modal');
        if(type === 'album') fetchAndRenderAlbums(); else fetchAndRenderAwardCategories();
    }).finally(() => { btn.innerText = "Crear"; btn.disabled = false; });
}

function saveNominee() {
    const name = document.getElementById('nominee-name').value;
    if(!name) return showToast("Falta nombre", "error");
    db.collection("awards").add({
        name, photo: document.getElementById('url-nominee-input').value || 'https://via.placeholder.com/100',
        type: document.getElementById('nominee-type').value, categoryId: state.currentAwardCategoryId, courseId: state.selectedCourse
    }).then(() => { showToast("Guardado"); closeModal('nominee-modal'); fetchAndRenderNominees(); });
}

function saveYoutubeVideo() {
    const url = document.getElementById('yt-url-input').value;
    db.collection("youtube").doc("video_" + state.selectedCourse).set({ url }).then(() => {
        showToast("Video actualizado"); closeModal('youtube-modal'); fetchAndRenderYoutube();
    });
}
function saveMediaToAlbum() {
    const url = document.getElementById('media-url-input').value;
    if(!url) return showToast("Falta URL", "error");
    db.collection("media").add({ albumId: state.currentAlbumId, url, courseId: state.selectedCourse })
      .then(() => { showToast("Subido"); closeModal('media-modal'); fetchAndRenderGallery(); });
}

// ================= RENDERIZADO (CON PLAYER YOUTUBE) =================

function fetchAndRenderMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();
    
    db.collection("members").where("courseId","==",state.selectedCourse).where("category","==",state.currentCategory).get().then(snap => {
        if(snap.empty) list.innerHTML = `<p style="color:#666">No hay registros.</p>`;
        snap.forEach(doc => {
            const d = doc.data();
            const card = document.createElement('div'); card.className = 'member-card';
            
            // Lógica Player YouTube
            let musicPlayer = '';
            if(d.musicUrl) {
                const vidId = extractVideoID(d.musicUrl);
                if(vidId) {
                    const thumb = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
                    musicPlayer = `
                        <div class="music-player-card">
                            <img src="${thumb}" class="music-cover">
                            <div class="music-details">
                                <span>Soundtrack</span>
                                <strong>${d.musicName || 'Canción'}</strong>
                            </div>
                            <a href="${d.musicUrl}" target="_blank" class="play-btn-link"><i class="fas fa-play-circle"></i></a>
                        </div>
                    `;
                }
            }

            card.innerHTML = `
                <img src="${d.photoUrl}" class="member-photo">
                <div class="member-info">
                    <h4>${d.name} ${d.last}</h4>
                    <p class="highlight-text">${d.nick}</p>
                    <p>${d.prof}</p>
                    ${musicPlayer}
                </div>
                ${state.isModerator ? `<div class="action-buttons" style="position:absolute; top:10px; right:10px;"><button class="btn-text" onclick="openEditModal('${doc.id}')"><i class="fas fa-pen"></i></button><button class="btn-text" style="color:red;" onclick="deleteItem('members','${doc.id}')"><i class="fas fa-trash"></i></button></div>`:''}
            `;
            list.appendChild(card);
        });
    });
}

// (Las funciones fetchAndRenderAlbums, Categories, etc. se mantienen con la lógica estándar pero los estilos CSS hacen que se vean nuevas)
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

function fetchAndRenderAwardCategories() {
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_categories").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'album-card';
            div.innerHTML = `<img src="${d.cover}" class="album-cover"><div class="album-title">${d.name}</div>`;
            div.onclick = () => { state.currentAwardCategoryId = doc.id; document.getElementById('category-title-display').innerText = d.name; goToInterface(10); };
            list.appendChild(div);
        });
    });
}

// ================= BÚSQUEDA GLOBAL =================
function handleGlobalSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const menu = document.getElementById('dashboard-menu');
    const results = document.getElementById('global-search-results');
    const list = document.getElementById('search-results-list');
    
    if(term.length < 2) { menu.classList.remove('hidden'); results.classList.add('hidden'); return; }
    
    menu.classList.add('hidden'); results.classList.remove('hidden'); list.innerHTML = '';
    
    db.collection("members").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(`${d.name} ${d.last} ${d.nick}`.toLowerCase().includes(term)) {
                const div = document.createElement('div'); div.className = 'member-card';
                div.innerHTML = `<img src="${d.photoUrl}" style="width:50px;height:50px;border-radius:50%"><div><h4>${d.name}</h4><p>Integrante</p></div>`;
                list.appendChild(div);
            }
        });
    });
}

// ================= UTILIDADES =================
function openEditModal(id) {
    state.editingId = id; document.getElementById('edit-member-modal').classList.remove('hidden');
    document.getElementById('preview-member').src = "https://via.placeholder.com/150";
    document.getElementById('music-thumb-preview').classList.add('hidden');
    if(!id) {
        document.getElementById('edit-name').value = ''; document.getElementById('url-photo-input').value = '';
        document.getElementById('yt-music-input').value = '';
    }
}
function openGenericModal(type) { document.getElementById('generic-modal').classList.remove('hidden'); document.getElementById('generic-type').value = type; }
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function openNomineeModal(type) { document.getElementById('nominee-modal').classList.remove('hidden'); document.getElementById('nominee-type').value = type; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg, type='success') {
    const t = document.createElement('div'); t.style.cssText = `background:${type==='error'?'#d00':'#0a0'};color:white;padding:15px;margin-top:10px;border-radius:5px;box-shadow:0 5px 15px black;`;
    t.innerText = msg; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 4000);
}

// Helpers
function handleModeratorClick(e) { e.preventDefault(); if(state.isModerator) { state.isModerator=false; updateUI(); } else document.getElementById('password-modal').classList.remove('hidden'); }
function verifyPassword() { if(document.getElementById('admin-pass-input').value === 'admin2') { state.isModerator=true; closeModal('password-modal'); updateUI(); } else showToast("Error clave","error"); }
function updateUI() {
    const disp = state.isModerator;
    document.querySelectorAll('.fab').forEach(el => el.classList.toggle('hidden', !disp));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !disp));
    document.getElementById('video-controls').classList.toggle('hidden', !disp);
    document.getElementById('mod-checkbox').checked = disp;
    if(state.currentView===4) fetchAndRenderMembers();
}
function deleteItem(col, id) { if(confirm("¿Borrar?")) db.collection(col).doc(id).delete().then(()=>updateUI()); }
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); goToInterface(state.history.pop()); } }
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); goToInterface(state.futureHistory.pop()); } }
function goHome() { state.history=[]; goToInterface(2); }
// Render de Galería, Nominees, Youtube se mantienen igual que la versión anterior estable pero usando las nuevas clases CSS.
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
            let id = extractVideoID(doc.data().url);
            if(id) c.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
        }
    });
}