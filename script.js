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

// ================= ESTADO & SONIDO =================
const state = {
    currentView: 1, history: [], isModerator: false, selectedCourse: null, currentCategory: null, currentAlbumId: null, currentAwardCategoryId: null, editingId: null
};

// Función global para reproducir sonido
function playSound() {
    const audio = document.getElementById('click-sound');
    if (audio) { audio.currentTime = 0; audio.play().catch(e => console.log("Audio play blocked")); }
}

// Aplicar sonido a TODOS los botones
document.addEventListener('click', (e) => {
    if(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('card-tech') || e.target.classList.contains('hex-item') || e.target.classList.contains('album-card')) {
        playSound();
    }
});

// ================= NAVEGACIÓN =================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return showToast("Selecciona curso", "error");
    
    // Gestión de historial básica
    if(state.currentView !== viewId) state.history.push(state.currentView);
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    document.getElementById('loading-screen').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        const header = document.getElementById('global-header');
        if(viewId > 1) header.classList.remove('hidden'); else header.classList.add('hidden');

        // Búsqueda solo en menú principal (View 3)
        document.getElementById('search-bar-container').classList.toggle('hidden', viewId !== 3);
        
        // Renderizado Dinámico
        if(viewId === 4) fetchAndRenderMembers();
        if(viewId === 5) fetchAndRenderAlbums(); // Fotos o Videos
        if(viewId === 6) fetchAndRenderGallery();
        if(viewId === 7) fetchAndRenderYoutube();
        if(viewId === 8) fetchAndRenderAwardCategories();
        if(viewId === 10) fetchAndRenderNominees();

        const v = document.getElementById(`view-${viewId}`);
        v.classList.remove('hidden'); v.classList.add('fade-in');
        state.currentView = viewId;
        updateUI();
    }, 400); // Carga más rápida
}

function selectCourse(name) {
    state.selectedCourse = name;
    document.getElementById('header-course-name').innerText = name.split(' ')[0];
    goToInterface(3);
}

// ================= LÓGICA RENDERIZADO =================

// 1. Integrantes (6 por fila, foto cuadrada)
function fetchAndRenderMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();
    
    // Filtro estricto por CURSO y CATEGORIA
    db.collection("members")
      .where("courseId", "==", state.selectedCourse)
      .where("category", "==", state.currentCategory)
      .get().then(snap => {
        if(snap.empty) { list.innerHTML = '<p style="color:#666; col-span:6;">Vacío</p>'; return; }
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'member-card';
            
            // Botón música (abre YouTube en nueva pestaña)
            let musicBtn = '';
            if(d.musicUrl) {
                musicBtn = `<div class="music-badge" onclick="window.open('${d.musicUrl}')"><i class="fab fa-youtube"></i> ${d.musicName || 'Play'}</div>`;
            }

            div.innerHTML = `
                <img src="${d.photoUrl}" class="member-photo">
                <div class="member-info">
                    <h4>${d.name} ${d.last}</h4>
                    <p>${d.nick}</p>
                    <p style="color:var(--blue)">${d.prof}</p>
                    ${musicBtn}
                </div>
                ${state.isModerator ? `<button style="position:absolute;top:5px;right:5px;background:red;color:white;border:none;border-radius:3px;cursor:pointer;" onclick="deleteItem('members','${doc.id}')">X</button>` : ''}
            `;
            // Clic en tarjeta para editar (si es admin)
            if(state.isModerator) div.ondblclick = () => openEditModal(doc.id);
            list.appendChild(div);
        });
    });
}

