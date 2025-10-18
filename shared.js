const ANALYSIS_HISTORY_KEY = 'colorAnalysisHistory';

function loadAnalysisHistoryFromStorage() {
    try {
        const savedHistory = window.localStorage.getItem(ANALYSIS_HISTORY_KEY);
        const history = savedHistory ? JSON.parse(savedHistory) : [];
        // Garante a ordenação sempre que for carregado
        return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (e) {
        console.error("Falha ao carregar o histórico:", e);
        return [];
    }
}

function saveAnalysisHistoryToStorage(history) {
    try {
        const historyData = JSON.stringify(history);
        window.localStorage.setItem(ANALYSIS_HISTORY_KEY, historyData);
    } catch (e) {
        alert("Não foi possível salvar a análise. Verifique as permissões de armazenamento do navegador.");
        console.error("Falha ao salvar o histórico:", e);
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