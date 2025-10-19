const USERS_DB_KEY = 'colorAnalyzerUsers';

// ATENÇÃO: Esta é uma função de hash insegura, apenas para demonstração.
// Em um ambiente real, use bibliotecas criptográficas robustas (ex: bcrypt) no backend.
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Converte para um inteiro de 32bit
    }
    return hash.toString();
}

function getCurrentUserEmail() {
    return sessionStorage.getItem('currentUser');
}

function getUserData() {
    const email = getCurrentUserEmail();
    if (!email) return null;

    const allUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
    return allUsers[email] || null;
}

function saveUserData(userData) {
    const email = getCurrentUserEmail();
    if (!email || !userData) return;

    const allUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
    allUsers[email] = userData;
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(allUsers));
}

function loadAnalysisHistoryFromStorage() {
    try {
        const userData = getUserData();
        const history = userData ? userData.analysisHistory : [];
        return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (e) {
        console.error("Falha ao carregar o histórico:", e);
        return [];
    }
}

function saveAnalysisHistoryToStorage(newHistory) {
    try {
        const userData = getUserData();
        if (userData) {
            userData.analysisHistory = newHistory;
            saveUserData(userData);
        }
    } catch (e) {
        alert("Não foi possível salvar a análise. Verifique as permissões de armazenamento do navegador.");
        console.error("Falha ao salvar o histórico:", e);
    }
}

function loadPaletteFromStorage() {
    try {
        const userData = getUserData();
        return userData ? userData.referencePalette : [];
    } catch (e) {
        console.error("Falha ao carregar a paleta:", e);
        return [];
    }
}

function savePaletteToStorage(newPalette) {
    const userData = getUserData();
    if (userData) {
        userData.referencePalette = newPalette;
        saveUserData(userData);
    }
}

function saveAnalysisNameToStorage(name) {
    try {
        const userData = getUserData();
        if (userData) {
            userData.analysisName = name;
            saveUserData(userData);
        }
    } catch (e) {
        console.error("Falha ao salvar o nome da análise:", e);
    }
}

function loadAnalysisNameFromStorage() {
    try {
        const userData = getUserData();
        return userData ? userData.analysisName || '' : '';
    } catch (e) {
        console.error("Falha ao carregar o nome da análise:", e);
        return '';
    }
}

function interpretDeltaE(deltaE) {
    if (deltaE < 1) return { text: "Diferença imperceptível", class: "badge-imperceptible" };
    if (deltaE < 2) return { text: "Diferença apenas perceptível", class: "badge-slight" };
    if (deltaE < 3.5) return { text: "Diferença perceptível (observador treinado)", class: "badge-noticeable" };
    if (deltaE < 5) return { text: "Diferença claramente perceptível", class: "badge-clear" };
    if (deltaE < 10) return { text: "Diferença significativa", class: "badge-significant" };
    return { text: "Cores muito diferentes", class: "badge-very-different" };
}