// 2. Galería (Fotos o Videos)
function fetchAndRenderGallery() {
    const list = document.getElementById('gallery-list'); list.innerHTML = '';
    // Ajustar grid si es video (4 por fila) o foto (mas denso)
    // En CSS ya definimos grid-gallery responsive, pero aquí filtramos.
    
    db.collection("media").where("albumId","==",state.currentAlbumId).get().then(snap => {
        snap.forEach(doc => {
            const url = doc.data().url;
            const isVideo = url.includes('youtube') || url.includes('youtu.be');
            const div = document.createElement('div');
            
            if(isVideo) {
                const id = extractVideoID(url);
                div.innerHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>`;
                div.className = 'gallery-item video-item'; // Clase para estilos específicos si quieres
            } else {
                div.innerHTML = `<img src="${url}" style="width:100%; height:200px; object-fit:cover; border-radius:8px;">`;
                div.className = 'gallery-item';
                div.onclick = () => window.open(url);
            }
            // Boton borrar
            if(state.isModerator) {
                const btn = document.createElement('button');
                btn.innerText = "X"; btn.style.background="red"; btn.style.width="100%";
                btn.onclick = () => deleteItem('media', doc.id);
                div.appendChild(btn);
            }
            list.appendChild(div);
        });
    });
}

// 3. Nominados y Ganadores (Tarjetas Diferentes)
function fetchAndRenderNominees() {
    const nList = document.getElementById('col-nominados'); nList.innerHTML = '';
    const wList = document.getElementById('col-ganadores'); wList.innerHTML = '';
    
    db.collection("awards").where("categoryId","==",state.currentAwardCategoryId).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'nominee') {
                nList.innerHTML += `
                    <div class="nominee-card-small">
                        <img src="${d.photo}" class="nom-img">
                        <span class="nom-name">${d.name}</span>
                        ${state.isModerator ? `<button onclick="deleteItem('awards','${doc.id}')" style="margin-left:auto;color:red;">X</button>` : ''}
                    </div>`;
            } else {
                wList.innerHTML += `
                    <div class="winner-card-big">
                        <img src="${d.photo}" class="win-img">
                        <div class="win-name">${d.name}</div>
                        ${state.isModerator ? `<button onclick="deleteItem('awards','${doc.id}')" style="margin-top:10px;color:red;">Borrar Ganador</button>` : ''}
                    </div>`;
            }
        });
    });
}

// ================= MODERADOR & UTILIDADES =================

function handleModeratorClick(e) {
    e.preventDefault();
    e.stopPropagation(); // Evita burbujeo
    if(state.isModerator) {
        state.isModerator = false;
        updateUI();
        showToast("Modo Admin: OFF");
    } else {
        document.getElementById('password-modal').classList.remove('hidden');
    }
}

function verifyPassword() {
    if(document.getElementById('admin-pass-input').value === 'admin2') {
        state.isModerator = true;
        closeModal('password-modal');
        updateUI();
        showToast("Modo Admin: ON");
    } else {
        showToast("Clave Incorrecta", "error");
    }
}

function updateUI() {
    const btn = document.getElementById('mod-btn');
    if(state.isModerator) {
        btn.innerHTML = '<i class="fas fa-unlock"></i> ADMIN: ON';
        btn.classList.add('active');
        document.querySelectorAll('.fab').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        document.getElementById('video-controls-btn').classList.remove('hidden');
    } else {
        btn.innerHTML = '<i class="fas fa-user-lock"></i> ADMIN: OFF';
        btn.classList.remove('active');
        document.querySelectorAll('.fab').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        document.getElementById('video-controls-btn').classList.add('hidden');
    }
    // Refrescar vistas si estamos en una para mostrar botones de borrar
    if(state.currentView === 4) fetchAndRenderMembers(); 
}

// Helper: Extraer ID Youtube
function extractVideoID(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}
function previewYoutubeThumbnail(url) {
    const id = extractVideoID(url);
    const box = document.getElementById('music-thumb-preview');
    if(id) {
        document.getElementById('yt-thumb-img').src = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
        box.classList.remove('hidden');
    } else box.classList.add('hidden');
}

// Guardados (Simplificados)
function saveMemberChanges() {
    const name = document.getElementById('edit-name').value;
    if(!name) return showToast("Nombre obligatorio", "error");
    const data = {
        name, last: document.getElementById('edit-last').value,
        nick: document.getElementById('edit-nick').value,
        prof: document.getElementById('edit-prof').value,
        musicName: document.getElementById('edit-music-name').value,
        photoUrl: document.getElementById('url-photo-input').value || 'https://via.placeholder.com/150',
        musicUrl: document.getElementById('yt-music-input').value, // Youtube Link
        courseId: state.selectedCourse, category: state.currentCategory
    };
    // Guardar... (igual a previas versiones)
    const action = state.editingId ? db.collection("members").doc(state.editingId).set(data,{merge:true}) : db.collection("members").add(data);
    action.then(()=>{showToast("Guardado"); closeModal('edit-member-modal'); fetchAndRenderMembers();});
}

function saveMediaToAlbum() {
    const url = document.getElementById('media-url-input').value;
    if(!url) return;
    db.collection("media").add({ albumId: state.currentAlbumId, url, courseId: state.selectedCourse })
    .then(()=>{showToast("Agregado"); closeModal('media-modal'); fetchAndRenderGallery();});
}

// Utilidades Modales
function openEditModal(id) { state.editingId = id; document.getElementById('edit-member-modal').classList.remove('hidden'); /* Reset fields... */ }
function openGenericModal(type) { document.getElementById('generic-modal').classList.remove('hidden'); document.getElementById('generic-type').value = type; }
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function openNomineeModal(type) { document.getElementById('nominee-modal').classList.remove('hidden'); document.getElementById('nominee-type').value=type; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function deleteItem(col, id) { if(confirm("¿Eliminar?")) db.collection(col).doc(id).delete().then(()=> { showToast("Eliminado"); if(state.currentView===4) fetchAndRenderMembers(); else if(state.currentView===6) fetchAndRenderGallery(); else if(state.currentView===10) fetchAndRenderNominees(); }); }
function showToast(msg, type='success') { const t=document.createElement('div'); t.style.cssText=`background:${type=='error'?'red':'green'};color:white;padding:10px;margin-top:10px;border-radius:5px`; t.innerText=msg; document.getElementById('toast-container').appendChild(t); setTimeout(()=>t.remove(),3000); }
// Nav
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); goToInterface(state.history.pop()); } }
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); goToInterface(state.futureHistory.pop()); } }
function goHome() { state.history=[]; goToInterface(2); }
// Resto de fetchs (Albums, Categories, Youtube) igual que antes...
function fetchAndRenderAlbums() {
    const list = document.getElementById('album-list'); list.innerHTML = '';
    document.getElementById('view-5-title').innerText = "ÁLBUMES";
    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="card-tech" style="height:200px;width:100%" onclick="state.currentAlbumId='${doc.id}'; goToInterface(6)">
                <img src="${d.coverUrl}" style="width:100%;height:150px;object-fit:cover"><p>${d.name}</p>
            </div>`;
        });
    });
}
function fetchAndRenderAwardCategories() {
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_categories").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="card-tech" style="height:200px;width:100%" onclick="state.currentAwardCategoryId='${doc.id}'; goToInterface(10)">
                <img src="${d.cover}" style="width:100%;height:150px;object-fit:cover"><p>${d.name}</p>
            </div>`;
        });
    });
}
function fetchAndRenderYoutube() {
    const c = document.getElementById('main-video-container');
    db.collection("youtube").doc("video_"+state.selectedCourse).get().then(doc=>{
        if(doc.exists) { const id=extractVideoID(doc.data().url); if(id) c.innerHTML=`<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;}
    });
}
function saveYoutubeVideo() { const url=document.getElementById('yt-url-input').value; db.collection("youtube").doc("video_"+state.selectedCourse).set({url}).then(()=>{showToast("Video Ok"); closeModal('youtube-modal'); fetchAndRenderYoutube();}); }
function updatePreview(val, id) { if(val) document.getElementById(id).src = val; }