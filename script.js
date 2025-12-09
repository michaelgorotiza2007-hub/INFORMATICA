// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDX8LzYRES0o8t7szn_l6UjNnbA0XEAAoE",
  authDomain: "informatica-aea9a.firebaseapp.com",
  projectId: "informatica-aea9a",
  storageBucket: "informatica-aea9a.firebasestorage.app",
  messagingSenderId: "917780830590",
  appId: "1:917780830590:web:f35201bd8843f2f08f3b2f"
};

const app = firebase.initializeApp(firebaseConfig);
const dbFirestore = firebase.firestore();

// ESTADO GLOBAL
const state = {
    currentView: 1,
    history: [],
    isModerator: false,
    selectedCourse: '',
    currentCategory: '', 
    editingId: null
};

// DATOS MOCKUP (Se actualizan en memoria para la demo)
let db = {
    members: [
        { id: 1, name: 'Juan', last: 'Perez', nick: 'Juancho', music: 'Rock', year: '2005', prof: 'Ingeniero', photo: 'https://via.placeholder.com/90' },
        { id: 2, name: 'Maria', last: 'Lopez', nick: 'Mary', music: 'Pop', year: '2006', prof: 'Doctora', photo: 'https://via.placeholder.com/90' }
    ],
    albums: [
        { id: 1, name: 'Paseo 2024', type: 'fotos' },
        { id: 2, name: 'Navidad', type: 'videos' }
    ],
    winners: [
        { id: 1, type: 'nominado', img: 'https://via.placeholder.com/100' },
        { id: 2, type: 'ganador', img: 'https://via.placeholder.com/150' }
    ]
};

// ==========================================
// NOTIFICACIONES (TOASTS)
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icono según tipo
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-triangle"></i>';
    
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            ${icon} <span>${message}</span>
        </div>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);
    playSound();

    // Eliminar después de 5 segundos
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function playSound() {
    const audio = document.getElementById('click-sound');
    if(audio) { audio.currentTime = 0; audio.play().catch(e => {}); }
}

// ==========================================
// MODALES Y SEGURIDAD
// ==========================================
function handleModeratorClick(e) {
    e.preventDefault(); // Evita check automático
    const checkbox = document.getElementById('mod-checkbox');
    if(!checkbox.checked) {
        // Abrir modal password
        document.getElementById('password-modal').classList.remove('hidden');
        document.getElementById('admin-pass-input').value = '';
        document.getElementById('admin-pass-input').focus();
    } else {
        // Desactivar modo
        checkbox.checked = false;
        state.isModerator = false;
        showToast("Modo Moderador Desactivado", "error");
        updateUI();
    }
}

function verifyPassword() {
    const pass = document.getElementById('admin-pass-input').value;
    if(pass === 'admin2') {
        document.getElementById('mod-checkbox').checked = true;
        state.isModerator = true;
        closeModal('password-modal');
        showToast("¡Modo Moderador Activado!", "success");
        updateUI();
    } else {
        showToast("Contraseña Incorrecta", "error");
        document.getElementById('admin-pass-input').value = '';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ==========================================
// NAVEGACIÓN
// ==========================================
function goToInterface(viewId, param = null) {
    playSound();
    if(state.currentView !== viewId) state.history.push(state.currentView);
    
    if(viewId === 4 || viewId === 5) state.currentCategory = param;

    document.getElementById('loading-screen').classList.remove('hidden');
    
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        
        // Ocultar todas las secciones
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');

        // Header Logic
        if(viewId > 1) document.getElementById('global-header').classList.remove('hidden');
        else document.getElementById('global-header').classList.add('hidden');

        // Search Bar Logic
        const searchBox = document.getElementById('search-bar-container');
        if([3, 4, 5, 6, 8].includes(viewId)) searchBox.classList.remove('hidden');
        else searchBox.classList.add('hidden');

        // Render Views
        if(viewId === 4) renderMembers();
        if(viewId === 5) renderAlbums();
        if(viewId === 8) renderWinners();

        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        state.currentView = viewId;
        updateUI();
    }, 1000); // 1s de carga
}

function selectCourse(name) {
    state.selectedCourse = name;
    document.getElementById('header-course-name').innerText = name;
    goToInterface(3);
}

function goBack() {
    if(state.history.length > 0) {
        const prev = state.history.pop();
        goToInterface(prev); 
        // Nota: goToInterface empuja al historial, para un back real deberíamos ajustar la lógica, 
        // pero para esta demo funcional está bien así.
    }
}

function goHome() { state.history = [1]; goToInterface(2); }
function goForward() { showToast("No hay historial futuro", "error"); }

// ==========================================
// LÓGICA DE CRUD Y EDICIÓN
// ==========================================

function updateUI() {
    // Mostrar/Ocultar FABs
    document.querySelectorAll('.fab').forEach(fab => {
        if(state.isModerator) fab.classList.remove('hidden');
        else fab.classList.add('hidden');
    });
    // Mostrar/Ocultar botones de borrar/editar
    document.querySelectorAll('.card-actions').forEach(act => {
        if(state.isModerator) act.style.display = 'flex';
        else act.style.display = 'none';
    });
}

// --- INTEGRANTES / PROFESORES ---
function renderMembers() {
    const list = document.getElementById('members-list');
    document.getElementById('view-4-title').innerText = state.currentCategory.toUpperCase();
    list.innerHTML = '';

    db.members.forEach(m => {
        const div = document.createElement('div');
        div.className = 'member-card';
        div.innerHTML = `
            <img src="${m.photo}" class="member-photo">
            <div class="member-info">
                <h4>${m.name} ${m.last}</h4>
                <p><i class="fas fa-tag"></i> ${m.nick}</p>
                <p><i class="fas fa-music"></i> ${m.music}</p>
                <p><i class="fas fa-graduation-cap"></i> ${m.prof}</p>
            </div>
            <div class="card-actions" style="display: ${state.isModerator ? 'flex' : 'none'}">
                <button class="action-btn" onclick="openEditModal(${m.id})"><i class="fas fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteMember(${m.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

// Abrir Modal de Edición
function openEditModal(id) {
    const modal = document.getElementById('edit-member-modal');
    state.editingId = id;

    if(id) {
        // Modo Editar: Cargar datos existentes
        const m = db.members.find(x => x.id === id);
        document.getElementById('modal-title').innerText = "EDITAR PERFIL";
        document.getElementById('edit-photo').value = m.photo;
        document.getElementById('edit-name').value = m.name;
        document.getElementById('edit-last').value = m.last;
        document.getElementById('edit-nick').value = m.nick;
        document.getElementById('edit-music').value = m.music;
        document.getElementById('edit-year').value = m.year;
        document.getElementById('edit-prof').value = m.prof;
    } else {
        // Modo Crear: Limpiar inputs
        document.getElementById('modal-title').innerText = "AGREGAR NUEVO";
        document.querySelectorAll('#edit-member-modal input').forEach(i => i.value = '');
    }
    
    modal.classList.remove('hidden');
}

// Guardar cambios del Modal
function saveMemberChanges() {
    const name = document.getElementById('edit-name').value;
    const photo = document.getElementById('edit-photo').value || 'https://via.placeholder.com/90';
    
    if(!name) { showToast("El nombre es obligatorio", "error"); return; }

    const newData = {
        id: state.editingId ? state.editingId : Date.now(),
        name: name,
        last: document.getElementById('edit-last').value,
        nick: document.getElementById('edit-nick').value,
        music: document.getElementById('edit-music').value,
        year: document.getElementById('edit-year').value,
        prof: document.getElementById('edit-prof').value,
        photo: photo
    };

    if(state.editingId) {
        // Actualizar existente
        const index = db.members.findIndex(x => x.id === state.editingId);
        db.members[index] = newData;
        showToast("Perfil actualizado correctamente");
    } else {
        // Crear nuevo
        db.members.push(newData);
        showToast("Nuevo integrante agregado");
    }

    closeModal('edit-member-modal');
    renderMembers();
    // Aquí iría dbFirestore.collection('integrantes').doc(id).set(newData);
}

function deleteMember(id) {
    if(confirm("¿Eliminar perfil?")) {
        db.members = db.members.filter(m => m.id !== id);
        renderMembers();
        showToast("Perfil eliminado", "success");
    }
}

// --- ÁLBUMES ---
function renderAlbums() {
    const list = document.getElementById('album-list');
    document.getElementById('view-5-title').innerText = "ÁLBUMES (" + state.currentCategory.toUpperCase() + ")";
    list.innerHTML = '';
    
    db.albums.forEach(a => {
        if(a.type === state.currentCategory) {
            const div = document.createElement('div');
            div.className = 'album-card';
            div.innerHTML = `
                <div class="album-cover"><i class="fas fa-folder"></i></div>
                <h4>${a.name}</h4>
                ${state.isModerator ? `<button style="color:red; background:none; border:none; margin:10px; cursor:pointer;" onclick="deleteAlbum(${a.id})">ELIMINAR</button>` : ''}
            `;
            div.onclick = (e) => {
                if(e.target.tagName !== 'BUTTON') goToInterface(6);
            };
            list.appendChild(div);
        }
    });
}

function addAlbum() {
    const name = prompt("Nombre del nuevo álbum:"); // Podría ser otro modal
    if(name) {
        db.albums.push({ id: Date.now(), name: name, type: state.currentCategory });
        renderAlbums();
        showToast("Álbum creado");
    }
}

// --- GANADORES ---
function renderWinners() {
    const nomDiv = document.getElementById('col-nominados');
    const winDiv = document.getElementById('col-ganadores');
    nomDiv.innerHTML = ''; winDiv.innerHTML = '';

    db.winners.forEach(w => {
        const img = `<img src="${w.img}" class="circle-img">`;
        const btn = state.isModerator ? `<br><button class="btn-cancel" style="padding:2px 10px; font-size:0.7rem; margin-top:5px;">X</button>` : '';
        const html = `<div>${img}${btn}</div>`;
        
        if(w.type === 'nominado') nomDiv.innerHTML += html;
        else winDiv.innerHTML += html;
    });
}

// --- FILTRO ---
function filterContent() {
    const term = document.getElementById('search-input').value.toLowerCase();
    if(state.currentView === 4) {
        document.querySelectorAll('.member-card').forEach(card => {
            card.style.display = card.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    }
}