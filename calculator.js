/**
 * PVC Calculator - Calculation Engine
 * Implements Price Variation Clause formulas as per contract agreement
 *
 * Formulas:
 *   (A) Labour Variation   = W × (LQ - LB) × Lc / (LB × 100)
 *   (B) Material Variation = W × (MQ - MB) × Mc / (MB × 100)
 *   (C) Fuel Variation     = 0 (currently)
 *   Total PVC = A + B + C
 *
 * Where:
 *   W  = Total payable amount for the quarter
 *   LQ = Average CPI-IW (converted to old series) for the quarter
 *   LB = Base period CPI-IW
 *   Lc = Labour component percentage
 *   MQ = Average WPI for the quarter
 *   MB = Base period WPI
 *   Mc = Material component percentage
 */
const PVCCalculator = {

    /**
     * Main calculation function
     * @param {Object} params - All input parameters
     * @returns {Object} Complete calculation result with all intermediate values
     */
    calculate(params) {
        const {
            months,         // [{month, year, amount, label}]
            labourPct,      // e.g., 70
            materialPct,    // e.g., 15
            fuelPct,        // e.g., 0
            linkingFactor,  // e.g., 2.88
            LB,             // Base CPI-IW (e.g., 302)
            MB,             // Base WPI (e.g., 121.6)
            indexData       // [{cpiIW, wpi}] for each month (new series CPI-IW)
        } = params;

        const roundOff = params.roundOff !== undefined ? params.roundOff : 2;

        // ===== Total Payable Amount (W) =====
        months.forEach(m => { if (m.amount !== undefined) m.amount = PVCUtils.roundN(parseFloat(m.amount), roundOff); });
        const W = PVCUtils.roundN(months.reduce((sum, m) => sum + parseFloat(m.amount), 0), roundOff);

        // ===== Component Values =====
        const labourValue = PVCUtils.roundN(W * labourPct / 100, roundOff);
        const materialValue = PVCUtils.roundN(W * materialPct / 100, roundOff);
        const fuelValue = PVCUtils.roundN(W * fuelPct / 100, roundOff);

        // ===== CPI-IW Conversion (New Series → Old Series) =====
        const convertedCPI = indexData.map(d => PVCUtils.roundN(parseFloat(d.cpiIW) * linkingFactor, 2));

        // ===== Average Indices =====
        // LQ: Average of converted CPI-IW values (strictly rounded to 2 decimals)
        const LQ = PVCUtils.roundN(convertedCPI.reduce((sum, v) => sum + v, 0) / convertedCPI.length, 2);

        // MQ: Average of WPI values (strictly rounded to 2 decimals)
        const wpiValues = indexData.map(d => PVCUtils.roundN(parseFloat(d.wpi), 2));
        const MQ = PVCUtils.roundN(wpiValues.reduce((sum, v) => sum + v, 0) / wpiValues.length, 2);

        // FQ: Average of Fuel WPI values (strictly rounded to 2 decimals)
        const fuelValues = indexData.map(d => PVCUtils.roundN(parseFloat(d.fuelWPI || d.wpi), 2));
        const FQ = PVCUtils.roundN(fuelValues.reduce((sum, v) => sum + v, 0) / fuelValues.length, 2);

        // ===== Price Variations =====
        // (A) Labour Variation = W × (LQ - LB) × Lc / (LB × 100)
        const labourVariation = PVCUtils.roundN(W * (LQ - LB) * labourPct / (LB * 100), roundOff);

        // (B) Material Variation = W × (MQ - MB) × Mc / (MB × 100)
        const materialVariation = PVCUtils.roundN(W * (MQ - MB) * materialPct / (MB * 100), roundOff);

        // (C) Fuel Variation = W × (FQ - FB) × Fc / (FB × 100)
        let fuelVariation = 0;
        const FB = params.FB || 0;
        if (fuelPct > 0 && FB > 0) {
            fuelVariation = PVCUtils.roundN(W * (FQ - FB) * fuelPct / (FB * 100), roundOff);
        }

        // ===== Total PVC =====
        const totalPVC = PVCUtils.roundN(labourVariation + materialVariation + fuelVariation, roundOff);

        // ===== Amount in Words =====
        const amountInWords = PVCUtils.numberToWords(Math.abs(totalPVC));

        return {
            // Computed values
            roundOff,
            W,
            labourValue,
            materialValue,
            fuelValue,
            convertedCPI,
            LQ,
            MQ,
            labourVariation,
            materialVariation,
            fuelVariation,
            totalPVC,
            amountInWords,
            // Pass through input params for result display
            months,
            labourPct,
            materialPct,
            fuelPct,
            linkingFactor,
            LB,
            MB,
            FB,
            indexData,
            wpiValues,
            fuelValues
        };
    }
};
