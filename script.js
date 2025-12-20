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
    currentView: 1, history: [], futureHistory: [],
    isAdmin: false, selectedCourse: null, selectedCourseImg: null,
    currentCategory: null, currentAlbumId: null, currentAwardCat: null
};

// Sonido Global
document.addEventListener('click', () => {
    const audio = document.getElementById('click-sound');
    if(audio) { audio.currentTime=0; audio.play().catch(()=>{}); }
});

// ================= NAVEGACIÓN =================
function goToInterface(viewId, param = null) {
    // Validar selección de curso
    if(viewId > 2 && !state.selectedCourse) return showToast("Selecciona un perfil primero", "error");

    // Historial
    if(state.currentView !== viewId) {
        state.history.push(state.currentView);
        state.futureHistory = [];
    }

    if(viewId === 4 || viewId === 5 || viewId === 7) state.currentCategory = param; // param puede ser 'integrantes', 'fotos', etc.

    // UI Updates
    document.getElementById('loader-overlay').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loader-overlay').classList.add('hidden');
        
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        const header = document.getElementById('global-header');
        if(viewId > 1) {
            header.classList.remove('hidden');
            document.getElementById('header-course-name').innerText = state.selectedCourse;
            document.getElementById('header-course-img').src = state.selectedCourseImg;
        } else {
            header.classList.add('hidden');
        }

        const search = document.getElementById('search-box');
        search.classList.toggle('hidden', viewId < 3); // Mostrar buscador desde View 3 en adelante

        // Cargar Datos
        if(viewId === 4) fetchMembers();
        if(viewId === 5) fetchAlbums(); // Fotos, Videos, Especiales
        if(viewId === 6) fetchMedia();
        if(viewId === 7) fetchAwardCategories();
        if(viewId === 8) fetchAwards();
        if(viewId === 9) fetchInfo();

        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        document.getElementById(`view-${viewId}`).classList.add('fade-in');
        state.currentView = viewId;
        updateAdminUI();

    }, 500); // Simulación carga
}

function selectCourse(name, img) {
    state.selectedCourse = name;
    state.selectedCourseImg = img;
    goToInterface(3);
}

function goBack() { if(state.history.length){ state.futureHistory.push(state.currentView); goToInterface(state.history.pop()); } }
function goForward() { if(state.futureHistory.length){ state.history.push(state.currentView); goToInterface(state.futureHistory.pop()); } }
function goHome() { state.history=[]; goToInterface(2); }

// ================= CRUD LOGIC =================

// 1. MIEMBROS / PROFESORES (FLIP CARDS)
function saveMember() {
    const data = {
        name: val('mem-name'), last: val('mem-last'), age: val('mem-age'),
        spec: val('mem-spec'), future: val('mem-future'), color: val('mem-color'),
        music: val('mem-music'), photo: val('mem-photo') || 'https://via.placeholder.com/150',
        courseId: state.selectedCourse, type: state.currentCategory // 'integrantes' o 'profesores'
    };
    db.collection("members").add(data).then(()=>{ showToast("Guardado"); closeModal('member-modal'); fetchMembers(); });
}

function fetchMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('v4-title').innerText = state.currentCategory.toUpperCase();

    db.collection("members").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            // Lógica tarjeta Spotify Flip
            const div = document.createElement('div'); div.className = 'flip-card';
            div.onclick = function() { this.classList.toggle('flipped'); };
            
            // Embed YouTube audio (small iframe)
            let ytEmbed = '';
            if(d.music && d.music.includes('youtu')) {
                const id = d.music.split('v=')[1] || d.music.split('/').pop();
                ytEmbed = `<iframe class="music-embed" src="https://www.youtube.com/embed/${id}" frameborder="0"></iframe>`;
            }

            div.innerHTML = `
                <div class="flip-inner">
                    <div class="flip-front">
                        <img src="${d.photo}">
                        <h3>${d.name} ${d.last}</h3>
                        <p>${d.spec}</p>
                    </div>
                    <div class="flip-back" style="border-top: 3px solid ${d.color || '#fff'}">
                        <h3>INFO</h3>
                        <p><strong>Edad:</strong> ${d.age}</p>
                        <p><strong>Futuro:</strong> ${d.future}</p>
                        <p><strong>Color:</strong> ${d.color}</p>
                        ${ytEmbed}
                        ${state.isAdmin ? `<button style="margin-top:10px;background:red;color:white;border:none;padding:5px;" onclick="deleteDoc('members','${doc.id}')">Borrar</button>` : ''}
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    });
}

// 2. ALBUMES & MEDIA
function createAlbum() {
    db.collection("albums").add({
        name: val('new-album-name'), cover: val('new-album-cover'),
        courseId: state.selectedCourse, type: state.currentCategory
    }).then(()=>{ showToast("Álbum Creado"); closeModal('album-modal'); fetchAlbums(); });
}

function fetchAlbums() {
    const list = document.getElementById('albums-list'); list.innerHTML = '';
    document.getElementById('v5-title').innerText = state.currentCategory.toUpperCase().replace('_', ' ');

    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
                <div class="album-item" onclick="openAlbum('${doc.id}','${d.name}')">
                    <img src="${d.cover}" class="album-img">
                    <div class="album-title">${d.name}</div>
                    ${state.isAdmin ? `<button onclick="event.stopPropagation();deleteDoc('albums','${doc.id}')" style="position:absolute;top:0;right:0;background:red;color:white;">X</button>` : ''}
                </div>`;
        });
    });
}
function openAlbum(id, name) { state.currentAlbumId = id; document.getElementById('album-name-display').innerText = name; goToInterface(6); }

function uploadMedia() {
    db.collection("media").add({
        url: val('new-media-url'), albumId: state.currentAlbumId, courseId: state.selectedCourse
    }).then(()=>{ showToast("Subido"); closeModal('media-modal'); fetchMedia(); });
}

function fetchMedia() {
    const list = document.getElementById('media-list'); list.innerHTML = '';
    db.collection("media").where("albumId","==",state.currentAlbumId).get().then(snap => {
        snap.forEach(doc => {
            const url = doc.data().url;
            let content = '';
            if(url.includes('youtu')) {
                const id = url.split('v=')[1] || url.split('/').pop();
                content = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" frameborder="0"></iframe>`;
            } else {
                content = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
            }
            list.innerHTML += `<div class="media-item">${content} ${state.isAdmin ? `<button onclick="deleteDoc('media','${doc.id}')" style="display:block;width:100%;background:red;color:white;">X</button>`:''}</div>`;
        });
    });
}
function setMediaSize(size) {
    document.getElementById('media-list').className = `media-grid ${size}`;
}

// 3. PREMIOS
function saveAwardVideo() {
    const url = val('award-video-input');
    db.collection("settings").doc("video_"+state.selectedCourse).set({url:url}).then(()=>fetchAwardCategories());
}
function saveCategory() {
    db.collection("award_cats").add({ name: val('cat-name'), cover: val('cat-cover'), courseId: state.selectedCourse }).then(()=>{ closeModal('category-modal'); fetchAwardCategories(); });
}
function fetchAwardCategories() {
    // Video
    db.collection("settings").doc("video_"+state.selectedCourse).get().then(doc=>{
        if(doc.exists) {
            const id = doc.data().url.split('v=')[1];
            document.getElementById('awards-main-video').innerHTML = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${id}" frameborder="0"></iframe>`;
        }
    });
    // Cats
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_cats").where("courseId","==",state.selectedCourse).get().then(snap=>{
        snap.forEach(doc=>{
            const d = doc.data();
            list.innerHTML += `
                <div class="album-item" onclick="openAwardCat('${doc.id}','${d.name}')">
                    <img src="${d.cover}" class="album-img">
                    <div class="album-title">${d.name}</div>
                </div>`;
        });
    });
}
function openAwardCat(id, name) { state.currentAwardCat = id; document.getElementById('cat-title-display').innerText = name; goToInterface(8); }

