document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d', { willReadFrequently: true }) : null;    const zoomCanvas = document.getElementById('zoom-canvas');
    const zoomCtx = zoomCanvas ? zoomCanvas.getContext('2d') : null;
    const uploadBtn = document.getElementById('upload-btn');
    const imageInput = document.getElementById('image-input');
    const imageClickMarker = document.getElementById('image-click-marker');
    const setAsRefBtn = document.getElementById('set-as-ref-btn');
    const addToPaletteBtn = document.getElementById('add-to-palette-btn');
    const saveAnalysisBtn = document.getElementById('save-analysis-btn');
    const paletteList = document.getElementById('palette-list');
    const analysisNameInput = document.getElementById('analysis-name');

    const sampleSizeInput = document.getElementById('sample-size');
    const sampleSizeValue = document.getElementById('sample-size-value');

    const refColorPreview = document.getElementById('ref-color-preview');
    const colorPreview = document.getElementById('color-preview');
    const hexRow = document.getElementById('hex-row');
    const rgbRow = document.getElementById('rgb-row');
    const labRow = document.getElementById('lab-row');
    const lightnessRow = document.getElementById('lightness-row');
    const diffRow = document.getElementById('diff-row');
    const interpretationRow = document.getElementById('interpretation-row');
    const colorMarker = document.getElementById('color-marker');
    const refColorMarker = document.getElementById('ref-color-marker');
    const colorRuler = document.getElementById('color-ruler');
    const colorRulerRef = document.getElementById('color-ruler-ref');
    const refColorMarker2 = document.getElementById('ref-color-marker-2');
    const selColorMarker2 = document.getElementById('sel-color-marker-2');

    let state = {
        originalImage: null,
        activeReferenceColor: null,
        referencePalette: loadPaletteFromStorage(),
        analysisHistory: loadAnalysisHistoryFromStorage(),
        currentSelectedColor: null,
        sampleSize: 5,
        lastClickX: 0,
        lastClickY: 0
    };

    // --- Funções de Conversão de Cor ---
    // Constantes para conversão sRGB -> XYZ (iluminante D65)
    const D65_X = 95.047;
    const D65_Y = 100.0;
    const D65_Z = 108.883;

    // Constantes para a função de transferência XYZ -> Lab
    const LAB_E = 0.008856;
    const LAB_K = 903.3; // (29/3)^3

    function rgbToLab(r, g, b) {
        let rNorm = r / 255;
        let gNorm = g / 255;
        let bNorm = b / 255;

        rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
        gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
        bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

        let x = (rNorm * 0.4124 + gNorm * 0.3576 + bNorm * 0.1805) * 100;
        let y = (rNorm * 0.2126 + gNorm * 0.7152 + bNorm * 0.0722) * 100;
        let z = (rNorm * 0.0193 + gNorm * 0.1192 + bNorm * 0.9505) * 100;

        x = x / D65_X;
        y = y / D65_Y;
        z = z / D65_Z;

        x = x > LAB_E ? Math.pow(x, 1/3) : (LAB_K / 116 * x) + 16/116;
        y = y > LAB_E ? Math.pow(y, 1/3) : (LAB_K / 116 * y) + 16/116;
        z = z > LAB_E ? Math.pow(z, 1/3) : (LAB_K / 116 * z) + 16/116;

        return {
            l: (116 * y) - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    function calculateDeltaE(lab1, lab2) {
        const deltaL = lab1.l - lab2.l;
        const deltaA = lab1.a - lab2.a;
        const deltaB = lab1.b - lab2.b;
        return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
    }

    function rgbToHex(r, g, b) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // --- Amostragem ---
    function getAverageColor(x, y, sampleSize) {
        if (!ctx) return { r: 0, g: 0, b: 0 };

        const halfSize = Math.floor(sampleSize / 2);
        let totalR = 0, totalG = 0, totalB = 0, count = 0;

        const startX = Math.max(0, x - halfSize);
        const startY = Math.max(0, y - halfSize);
        const endX = Math.min(canvas.width, x + halfSize + 1);
        const endY = Math.min(canvas.height, y + halfSize + 1);

        const width = endX - startX;
        const height = endY - startY;
        
        const imageData = ctx.getImageData(startX, startY, width, height);
        const data = imageData.data;
        count = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            totalR += data[i]; totalG += data[i+1]; totalB += data[i+2];
        }

        return {
            r: Math.round(totalR / count),
            g: Math.round(totalG / count),
            b: Math.round(totalB / count)
        };
    }

    function drawZoomPreview(x, y) {
        if (!zoomCtx || !ctx) return;

        const zoomAreaSize = 21; // Use an odd number for a clear center
        const halfZoom = Math.floor(zoomAreaSize / 2);
        
        zoomCtx.imageSmoothingEnabled = false;
        zoomCtx.clearRect(0, 0, zoomCanvas.width, zoomCanvas.height);

        const startX = Math.max(0, x - halfZoom);
        const startY = Math.max(0, y - halfZoom);
        const width = Math.min(zoomAreaSize, canvas.width - startX);
        const height = Math.min(zoomAreaSize, canvas.height - startY);

        if (width <= 0 || height <= 0) return;

        const imageData = ctx.getImageData(startX, startY, width, height);
        
        // Draw the magnified image pixel by pixel
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
        zoomCtx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, zoomCanvas.width, zoomCanvas.height);

        // Desenha marcador do centro
        const centerX = zoomCanvas.width / 2;
        const centerY = zoomCanvas.height / 2;
        const cellSize = zoomCanvas.width / zoomAreaSize;
        
        zoomCtx.strokeStyle = '#ff0000';
        zoomCtx.lineWidth = 2;
        zoomCtx.strokeRect(centerX - cellSize/2, centerY - cellSize/2, cellSize, cellSize);
    }

    function handleCanvasClick(e) {
        // Prevenir comportamento padrão em eventos de toque para evitar rolagem acidental
        if (e.type === 'touchstart') {
            e.preventDefault();
        }

        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : null;
        const clientX = touch ? touch.clientX : e.clientX;
        const clientY = touch ? touch.clientY : e.clientY;

        // Correção: Calcula a posição relativa ao tamanho real do canvas, não ao tamanho do elemento DOM.
        // Isso corrige o problema de mapeamento em imagens com proporções diferentes (ex: retrato).
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let x = Math.floor((clientX - rect.left) * scaleX);
        let y = Math.floor((clientY - rect.top) * scaleY);

        x = Math.max(0, Math.min(canvas.width - 1, x));
        y = Math.max(0, Math.min(canvas.height - 1, y));

        state.lastClickX = x;
        state.lastClickY = y;

        const avgColor = getAverageColor(x, y, state.sampleSize);
        const lab = rgbToLab(avgColor.r, avgColor.g, avgColor.b);
        
        const selectedColor = {
            r: avgColor.r,
            g: avgColor.g,
            b: avgColor.b,
            lab: lab,
            hex: rgbToHex(avgColor.r, avgColor.g, avgColor.b)
        };

        state.currentSelectedColor = selectedColor;

        if (imageClickMarker) {
            // Calcula a posição do clique relativa ao elemento canvas
            const clickXInCanvas = clientX - rect.left;
            const clickYInCanvas = clientY - rect.top;

            // A posição do marcador é relativa ao .canvas-wrapper.
            // Precisamos adicionar o deslocamento (offset) do canvas dentro do wrapper.
            const markerLeft = canvas.offsetLeft + clickXInCanvas;
            const markerTop = canvas.offsetTop + clickYInCanvas;

            imageClickMarker.style.left = `${markerLeft}px`;
            imageClickMarker.style.top = `${markerTop}px`;
            imageClickMarker.style.visibility = 'visible';
        }

        drawZoomPreview(x, y);
        updateComparisonUI();
        updateButtonStates();
    }

    function handleImageLoad(e) {
        try {
            if (!e.target.files || e.target.files.length === 0) {
                alert('Nenhum arquivo selecionado.');
                return;
            }

            const file = e.target.files[0];

            if (file.type && !file.type.startsWith('image/')) {
                alert('Por favor, selecione um arquivo de imagem válido.');
                return;
            }

            const finalizeImage = (source) => {
                const img = new Image();
                // crossOrigin é necessário para Data URLs e URLs de outros domínios,
                // mas não para Object URLs. Definir como 'anonymous' é uma prática segura.
                img.crossOrigin = 'anonymous';

                let loadTimeout = setTimeout(() => {
                    img.src = '';
                    alert('Tempo excedido ao carregar a imagem. Tente novamente.');
                }, 30000);

                img.onload = () => {
                    clearTimeout(loadTimeout);
                    try {
                        if (!img.complete || !img.naturalWidth) {
                            throw new Error('Imagem carregada mas dimensões indisponíveis');
                        }

                        state.originalImage = img;
                        drawImageOnCanvas(img);
                        if (imageClickMarker) imageClickMarker.style.visibility = 'hidden';
                        if (zoomCtx) zoomCtx.clearRect(0, 0, zoomCanvas.width, zoomCanvas.height);
                        state.activeReferenceColor = null;
                        state.currentSelectedColor = null;
                        updateComparisonUI();
                        updateButtonStates();

                        // Limpa o Object URL para liberar memória, se aplicável
                        if (source.startsWith('blob:')) {
                            URL.revokeObjectURL(source);
                        }
                    } catch (err) {
                        alert(`Erro ao processar a imagem: ${err.message}. Tente uma imagem menor ou de formato diferente.`);
                    }
                };

                img.onerror = () => {
                    clearTimeout(loadTimeout);
                    alert('Erro ao carregar a imagem. O arquivo pode estar corrompido ou em um formato não suportado.');
                };

                img.src = source;
            };

            // Prioriza URL.createObjectURL por ser mais eficiente em memória, especialmente em mobile.
            try {
                const objectUrl = URL.createObjectURL(file);
                finalizeImage(objectUrl);
            } catch (e) {
                // Fallback para FileReader se createObjectURL falhar
                const reader = new FileReader();
                reader.onload = (event) => finalizeImage(event.target.result);
                reader.onerror = () => alert('Falha ao ler o arquivo de imagem com ambos os métodos.');
                reader.readAsDataURL(file);
            }
        } catch (outerErr) {
            alert('Erro inesperado ao carregar imagem.');
        }
    }

    function handleSetAsReference() {
        if (state.currentSelectedColor) {
            setActiveReferenceColor(state.currentSelectedColor);
            updateButtonStates();
        }
    }

    function handleAddToPalette() {
        if (state.currentSelectedColor) {
            const isAlreadyInPalette = state.referencePalette.some(
                color => color.hex === state.currentSelectedColor.hex
            );
            if (!isAlreadyInPalette) {
                state.referencePalette.push(state.currentSelectedColor);
                savePaletteToStorage(state.referencePalette);
                renderPalette();
            }
            updateButtonStates();
        }
    }

    function handleSaveAnalysis() {
        const { activeReferenceColor, currentSelectedColor } = state;
        if (activeReferenceColor && currentSelectedColor) {
            const deltaE = calculateDeltaE(currentSelectedColor.lab, activeReferenceColor.lab);
            const interpretation = interpretDeltaE(deltaE);

            const now = new Date();
            const timestamp = now.toISOString();
            const date = now.toLocaleDateString('pt-BR');
            const time = now.toLocaleTimeString('pt-BR').replace(/:/g, '-');
            const order = (state.analysisHistory.filter(item => item.timestamp.startsWith(timestamp.slice(0, 10))).length + 1).toString().padStart(2, '0');

            const newAnalysis = {
                id: `${date.replace(/\//g, '-')} ${time} #${order}`,
                name: analysisNameInput.value || 'Sem nome',
                refColor: activeReferenceColor,
                selColor: currentSelectedColor,
                deltaE: deltaE,
                interpretation: interpretation,
                timestamp: timestamp,
                // Salva os valores formatados para consistência histórica
                formatted: {
                    ref: {
                        rgb: `(${activeReferenceColor.r}, ${activeReferenceColor.g}, ${activeReferenceColor.b})`,
                        lab: `L*:${activeReferenceColor.lab.l.toFixed(1)} a*:${activeReferenceColor.lab.a.toFixed(1)} b*:${activeReferenceColor.lab.b.toFixed(1)}`
                    },
                    sel: {
                        rgb: `(${currentSelectedColor.r}, ${currentSelectedColor.g}, ${currentSelectedColor.b})`,
                        lab: `L*:${currentSelectedColor.lab.l.toFixed(1)} a*:${currentSelectedColor.lab.a.toFixed(1)} b*:${currentSelectedColor.lab.b.toFixed(1)}`
                    }
                }
            };
            state.analysisHistory.unshift(newAnalysis);
            saveAnalysisHistoryToStorage(state.analysisHistory);
            showTemporaryFeedback(saveAnalysisBtn, 'Análise salva!');
        }
    }

    function showTemporaryFeedback(button, message) {
        const originalText = button.textContent;
        button.textContent = message;
        button.disabled = true;
        setTimeout(() => {
            if (button) { // Verifica se o botão ainda existe no DOM
                button.textContent = originalText;
                updateButtonStates();
            }
        }, 1500); // Exibe o feedback por 1.5 segundos
    }

    function handleSampleSizeChange() {
        state.sampleSize = parseInt(sampleSizeInput.value);
        sampleSizeValue.textContent = `${state.sampleSize}x${state.sampleSize}`;
        
        if (state.currentSelectedColor && state.lastClickX && state.lastClickY) {
            const avgColor = getAverageColor(state.lastClickX, state.lastClickY, state.sampleSize);
            const lab = rgbToLab(avgColor.r, avgColor.g, avgColor.b);
            
            state.currentSelectedColor = {
                r: avgColor.r,
                g: avgColor.g,
                b: avgColor.b,
                lab: lab,
                hex: rgbToHex(avgColor.r, avgColor.g, avgColor.b)
            };
            
            drawZoomPreview(state.lastClickX, state.lastClickY);
            updateComparisonUI();
        }
    }

    // Event Listeners
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            imageInput.click(); // Aciona o input de arquivo oculto
        });
    }
    if (imageInput) imageInput.addEventListener('change', handleImageLoad);
    if (canvas && ctx) {
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('touchstart', handleCanvasClick, { passive: false });
    }
    if (setAsRefBtn) setAsRefBtn.addEventListener('click', handleSetAsReference);
    // Adicionando tratamento para 'touchstart' para melhor responsividade em mobile
    if (setAsRefBtn) setAsRefBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleSetAsReference();
    });
    if (saveAnalysisBtn) saveAnalysisBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleSaveAnalysis();
    });

    if (addToPaletteBtn) addToPaletteBtn.addEventListener('click', handleAddToPalette);
    if (addToPaletteBtn) addToPaletteBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleAddToPalette();
    });

    if (saveAnalysisBtn) saveAnalysisBtn.addEventListener('click', handleSaveAnalysis);
    if (sampleSizeInput) sampleSizeInput.addEventListener('input', handleSampleSizeChange);
    if (analysisNameInput) analysisNameInput.addEventListener('input', () => saveAnalysisNameToStorage(analysisNameInput.value));

    function renderPalette() {
        if (!paletteList) return;
        paletteList.innerHTML = '';
        state.referencePalette.forEach((color, index) => {
            const item = document.createElement('div');
            item.className = 'palette-item';
            item.addEventListener('click', () => setActiveReferenceColor(color));

            if (state.activeReferenceColor && color.hex === state.activeReferenceColor.hex) {
                item.classList.add('active');
            }

            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch';
            swatch.style.backgroundColor = color.hex;
            item.appendChild(swatch);

            const hexText = document.createElement('span');
            hexText.textContent = color.hex.toUpperCase();
            item.appendChild(hexText);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'palette-item-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remover cor';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removePaletteItem(color, index);
            });
            item.appendChild(removeBtn);

            paletteList.appendChild(item);
        });
    }

    function setActiveReferenceColor(color) {
        state.activeReferenceColor = color;
        renderPalette();
        updateComparisonUI();
        updateButtonStates();
        updateRefColorRuler(color);
    }

    function updateRefColorRuler(color) {
        if (!color || !colorRulerRef) return;

        const r = color.r, g = color.g, b = color.b;
        const steps = 10; // Número de variações para um gradiente suave
        const gradientStops = [];

        // Criar variações da cor, mantendo o matiz mas alterando a luminosidade
        for (let i = 0; i <= steps; i++) {
            const factor = i / steps; // 0 = mais escuro, 1 = mais claro
            
            // Para escurecer: multiplicamos os componentes RGB por um fator < 1
            // Para clarear: interpolamos em direção ao branco (255)
            let newR, newG, newB;
            if (factor <= 0.5) {
                // Parte mais escura (0% a 50%)
                const darkFactor = factor * 2; // converte 0-0.5 para 0-1
                newR = Math.round(r * darkFactor);
                newG = Math.round(g * darkFactor);
                newB = Math.round(b * darkFactor);
            } else {
                // Parte mais clara (50% a 100%)
                const lightFactor = (factor - 0.5) * 2; // converte 0.5-1 para 0-1
                newR = Math.round(r + (255 - r) * lightFactor);
                newG = Math.round(g + (255 - g) * lightFactor);
                newB = Math.round(b + (255 - b) * lightFactor);
            }

            // Adicionar ao gradiente
            gradientStops.push(`rgb(${newR}, ${newG}, ${newB}) ${factor * 100}%`);
        }

        // Aplicar o gradiente com todas as variações
        colorRulerRef.style.background = `linear-gradient(to right, ${gradientStops.join(', ')})`;
    }

    function removePaletteItem(color, index) {
        if (state.activeReferenceColor && state.activeReferenceColor.hex === color.hex) {
            state.activeReferenceColor = null;
        }
        state.referencePalette.splice(index, 1);
        savePaletteToStorage(state.referencePalette);
        renderPalette();
        updateComparisonUI();
        updateButtonStates();
    }



    function updateComparisonUI() {
        const refColor = state.activeReferenceColor;
        const selColor = state.currentSelectedColor;

        // Atualizar o gradiente da régua de referência e marcadores
        if (refColor) {
            updateRefColorRuler(refColor);
            
            // Mostrar marcador de referência no centro
            if (refColorMarker2) {
                refColorMarker2.style.left = '50%';
                refColorMarker2.style.visibility = 'visible';
            }

            // Atualizar posição do marcador da cor selecionada
            if (selColor && selColorMarker2) {
                // Calcular a posição relativa baseada no brilho
                const brightnessSel = (selColor.r * 0.299 + selColor.g * 0.587 + selColor.b * 0.114) / 255;
                const brightnessRef = (refColor.r * 0.299 + refColor.g * 0.587 + refColor.b * 0.114) / 255;
                
                // Posição percentual com base na diferença de brilho
                let position;
                if (brightnessSel < brightnessRef) {
                    // Mais escuro que a referência (0% a 50%)
                    position = (brightnessSel / brightnessRef) * 50;
                } else {
                    // Mais claro que a referência (50% a 100%)
                    position = 50 + ((brightnessSel - brightnessRef) / (1 - brightnessRef)) * 50;
                }

                position = Math.max(0, Math.min(100, position)); // Garantir que fique entre 0% e 100%
                selColorMarker2.style.left = `${position}%`;
                selColorMarker2.style.visibility = 'visible';
            } else if (selColorMarker2) {
                selColorMarker2.style.visibility = 'hidden';
            }
        } else {
            // Resetar o gradiente e marcadores quando não houver cor de referência
            if (colorRulerRef) {
                colorRulerRef.style.background = 'linear-gradient(to right, #000000, #808080, #ffffff)';
            }
            if (refColorMarker2) {
                refColorMarker2.style.visibility = 'hidden';
            }
            if (selColorMarker2) {
                selColorMarker2.style.visibility = 'hidden';
            }
        }

        const refHexCell = hexRow.cells[1], selHexCell = hexRow.cells[2];
        const refRgbCell = rgbRow.cells[1], selRgbCell = rgbRow.cells[2];
        const refLabCell = labRow.cells[1], selLabCell = labRow.cells[2];
        const refLightnessCell = lightnessRow.cells[1], selLightnessCell = lightnessRow.cells[2];
        const diffCell = diffRow.cells[1];
        const interpretationCell = interpretationRow.cells[1];

        if (refColor) {
            refColorPreview.style.backgroundColor = refColor.hex;
            refHexCell.textContent = refColor.hex.toUpperCase();
            refRgbCell.textContent = `(${refColor.r}, ${refColor.g}, ${refColor.b})`;
            refLabCell.textContent = `L*:${refColor.lab.l.toFixed(1)} a*:${refColor.lab.a.toFixed(1)} b*:${refColor.lab.b.toFixed(1)}`;
            refLightnessCell.textContent = refColor.lab.l.toFixed(2);
            refColorMarker.style.left = `${refColor.lab.l}%`;
            refColorMarker.style.visibility = 'visible';
            
            if (colorRuler) colorRuler.style.background = `linear-gradient(to right, #000000 0%, #808080 50%, #ffffff 100%)`;
        } else {
            refColorPreview.style.backgroundColor = '#f0f0f0';
            refHexCell.textContent = '-';
            refRgbCell.textContent = '-';
            refLabCell.textContent = '-';
            refLightnessCell.textContent = '-';
            refColorMarker.style.visibility = 'hidden';
            if (colorRuler) colorRuler.style.background = 'linear-gradient(to right, #000000, #808080, #ffffff)';
            if (colorRulerRef) colorRulerRef.style.background = '#f0f0f0';
        }

        if (selColor) {
            colorPreview.style.backgroundColor = selColor.hex;
            selHexCell.textContent = selColor.hex.toUpperCase();
            selRgbCell.textContent = `(${selColor.r}, ${selColor.g}, ${selColor.b})`;
            selLabCell.textContent = `L*:${selColor.lab.l.toFixed(1)} a*:${selColor.lab.a.toFixed(1)} b*:${selColor.lab.b.toFixed(1)}`;
            selLightnessCell.textContent = selColor.lab.l.toFixed(2);
            colorMarker.style.left = `${selColor.lab.l}%`;
            colorMarker.style.visibility = 'visible';
        } else {
            colorPreview.style.backgroundColor = '#f0f0f0';
            selHexCell.textContent = '-';
            selRgbCell.textContent = '-';
            selLabCell.textContent = '-';
            selLightnessCell.textContent = '-';
            colorMarker.style.visibility = 'hidden';
        }

        if (refColor && selColor) {
            const deltaE = calculateDeltaE(selColor.lab, refColor.lab);
            const interpretation = interpretDeltaE(deltaE);
            diffCell.textContent = deltaE.toFixed(2);
            interpretationCell.innerHTML = `<span class="interpretation-badge ${interpretation.class}">${interpretation.text}</span>`;
        } else {
            diffCell.textContent = '-';
            interpretationCell.textContent = '-';
        }
    }

    function updateButtonStates() {
        if (!setAsRefBtn || !addToPaletteBtn || !saveAnalysisBtn) return;

        setAsRefBtn.disabled = !state.currentSelectedColor;
        addToPaletteBtn.disabled = !state.currentSelectedColor;
        saveAnalysisBtn.disabled = !(state.currentSelectedColor && state.activeReferenceColor);
    }

    function drawImageOnCanvas(img) {
        try {
            if (!canvas || !ctx) return;
            
            const maxWidth = Math.min(800, window.innerWidth - 40);
            const maxHeight = Math.min(600, window.innerHeight - 200);
            
            const scale = Math.min(
                maxWidth / img.naturalWidth,
                maxHeight / img.naturalHeight
            );
            
            const width = Math.round(img.naturalWidth * scale);
            const height = Math.round(img.naturalHeight * scale);
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, width, height);

            try {
                ctx.getImageData(0, 0, 1, 1);
            } catch (e) {
                throw new Error('Falha ao verificar se a imagem foi desenhada');
            }
        } catch (err) {
            canvas.width = 320;
            canvas.height = 240;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Erro ao carregar imagem', canvas.width/2, canvas.height/2);
            throw err;
        }
    }

    // Checagem de suporte ao localStorage
    function checkLocalStorageSupport() {
        let supported = true;
        try {
            const testKey = '__test_localstorage__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
        } catch (e) {
            supported = false;
        }
        if (!supported) {
            alert('Atenção: O armazenamento local do navegador não está disponível. As análises e paletas não serão salvas. Verifique as permissões do navegador ou tente outro navegador.');
        }
    }

    checkLocalStorageSupport();
    renderPalette();
    updateButtonStates();
    updateComparisonUI();
    analysisNameInput.value = loadAnalysisNameFromStorage();

    // --- Registro do Service Worker para PWA ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registrado com sucesso:', registration.scope);
                })
                .catch(error => {
                    console.log('Falha no registro do Service Worker:', error);
                });
        });
    }
});