// CONFIGURACIÓN FIREBASE
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

// ESTADO
const state = {
    currentView: 1, history: [], futureHistory: [],
    isAdmin: false, selectedCourse: null, currentCategory: null, currentAlbumId: null, currentAwardCat: null
};

// SONIDO
document.addEventListener('click', () => {
    const audio = document.getElementById('click-sound');
    if(audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
});

// NAVEGACIÓN
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return showToast("Selecciona curso", "error");
    if(state.currentView !== viewId) { state.history.push(state.currentView); state.futureHistory = []; }
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    document.getElementById('loader-overlay').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loader-overlay').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        const header = document.getElementById('global-header');
        if(viewId > 1) {
            header.classList.remove('hidden');
            document.getElementById('header-title').innerText = state.selectedCourse;
        } else header.classList.add('hidden');

        if(viewId === 4) renderMembers(); // IMAGEN 4
        if(viewId === 5) renderAlbums();
        if(viewId === 6) renderMedia();
        if(viewId === 7) renderAwardMain(); // VIDEO CORREGIDO
        if(viewId === 8) renderAwardsDetail();
        if(viewId === 9) renderInfo(); // IMAGEN 3

        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        document.getElementById(`view-${viewId}`).classList.add('fade-in');
        state.currentView = viewId;
        updateAdminUI();
    }, 500);
}

function selectCourse(name) { state.selectedCourse = name; goToInterface(3); }
function goHome() { state.history = []; goToInterface(2); }
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); goToInterface(state.history.pop()); } }
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); goToInterface(state.futureHistory.pop()); } }

// --- RENDERIZADO MIEMBROS (ESTILO IMAGEN 4 - ICONOS) ---
function renderMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('v4-title').innerText = state.currentCategory.toUpperCase();
    
    db.collection("members").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            // Extracción segura del ID de video para el botón de música
            let musicBtn = '';
            if(d.music && d.music.length > 5) {
                musicBtn = `<button class="music-btn-small" onclick="window.open('${d.music}')"><i class="fas fa-play"></i> Música</button>`;
            }

            list.innerHTML += `
                <div class="member-data-card">
                    <div class="mem-img-box">
                        <img src="${d.photo || 'https://via.placeholder.com/150'}">
                    </div>
                    <div class="mem-info-list">
                        <div class="info-row" style="font-size:1.2rem; color:white; border:none; margin-bottom:5px;">
                            ${d.name} ${d.last} ${state.isAdmin ? `<i class="fas fa-trash" style="color:red; cursor:pointer;" onclick="deleteDoc('members','${doc.id}')"></i>` : ''}
                        </div>
                        <div class="info-row"><i class="fas fa-cake-candles"></i> <strong>Edad:</strong> ${d.age || '-'}</div>
                        <div class="info-row"><i class="fas fa-briefcase"></i> <strong>Esp:</strong> ${d.spec || '-'}</div>
                        <div class="info-row"><i class="fas fa-rocket"></i> <strong>Futuro:</strong> ${d.future || '-'}</div>
                        <div class="info-row"><i class="fas fa-palette"></i> <strong>Color:</strong> ${d.color || '-'}</div>
                        <div class="info-row" style="border:none;">${musicBtn}</div>
                    </div>
                </div>
            `;
        });
    });
}

function saveMember() {
    const data = {
        name: val('mem-name'), last: val('mem-last'), age: val('mem-age'), spec: val('mem-spec'),
        future: val('mem-future'), color: val('mem-color'), music: val('mem-music'), photo: val('mem-photo'),
        courseId: state.selectedCourse, type: state.currentCategory
    };
    db.collection("members").add(data).then(()=>{ closeModal('member-modal'); renderMembers(); });
}

// --- INFO (IMAGEN 3) ---
function renderInfo() {
    const sList = document.getElementById('info-social-list'); sList.innerHTML = '';
    const cList = document.getElementById('info-contact-list'); cList.innerHTML = '';

    const colors = {'facebook':'#1877F2', 'instagram':'#E1306C', 'tiktok':'#000', 'youtube':'#FF0000'};
    const icons = {'facebook':'fa-facebook', 'instagram':'fa-instagram', 'tiktok':'fa-tiktok', 'youtube':'fa-youtube'};

    db.collection("info").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'social') {
                const icon = icons[d.name.toLowerCase()] || 'fa-link';
                sList.innerHTML += `<a href="${d.val}" target="_blank" class="social-row"><i class="fab ${icon}"></i> ${d.name}</a>`;
            } else {
                cList.innerHTML += `<div class="social-row"><i class="fas fa-phone"></i> ${d.name}: ${d.val}</div>`;
            }
        });
    });
}

// --- PREMIOS & VIDEO CORREGIDO ---
function extractVideoID(url) {
    if(!url) return null;
    let id = '';
    url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if(url[2] !== undefined) {
        id = url[2].split(/[^0-9a-z_\-]/i);
        id = id[0];
    } else {
        id = url;
    }
    return id;
}

function renderAwardMain() {
    // Carga video principal
    db.collection("settings").doc("video_"+state.selectedCourse).get().then(doc => {
        const box = document.getElementById('main-video-player');
        if(doc.exists && doc.data().url) {
            const id = extractVideoID(doc.data().url);
            box.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
        } else {
            box.innerHTML = '<p style="color:#666; padding-top:200px;">Sin video</p>';
        }
    });
    // Categorias
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_cats").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="album-card" onclick="openAwardDetail('${doc.id}','${d.name}')"><img src="${d.cover}" class="album-thumb"><div style="padding:10px;">${d.name}</div></div>`;
        });
    });
}
function saveAwardVideo() {
    const url = val('award-video-url');
    db.collection("settings").doc("video_"+state.selectedCourse).set({url:url}).then(()=>renderAwardMain());
}
function openAwardDetail(id, name) { state.currentAwardCat = id; document.getElementById('cat-display-title').innerText = name; goToInterface(8); }

// --- DETALLE PREMIOS (CERTIFICADO IMAGEN 5) ---
function renderAwardsDetail() {
    const nList = document.getElementById('nominees-list'); nList.innerHTML = '';
    const wList = document.getElementById('winner-display'); wList.innerHTML = '';

    db.collection("awards").where("catId","==",state.currentAwardCat).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'nominee') {
                nList.innerHTML += `<div style="text-align:center"><img src="${d.photo}" class="nominee-pic"><p>${d.name}</p></div>`;
            } else {
                // Ganador: Click abre modal certificado
                wList.innerHTML += `<div style="text-align:center" onclick="openCert('${d.cert}')"><img src="${d.photo}" class="winner-pic"><h3 style="color:gold">${d.name}</h3><small>(Ver Certificado)</small></div>`;
            }
        });
    });
}
function openCert(url) {
    document.getElementById('certificate-modal').classList.remove('hidden');
    document.getElementById('cert-img-display').src = url;
}

// --- UTILIDADES CRUD GENÉRICAS ---
function val(id) { return document.getElementById(id).value; }
function deleteDoc(col, id) { if(confirm("Borrar?")) db.collection(col).doc(id).delete().then(()=>goToInterface(state.currentView)); }
function toggleAdmin() { if(state.isAdmin){state.isAdmin=false; updateAdminUI();}else document.getElementById('password-modal').classList.remove('hidden'); }
function verifyPassword() { if(val('admin-pass-input')==='admin2'){ state.isAdmin=true; closeModal('password-modal'); updateAdminUI();} else alert("Error"); }
function updateAdminUI() { 
    document.getElementById('admin-trigger').innerText = state.isAdmin ? "ADMIN: ON" : "MODO ADMIN";
    document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('hidden', !state.isAdmin)); 
}
function showToast(msg, type) { 
    const t = document.createElement('div'); t.innerText=msg; 
    t.style.cssText=`position:fixed;top:20px;right:20px;padding:10px;background:${type=='error'?'red':'green'};color:white;`;
    document.body.appendChild(t); setTimeout(()=>t.remove(),3000); 
}

// Modales
function openMemberModal() { document.getElementById('member-modal').classList.remove('hidden'); }
function openAlbumModal() { document.getElementById('album-modal').classList.remove('hidden'); }
function openMediaModal() { document.getElementById('media-modal').classList.remove('hidden'); }
function openCategoryModal() { document.getElementById('category-modal').classList.remove('hidden'); }
function openNomineeModal(type) { document.getElementById('nominee-modal').classList.remove('hidden'); document.getElementById('nom-type').value = type; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Albumes y Media
function createAlbum() { db.collection("albums").add({name:val('new-album-name'), cover:val('new-album-cover'), courseId:state.selectedCourse, type:state.currentCategory}).then(()=>{closeModal('album-modal'); renderAlbums();}); }
function renderAlbums() {
    const list = document.getElementById('albums-list'); list.innerHTML='';
    document.getElementById('v5-title').innerText = state.currentCategory.toUpperCase();
    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap=>{
        snap.forEach(doc=>{
            const d=doc.data();
            list.innerHTML+=`<div class="album-card" onclick="state.currentAlbumId='${doc.id}';document.getElementById('album-title').innerText='${d.name}';goToInterface(6)"><img src="${d.cover}" class="album-thumb"><p style="padding:10px;text-align:center">${d.name}</p></div>`;
        });
    });
}
function uploadMedia() { db.collection("media").add({url:val('new-media-url'), albumId:state.currentAlbumId}).then(()=>{closeModal('media-modal'); renderMedia();}); }
function renderMedia() {
    const list = document.getElementById('media-list'); list.innerHTML='';
    db.collection("media").where("albumId","==",state.currentAlbumId).get().then(snap=>{
        snap.forEach(doc=>{
            const url = doc.data().url;
            let content = url.includes('youtu') ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${extractVideoID(url)}" frameborder="0"></iframe>` : `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
            list.innerHTML+=`<div style="background:#111;border:1px solid #333">${content}</div>`;
        });
    });
}
function setSize(s) { document.getElementById('media-list').className=`media-grid ${s}`; }
function saveSocial() { db.collection("info").add({type:val('social-type'), name:val('social-name'), val:val('social-val'), courseId:state.selectedCourse}).then(()=>{closeModal('social-modal'); renderInfo();}); }