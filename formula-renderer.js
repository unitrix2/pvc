/**
 * PVC Calculator - Formula Renderer
 * Uses KaTeX to render mathematical formulas in proper fraction format
 * Renders both generic formulas (with symbols) and actual calculations (with numbers)
 */
const FormulaRenderer = {

    /**
     * Render a KaTeX formula to HTML string
     */
    _render(latex, displayMode = false) {
        try {
            return katex.renderToString(latex, {
                displayMode: displayMode,
                throwOnError: false,
                strict: false
            });
        } catch (e) {
            console.error('KaTeX render error:', e);
            return `<span class="formula-fallback">${latex}</span>`;
        }
    },

    /**
     * Render the generic Labour formula
     * Returns: W × (LQ − LB) × Lc / (LB × 100)
     */
    renderLabourGenericFormula() {
        return this._render(
            '\\dfrac{W \\times (L_Q - L_B) \\times L_c}{L_B \\times 100}',
            false
        );
    },

    /**
     * Render the Labour calculation with actual numbers
     * Shows the substituted values in fraction format, then the result
     */
    renderLabourCalculation(W, LQ, LB, Lc) {
        const result = PVCUtils.round2(W * (LQ - LB) * Lc / (LB * 100));
        const calcFraction = this._render(
            `=\\dfrac{${W}(${LQ}-${LB})\\times${Lc}}{${LB}\\times 100}`,
            false
        );
        const resultStr = this._render(
            `= \\textbf{${result.toFixed(2)}}`,
            false
        );
        return { calcFraction, resultStr, result };
    },

    /**
     * Render the generic Material formula
     * Returns: W × (MQ − MB) × Mc / (MB × 100)
     */
    renderMaterialGenericFormula() {
        return this._render(
            '\\dfrac{W \\times (M_Q - M_B) \\times M_c}{M_B \\times 100}',
            false
        );
    },

    /**
     * Render the Material calculation with actual numbers
     */
    renderMaterialCalculation(W, MQ, MB, Mc) {
        const result = PVCUtils.round2(W * (MQ - MB) * Mc / (MB * 100));
        const calcFraction = this._render(
            `=\\dfrac{${W}(${MQ}-${MB})\\times${Mc}}{${MB}\\times 100}`,
            false
        );
        const resultStr = this._render(
            `= \\textbf{${result.toFixed(2)}}`,
            false
        );
        return { calcFraction, resultStr, result };
    },

    /**
     * Render the generic Fuel formula
     * Returns: W × (FQ − FB) × Fc / (FB × 100)
     */
    renderFuelGenericFormula() {
        return this._render(
            '\\dfrac{W \\times (F_Q - F_B) \\times F_c}{F_B \\times 100}',
            false
        );
    },

    /**
     * Render the Fuel calculation with actual numbers
     */
    renderFuelCalculation(W, FQ, FB, Fc) {
        let result = 0;
        let calcFraction = '';
        let resultStr = '';
        if (Fc > 0 && FB > 0) {
            result = PVCUtils.round2(W * (FQ - FB) * Fc / (FB * 100));
            calcFraction = this._render(
                `=\\dfrac{${W}(${FQ}-${FB})\\times${Fc}}{${FB}\\times 100}`,
                false
            );
            resultStr = this._render(
                `= \\textbf{${result.toFixed(2)}}`,
                false
            );
        } else {
            calcFraction = this._render('0', false);
            resultStr = this._render('=\\textbf{0.00}', false);
        }
        return { calcFraction, resultStr, result };
    },

    /**
     * Render L_B subscript
     */
    renderLB() {
        return this._render('L_B');
    },

    /**
     * Render M_B subscript
     */
    renderMB() {
        return this._render('M_B');
    },

    /**
     * Render L_c subscript
     */
    renderLc() {
        return this._render('L_c');
    },

    /**
     * Render M_c subscript
     */
    renderMc() {
        return this._render('M_c');
    },

    /**
     * Render F_c subscript
     */
    renderFc() {
        return this._render('F_c');
    }
};
