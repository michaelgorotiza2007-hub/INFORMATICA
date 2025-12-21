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
    isAdmin: false, selectedCourse: null,
    currentCategory: null, currentAlbumId: null, currentAwardCat: null
};

// Sonido
document.addEventListener('click', () => {
    const audio = document.getElementById('click-sound');
    if(audio) { audio.currentTime=0; audio.play().catch(()=>{}); }
});

// ================= NAVEGACIÓN =================
function goToInterface(viewId, param = null) {
    if(viewId > 2 && !state.selectedCourse) return showToast("Selecciona un perfil", "error");
    if(state.currentView !== viewId) { state.history.push(state.currentView); state.futureHistory=[]; }
    
    // Categorias de contenido
    if(viewId === 4 || viewId === 5) state.currentCategory = param; 
    
    document.getElementById('loader-overlay').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loader-overlay').classList.add('hidden');
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        const header = document.getElementById('global-header');
        if(viewId > 1) {
            header.classList.remove('hidden');
            document.getElementById('header-course-name').innerText = state.selectedCourse;
        } else header.classList.add('hidden');

        // Búsqueda visible desde view 3
        document.getElementById('search-box').classList.toggle('hidden', viewId < 3);

        // Renderizado
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
    }, 400);
}

function selectCourse(name) { state.selectedCourse = name; goToInterface(3); }
function goHome() { state.history=[]; goToInterface(2); }
function goBack() { if(state.history.length) { state.futureHistory.push(state.currentView); goToInterface(state.history.pop()); } }
function goForward() { if(state.futureHistory.length) { state.history.push(state.currentView); goToInterface(state.futureHistory.pop()); } }

// ================= LÓGICA DE DATOS =================

// 1. MIEMBROS
function fetchMembers() {
    const list = document.getElementById('members-list'); list.innerHTML = '';
    document.getElementById('v4-title').innerText = state.currentCategory.toUpperCase();
    
    db.collection("members").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div'); div.className = 'flip-card';
            div.onclick = function() { this.classList.toggle('flipped'); };

            // Embed YT
            let ytEmbed = '';
            if(d.music && d.music.length > 5) {
                const id = extractVideoID(d.music);
                if(id) ytEmbed = `<iframe class="music-embed" src="https://www.youtube.com/embed/${id}" frameborder="0"></iframe>`;
            }

            div.innerHTML = `
                <div class="flip-inner">
                    <div class="flip-front">
                        <img src="${d.photo}">
                        <h3>${d.name} ${d.last}</h3>
                        <p style="color:#aaa">${d.spec}</p>
                    </div>
                    <div class="flip-back" style="border-color:${d.color}">
                        <h3>INFO</h3>
                        <div class="flip-data-row"><strong>Edad:</strong> ${d.age}</div>
                        <div class="flip-data-row"><strong>Futuro:</strong> ${d.future}</div>
                        <div class="flip-data-row"><strong>Color:</strong> ${d.color}</div>
                        ${ytEmbed}
                        ${state.isAdmin ? `<button onclick="deleteDoc('members','${doc.id}')" style="margin-top:10px;background:red;border:none;color:white;cursor:pointer">Borrar</button>` : ''}
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    });
}
function saveMember() {
    const data = {
        name: val('mem-name'), last: val('mem-last'), age: val('mem-age'), spec: val('mem-spec'),
        future: val('mem-future'), color: val('mem-color'), music: val('mem-music'), photo: val('mem-photo'),
        courseId: state.selectedCourse, type: state.currentCategory
    };
    db.collection("members").add(data).then(()=>{ closeModal('member-modal'); fetchMembers(); });
}

// 2. ALBUMS & MEDIA
function fetchAlbums() {
    const list = document.getElementById('albums-list'); list.innerHTML = '';
    document.getElementById('v5-title').innerText = state.currentCategory.toUpperCase();
    db.collection("albums").where("courseId","==",state.selectedCourse).where("type","==",state.currentCategory).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
                <div class="album-item" onclick="openAlbum('${doc.id}','${d.name}')">
                    <img src="${d.cover}" class="album-img">
                    <div class="album-title">${d.name}</div>
                    ${state.isAdmin ? `<button onclick="event.stopPropagation(); deleteDoc('albums','${doc.id}')" style="position:absolute;top:0;right:0;background:red;color:white;border:none;">X</button>`:''}
                </div>`;
        });
    });
}
function openAlbum(id, name) { state.currentAlbumId = id; document.getElementById('album-title-display').innerText = name; goToInterface(6); }

