document.addEventListener('DOMContentLoaded', () => {
    const PALETTE_STORAGE_KEY = 'colorAnalyzerPalette';
    const ANALYSIS_HISTORY_KEY = 'colorAnalysisHistory';
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    const zoomCanvas = document.getElementById('zoom-canvas');
    const zoomCtx = zoomCanvas ? zoomCanvas.getContext('2d') : null;
    const imageUploader = document.getElementById('image-uploader');
    const imageCapturer = document.getElementById('image-capturer');
    const imageClickMarker = document.getElementById('image-click-marker');
    const setAsRefBtn = document.getElementById('set-as-ref-btn');
    const addToPaletteBtn = document.getElementById('add-to-palette-btn');
    const saveAnalysisBtn = document.getElementById('save-analysis-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const paletteList = document.getElementById('palette-list');
    const analysisHistoryBody = document.getElementById('analysis-history-body');
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

    function interpretDeltaE(deltaE) {
        if (deltaE < 1) return { text: "Diferença imperceptível", class: "badge-imperceptible" };
        if (deltaE < 2) return { text: "Diferença apenas perceptível", class: "badge-slight" };
        if (deltaE < 3.5) return { text: "Diferença perceptível (observador treinado)", class: "badge-noticeable" };
        if (deltaE < 5) return { text: "Diferença claramente perceptível", class: "badge-clear" };
        if (deltaE < 10) return { text: "Diferença significativa", class: "badge-significant" };
        return { text: "Cores muito diferentes", class: "badge-very-different" };
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
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : null;
        const clientX = touch ? touch.clientX : e.clientX;
        const clientY = touch ? touch.clientY : e.clientY;

        const relativeX = (clientX - rect.left) / rect.width;
        const relativeY = (clientY - rect.top) / rect.height;

        let x = Math.floor(relativeX * canvas.width);
        let y = Math.floor(relativeY * canvas.height);

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
            const markerX = clientX - rect.left;
            const markerY = clientY - rect.top;
            imageClickMarker.style.left = `${markerX}px`;
            imageClickMarker.style.top = `${markerY}px`;
            imageClickMarker.style.visibility = 'visible';
        }

        drawZoomPreview(x, y);
        updateComparisonUI();
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

            const img = new Image();
            img.crossOrigin = 'anonymous';

            const finalizeImage = (source) => {
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
                    } catch (err) {
                        alert('Erro ao desenhar a imagem no canvas.');
                    }
                };
                
                img.onerror = () => {
                    clearTimeout(loadTimeout);
                    alert('Erro ao carregar a imagem. Tente outro formato.');
                };
                
                img.src = source;
            };

            const reader = new FileReader();
            reader.onload = (event) => {
                finalizeImage(event.target.result);
            };
            reader.onerror = () => {
                try {
                    const objectUrl = URL.createObjectURL(file);
                    finalizeImage(objectUrl);
                    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
                } catch (e) {
                    alert('Erro ao ler o arquivo de imagem.');
                }
            };

            try {
                reader.readAsDataURL(file);
            } catch (readErr) {
                try {
                    const objectUrl = URL.createObjectURL(file);
                    finalizeImage(objectUrl);
                    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
                } catch (e) {
                    alert('Erro ao processar a imagem no dispositivo.');
                }
            }
        } catch (outerErr) {
            alert('Erro inesperado ao carregar imagem.');
        }
    }

    function handleSetAsReference() {
        if (state.currentSelectedColor) {
            setActiveReferenceColor(state.currentSelectedColor);
        }
    }

    function handleAddToPalette() {
        if (state.currentSelectedColor) {
            const isAlreadyInPalette = state.referencePalette.some(
                color => color.hex === state.currentSelectedColor.hex
            );
            if (!isAlreadyInPalette) {
                state.referencePalette.push(state.currentSelectedColor);
                renderPalette();
                savePaletteToStorage();
            }
        }
    }

    function handleSaveAnalysis() {
        const { activeReferenceColor, currentSelectedColor } = state;
        if (activeReferenceColor && currentSelectedColor) {
            const deltaE = calculateDeltaE(currentSelectedColor.lab, activeReferenceColor.lab);
            const interpretation = interpretDeltaE(deltaE);

            // Salva um "retrato" completo dos dados da tabela comparativa
            const newAnalysis = {
                refColor: activeReferenceColor,
                selColor: currentSelectedColor,
                deltaE: deltaE,
                interpretation: interpretation,
                timestamp: new Date().toISOString(),
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
            saveAnalysisHistoryToStorage();
            renderAnalysisHistory();
        }
    }

    function handleExportToExcel() {
        if (state.analysisHistory.length === 0) {
            alert('Nenhuma análise para exportar.');
            return;
        }

        const data = state.analysisHistory.map(analysis => {
            const { refColor, selColor, deltaE, interpretation, timestamp } = analysis;
            const interpretationText = interpretation ? interpretation.text : interpretDeltaE(deltaE).text;
            const date = new Date(timestamp).toLocaleString('pt-BR');
            return {
                'Data/Hora': date,
                'Ref HEX': refColor.hex,
                'Ref RGB': `(${refColor.r},${refColor.g},${refColor.b})`,
                'Ref L*': refColor.lab.l.toFixed(2),
                'Ref a*': refColor.lab.a.toFixed(2),
                'Ref b*': refColor.lab.b.toFixed(2),
                'Sel HEX': selColor.hex,
                'Sel RGB': `(${selColor.r},${selColor.g},${selColor.b})`,
                'Sel L*': selColor.lab.l.toFixed(2),
                'Sel a*': selColor.lab.a.toFixed(2),
                'Sel b*': selColor.lab.b.toFixed(2),
                'Delta E': deltaE.toFixed(2),
                'Interpretação': interpretationText,
            };
        });

        const fileName = `analise_cores_${new Date().toISOString().slice(0,10)}`;
        if (typeof XLSX === 'undefined') {
            alert('A biblioteca de exportação para Excel (SheetJS) não foi carregada.');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Análises');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
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
    if (imageUploader) imageUploader.addEventListener('change', handleImageLoad);
    if (imageCapturer) imageCapturer.addEventListener('change', handleImageLoad);
    if (canvas && ctx) {
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('touchstart', handleCanvasClick, { passive: true });
    }
    if (setAsRefBtn) setAsRefBtn.addEventListener('click', handleSetAsReference);
    if (addToPaletteBtn) addToPaletteBtn.addEventListener('click', handleAddToPalette);
    if (saveAnalysisBtn) saveAnalysisBtn.addEventListener('click', handleSaveAnalysis);
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', handleExportToExcel);
    if (sampleSizeInput) sampleSizeInput.addEventListener('input', handleSampleSizeChange);

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
    }

    function removePaletteItem(color, index) {
        if (state.activeReferenceColor && state.activeReferenceColor.hex === color.hex) {
            state.activeReferenceColor = null;
        }
        state.referencePalette.splice(index, 1);
        savePaletteToStorage();
        renderPalette();
        updateComparisonUI();
    }

    function renderAnalysisHistory() {
        if (!analysisHistoryBody) return;
        analysisHistoryBody.innerHTML = '';

        const fragment = document.createDocumentFragment();

        state.analysisHistory.forEach((analysis, index) => {
            const { refColor, selColor, deltaE, interpretation } = analysis;
            const finalInterpretation = interpretation || interpretDeltaE(deltaE); // Fallback para dados antigos

            const row = document.createElement('tr');

            // Células de Cor (Ref e Sel)
            [refColor, selColor].forEach(color => {
                const cell = document.createElement('td'); 
                const dataLabel = color === refColor ? 'Cor de Referência' : 'Cor Analisada';
                cell.setAttribute('data-label', dataLabel);

                const formattedValues = analysis.formatted ? (color === refColor ? analysis.formatted.ref : analysis.formatted.sel) : null;

                cell.innerHTML = `
                    <div class="color-cell">
                        <div class="history-swatch" style="background-color: ${color.hex};"></div>
                        <div class="history-color-details">${color.hex.toUpperCase()}<br><small>${formattedValues ? formattedValues.rgb : ''}<br>${formattedValues ? formattedValues.lab : ''}</small></div>
                    </div>`;
                row.appendChild(cell);
            });

            // Célula Delta E
            const deltaECell = document.createElement('td');
            deltaECell.setAttribute('data-label', 'Diferença (ΔE)');
            deltaECell.textContent = deltaE.toFixed(2);
            row.appendChild(deltaECell);

            // Célula Interpretação
            const interpretationCell = document.createElement('td');
            interpretationCell.setAttribute('data-label', 'Interpretação');
            interpretationCell.innerHTML = `<span class="interpretation-badge ${finalInterpretation.class}">${finalInterpretation.text}</span>`;
            row.appendChild(interpretationCell);

            // Célula Ação
            const actionCell = document.createElement('td');
            actionCell.setAttribute('data-label', 'Ação');
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-history-btn';
            removeBtn.title = 'Remover análise';
            removeBtn.innerHTML = '&times;';
            // Adiciona um wrapper para centralizar o botão no layout de cartão
            const btnWrapper = document.createElement('div');
            btnWrapper.appendChild(removeBtn);
            removeBtn.addEventListener('click', () => {
                removeAnalysisHistoryItem(index);
            });
            actionCell.appendChild(removeBtn);
            row.appendChild(actionCell);

            fragment.appendChild(row);
        });
        analysisHistoryBody.appendChild(fragment);
    }

    function removeAnalysisHistoryItem(index) {
        state.analysisHistory.splice(index, 1);
        saveAnalysisHistoryToStorage();
        renderAnalysisHistory();
    }

    function updateComparisonUI() {
        const refColor = state.activeReferenceColor;
        const selColor = state.currentSelectedColor;

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

    function savePaletteToStorage() {
        try {
            const paletteData = JSON.stringify(state.referencePalette);
            window.localStorage.setItem(PALETTE_STORAGE_KEY, paletteData);
        } catch (e) {
            alert("Não foi possível salvar a paleta de cores. Verifique as permissões de armazenamento do navegador.");
            console.error("Falha ao salvar a paleta:", e);
        }
    }

    function loadPaletteFromStorage() {
        try {
            const savedPalette = window.localStorage.getItem(PALETTE_STORAGE_KEY);
            return savedPalette ? JSON.parse(savedPalette) : [];
        } catch (e) {
            console.error("Falha ao carregar a paleta:", e);
            return [];
        }
    }

    function saveAnalysisHistoryToStorage() {
        try {
            const historyData = JSON.stringify(state.analysisHistory);
            window.localStorage.setItem(ANALYSIS_HISTORY_KEY, historyData);
        } catch (e) {
            alert("Não foi possível salvar a análise. Verifique as permissões de armazenamento do navegador.");
            console.error("Falha ao salvar o histórico:", e);
        }
    }

    function loadAnalysisHistoryFromStorage() {
        try {
            const savedHistory = window.localStorage.getItem(ANALYSIS_HISTORY_KEY);
            return savedHistory ? JSON.parse(savedHistory) : [];
        } catch (e) {
            console.error("Falha ao carregar o histórico:", e);
            return [];
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
    renderAnalysisHistory();
    updateComparisonUI();
});
