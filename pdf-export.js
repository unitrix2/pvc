/**
 * PVC Calculator - PDF Export & Print
 * Uses html2pdf.js for PDF generation and window.print() for printing
 */
const PDFExport = {

    /**
     * Export the PVC document to PDF
     * @param {string} elementId - ID of the HTML element to capture
     * @param {string} filename - Name of the output PDF file
     */
    async exportToPDF(elementId, filename) {
        const element = document.getElementById(elementId);
        if (!element) {
            PVCUtils.showToast('Document not found for PDF export.', 'error');
            return;
        }

        // Show loading
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'pdf-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="pdf-loading-spinner">
                <div class="spinner"></div>
                <p>Generating PDF...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);

        try {
            const opt = {
                margin: 10,
                filename: filename || 'PVC_Calculation.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'landscape'
                },
                pagebreak: { mode: 'avoid-all' }
            };

            await html2pdf().set(opt).from(element).save();
            PVCUtils.showToast('PDF downloaded successfully!', 'success');
        } catch (err) {
            console.error('PDF export error:', err);
            PVCUtils.showToast('Failed to generate PDF. Try printing instead.', 'error');
        } finally {
            loadingOverlay.remove();
        }
    },

    /**
     * Print the PVC document using browser's print dialog
     */
    printDocument(type = 'single') {
        if (type === 'bulk') {
            document.body.classList.add('print-bulk');
            document.body.classList.remove('print-single');
        } else {
            document.body.classList.add('print-single');
            document.body.classList.remove('print-bulk');
        }
        window.print();
    },

    async exportBulkPDF(bulkElementId, filename) {
        const bulkElement = document.getElementById(bulkElementId);
        const singleElement = document.getElementById('pvc-document');
        if (!bulkElement) {
            PVCUtils.showToast('Bulk document not found for PDF export.', 'error');
            return;
        }

        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'pdf-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="pdf-loading-spinner">
                <div class="spinner"></div>
                <p>Generating Bulk PDF (All Quarters)...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);

        bulkElement.classList.remove('no-screen');
        bulkElement.style.display = 'block';
        if (singleElement) singleElement.style.display = 'none';

        try {
            const opt = {
                margin: 10,
                filename: filename || 'PVC_Bulk_Calculation.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'landscape'
                },
                pagebreak: { mode: ['css', 'legacy'], after: '.page-break' }
            };

            await html2pdf().set(opt).from(bulkElement).save();
            PVCUtils.showToast('Bulk PDF downloaded successfully!', 'success');
        } catch (err) {
            console.error('Bulk PDF export error:', err);
            PVCUtils.showToast('Failed to generate Bulk PDF. Try Bulk Print instead.', 'error');
        } finally {
            bulkElement.classList.add('no-screen');
            bulkElement.style.display = 'none';
            if (singleElement) singleElement.style.display = 'block';
            loadingOverlay.remove();
        }
    }
};