function fetchMedia() {
    const list = document.getElementById('media-list'); list.innerHTML = '';
    db.collection("media").where("albumId","==",state.currentAlbumId).get().then(snap => {
        snap.forEach(doc => {
            const url = doc.data().url;
            let content = url.includes('youtu') ? `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${extractVideoID(url)}" frameborder="0"></iframe>` : `<img src="${url}" class="media-content">`;
            list.innerHTML += `<div class="media-item" style="height:200px;">${content} ${state.isAdmin ? `<button onclick="deleteDoc('media','${doc.id}')" style="position:absolute;top:0;right:0;background:red;color:white;width:20px;">X</button>`:''}</div>`;
        });
    });
}

// 3. PREMIOS
function fetchAwardCategories() {
    // Video Principal
    db.collection("settings").doc("video_"+state.selectedCourse).get().then(doc => {
        const box = document.getElementById('awards-main-video');
        if(doc.exists && doc.data().url) {
             const id = extractVideoID(doc.data().url);
             box.innerHTML = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
        } else box.innerHTML = '<p style="padding:100px;text-align:center;color:#666">Sin Video</p>';
    });
    // Categorias
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    db.collection("award_cats").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="album-item" onclick="openAwardDetail('${doc.id}','${d.name}')"><img src="${d.cover}" class="album-img"><div class="album-title">${d.name}</div></div>`;
        });
    });
}
function openAwardDetail(id, name) { state.currentAwardCat = id; document.getElementById('award-cat-title').innerText = name; goToInterface(8); }

function fetchAwards() {
    const nList = document.getElementById('nominees-list'); nList.innerHTML = '';
    const wList = document.getElementById('winner-display'); wList.innerHTML = '';
    db.collection("awards").where("catId","==",state.currentAwardCat).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'nominee') {
                nList.innerHTML += `<div class="nominee-card"><img src="${d.photo}" class="nom-img"><p>${d.name}</p></div>`;
            } else {
                wList.innerHTML += `<div class="winner-stage" onclick="openCert('${d.cert}')"><img src="${d.photo}" class="win-img"><h3 style="color:gold;margin-top:10px">${d.name}</h3><p style="font-size:0.8rem;color:#888">(Click para Certificado)</p></div>`;
            }
        });
    });
}
function openCert(url) {
    document.getElementById('certificate-modal').classList.remove('hidden');
    document.getElementById('cert-img-display').src = url;
}

// 4. INFO
function fetchInfo() {
    const sList = document.getElementById('info-social-list'); sList.innerHTML = '';
    const cList = document.getElementById('info-contact-list'); cList.innerHTML = '';
    const icons = {'facebook':'fa-facebook', 'instagram':'fa-instagram', 'tiktok':'fa-tiktok', 'youtube':'fa-youtube'};

    db.collection("info").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.type === 'social') {
                const icon = icons[d.name.toLowerCase()] || 'fa-link';
                sList.innerHTML += `<a href="${d.val}" target="_blank" class="social-row"><i class="fab ${icon}"></i> ${d.name}</a>`;
            } else {
                cList.innerHTML += `<div class="social-row"><i class="fas fa-phone"></i> <strong>${d.name}:</strong> ${d.val}</div>`;
            }
        });
    });
}

// ================= UTILIDADES =================
function extractVideoID(url) {
    if(!url) return null;
    let regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    let match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

// Modal Universal Handling
let universalAction = null;
function openUniversalModal(type) {
    const modal = document.getElementById('universal-modal');
    const title = document.getElementById('univ-title');
    const inputs = document.getElementById('univ-inputs');
    const btn = document.getElementById('univ-save-btn');
    
    modal.classList.remove('hidden');
    inputs.innerHTML = '';
    
    if(type === 'album') {
        title.innerText = "NUEVO ÁLBUM";
        inputs.innerHTML = `<input id="uni-1" placeholder="Nombre"><input id="uni-2" placeholder="URL Portada">`;
        btn.onclick = () => {
            db.collection("albums").add({name:val('uni-1'), cover:val('uni-2'), courseId:state.selectedCourse, type:state.currentCategory})
            .then(()=>{ closeModal('universal-modal'); fetchAlbums(); });
        };
    } else if(type === 'media') {
        title.innerText = "SUBIR MULTIMEDIA";
        inputs.innerHTML = `<input id="uni-1" placeholder="URL Imagen o YouTube">`;
        btn.onclick = () => {
            db.collection("media").add({url:val('uni-1'), albumId:state.currentAlbumId})
            .then(()=>{ closeModal('universal-modal'); fetchMedia(); });
        };
    } else if(type === 'category') {
        title.innerText = "NUEVA CATEGORÍA";
        inputs.innerHTML = `<input id="uni-1" placeholder="Nombre"><input id="uni-2" placeholder="URL Fondo">`;
        btn.onclick = () => {
            db.collection("award_cats").add({name:val('uni-1'), cover:val('uni-2'), courseId:state.selectedCourse})
            .then(()=>{ closeModal('universal-modal'); fetchAwardCategories(); });
        };
    } else if(type === 'awardVideo') {
        title.innerText = "VIDEO PRINCIPAL PREMIOS";
        inputs.innerHTML = `<input id="uni-1" placeholder="URL YouTube">`;
        btn.onclick = () => {
            db.collection("settings").doc("video_"+state.selectedCourse).set({url:val('uni-1')})
            .then(()=>{ closeModal('universal-modal'); fetchAwardCategories(); });
        };
    } else if(type === 'social') {
        title.innerText = "NUEVO CONTACTO";
        inputs.innerHTML = `<select id="uni-type" style="width:100%;padding:10px;margin-bottom:10px;background:#000;color:white;border:1px solid #333"><option value="social">Red Social</option><option value="phone">Teléfono</option></select><input id="uni-1" placeholder="Nombre"><input id="uni-2" placeholder="Valor (URL o Número)">`;
        btn.onclick = () => {
             db.collection("info").add({type:val('uni-type'), name:val('uni-1'), val:val('uni-2'), courseId:state.selectedCourse})
             .then(()=>{ closeModal('universal-modal'); fetchInfo(); });
        };
    }
}

// Búsqueda
function globalSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const res = document.getElementById('search-results');
    if(term.length < 2) { res.classList.add('hidden'); return; }
    res.classList.remove('hidden');
    res.innerHTML = '';
    db.collection("members").where("courseId","==",state.selectedCourse).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            if(d.name.toLowerCase().includes(term)) res.innerHTML += `<div style="padding:10px;border-bottom:1px solid #333;background:#111;">${d.name} ${d.last} (${d.type})</div>`;
        });
    });
}

// Helpers
function val(id) { return document.getElementById(id).value; }
function deleteDoc(col, id) { if(confirm("¿Eliminar?")) db.collection(col).doc(id).delete().then(()=>goToInterface(state.currentView)); }
function toggleAdmin() { if(state.isAdmin){state.isAdmin=false; updateAdminUI();}else document.getElementById('password-modal').classList.remove('hidden'); }
function verifyPassword() { if(val('admin-pass-input')==='admin2'){ state.isAdmin=true; closeModal('password-modal'); updateAdminUI();}else alert("Error"); }
function updateAdminUI() { 
    document.getElementById('admin-trigger').innerText = state.isAdmin ? "ADMIN: ON" : "MODO ADMIN: OFF";
    document.querySelectorAll('.admin-only').forEach(el=>el.classList.toggle('hidden', !state.isAdmin)); 
}
function setMediaSize(s) { document.getElementById('media-list').className = `media-grid ${s}`; }
function showToast(m,t) { const el=document.createElement('div'); el.innerText=m; el.style.cssText=`position:fixed;top:20px;right:20px;padding:15px;background:${t=='error'?'red':'green'};color:white;z-index:9999;`; document.body.appendChild(el); setTimeout(()=>el.remove(),3000); }

// Modales Específicos
function openMemberModal() { document.getElementById('member-modal').classList.remove('hidden'); }
function openNomineeModal(type) { 
    document.getElementById('nominee-modal').classList.remove('hidden'); 
    document.getElementById('nom-type').value=type; 
    document.getElementById('winner-only-fields').classList.toggle('hidden', type !== 'winner');
}
function saveNominee() {
    db.collection("awards").add({
        name:val('nom-name'), photo:val('nom-photo'), cert:val('nom-cert'),
        type:val('nom-type'), catId:state.currentAwardCat
    }).then(()=>{ closeModal('nominee-modal'); fetchAwards(); });
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }