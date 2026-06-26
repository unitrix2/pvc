/**
 * PVC Calculator - Storage Layer
 * localStorage CRUD operations + JSON export/import for backup
 */
const PVCStorage = {
    KEYS: {
        CONTRACTS: 'pvc_contracts',
        CALCULATIONS: 'pvc_calculations'
    },
    masterIndexData: null,

    // ==================== Generic Helpers ====================

    _getData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading localStorage:', key, e);
            return [];
        }
    },

    _setData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error writing localStorage:', key, e);
            PVCUtils.showToast('Storage error! Data may not be saved.', 'error');
        }
    },

    // ==================== Contracts ====================

    getContracts() {
        return this._getData(this.KEYS.CONTRACTS);
    },

    getContractById(id) {
        return this.getContracts().find(c => c.id === id) || null;
    },

    saveContract(contract) {
        const contracts = this.getContracts();
        if (contract.id) {
            const idx = contracts.findIndex(c => c.id === contract.id);
            if (idx >= 0) {
                contract.updatedAt = new Date().toISOString();
                contracts[idx] = contract;
            } else {
                contract.createdAt = new Date().toISOString();
                contracts.push(contract);
            }
        } else {
            contract.id = PVCUtils.generateId();
            contract.createdAt = new Date().toISOString();
            contracts.push(contract);
        }
        this._setData(this.KEYS.CONTRACTS, contracts);
        return contract;
    },

    deleteContract(id) {
        const contracts = this.getContracts().filter(c => c.id !== id);
        this._setData(this.KEYS.CONTRACTS, contracts);
        // Also delete associated calculations
        const calcs = this.getCalculations().filter(c => c.contractId !== id);
        this._setData(this.KEYS.CALCULATIONS, calcs);
    },

    // ==================== Calculations ====================

    getCalculations() {
        return this._getData(this.KEYS.CALCULATIONS);
    },

    getCalculationById(id) {
        return this.getCalculations().find(c => c.id === id) || null;
    },

    getCalculationsByContract(contractId) {
        return this.getCalculations().filter(c => c.contractId === contractId);
    },

    saveCalculation(calc) {
        const calcs = this.getCalculations();
        if (calc.id) {
            const idx = calcs.findIndex(c => c.id === calc.id);
            if (idx >= 0) {
                calc.updatedAt = new Date().toISOString();
                calcs[idx] = calc;
            } else {
                calc.createdAt = new Date().toISOString();
                calcs.push(calc);
            }
        } else {
            calc.id = PVCUtils.generateId();
            calc.createdAt = new Date().toISOString();
            calcs.push(calc);
        }
        this._setData(this.KEYS.CALCULATIONS, calcs);
        return calc;
    },

    deleteCalculation(id) {
        const calcs = this.getCalculations().filter(c => c.id !== id);
        this._setData(this.KEYS.CALCULATIONS, calcs);
    },

    // ==================== Index Data (CPI-IW & WPI) ====================

    getIndexData() {
        return this.masterIndexData || [];
    },

    setMasterIndexData(data) {
        data.sort((a, b) => (a.year - b.year) || (a.month - b.month));
        this.masterIndexData = data;
    },

    getIndexForMonth(year, month, periodStr) {
        const data = this.getIndexData();
        if (periodStr) {
            const match = data.find(d => d.periodStr && d.periodStr.toUpperCase() === periodStr.toUpperCase());
            if (match) return match;
        }
        return data.find(d => d.year === year && d.month === month) || null;
    },

    // ==================== Bulk Import for Index Data ====================

    bulkImportIndex(entries) {
        // Obsolete function, retained for compatibility if needed
        return 0;
    },

    // ==================== Export / Import All Data ====================

    exportAll() {
        return {
            version: '1.0',
            appName: 'PVC Calculator',
            exportDate: new Date().toISOString(),
            contracts: this.getContracts(),
            calculations: this.getCalculations()
        };
    },

    importAll(data) {
        if (!data || !data.appName || data.appName !== 'PVC Calculator') {
            throw new Error('Invalid backup file. Please select a valid PVC Calculator backup.');
        }
        if (data.contracts) this._setData(this.KEYS.CONTRACTS, data.contracts);
        if (data.calculations) this._setData(this.KEYS.CALCULATIONS, data.calculations);
    },

    clearAll() {
        localStorage.removeItem(this.KEYS.CONTRACTS);
        localStorage.removeItem(this.KEYS.CALCULATIONS);
    },

    /** Download all data as JSON backup file */
    downloadBackup() {
        const data = this.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pvc_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
