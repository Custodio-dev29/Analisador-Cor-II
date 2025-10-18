document.addEventListener('DOMContentLoaded', () => {
    const analysisHistoryBody = document.getElementById('analysis-history-body');
    const exportExcelBtn = document.getElementById('export-excel-btn');

    let state = {
        analysisHistory: loadAnalysisHistoryFromStorage(),
    };

    function renderAnalysisHistory() {
        if (!analysisHistoryBody) return;
        analysisHistoryBody.innerHTML = '';

        const fragment = document.createDocumentFragment();

        state.analysisHistory.forEach((analysis, index) => {
            const { id, name, refColor, selColor, deltaE, interpretation, timestamp } = analysis;
            const finalInterpretation = interpretation || interpretDeltaE(deltaE); // Fallback for old data

            const row = document.createElement('tr');

            // Célula de ID e Nome
            const idCell = document.createElement('td');
            idCell.setAttribute('data-label', 'ID / Nome da Amostra');

            // Correção de segurança: Criar elementos em vez de usar innerHTML
            const idCellDiv = document.createElement('div');
            idCellDiv.className = 'id-cell';
            const nameElement = document.createElement('b');
            nameElement.textContent = name || 'Sem nome'; // Usa textContent para evitar XSS
            const dateElement = document.createElement('small');
            dateElement.textContent = id || new Date(timestamp).toLocaleString('pt-BR');

            idCellDiv.appendChild(nameElement);
            idCellDiv.appendChild(document.createElement('br'));
            idCellDiv.appendChild(dateElement);
            idCell.appendChild(idCellDiv);
            row.appendChild(idCell);

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
        saveAnalysisHistoryToStorage(state.analysisHistory);
        renderAnalysisHistory();
    }

    function handleExportToExcel() {
        if (state.analysisHistory.length === 0) {
            alert('Nenhum histórico para exportar.');
            return;
        }

        const data = state.analysisHistory.map(analysis => {
            const { refColor, selColor, deltaE, interpretation, timestamp, name } = analysis;
            const interpretationText = (interpretation || interpretDeltaE(deltaE)).text;
            const date = new Date(timestamp).toLocaleString('pt-BR');
            
            return {
                'Data/Hora': date,
                'Nome da Amostra': name || 'Sem nome',
                'Ref HEX': refColor.hex.toUpperCase(),
                'Ref RGB': `(${refColor.r},${refColor.g},${refColor.b})`,
                'Ref L*': refColor.lab.l.toFixed(2),
                'Ref a*': refColor.lab.a.toFixed(2),
                'Ref b*': refColor.lab.b.toFixed(2),
                'Sel HEX': selColor.hex.toUpperCase(),
                'Sel RGB': `(${selColor.r},${selColor.g},${selColor.b})`,
                'Sel L*': selColor.lab.l.toFixed(2),
                'Sel a*': selColor.lab.a.toFixed(2),
                'Sel b*': selColor.lab.b.toFixed(2),
                'Delta E': deltaE.toFixed(2),
                'Interpretação': interpretationText,
            };
        });

        const fileName = `historico_analise_cores_${new Date().toISOString().slice(0,10)}.xlsx`;
        if (typeof XLSX === 'undefined') {
            alert('A biblioteca de exportação para Excel (SheetJS) não foi carregada.');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico de Análises');
        XLSX.writeFile(workbook, fileName);
    }

    if (exportExcelBtn) exportExcelBtn.addEventListener('click', handleExportToExcel);
    renderAnalysisHistory();
});