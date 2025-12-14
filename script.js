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

// ================= ESTADO GLOBAL =================
const state = {
    currentView: 1, history: [], futureHistory: [],
    isAdmin: false, selectedCourse: null, currentCategory: null, currentAlbumId: null, currentAwardCategoryId: null
};

// Sonido Global
document.addEventListener('click', () => {
    const audio = document.getElementById('click-sound');
    if(audio) { audio.currentTime=0; audio.play().catch(e=>{}); }
});

// ================= NAVEGACIÓN ROBUSTA =================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return alert("Selecciona un curso primero");
    
    // Evitar añadir al historial si estamos en la misma vista o regresando
    if(state.currentView !== viewId) {
        state.history.push(state.currentView);
        state.futureHistory = []; // Limpiar futuro al hacer nueva navegación
    }
    
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    // UI Updates
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-1').classList.add('hidden');
    
    const header = document.getElementById('global-header');
    if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');

    const search = document.getElementById('search-container');
    if(viewId === 3) search.classList.remove('hidden'); else search.classList.add('hidden');

    // Renderizar
    if(viewId === 4) fetchMembers();
    if(viewId === 5) fetchAlbums(); 
    if(viewId === 6) fetchMedia();  
    if(viewId === 7) fetchMainVideo();
    if(viewId === 8) fetchCategories();
    if(viewId === 10) fetchAwards();

    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    document.getElementById(`view-${viewId}`).classList.add('fade-in');
    state.currentView = viewId;
    updateAdminUI();
}

function goBack() {
    if(state.history.length > 0) {
        const prev = state.history.pop();
        state.futureHistory.push(state.currentView);
        // Llamamos a goToInterface pero hackeamos el historial para no añadir este paso
        manualNavigate(prev);
    }
}

function goForward() {
    if(state.futureHistory.length > 0) {
        const next = state.futureHistory.pop();
        state.history.push(state.currentView);
        manualNavigate(next);
    }
}

function manualNavigate(viewId) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    if(viewId > 1) document.getElementById('global-header').classList.remove('hidden');
    
    if(viewId === 4) fetchMembers();
    if(viewId === 5) fetchAlbums(); 
    if(viewId === 6) fetchMedia();  
    if(viewId === 7) fetchMainVideo();
    if(viewId === 8) fetchCategories();
    if(viewId === 10) fetchAwards();

    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    state.currentView = viewId;
    updateAdminUI();
}

function goHome() { state.history = []; goToInterface(2); }
function selectCourse(name) { state.selectedCourse = name; document.getElementById('course-title').innerText = name.split(' ')[0]; goToInterface(3); }

// ================= LÓGICA PREMIOS (VIDEO + CATEGORÍAS) =================

// Video Principal (Vista 7)
function saveMainVideo() {
    const url = document.getElementById('main-video-input').value;
    if(!url) return;
    db.collection("youtube").doc("awards_main_"+state.selectedCourse).set({url: url}).then(() => {
        alert("Video Actualizado");
        fetchMainVideo();
    });
}

function fetchMainVideo() {
    db.collection("youtube").doc("awards_main_"+state.selectedCourse).get().then(doc => {
        const box = document.getElementById('main-video-box');
        if(doc.exists && doc.data().url) {
            const id = doc.data().url.split('v=')[1] || doc.data().url.split('/').pop();
            box.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
        } else {
            box.innerHTML = `<p style="color:#666; padding:50px; text-align:center">No hay video configurado</p>`;
        }
    });
}

// Categorías (Vista 8)
function saveCategory() {
    const name = document.getElementById('cat-name-input').value;
    const cover = document.getElementById('cat-cover-input').value || 'https://via.placeholder.com/150';
    if(!name) return;
    db.collection("award_categories").add({
        name, cover, courseId: state.selectedCourse
    }).then(() => { closeModal('category-modal'); fetchCategories(); });
}

function fetchCategories() {
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_categories").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'card-base';
            div.innerHTML = `
                ${state.isAdmin ? `<button class="btn-delete-float" onclick="event.stopPropagation(); deleteDoc('award_categories','${doc.id}')">X</button>` : ''}
                <img src="${d.cover}" class="card-img">
                <div class="card-title">${d.name}</div>
            `;
            div.onclick = () => {
                state.currentAwardCategoryId = doc.id;
                document.getElementById('award-cat-title').innerText = d.name;
                goToInterface(10);
            };
            list.appendChild(div);
        });
    });
}

// Nominados y Ganadores (Vista 10)
function saveNominee() {
    const name = document.getElementById('nominee-name').value;
    const photo = document.getElementById('nominee-photo').value || 'https://via.placeholder.com/150';
    const type = document.getElementById('nominee-type').value; // 'nominee' o 'winner'
    
    if(!name) return;
    
    db.collection("awards").add({
        name, photo, type, 
        categoryId: state.currentAwardCategoryId, 
        courseId: state.selectedCourse
    }).then(() => { closeModal('nominee-modal'); fetchAwards(); });
}

function fetchAwards() {
    const nList = document.getElementById('nominees-list'); nList.innerHTML = '';
    const wList = document.getElementById('winner-display'); wList.innerHTML = '';
    
    db.collection("awards").where("categoryId","==",state.currentAwardCategoryId).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const delBtn = state.isAdmin ? `<button onclick="deleteDoc('awards','${doc.id}')" style="color:red; background:none; border:none; cursor:pointer;">(Eliminar)</button>` : '';
            
            if(d.type === 'nominee') {
                // Foto cuadrada con borde ondulado estático
                nList.innerHTML += `
                    <div class="nominee-item">
                        <img src="${d.photo}" class="wavy-border">
                        <div style="color:white; font-size:0.9rem;">${d.name}</div>
                        ${delBtn}
                    </div>
                `;
            } else {
                // Foto cuadrada con borde animado RGB
                wList.innerHTML = `
                    <img src="${d.photo}" class="winner-anim">
                    <h2 style="color:var(--gold); margin-top:15px; font-family:'Orbitron'">${d.name}</h2>
                    ${delBtn}
                `;
            }
        });
    });
}


// ================= FUNCIONES CRUD STANDARD =================
function createAlbum() {
    const name = document.getElementById('new-album-name').value;
    const cover = document.getElementById('new-album-cover').value || 'https://via.placeholder.com/150';
    db.collection("albums").add({ name, coverUrl: cover, courseId: state.selectedCourse, type: state.currentCategory })
      .then(() => { closeModal('album-modal'); fetchAlbums(); });
}

function fetchAlbums() {
    const list = document.getElementById('albums-list'); list.innerHTML = '';
    document.getElementById('v5-title').innerText = state.currentCategory === 'fotos' ? 'FOTOS' : 'VIDEOS';
    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'card-base';
            div.innerHTML = `
                ${state.isAdmin ? `<button class="btn-delete-float" onclick="event.stopPropagation(); deleteAlbumAndContent('${doc.id}')">X</button>` : ''}
                <img src="${d.coverUrl}" class="card-img">
                <div class="card-title">${d.name}</div>
            `;
            div.onclick = () => { state.currentAlbumId = doc.id; document.getElementById('album-title-display').innerText = d.name; goToInterface(6); };
            list.appendChild(div);
        });
    });
}

function uploadMedia() {
    const url = document.getElementById('new-media-url').value;
    db.collection("media").add({ albumId: state.currentAlbumId, url, courseId: state.selectedCourse }).then(() => {
        closeModal('media-modal'); fetchMedia();
    });
}

function fetchMedia() {
    const list = document.getElementById('media-list'); list.innerHTML = '';
    db.collection("media").where("albumId","==",state.currentAlbumId).get().then(snap => {
        snap.forEach(doc => {
            const url = doc.data().url;
            const div = document.createElement('div'); div.className = 'card-base';
            const del = state.isAdmin ? `<button class="btn-delete-float" onclick="event.stopPropagation(); deleteDoc('media','${doc.id}')">X</button>` : '';
            if(url.includes('youtu')) {
                const id = url.split('v=')[1] || url.split('/').pop();
                div.innerHTML = `${del}<iframe width="100%" height="180" src="https://www.youtube.com/embed/${id}" frameborder="0"></iframe>`;
            } else {
                div.innerHTML = `${del}<img src="${url}" class="card-img" onclick="window.open('${url}')">`;
            }
            list.appendChild(div);
        });
    });
}

function saveMember() {
    const data = {
        name: document.getElementById('mem-name').value,
        last: document.getElementById('mem-last').value,
        nick: document.getElementById('mem-nick').value,
        prof: document.getElementById('mem-prof').value,
        musicUrl: document.getElementById('mem-music').value,
        photoUrl: document.getElementById('mem-photo').value || 'https://via.placeholder.com/150',
        courseId: state.selectedCourse, category: state.currentCategory
    };
    db.collection("members").add(data).then(()=>{ closeModal('member-modal'); fetchMembers(); });
}

function fetchMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('v4-title').innerText = state.currentCategory.toUpperCase();
    db.collection("members").where("courseId","==",state.selectedCourse).where("category","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'card-base'; div.style.display="flex"; div.style.padding="10px"; div.style.gap="10px";
            div.innerHTML = `
                ${state.isAdmin ? `<button class="btn-delete-float" onclick="deleteDoc('members','${doc.id}')">X</button>` : ''}
                <img src="${d.photoUrl}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid var(--gold)">
                <div>
                    <h4 style="color:white">${d.name} ${d.last}</h4>
                    <p style="color:var(--neon-blue);font-size:0.9rem">${d.prof}</p>
                    ${d.musicUrl ? `<a href="${d.musicUrl}" target="_blank" style="color:red;font-size:0.8rem"><i class="fab fa-youtube"></i> Ver Video</a>` : ''}
                </div>
            `;
            list.appendChild(div);
        });
    });
}

// ================= UTILIDADES =================
function deleteAlbumAndContent(id) {
    if(confirm("¿Eliminar Álbum y todo su contenido?")) {
        db.collection("media").where("albumId","==",id).get().then(snap => {
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            batch.delete(db.collection("albums").doc(id));
            batch.commit().then(()=>fetchAlbums());
        });
    }
}
function deleteDoc(col, id) { if(confirm("¿Eliminar?")) db.collection(col).doc(id).delete().then(()=> goToInterface(state.currentView)); }

function toggleAdmin() {
    if(state.isAdmin) { state.isAdmin=false; document.getElementById('admin-toggle').innerText="MODO ADMIN: OFF"; updateAdminUI(); }
    else document.getElementById('password-modal').classList.remove('hidden');
}
function verifyPassword() {
    if(document.getElementById('admin-pass-input').value === 'admin2') {
        state.isAdmin=true; closeModal('password-modal'); document.getElementById('admin-toggle').innerText="MODO ADMIN: ON"; updateAdminUI();
    } else alert("Error");
}
function updateAdminUI() { document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !state.isAdmin)); }

// Modales
function openMemberModal() { document.getElementById('member-modal').classList.remove('hidden'); }
function openAlbumModal() { document.getElementById('album-modal').classList.remove('hidden'); }
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function openCategoryModal() { document.getElementById('category-modal').classList.remove('hidden'); }
function openNomineeModal(type) { document.getElementById('nominee-modal').classList.remove('hidden'); document.getElementById('nominee-type').value=type; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }