// ================= CONFIGURACIÓN FIREBASE =================
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
    currentView: 1, 
    history: [], 
    futureHistory: [],
    isAdmin: false, 
    selectedCourse: null, 
    currentCategory: null, // 'integrantes', 'fotos', etc.
    currentAlbumId: null // Para saber donde guardar fotos/videos
};

// ================= SONIDO GLOBAL =================
document.addEventListener('click', () => {
    const audio = document.getElementById('click-sound');
    if(audio) { audio.currentTime=0; audio.play().catch(e=>{}); }
});

// ================= NAVEGACIÓN =================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return alert("Selecciona un curso primero");

    // Historial para botón Atrás
    if(state.currentView !== viewId) {
        state.history.push(state.currentView);
        state.futureHistory = [];
    }
    
    // Parámetros de categoría
    if(viewId === 4 || viewId === 5) state.currentCategory = param; 
    
    // Ocultar todo
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-1').classList.add('hidden');
    
    // Mostrar header excepto en intro
    const header = document.getElementById('global-header');
    if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');
    
    // Mostrar Buscador solo en menú (View 3)
    const search = document.getElementById('search-container');
    if(viewId === 3) search.classList.remove('hidden'); else search.classList.add('hidden');

    // Cargar datos según vista
    if(viewId === 4) loadMembers();
    if(viewId === 5) loadAlbums(); // Fotos o Videos
    if(viewId === 6) loadMedia(); // Contenido del álbum
    if(viewId === 7) loadMainVideo();
    if(viewId === 8) loadAwardCategories();
    if(viewId === 10) loadAwards();

    // Mostrar vista
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

// ================= GUARDAR DATOS (CORE) =================

// 1. CREAR ÁLBUM
function createAlbum() {
    const name = document.getElementById('new-album-name').value;
    const cover = document.getElementById('new-album-cover').value;
    
    if(!name) return alert("Nombre obligatorio");
    
    db.collection("albums").add({
        name: name,
        coverUrl: cover || 'https://via.placeholder.com/150',
        courseId: state.selectedCourse,
        type: state.currentCategory // 'fotos' o 'videos'
    }).then(() => {
        alert("Álbum creado!");
        closeModal('album-modal');
        loadAlbums();
    }).catch(e => alert("Error: " + e.message));
}

// 2. SUBIR MEDIA (FOTO/VIDEO)
function uploadMedia() {
    const url = document.getElementById('new-media-url').value;
    if(!url) return alert("URL vacía");
    
    db.collection("media").add({
        albumId: state.currentAlbumId, // ID del álbum abierto actualmente
        url: url,
        courseId: state.selectedCourse,
        type: state.currentCategory // Para distinguir foto de video
    }).then(() => {
        alert("Contenido agregado!");
        closeModal('media-modal');
        loadMedia();
    });
}

// 3. GUARDAR INTEGRANTE
function saveMember() {
    const name = document.getElementById('mem-name').value;
    if(!name) return alert("Nombre requerido");

    const data = {
        name: name,
        last: document.getElementById('mem-last').value,
        nick: document.getElementById('mem-nick').value,
        prof: document.getElementById('mem-prof').value,
        musicUrl: document.getElementById('mem-music').value,
        photoUrl: document.getElementById('mem-photo').value || 'https://via.placeholder.com/150',
        courseId: state.selectedCourse,
        category: state.currentCategory // 'integrantes' o 'profesores'
    };

    const id = document.getElementById('mem-id').value;
    const promise = id ? db.collection("members").doc(id).set(data, {merge:true}) : db.collection("members").add(data);
    
    promise.then(() => {
        alert("Perfil guardado");
        closeModal('member-modal');
        loadMembers();
    });
}

// ================= CARGAR DATOS (RENDER) =================

// CARGAR INTEGRANTES
function loadMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('v4-title').innerText = state.currentCategory.toUpperCase();

    db.collection("members")
      .where("courseId", "==", state.selectedCourse)
      .where("category", "==", state.currentCategory)
      .get().then(snap => {
          snap.forEach(doc => {
              const d = doc.data();
              const div = document.createElement('div');
              div.className = 'member-card';
              
              let musicBtn = '';
              if(d.musicUrl) musicBtn = `<span class="yt-btn" onclick="window.open('${d.musicUrl}')"><i class="fas fa-play"></i> Soundtrack</span>`;

              div.innerHTML = `
                  <img src="${d.photoUrl}" class="mem-pic">
                  <div class="mem-info">
                      <h4>${d.name} ${d.last}</h4>
                      <span>${d.nick}</span>
                      <p>${d.prof}</p>
                      ${musicBtn}
                  </div>
                  ${state.isAdmin ? `<button onclick="deleteDoc('members','${doc.id}')" style="color:red">X</button>` : ''}
              `;
              if(state.isAdmin) div.ondblclick = () => openMemberModal(doc.id);
              list.appendChild(div);
          });
      });
}

// CARGAR ÁLBUMES
function loadAlbums() {
    const list = document.getElementById('albums-list'); list.innerHTML = '';
    document.getElementById('v5-title').innerText = state.currentCategory === 'fotos' ? 'ÁLBUMES DE FOTOS' : 'COLECCIONES DE VIDEO';

    db.collection("albums")
      .where("courseId", "==", state.selectedCourse)
      .where("type", "==", state.currentCategory)
      .get().then(snap => {
          snap.forEach(doc => {
              const d = doc.data();
              const div = document.createElement('div');
              div.className = 'album-item';
              div.innerHTML = `<img src="${d.coverUrl}" class="album-cover"><div class="album-title">${d.name}</div>`;
              div.onclick = () => {
                  state.currentAlbumId = doc.id;
                  document.getElementById('album-title-display').innerText = d.name;
                  goToInterface(6);
              };
              list.appendChild(div);
          });
      });
}

// CARGAR MEDIA (FOTOS O VIDEOS)
function loadMedia() {
    const list = document.getElementById('media-list'); list.innerHTML = '';
    // Ajustar grid visualmente si son videos
    if(state.currentCategory === 'videos') list.style.gridTemplateColumns = "repeat(auto-fill, minmax(300px, 1fr))";
    else list.style.gridTemplateColumns = "repeat(auto-fill, minmax(150px, 1fr))";

    db.collection("media").where("albumId", "==", state.currentAlbumId).get().then(snap => {
        snap.forEach(doc => {
            const url = doc.data().url;
            const div = document.createElement('div');
            
            // Detectar si es YouTube
            if(url.includes('youtu')) {
                const id = url.split('v=')[1] || url.split('/').pop();
                div.innerHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" frameborder="0"></iframe>`;
            } else {
                div.innerHTML = `<img src="${url}" class="media-item" onclick="window.open('${url}')" style="width:100%;height:150px;object-fit:cover;">`;
            }
            list.appendChild(div);
        });
    });
}

// BUSCADOR GLOBAL
function performSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const grid = document.getElementById('results-grid');
    const container = document.getElementById('search-results');
    
    if(term.length < 2) { container.classList.add('hidden'); return; }
    
    container.classList.remove('hidden');
    grid.innerHTML = '';

    // Buscar Miembros
    db.collection("members").where("courseId", "==", state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.name.toLowerCase().includes(term)) {
                grid.innerHTML += `<div class="member-card" style="margin:5px;"><h4>${d.name}</h4><p>Integrante</p></div>`;
            }
        });
    });
}

// ================= UTILIDADES =================
function toggleAdmin() {
    if(state.isAdmin) {
        state.isAdmin = false;
        document.getElementById('admin-toggle').innerText = "MODO ADMIN: OFF";
        document.getElementById('admin-toggle').style.background = "#333";
        updateAdminUI();
    } else {
        document.getElementById('password-modal').classList.remove('hidden');
    }
}
function verifyPassword() {
    if(document.getElementById('admin-pass-input').value === 'admin2') {
        state.isAdmin = true;
        document.getElementById('admin-toggle').innerText = "MODO ADMIN: ON";
        document.getElementById('admin-toggle').style.background = "green";
        closeModal('password-modal');
        updateAdminUI();
    } else alert("Clave incorrecta");
}
function updateAdminUI() {
    const els = document.querySelectorAll('.admin-only');
    els.forEach(el => state.isAdmin ? el.classList.remove('hidden') : el.classList.add('hidden'));
}

// Funciones Modales
function openAlbumModal() { document.getElementById('album-modal').classList.remove('hidden'); }
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function openMemberModal(id=null) { 
    document.getElementById('member-modal').classList.remove('hidden'); 
    document.getElementById('mem-id').value = id || '';
    if(!id) { document.getElementById('mem-name').value = ''; document.getElementById('mem-photo').value=''; }
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function deleteDoc(col, id) { if(confirm("Borrar?")) db.collection(col).doc(id).delete().then(()=>goToInterface(state.currentView)); }

// Historial
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); goToInterface(state.history.pop()); } }
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); goToInterface(state.futureHistory.pop()); } }
function goHome() { state.history=[]; goToInterface(2); }
function clearSearch() { document.getElementById('search-results').classList.add('hidden'); document.getElementById('search-input').value=''; }