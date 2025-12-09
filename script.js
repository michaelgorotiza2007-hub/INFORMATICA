// ==========================================
// CONFIGURACIÓN DE FIREBASE
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

// ==========================================
// ESTADO GLOBAL (CON HISTORIAL REAL)
// ==========================================
const state = {
    currentView: 1,
    history: [],      // Pila de historial (Atrás)
    futureHistory: [], // Pila de futuro (Adelante)
    isModerator: false,
    selectedCourse: '',
    currentCategory: '', 
    editingId: null
};

// DATOS DE EJEMPLO
let db = {
    members: [
        { id: 1, name: 'Juan', last: 'Perez', nick: 'Juancho', music: 'Rock', year: '2005', prof: 'Ingeniero', photo: 'https://via.placeholder.com/90' }
    ],
    albums: [
        { id: 1, name: 'Paseo 2024', type: 'fotos' }
    ],
    winners: [
        { id: 1, type: 'nominado', img: 'https://via.placeholder.com/100' },
        { id: 2, type: 'ganador', img: 'https://via.placeholder.com/150' }
    ]
};

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
function playSound() {
    const audio = document.getElementById('click-sound');
    if(audio) { audio.currentTime = 0; audio.play().catch(e => {}); }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><i class="fas fa-info-circle"></i> <span>${message}</span></div><div class="toast-progress"></div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
}

// ==========================================
// NAVEGACIÓN (HISTORIAL REAL)
// ==========================================

// Función central para cambiar de vista con simulación de carga
function loadView(viewId) {
    playSound();
    
    // Simulación de carga
    document.getElementById('loading-screen').classList.remove('hidden');
    
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        
        // Ocultar todo
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');

        // Header
        if(viewId > 1) document.getElementById('global-header').classList.remove('hidden');
        else document.getElementById('global-header').classList.add('hidden');

        // Barra de búsqueda
        const searchBox = document.getElementById('search-bar-container');
        if([3, 4, 5, 6, 8].includes(viewId)) searchBox.classList.remove('hidden');
        else searchBox.classList.add('hidden');

        // Renderizado
        if(viewId === 4) renderMembers();
        if(viewId === 5) renderAlbums();
        if(viewId === 8) renderWinners();

        // Mostrar
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        state.currentView = viewId;
        
        // Actualizar UI de moderador
        updateUI();
    }, 800); // 0.8s de carga para que sea fluido
}

// Ir a una interfaz nueva (Borra el futuro)
function goToInterface(viewId, param = null) {
    if(state.currentView === viewId) return;

    // Guardar actual en historial
    state.history.push(state.currentView);
    // Al ir a una ruta nueva, el futuro se borra (como en un navegador)
    state.futureHistory = [];
    
    if(viewId === 4 || viewId === 5) state.currentCategory = param;
    
    loadView(viewId);
}

function selectCourse(name) {
    state.selectedCourse = name;
    document.getElementById('header-course-name').innerText = name;
    goToInterface(3);
}

// BOTÓN RETROCEDER
function goBack() {
    if(state.history.length > 0) {
        // Guardamos el actual en el futuro antes de irnos
        state.futureHistory.push(state.currentView);
        
        // Sacamos el último del pasado
        const prev = state.history.pop();
        
        // Cargamos (sin usar goToInterface para no alterar pilas incorrectamente)
        loadView(prev);
    } else {
        showToast("No hay historial previo", "error");
    }
}

// BOTÓN AVANZAR (Ahora sí funciona)
function goForward() {
    if(state.futureHistory.length > 0) {
        // Guardamos el actual en el historial (pasado)
        state.history.push(state.currentView);
        
        // Sacamos el siguiente del futuro
        const next = state.futureHistory.pop();
        
        loadView(next);
    } else {
        showToast("No hay historial futuro", "error");
    }
}

function goHome() {
    state.history = [state.currentView]; // Reset simple
    state.futureHistory = [];
    goToInterface(2);
}

// ==========================================
// LÓGICA DE MODERADOR (CORREGIDA)
// ==========================================

function handleModeratorClick(e) {
    const checkbox = document.getElementById('mod-checkbox');
    
    if(!checkbox.checked) {
        // Si el usuario intentó apagarlo (ya estaba encendido), se apaga directo
        state.isModerator = false;
        showToast("Modo Moderador Desactivado");
        updateUI();
    } else {
        // Si el usuario intentó encenderlo, detenemos el cambio visual y pedimos clave
        e.preventDefault(); 
        document.getElementById('password-modal').classList.remove('hidden');
        document.getElementById('admin-pass-input').value = '';
        document.getElementById('admin-pass-input').focus();
    }
}

function verifyPassword() {
    const pass = document.getElementById('admin-pass-input').value;
    const checkbox = document.getElementById('mod-checkbox');
    
    if(pass === 'admin2') {
        state.isModerator = true;
        checkbox.checked = true; // Ahora sí lo marcamos visualmente
        closeModal('password-modal');
        showToast("¡Modo Moderador Activado!", "success");
        updateUI();
    } else {
        showToast("Contraseña Incorrecta", "error");
        document.getElementById('admin-pass-input').value = '';
    }
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function updateUI() {
    // Mostrar/Ocultar botones flotantes y de edición
    const displayVal = state.isModerator ? 'flex' : 'none';
    
    document.querySelectorAll('.fab').forEach(fab => {
        fab.classList.toggle('hidden', !state.isModerator);
    });
    
    document.querySelectorAll('.card-actions').forEach(act => {
        act.style.display = displayVal;
    });
    
    document.querySelectorAll('.delete-album-btn').forEach(btn => {
        btn.style.display = displayVal;
    });
}

// ==========================================
// GESTIÓN DE CONTENIDO (CRUD)
// ==========================================

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
                <p>${m.nick}</p>
            </div>
            <div class="card-actions" style="display: ${state.isModerator ? 'flex' : 'none'}">
                <button class="action-btn" onclick="openEditModal(${m.id})"><i class="fas fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteMember(${m.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

function openEditModal(id) {
    state.editingId = id;
    const modal = document.getElementById('edit-member-modal');
    document.getElementById('modal-title').innerText = id ? "EDITAR PERFIL" : "AGREGAR NUEVO";
    
    if(!id) {
        document.querySelectorAll('#edit-member-modal input').forEach(i => i.value = '');
    } else {
        const m = db.members.find(x => x.id === id);
        if(m) {
            document.getElementById('edit-name').value = m.name;
            document.getElementById('edit-last').value = m.last;
            document.getElementById('edit-photo').value = m.photo;
            // Llenar resto de campos...
        }
    }
    modal.classList.remove('hidden');
}

function saveMemberChanges() {
    const name = document.getElementById('edit-name').value;
    if(!name) return showToast("Falta nombre", "error");

    const newData = {
        id: state.editingId || Date.now(),
        name: name,
        last: document.getElementById('edit-last').value,
        nick: document.getElementById('edit-nick').value,
        photo: document.getElementById('edit-photo').value || 'https://via.placeholder.com/90'
    };

    if(state.editingId) {
        const idx = db.members.findIndex(x => x.id === state.editingId);
        db.members[idx] = newData;
    } else {
        db.members.push(newData);
    }
    
    closeModal('edit-member-modal');
    renderMembers();
    showToast("Guardado correctamente");
}

function deleteMember(id) {
    if(confirm("¿Borrar?")) {
        db.members = db.members.filter(x => x.id !== id);
        renderMembers();
    }
}

// Renderizados simples para albums y ganadores
function renderAlbums() {
    const list = document.getElementById('album-list');
    list.innerHTML = '';
    db.albums.forEach(a => {
        if(a.type === state.currentCategory) {
            const div = document.createElement('div');
            div.className = 'album-card';
            div.innerHTML = `
                <div class="album-cover"><i class="fas fa-folder"></i></div>
                <h4>${a.name}</h4>
                <button class="delete-album-btn" style="color:red;background:none;border:none;margin-top:5px;cursor:pointer;display:${state.isModerator?'block':'none'}" onclick="deleteAlbum(${a.id})">ELIMINAR</button>
            `;
            div.onclick = (e) => { if(e.target.tagName !== 'BUTTON') goToInterface(6); };
            list.appendChild(div);
        }
    });
}

function deleteAlbum(id) {
    db.albums = db.albums.filter(a => a.id !== id);
    renderAlbums();
}

function renderWinners() {
    const n = document.getElementById('col-nominados');
    const g = document.getElementById('col-ganadores');
    n.innerHTML = ''; g.innerHTML = '';
    db.winners.forEach(w => {
        const html = `<div><img src="${w.img}" class="circle-img"></div>`;
        if(w.type === 'nominado') n.innerHTML += html;
        else g.innerHTML += html;
    });
}

function addAlbum() {
    const name = prompt("Nombre álbum:");
    if(name) {
        db.albums.push({id: Date.now(), name: name, type: state.currentCategory});
        renderAlbums();
    }
}

function filterContent() {
    // lógica de búsqueda simple
}