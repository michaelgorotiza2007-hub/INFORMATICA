// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDX8LzYRES0o8t7szn_l6UjNnbA0XEAAoE",
  authDomain: "informatica-aea9a.firebaseapp.com",
  projectId: "informatica-aea9a",
  storageBucket: "informatica-aea9a.firebasestorage.app",
  messagingSenderId: "917780830590",
  appId: "1:917780830590:web:f35201bd8843f2f08f3b2f"
};

// Inicializar Firebase (Usando la sintaxis compatible con el HTML anterior)
const app = firebase.initializeApp(firebaseConfig);
const dbFirestore = firebase.firestore();

console.log("Firebase conectado correctamente");

// ==========================================
// 2. LÓGICA DE LA PÁGINA WEB
// ==========================================

// --- ESTADO DE LA APLICACIÓN ---
const state = {
    currentView: 1,
    history: [],
    isModerator: false,
    selectedCourse: '',
    currentCategory: '', // 'integrantes', 'profesores', 'fotos', 'videos'
    currentAlbum: null
};

// --- DATOS DE EJEMPLO (MOCKUP) ---
// Estos datos se muestran mientras llenas tu base de datos real
const db = {
    members: [
        { id: 1, name: 'Juan', last: 'Perez', nick: 'Juancho', music: 'Rock', year: '2005', prof: 'Ingeniero' },
        { id: 2, name: 'Maria', last: 'Lopez', nick: 'Mary', music: 'Pop', year: '2006', prof: 'Doctora' },
        { id: 3, name: 'Carlos', last: 'Ruiz', nick: 'Charly', music: 'Salsa', year: '2005', prof: 'Arquitecto' }
    ],
    albums: [
        { id: 1, name: 'Paseo de Curso 2024', type: 'fotos' },
        { id: 2, name: 'Feria de Ciencias', type: 'fotos' },
        { id: 3, name: 'Video de Navidad', type: 'videos' }
    ],
    winners: [
        { id: 1, type: 'nominado', img: 'https://via.placeholder.com/80/0000FF/808080?text=Nom1' },
        { id: 2, type: 'nominado', img: 'https://via.placeholder.com/80/0000FF/808080?text=Nom2' },
        { id: 3, type: 'ganador', img: 'https://via.placeholder.com/80/FFD700/000000?text=Ganador' }
    ]
};

// --- FUNCIONES AUXILIARES ---
function playSound() {
    const audio = document.getElementById('click-sound');
    if(audio) { 
        audio.currentTime = 0; 
        audio.play().catch(e => console.log("Interacción necesaria para reproducir audio")); 
    }
}

function showLoading(callback) {
    document.getElementById('loading-screen').classList.remove('hidden');
    // Simula 1.5 segundos de carga
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        callback();
    }, 1500); 
}

// --- NAVEGACIÓN ---
function goToInterface(viewId, param = null) {
    playSound();
    
    if(state.currentView !== viewId) {
        state.history.push(state.currentView);
    }

    if(viewId === 4) state.currentCategory = param;
    if(viewId === 5) state.currentCategory = param;
    
    showLoading(() => {
        // Ocultar todo
        document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-1').classList.add('hidden');
        
        // Header
        if(viewId > 1) {
            document.getElementById('global-header').classList.remove('hidden');
        } else {
            document.getElementById('global-header').classList.add('hidden');
        }

        // Barra de búsqueda
        const searchContainer = document.getElementById('search-bar-container');
        if([3, 4, 5, 6, 8].includes(viewId)) {
            searchContainer.classList.remove('hidden');
            document.getElementById('search-input').value = ''; 
            document.getElementById('search-input').placeholder = getSearchPlaceholder(viewId);
        } else {
            searchContainer.classList.add('hidden');
        }

        // Renderizado
        if(viewId === 4) renderMembers();
        if(viewId === 5) renderAlbums();
        if(viewId === 8) renderWinners();

        // Mostrar vista
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        state.currentView = viewId;

        updateModeratorUI();
    });
}

function selectCourse(courseName) {
    state.selectedCourse = courseName;
    document.getElementById('header-course-name').innerText = courseName;
    goToInterface(3);
}

function goBack() {
    playSound();
    if(state.history.length > 0) {
        const prev = state.history.pop();
        showLoading(() => {
             document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
             if(prev === 1) {
                 document.getElementById('view-1').classList.remove('hidden');
                 document.getElementById('global-header').classList.add('hidden');
             } else {
                 document.getElementById(`view-${prev}`).classList.remove('hidden');
                 if(prev === 4) renderMembers();
                 if(prev === 5) renderAlbums();
             }
             state.currentView = prev;
             updateModeratorUI();
        });
    }
}

function goForward() {
    playSound();
    alert("Función no disponible en esta demo.");
}

function goHome() {
    state.history = [1];
    goToInterface(2);
}

// --- MODERADOR ---
function toggleModeratorMode(checkbox) {
    playSound();
    if(checkbox.checked) {
        const password = prompt("Ingrese la clave de moderador:");
        if(password === "admin2") {
            state.isModerator = true;
            alert("Modo Moderador Activado: Ahora los datos que agregues se guardarán en Firebase.");
        } else {
            alert("Clave incorrecta");
            checkbox.checked = false;
            state.isModerator = false;
        }
    } else {
        state.isModerator = false;
        alert("Modo usuario estándar.");
    }
    updateModeratorUI();
    if(state.currentView === 4) renderMembers();
    if(state.currentView === 5) renderAlbums();
    if(state.currentView === 8) renderWinners();
}

function updateModeratorUI() {
    const fabs = document.querySelectorAll('.fab');
    fabs.forEach(fab => {
        if(state.isModerator) fab.classList.remove('hidden');
        else fab.classList.add('hidden');
    });
}

// --- RENDERIZADO VISUAL ---

function renderMembers() {
    const container = document.getElementById('members-list');
    const title = document.getElementById('view-4-title');
    
    if(state.currentCategory) {
        title.innerText = state.currentCategory.toUpperCase();
    }
    
    container.innerHTML = '';
    
    // NOTA: Aquí mostramos los datos 'falsos' (db.members). 
    // Para mostrar los de Firebase real, habría que usar dbFirestore.collection(...).get()
    // pero mantenemos esto simple por ahora.
    db.members.forEach(m => {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <img src="https://via.placeholder.com/80" class="member-photo" alt="Foto">
            <div class="member-info">
                <p><strong>Nombre:</strong> ${m.name}</p>
                <p><strong>Apellido:</strong> ${m.last}</p>
                <p><strong>Apodo:</strong> ${m.nick}</p>
                <p><strong>Música:</strong> ${m.music}</p>
                <p><strong>Año:</strong> ${m.year}</p>
                <p><strong>Prof:</strong> ${m.prof}</p>
                <div class="edit-controls" style="display: ${state.isModerator ? 'flex' : 'none'}">
                    <button class="btn-small btn-edit" onclick="editItem(${m.id})">Editar</button>
                    <button class="btn-small btn-delete" onclick="deleteItem(${m.id})">Borrar</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderAlbums() {
    const container = document.getElementById('album-list');
    const title = document.getElementById('view-5-title');
    
    if(state.currentCategory) {
        title.innerText = "ÁLBUMES DE " + state.currentCategory.toUpperCase();
    }
    
    container.innerHTML = '';
    db.albums.forEach(a => {
        if(a.type === state.currentCategory) {
            const div = document.createElement('div');
            div.className = 'album-card';
            div.innerHTML = `
                <div style="width:100%; height:100px; background:#aaa; border-radius:10px; margin-bottom:10px;"></div>
                <h4>${a.name}</h4>
                <div class="edit-controls" style="display: ${state.isModerator ? 'flex' : 'none'}; justify-content:center; margin-top:5px;">
                    <button class="btn-small btn-delete">X</button>
                </div>
            `;
            div.onclick = (e) => {
                if(!e.target.classList.contains('btn-delete')) {
                    goToInterface(6);
                }
            };
            container.appendChild(div);
        }
    });
}

function renderWinners() {
    const nomContainer = document.getElementById('col-nominados');
    const winContainer = document.getElementById('col-ganadores');
    
    nomContainer.innerHTML = '<h3>NOMINADOS</h3>';
    winContainer.innerHTML = '<h3>GANADOR</h3>';

    db.winners.forEach(w => {
        const div = document.createElement('div');
        div.style.marginBottom = "20px";
        div.innerHTML = `
            <div class="winner-circle"><img src="${w.img}" alt="Winner"></div>
            ${state.isModerator ? '<button class="btn-small btn-delete" style="margin-top:5px;">X</button>' : ''}
        `;
        if(w.type === 'nominado') nomContainer.appendChild(div);
        else winContainer.appendChild(div);
    });
}

function getSearchPlaceholder(viewId) {
    switch(viewId) {
        case 3: return "Buscar sección...";
        case 4: return `Buscar ${state.currentCategory}...`;
        case 5: return "Buscar álbum...";
        case 6: return "Buscar foto/video...";
        case 8: return "Buscar ganador...";
        default: return "Buscar...";
    }
}

function filterContent() {
    const query = document.getElementById('search-input').value.toLowerCase();
    if(state.currentView === 4) {
        const cards = document.querySelectorAll('.member-card');
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            card.style.display = text.includes(query) ? 'flex' : 'none';
        });
    }
}

// ==========================================
// 3. FUNCIONES DE BASE DE DATOS (FIREBASE)
// ==========================================

function addItem(type) {
    if(!state.isModerator) return;
    
    // Ejemplo de cómo guardar un Integrante en Firebase
    if(type === 'member') {
        let name = prompt("Nombre:");
        let last = prompt("Apellido:");
        let nick = prompt("Apodo:");
        
        if(name && last) {
            playSound();
            
            // Guardar en Firebase Firestore
            dbFirestore.collection("integrantes").add({
                nombre: name,
                apellido: last,
                apodo: nick,
                fecha: new Date()
            })
            .then((docRef) => {
                alert("Integrante guardado en Firebase con ID: " + docRef.id);
                // Agregamos visualmente para que se vea sin recargar
                db.members.push({ id: Date.now(), name: name, last: last, nick: nick, music: '-', year: '-', prof: '-' });
                renderMembers();
            })
            .catch((error) => {
                console.error("Error agregando documento: ", error);
                alert("Hubo un error al guardar en Firebase");
            });
        }
    } 
    // Ejemplo simple para Álbumes
    else if (type === 'album') {
        let name = prompt("Nombre del Álbum:");
        if(name) {
            db.albums.push({ id: Date.now(), name: name, type: state.currentCategory });
            renderAlbums();
            alert("Álbum agregado visualmente (Configura la función dbFirestore.add para guardar en la nube)");
        }
    }
    else {
        alert("Funcionalidad para " + type + " en construcción.");
    }
}

function deleteItem(id) {
    if(confirm("¿Estás seguro de borrar este elemento?")) {
        // Aquí deberías agregar dbFirestore.collection(...).doc(id).delete()
        alert("Elemento eliminado visualmente.");
    }
}

function editItem(id) {
    alert("Función de editar en construcción.");
}