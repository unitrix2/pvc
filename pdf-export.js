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
    printDocument() {
        window.print();
    }
};