function saveNominee() {
    db.collection("awards").add({
        name: val('nom-name'), photo: val('nom-photo'), cert: val('nom-cert'),
        type: val('nom-type'), catId: state.currentAwardCat, courseId: state.selectedCourse
    }).then(()=>{ closeModal('nominee-modal'); fetchAwards(); });
}
function fetchAwards() {
    const nList = document.getElementById('nominees-list'); nList.innerHTML = '';
    const wList = document.getElementById('winner-display'); wList.innerHTML = '';

    db.collection("awards").where("catId","==",state.currentAwardCat).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'nominee') {
                nList.innerHTML += `<div class="nominee-card"><img src="${d.photo}" class="nom-img"><p>${d.name}</p></div>`;
            } else {
                wList.innerHTML += `
                    <div class="winner-card" onclick="openCert('${d.cert}','${d.name}')">
                        <img src="${d.photo}" class="win-img">
                        <h2>${d.name}</h2>
                        <p style="color:gold;font-size:0.8rem;">(Click para Certificado)</p>
                    </div>`;
            }
        });
    });
}
function openCert(url, name) {
    document.getElementById('certificate-modal').classList.remove('hidden');
    document.getElementById('cert-img-display').src = url;
    document.getElementById('cert-name-display').innerText = name;
}

// 4. INFO
function saveSocial() {
    db.collection("info").add({
        type: val('social-type'), name: val('social-name'), val: val('social-val'), courseId: state.selectedCourse
    }).then(()=>{ closeModal('social-modal'); fetchInfo(); });
}
function fetchInfo() {
    const sList = document.getElementById('info-socials'); sList.innerHTML = '';
    const cList = document.getElementById('info-contacts'); cList.innerHTML = '';
    
    // Colores Apps
    const colors = { 'facebook': '#1877F2', 'instagram': '#E1306C', 'tiktok': '#000', 'youtube': '#FF0000', 'github': '#333' };

    db.collection("info").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'social') {
                const bg = colors[d.name.toLowerCase()] || '#333';
                sList.innerHTML += `<a href="${d.val}" target="_blank" class="social-item-btn" style="background:${bg}">${d.name}</a>`;
            } else {
                cList.innerHTML += `<div class="contact-item"><i class="fas fa-phone"></i> <strong>${d.name}:</strong> ${d.val}</div>`;
            }
        });
    });
}

// ================= BÚSQUEDA GLOBAL =================
function globalSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const res = document.getElementById('search-results');
    if(term.length < 2) { res.classList.add('hidden'); return; }
    res.classList.remove('hidden');
    res.innerHTML = '';
    
    // Buscar miembros
    db.collection("members").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.name.toLowerCase().includes(term)) {
                res.innerHTML += `<div style="padding:10px; border-bottom:1px solid #333;">${d.name} ${d.last} (${d.type})</div>`;
            }
        });
    });
}

// ================= UTILIDADES =================
function toggleAdmin() {
    if(state.isAdmin) { state.isAdmin = false; document.getElementById('admin-btn').innerText="ADMIN: OFF"; updateAdminUI(); }
    else document.getElementById('password-modal').classList.remove('hidden');
}
function verifyPassword() {
    if(val('admin-pass-input') === 'admin2') {
        state.isAdmin = true; closeModal('password-modal');
        document.getElementById('admin-btn').innerText="ADMIN: ON"; updateAdminUI();
    } else alert("Error");
}
function updateAdminUI() { document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !state.isAdmin)); }
function val(id) { return document.getElementById(id).value; }
function showToast(msg, type='success') {
    const t = document.createElement('div'); t.innerText = msg;
    t.style.cssText = `position:fixed;top:20px;right:20px;padding:15px;background:${type=='error'?'red':'green'};color:white;border-radius:5px;z-index:4000;`;
    document.body.appendChild(t); setTimeout(()=>t.remove(), 3000);
}
function deleteDoc(col, id) { if(confirm("¿Eliminar?")) db.collection(col).doc(id).delete().then(()=> goToInterface(state.currentView)); }

// Modales helpers
function openMemberModal() { document.getElementById('member-modal').classList.remove('hidden'); }
function openAlbumModal() { document.getElementById('album-modal').classList.remove('hidden'); }
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function openCategoryModal() { document.getElementById('category-modal').classList.remove('hidden'); }
function openNomineeModal(type) { document.getElementById('nominee-modal').classList.remove('hidden'); document.getElementById('nom-type').value=type; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }