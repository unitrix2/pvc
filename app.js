/**
 * PVC Calculator - Main Application
 * SPA navigation, page rendering, form handling, event binding
 */
const App = {
    currentPage: 'dashboard',
    editingContractId: null,
    lastCalcResult: null,

    // ==================== INITIALIZATION ====================

    init() {
        this.bindNavigation();
        this.initParticles();
        ExcelHandler.fetchMasterData().then(() => {
            this.navigateTo('dashboard');
        }).catch(e => {
            console.error("Failed to load master index data:", e);
            this.navigateTo('dashboard');
        });
    },

    bindNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) this.navigateTo(page);
            });
        });
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
    },

    toggleThemeMode() {
        const body = document.body;
        const icon = document.getElementById('theme-mode-icon');
        const text = document.getElementById('theme-mode-text');
        if (body.getAttribute('data-theme') === 'light') {
            body.removeAttribute('data-theme');
            if (icon) icon.textContent = '☀️';
            if (text) text.textContent = 'Light Mode';
        } else {
            body.setAttribute('data-theme', 'light');
            if (icon) icon.textContent = '🌙';
            if (text) text.textContent = 'Dark Mode';
        }
    },

    setThemeColor(color) {
        document.body.setAttribute('data-color', color);
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        const dot = document.querySelector(`.color-dot.color-${color}`);
        if (dot) dot.classList.add('active');
    },

    toggleCalcMode(mode) {
        document.querySelectorAll('.calc-mode-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.calc-section-toggle').forEach(s => s.classList.remove('active'));
        const btn = document.getElementById(`btn-mode-${mode}`);
        const sec = document.getElementById(`section-mode-${mode}`);
        if (btn) btn.classList.add('active');
        if (sec) sec.classList.add('active');
    },

    initParticles() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        let mouse = { x: width / 2, y: height / 2 };
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        const particles = [];
        const particleCount = 45;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 1.2,
                vy: (Math.random() - 0.5) * 1.2,
                radius: Math.random() * 2.5 + 1.5
            });
        }

        function animate() {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);
            const isLight = document.body.getAttribute('data-theme') === 'light';
            const baseColor = isLight ? '15, 23, 42' : '245, 158, 11';

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx = -p.vx;
                if (p.y < 0 || p.y > height) p.vy = -p.vy;

                // Mouse interaction
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 150) {
                    p.x += dx * 0.015;
                    p.y += dy * 0.015;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${baseColor}, 0.6)`;
                ctx.fill();

                // Draw connecting lines
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx2 = p2.x - p.x;
                    const dy2 = p2.y - p.y;
                    const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
                    if (dist2 < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(${baseColor}, ${0.25 - dist2/480})`;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    },

    // ==================== NAVIGATION ====================

    navigateTo(page, data = null) {
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Update page visibility
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
            pageEl.innerHTML = this.renderPage(page, data);
            this.bindPageEvents(page);
        }

        this.currentPage = page;

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');

        // Scroll to top
        window.scrollTo(0, 0);
    },

    renderPage(page, data) {
        switch (page) {
            case 'dashboard': return this.renderDashboard();
            case 'contracts': return this.renderContracts();
            case 'calculate': return this.renderCalculate();
            case 'result': return this.renderResult(data);
            case 'data-mgmt': return this.renderDataMgmt();
            default: return '<p>Page not found.</p>';
        }
    },

    bindPageEvents(page) {
        switch (page) {
            case 'contracts': this.bindContractEvents(); break;
            case 'calculate': this.bindCalculateEvents(); break;
            case 'result': this.bindResultEvents(); break;
            case 'data-mgmt': this.bindDataMgmtEvents(); break;
        }
    },

    // ==================== DASHBOARD ====================

    renderDashboard() {
        const contracts = PVCStorage.getContracts();
        const calculations = PVCStorage.getCalculations();
        const indexData = PVCStorage.getIndexData();

        const recentCalcs = calculations.slice(-5).reverse();

        let fallbackWarning = '';
        if (indexData.length === 0) {
            fallbackWarning = `
                <div class="toast-notification toast-error" style="position:relative; transform:none; opacity:1; margin-bottom:20px;">
                    <strong>Local Testing Mode Detected:</strong> The browser blocked reading the master_index_data.csv file. 
                    <br>Please select the master CSV file manually to continue testing:
                    <input type="file" accept=".csv" onchange="App.handleLocalMasterFileUpload(event)" style="margin-top:10px;">
                </div>
            `;
        }

        return `
            <div class="page-header">
                <h1>Dashboard</h1>
                <p class="page-subtitle">Price Variation Clause Calculator — Overview</p>
            </div>
            ${fallbackWarning}

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-value">${contracts.length}</div>
                    <div class="stat-label">Contracts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🧮</div>
                    <div class="stat-value">${calculations.length}</div>
                    <div class="stat-label">Calculations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-value">${indexData.length}</div>
                    <div class="stat-label">Index Records</div>
                </div>
            </div>

            <div class="quick-actions">
                <h3>Quick Actions</h3>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="App.navigateTo('contracts')">➕ New Contract</button>
                    <button class="btn btn-primary" onclick="App.navigateTo('calculate')">🧮 Calculate PVC</button>
                    <button class="btn btn-secondary" onclick="App.navigateTo('data-mgmt')">💾 Backup / Restore</button>
                </div>
            </div>

            ${recentCalcs.length > 0 ? `
                <div class="recent-section">
                    <h3>Recent Calculations</h3>
                    <div class="calc-list">
                        ${recentCalcs.map(calc => {
                            const contract = PVCStorage.getContractById(calc.contractId);
                            return `
                                <div class="calc-card" onclick="App.viewCalculation('${calc.id}')">
                                    <div class="calc-info">
                                        <strong>Quarter-${calc.quarterNumber}</strong>
                                        <span>${calc.periodLabel || ''}</span>
                                        ${contract ? `<small>${contract.contractNumber}</small>` : ''}
                                    </div>
                                    <div class="calc-amount">₹${PVCUtils.formatIndianNumber(calc.result.totalPVC)}</div>
                                    <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); App.viewCalculation('${calc.id}')">View</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div class="empty-state">
                    <div class="empty-icon">🧮</div>
                    <p>No calculations yet. Start by adding a contract and then calculate PVC.</p>
                </div>
            `}
        `;
    },

    viewCalculation(id) {
        const calc = PVCStorage.getCalculationById(id);
        if (calc) {
            this.lastCalcResult = calc;
            this.navigateTo('result', calc);
        }
    },

    // ==================== CONTRACTS ====================

    renderContracts() {
        const contracts = PVCStorage.getContracts();
        const indexData = PVCStorage.getIndexData();
        this.editingContractId = null;

        let fallbackWarning = '';
        if (indexData.length === 0) {
            fallbackWarning = `
                <div class="toast-notification toast-error" style="position:relative; transform:none; opacity:1; margin-bottom:20px;">
                    <strong>Local Testing Mode Detected:</strong> The browser blocked reading the master_index_data.csv file. 
                    <br>Please select the master CSV file manually to continue testing:
                    <input type="file" accept=".csv" onchange="App.handleLocalMasterFileUpload(event)" style="margin-top:10px;">
                </div>
            `;
        }

        return `
            <div class="page-header">
                <h1>Contract Management</h1>
                <p class="page-subtitle">Add, edit, and manage your contracts</p>
            </div>
            ${fallbackWarning}

            <div class="card">
                <div class="card-header">
                    <h3 id="contract-form-title">➕ Add New Contract</h3>
                </div>
                <form id="contract-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Contract Agreement No.</label>
                            <input type="text" class="form-input" id="contract-number" placeholder="e.g., RS/Mech/OEA-CPA/CNB/16" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contract Date</label>
                            <input type="date" class="form-input" id="contract-date" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Name of Work</label>
                        <textarea class="form-textarea" id="work-name" placeholder="Enter the name/description of work..." required></textarea>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Tender Opening Date</label>
                            <input type="date" class="form-input" id="tender-date" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Base Period Month</label>
                            <select class="form-select" id="base-period-month" required>
                                ${PVCUtils.MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Base Period Year</label>
                            <input type="number" class="form-input" id="base-period-year" min="2000" max="2100" placeholder="e.g., 2018" required>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">L<sub>B</sub> (Base CPI-IW)</label>
                            <input type="number" class="form-input" id="lb-value" step="0.01" placeholder="e.g., 302" required>
                            <span class="form-hint">Consumer Price Index for base period</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">M<sub>B</sub> (Base WPI)</label>
                            <input type="number" class="form-input" id="mb-value" step="0.01" placeholder="e.g., 121.6" required>
                            <span class="form-hint">Wholesale Price Index for base period</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">F<sub>B</sub> (Base Fuel WPI)</label>
                            <input type="number" class="form-input" id="fb-value" step="0.01" value="0" placeholder="e.g., 140.2" required>
                            <span class="form-hint">Fuel & Power WPI for base period</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Current CPI Base Year</label>
                            <input type="number" class="form-input" id="current-cpi-year" value="2016" placeholder="e.g., 2016" required>
                            <span class="form-hint">Govt active series base year</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contract CPI Base Year</label>
                            <input type="number" class="form-input" id="contract-cpi-year" value="2001" placeholder="e.g., 2001" required>
                            <span class="form-hint">Contract agreement base year</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Linking Factor</label>
                            <input type="number" class="form-input" id="linking-factor" step="0.01" value="2.88" placeholder="e.g., 2.88" required>
                            <span class="form-hint">Conversion multiplier</span>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Labour Component %</label>
                            <input type="number" class="form-input" id="labour-pct" step="0.01" value="70" placeholder="e.g., 70" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Material Component %</label>
                            <input type="number" class="form-input" id="material-pct" step="0.01" value="15" placeholder="e.g., 15" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fuel Component %</label>
                            <input type="number" class="form-input" id="fuel-pct" step="0.01" value="0" placeholder="e.g., 0" required>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button type="submit" class="btn btn-primary btn-lg">💾 Save Contract</button>
                        <button type="button" class="btn btn-secondary" id="btn-reset-form" onclick="App.resetContractForm()">🔄 Reset</button>
                    </div>
                </form>
            </div>

            ${contracts.length > 0 ? `
                <div class="card-header" style="margin-top:8px; margin-bottom:16px;">
                    <h3>📋 Saved Contracts (${contracts.length})</h3>
                </div>
                <div class="contract-cards">
                    ${contracts.map(c => `
                        <div class="contract-card">
                            <h4>${c.contractNumber}</h4>
                            <p>${c.workName.substring(0, 120)}${c.workName.length > 120 ? '...' : ''}</p>
                            <p><strong>Base Period:</strong> ${PVCUtils.formatMonthYearLong(c.basePeriodMonth, c.basePeriodYear)}</p>
                            <p><strong>L<sub>B</sub>:</strong> ${c.LB} | <strong>M<sub>B</sub>:</strong> ${c.MB} | <strong>Link Factor:</strong> ${c.linkingFactor}</p>
                            <p><strong>Components:</strong> Labour ${c.labourPct}% | Material ${c.materialPct}% | Fuel ${c.fuelPct}%</p>
                            <div class="card-actions">
                                <button class="btn btn-sm btn-outline" onclick="App.editContract('${c.id}')">✏️ Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="App.deleteContract('${c.id}')">🗑️ Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    },

    bindContractEvents() {
        const form = document.getElementById('contract-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveContract();
            });

            const monthInput = document.getElementById('base-period-month');
            const yearInput = document.getElementById('base-period-year');

            const fetchBaseValues = () => {
                const m = parseInt(monthInput.value);
                const y = parseInt(yearInput.value);
                if (m && y) {
                    const idx = PVCStorage.getIndexForMonth(y, m);
                    if (idx) {
                        const lbEl = document.getElementById('lb-value');
                        const mbEl = document.getElementById('mb-value');
                        const fbEl = document.getElementById('fb-value');
                        const lfEl = document.getElementById('linking-factor');
                        const contractCpiEl = document.getElementById('contract-cpi-year');
                        
                        // Only auto-fill if empty or user wants it. Let's just aggressively auto-fill.
                        if(idx.cpiIW) lbEl.value = idx.cpiIW;
                        if(idx.wpi) mbEl.value = idx.wpi;
                        if(idx.fuelWPI) fbEl.value = idx.fuelWPI;
                        else if(idx.wpi) fbEl.value = idx.wpi; // fallback
                        
                        // Auto-set linking factor based on Base Period (Sep 2020 cutoff)
                        if (y < 2020 || (y === 2020 && m < 9)) {
                            lfEl.value = 2.88; // Old series 2001=100
                            if (contractCpiEl) contractCpiEl.value = 2001;
                        } else {
                            lfEl.value = 1.00; // New series 2016=100
                            if (contractCpiEl) contractCpiEl.value = parseInt(document.getElementById('current-cpi-year').value) || 2016;
                        }
                        
                        PVCUtils.showToast('Base indices & Linking Factor auto-filled!', 'success');
                    }
                }
            };

            if (monthInput) monthInput.addEventListener('change', fetchBaseValues);
            if (yearInput) yearInput.addEventListener('change', fetchBaseValues);
        }
    },

    saveContract() {
        const contract = {
            id: this.editingContractId || null,
            contractNumber: document.getElementById('contract-number').value.trim(),
            contractDate: document.getElementById('contract-date').value,
            workName: document.getElementById('work-name').value.trim(),
            tenderDate: document.getElementById('tender-date').value,
            basePeriodMonth: parseInt(document.getElementById('base-period-month').value),
            basePeriodYear: parseInt(document.getElementById('base-period-year').value),
            LB: parseFloat(document.getElementById('lb-value').value),
            MB: parseFloat(document.getElementById('mb-value').value),
            FB: parseFloat(document.getElementById('fb-value').value) || 0,
            currentCpiYear: parseInt(document.getElementById('current-cpi-year').value) || 2016,
            contractCpiYear: parseInt(document.getElementById('contract-cpi-year').value) || 2001,
            linkingFactor: parseFloat(document.getElementById('linking-factor').value),
            labourPct: parseFloat(document.getElementById('labour-pct').value),
            materialPct: parseFloat(document.getElementById('material-pct').value),
            fuelPct: parseFloat(document.getElementById('fuel-pct').value)
        };

        // Validate percentages
        const totalPct = contract.labourPct + contract.materialPct + contract.fuelPct;
        if (totalPct > 100) {
            PVCUtils.showToast('Component percentages total cannot exceed 100%!', 'error');
            return;
        }

        PVCStorage.saveContract(contract);
        PVCUtils.showToast(this.editingContractId ? 'Contract updated!' : 'Contract saved!', 'success');
        this.editingContractId = null;
        this.navigateTo('contracts');
    },

    editContract(id) {
        const c = PVCStorage.getContractById(id);
        if (!c) return;

        this.editingContractId = id;
        this.navigateTo('contracts');

        // Fill form after render
        setTimeout(() => {
            document.getElementById('contract-form-title').textContent = '✏️ Edit Contract';
            document.getElementById('contract-number').value = c.contractNumber;
            document.getElementById('contract-date').value = c.contractDate;
            document.getElementById('work-name').value = c.workName;
            document.getElementById('tender-date').value = c.tenderDate;
            document.getElementById('base-period-month').value = c.basePeriodMonth;
            document.getElementById('base-period-year').value = c.basePeriodYear;
            document.getElementById('lb-value').value = c.LB || '';
            document.getElementById('mb-value').value = c.MB || '';
            document.getElementById('fb-value').value = c.FB || '0';
            document.getElementById('current-cpi-year').value = c.currentCpiYear || 2016;
            document.getElementById('contract-cpi-year').value = c.contractCpiYear || 2001;
            document.getElementById('linking-factor').value = c.linkingFactor || 2.88;
            document.getElementById('labour-pct').value = c.labourPct;
            document.getElementById('material-pct').value = c.materialPct;
            document.getElementById('fuel-pct').value = c.fuelPct;
            window.scrollTo(0, 0);
        }, 50);
    },

    resetContractForm() {
        this.editingContractId = null;
        this.navigateTo('contracts');
    },

    deleteContract(id) {
        this.showConfirm('Delete Contract?', 'This will also delete all calculations associated with this contract. This action cannot be undone.', () => {
            PVCStorage.deleteContract(id);
            PVCUtils.showToast('Contract deleted.', 'success');
            this.navigateTo('contracts');
        });
    },

    // ==================== INDEX DATA (CPI/WPI) ====================

    // ==================== INDEX DATA (DEPRECATED) ====================
    // Index data is now fetched from master_index_data.csv

    // ==================== CALCULATE PVC ====================
    manualMonthsCount: 3,

    addMonthRow() {
        this.manualMonthsCount++;
        this.updateMonthRows();
    },

    removeMonthRow() {
        if (this.manualMonthsCount <= 1) return;
        this.manualMonthsCount--;
        this.updateMonthRows();
    },

    renderCalculate() {
        const contracts = PVCStorage.getContracts();
        const indexData = PVCStorage.getIndexData();
        const currentYear = new Date().getFullYear();

        let fallbackWarning = '';
        if (indexData.length === 0) {
            fallbackWarning = `
                <div class="toast-notification toast-error" style="position:relative; transform:none; opacity:1; margin-bottom:20px;">
                    <strong>Local Testing Mode Detected:</strong> The browser blocked reading the master_index_data.csv file. 
                    <br>Please select the master CSV file manually to continue testing:
                    <input type="file" accept=".csv" onchange="App.handleLocalMasterFileUpload(event)" style="margin-top:10px;">
                </div>
            `;
        }

        return `
            <div class="page-header">
                <h1>Calculate PVC</h1>
                <p class="page-subtitle">Price Variation Clause Calculation</p>
            </div>
            ${fallbackWarning}

            <div class="calc-mode-selector no-print">
                <button type="button" id="btn-mode-upload" class="calc-mode-btn active" onclick="App.toggleCalcMode('upload')">📂 Upload Excel Template (Recommended)</button>
                <button type="button" id="btn-mode-manual" class="calc-mode-btn" onclick="App.toggleCalcMode('manual')">✍️ Manual Entry Mode</button>
            </div>

            <!-- Upload Mode Section -->
            <div id="section-mode-upload" class="calc-section-toggle active">
                <div class="card no-print">
                    <div class="card-header">
                        <h3>📤 Quick Excel Upload (Auto-Fill & Calculate)</h3>
                        <button type="button" class="btn btn-secondary" onclick="ExcelHandler.downloadCalcTemplate()">📥 Download Template</button>
                    </div>
                    <p class="form-hint" style="margin-bottom: 16px;">
                        Simply upload your filled Excel template. It contains all contract details, base period, and monthly payable amounts. We will automatically parse, save the contract, and prepare your calculation instantly!
                    </p>
                    <div class="upload-zone">
                        <input type="file" id="calc-file-upload" accept=".xlsx,.xls">
                        <p>Click or drag your filled Quarter Data Excel here to auto-fill and calculate</p>
                    </div>
                </div>
            </div>

            <!-- Manual Entry Section -->
            <div id="section-mode-manual" class="calc-section-toggle">
                <form id="calc-form">
                    <!-- Step 1: Select Contract -->
                    <div class="card">
                        <div class="card-header">
                            <h3>📋 Step 1: Select Contract</h3>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contract</label>
                            <select class="form-select" id="calc-contract" required>
                                <option value="">-- Select a Contract --</option>
                                ${contracts.map(c => `<option value="${c.id}">${c.contractNumber} — ${c.workName.substring(0, 60)}</option>`).join('')}
                            </select>
                            ${contracts.length === 0 ? `<p class="text-secondary" style="margin-top:8px;">No contracts found for manual entry. <a href="#" onclick="App.navigateTo('contracts')">Click here to create one</a> or use the Upload tab above.</p>` : ''}
                        </div>
                    </div>

                    <!-- Step 2: Quarter Details -->
                    <div class="card">
                        <div class="card-header">
                            <h3>📅 Step 2: Quarter Details</h3>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Round Off Decimals</label>
                                <input type="number" class="form-input" id="round-off" min="0" max="10" value="2" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Starting Quarter Number</label>
                                <input type="number" class="form-input" id="quarter-number" min="1" max="100" placeholder="e.g., 11" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Start Month</label>
                                <select class="form-select" id="start-month" required>
                                    ${PVCUtils.MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Start Year</label>
                                <input type="number" class="form-input" id="start-year" min="2000" max="2100" value="${currentYear}" placeholder="e.g., 2021" required>
                            </div>
                        </div>
                    </div>

                    <!-- Step 3: Monthly Data -->
                    <div class="card">
                        <div class="card-header">
                            <h3>💰 Step 3: Monthly Payable Amounts & Index Data</h3>
                            <div class="action-buttons">
                                <button type="button" class="btn btn-sm btn-outline" onclick="App.addMonthRow()">➕ Add Month</button>
                                <button type="button" class="btn btn-sm btn-outline" onclick="App.removeMonthRow()">➖ Remove Month</button>
                            </div>
                        </div>
                        <p class="form-hint" style="margin-bottom:16px;">Enter the payable amount for each month. CPI-IW and WPI will auto-fill from stored data if available.</p>

                        <div id="month-rows-container">
                            <!-- Dynamically populated -->
                        </div>
                    </div>

                    <!-- Calculate Button -->
                    <div class="action-buttons" style="margin-top: 8px;">
                        <button type="submit" class="btn btn-primary btn-lg">🧮 Calculate PVC</button>
                    </div>
                </form>
            </div>
        `;
    },

    bindCalculateEvents() {
        const fileInput = document.getElementById('calc-file-upload');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const data = await ExcelHandler.parseCalcExcelFile(file);
                    this.autoFillCalculationData(data);
                    PVCUtils.showToast('Data loaded successfully!', 'success');
                } catch(err) {
                    PVCUtils.showToast(err.message, 'error');
                }
            });
        }

        const startMonth = document.getElementById('start-month');
        const startYear = document.getElementById('start-year');

        const updateMonthRows = () => this.updateMonthRows(false);

        if (startMonth) startMonth.addEventListener('change', updateMonthRows);
        if (startYear) startYear.addEventListener('input', updateMonthRows);

        // Initial render of month rows
        this.updateMonthRows(false);

        const form = document.getElementById('calc-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performCalculation();
            });
        }
    },

    autoFillCalculationData(data) {
        // Find or create contract
        let contract = null;
        if (data.contractData.contractNumber) {
            contract = PVCStorage.getContracts().find(c => c.contractNumber === data.contractData.contractNumber);
        }
        if (!contract) {
            contract = PVCStorage.saveContract(data.contractData);
            // Refresh dropdown
            const select = document.getElementById('calc-contract');
            if (select) {
                const wName = contract.workName || 'Unnamed Work';
                select.innerHTML += `<option value="${contract.id}">${contract.contractNumber || 'New'} — ${wName.substring(0, 60)}</option>`;
            }
        }
        
        document.getElementById('calc-contract').value = contract.id;
        if (data.quarterData.roundOff !== undefined) {
            const ro = document.getElementById('round-off');
            if (ro) ro.value = data.quarterData.roundOff;
        }
        document.getElementById('quarter-number').value = data.quarterData.quarterNumber;
        document.getElementById('start-month').value = data.quarterData.startMonth;
        document.getElementById('start-year').value = data.quarterData.startYear;
        
        this.manualMonthsCount = data.monthlyAmounts.length || 3;
        this.updateMonthRows(false);
        this.toggleCalcMode('manual');

        // Fill month values (wait for DOM update)
        setTimeout(() => {
            data.monthlyAmounts.forEach(m => {
                const amountInput = document.getElementById(`amount-${m.monthIndex}`);
                const cpiInput = document.getElementById(`cpi-${m.monthIndex}`);
                const wpiInput = document.getElementById(`wpi-${m.monthIndex}`);
                if (amountInput && m.amount) amountInput.value = m.amount;
                if (cpiInput && m.cpiIW) cpiInput.value = m.cpiIW;
                if (wpiInput && m.wpi) wpiInput.value = m.wpi;
            });
        }, 100);
    },

    updateMonthRows(preserveValues = false) {
        const container = document.getElementById('month-rows-container');
        if (!container) return;

        const sm = parseInt(document.getElementById('start-month').value, 10);
        const sy = parseInt(document.getElementById('start-year').value, 10);

        if (!sm || !sy) return;

        // Backup current values
        const existingValues = [];
        if (preserveValues) {
            for (let i = 0; i < this.manualMonthsCount; i++) {
                const amtEl = document.getElementById(`amount-${i}`);
                const cpiEl = document.getElementById(`cpi-${i}`);
                const wpiEl = document.getElementById(`wpi-${i}`);
                if (amtEl || cpiEl || wpiEl) {
                    existingValues.push({
                        amount: amtEl ? amtEl.value : '',
                        cpiIW: cpiEl ? cpiEl.value : '',
                        wpi: wpiEl ? wpiEl.value : ''
                    });
                }
            }
        }

        const months = PVCUtils.getConsecutiveMonths(sm, sy, this.manualMonthsCount);

        container.innerHTML = months.map((m, i) => {
            const periodStr = `INDX${m.month < 10 ? '0' : ''}${m.month}${m.year}`;
            const idx = PVCStorage.getIndexForMonth(m.year, m.month, periodStr);
            const prev = existingValues[i] || {};
            const valCpi = preserveValues && prev.cpiIW !== undefined && prev.cpiIW !== '' ? prev.cpiIW : (idx ? idx.cpiIW : '');
            const valWpi = preserveValues && prev.wpi !== undefined && prev.wpi !== '' ? prev.wpi : (idx ? idx.wpi : '');
            const valAmt = preserveValues && prev.amount !== undefined ? prev.amount : '';
            return `
                <div class="month-data-grid">
                    <div class="month-label">${m.label}</div>
                    <div class="form-group">
                        <label class="form-label">Payable Amount (₹)</label>
                        <input type="number" class="form-input" id="amount-${i}" step="any" value="${valAmt}" placeholder="0.00" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">CPI-IW (New Series)</label>
                        <input type="number" class="form-input" id="cpi-${i}" step="any" value="${valCpi}" placeholder="e.g., 121.7" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">WPI</label>
                        <input type="number" class="form-input" id="wpi-${i}" step="any" value="${valWpi}" placeholder="e.g., 133.7" required>
                    </div>
                </div>
            `;
        }).join('');
    },

    performCalculation() {
        const contractId = document.getElementById('calc-contract').value;
        if (!contractId) {
            PVCUtils.showToast('Please select a contract.', 'error');
            return;
        }

        const contract = PVCStorage.getContractById(contractId);
        if (!contract) {
            PVCUtils.showToast('Contract not found.', 'error');
            return;
        }

        const startQuarterNumber = parseInt(document.getElementById('quarter-number').value);
        const sm = parseInt(document.getElementById('start-month').value);
        const sy = parseInt(document.getElementById('start-year').value);
        const roundOff = parseInt(document.getElementById('round-off').value) || 2;
        
        const monthsInfo = PVCUtils.getConsecutiveMonths(sm, sy, this.manualMonthsCount);

        const allMonths = [];
        const allIndexData = [];

        for (let i = 0; i < this.manualMonthsCount; i++) {
            const amount = parseFloat(document.getElementById(`amount-${i}`).value);
            const cpiIW = parseFloat(document.getElementById(`cpi-${i}`).value);
            const wpi = parseFloat(document.getElementById(`wpi-${i}`).value);

            if (isNaN(amount) || isNaN(cpiIW) || isNaN(wpi)) {
                PVCUtils.showToast(`Please fill all fields for ${monthsInfo[i].label}.`, 'error');
                return;
            }

            const mYear = monthsInfo[i].year;
            const mMonth = monthsInfo[i].month;
            const masterData = PVCStorage.getIndexForMonth(mYear, mMonth);
            const fuelWPI = masterData ? (masterData.fuelWPI || wpi) : wpi;

            allMonths.push({
                month: mMonth,
                year: mYear,
                amount: amount,
                label: monthsInfo[i].label
            });
            allIndexData.push({ cpiIW, wpi, fuelWPI });
        }

        // Chunk into quarters (chunks of 3 months)
        const quarters = [];
        let curQIndex = 0;
        for (let i = 0; i < allMonths.length; i += 3) {
            const chunkMonths = allMonths.slice(i, i + 3);
            const chunkIndexData = allIndexData.slice(i, i + 3);
            
            const qNum = startQuarterNumber + curQIndex;
            const periodLabel = chunkMonths.length > 1 ? `${chunkMonths[0].label} to ${chunkMonths[chunkMonths.length - 1].label}` : `${chunkMonths[0].label}`;

            const qResult = PVCCalculator.calculate({
                months: chunkMonths,
                labourPct: contract.labourPct,
                materialPct: contract.materialPct,
                fuelPct: contract.fuelPct,
                linkingFactor: contract.linkingFactor,
                LB: contract.LB,
                MB: contract.MB,
                FB: contract.FB || 0,
                roundOff,
                indexData: chunkIndexData
            });

            quarters.push({
                quarterNumber: qNum,
                periodLabel,
                months: chunkMonths,
                indexData: chunkIndexData,
                result: qResult
            });
            curQIndex++;
        }

        // Build calc object for saving/displaying
        const calcData = {
            isMultiQuarter: true,
            contractId: contract.id,
            contract: { ...contract }, // snapshot of contract at calculation time
            quarterNumber: quarters[0].quarterNumber,
            startQuarterNumber,
            periodLabel: quarters.length > 1 ? `${quarters[0].periodLabel} (to ${quarters[quarters.length - 1].periodLabel})` : quarters[0].periodLabel,
            months: quarters[0].months,
            indexData: quarters[0].indexData,
            result: quarters[0].result,
            quarters,
            currentQuarterIndex: 0
        };

        this.lastCalcResult = calcData;
        this.navigateTo('result', calcData);
    },

    // ==================== RESULT / OUTPUT ====================

    renderResult(data) {
        if (!data && this.lastCalcResult) {
            data = this.lastCalcResult;
        }
        if (!data) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">🧮</div>
                    <p>No calculation result to display. Please perform a calculation first.</p>
                    <button class="btn btn-primary" onclick="App.navigateTo('calculate')">🧮 Calculate PVC</button>
                </div>
            `;
        }

        // Support legacy single quarter or new multi-quarter
        if (!data.quarters) {
            data.quarters = [{
                quarterNumber: data.quarterNumber,
                periodLabel: data.periodLabel,
                months: data.months,
                indexData: data.indexData,
                result: data.result
            }];
            data.currentQuarterIndex = 0;
            data.isMultiQuarter = false;
        }

        if (data.currentQuarterIndex === undefined) data.currentQuarterIndex = 0;
        const curQ = data.quarters[data.currentQuarterIndex];

        const qn = curQ.quarterNumber;
        const periodLabel = curQ.periodLabel;

        const singleDocHTML = this._generatePVCDocumentContent(data.contract, curQ, 'pvc-document');
        
        const bulkDocHTML = `
            <div id="bulk-pvc-document" class="bulk-container no-screen">
                ${data.quarters.map((q, idx) => `
                    <div class="pvc-document bulk-page">
                        ${this._generatePVCDocumentInner(data.contract, q)}
                    </div>
                    ${idx < data.quarters.length - 1 ? '<div class="page-break" style="page-break-after: always; break-after: page;"></div>' : ''}
                `).join('')}
            </div>
        `;

        const paginationHTML = data.quarters.length > 1 ? `
            <div class="pagination-bar no-print">
                <button class="btn btn-outline" onclick="App.prevQuarter()" ${data.currentQuarterIndex === 0 ? 'disabled' : ''}>⬅️ Previous Quarter</button>
                <span class="quarter-indicator">Showing Quarter-${qn} (Quarter ${data.currentQuarterIndex + 1} of ${data.quarters.length})</span>
                <button class="btn btn-outline" onclick="App.nextQuarter()" ${data.currentQuarterIndex === data.quarters.length - 1 ? 'disabled' : ''}>Next Quarter ➡️</button>
            </div>
        ` : '';

        return `
            <div class="page-header no-print">
                <h1>PVC Result — Quarter-${qn}</h1>
                <p class="page-subtitle">${periodLabel}</p>
            </div>

            ${paginationHTML}

            <div class="result-actions no-print">
                <button class="btn btn-primary" onclick="App.saveCurrentCalculation()">💾 Save Calculation</button>
                <button class="btn btn-secondary" onclick="PDFExport.exportToPDF('pvc-document', 'PVC_Quarter${qn}_${periodLabel.replace(/ /g,'')}.pdf')">📄 Download Current PDF</button>
                ${data.quarters.length > 1 ? `<button class="btn btn-secondary" onclick="PDFExport.exportBulkPDF('bulk-pvc-document', 'PVC_Bulk_AllQuarters.pdf')">📦 Bulk Download All PDFs</button>` : ''}
                <button class="btn btn-secondary" onclick="PDFExport.printDocument('single')">🖨️ Print Current</button>
                ${data.quarters.length > 1 ? `<button class="btn btn-secondary" onclick="PDFExport.printDocument('bulk')">🖨️ Bulk Print All</button>` : ''}
                ${data.quarters.length > 1 ? `<button class="btn btn-success" onclick="ExcelHandler.exportBulkExcel(App.lastCalcResult)">📊 Bulk Export to Excel</button>` : ''}
                <button class="btn btn-outline" onclick="App.navigateTo('calculate')">🔙 Back to Calculator</button>
            </div>

            ${singleDocHTML}
            ${bulkDocHTML}
        `;
    },

    prevQuarter() {
        if (this.lastCalcResult && this.lastCalcResult.currentQuarterIndex > 0) {
            this.lastCalcResult.currentQuarterIndex--;
            this.navigateTo('result', this.lastCalcResult);
        }
    },

    nextQuarter() {
        if (this.lastCalcResult && this.lastCalcResult.currentQuarterIndex < this.lastCalcResult.quarters.length - 1) {
            this.lastCalcResult.currentQuarterIndex++;
            this.navigateTo('result', this.lastCalcResult);
        }
    },

    _generatePVCDocumentContent(c, q, id) {
        return `<div class="pvc-document" id="${id}">${this._generatePVCDocumentInner(c, q)}</div>`;
    },

    _generatePVCDocumentInner(c, q) {
        const r = q.result;
        const qn = q.quarterNumber;
        const periodLabel = q.periodLabel;
        const months = q.months;
        const dec = r.roundOff !== undefined ? r.roundOff : 2;

        const componentRows = [
            { label: `${c.labourPct}% of Total Payable amount for Labour(L<sub>c</sub>)`, value: r.labourValue },
            { label: `${c.materialPct}% of Total Payable amount for Material (M<sub>c</sub>)`, value: r.materialValue },
            { label: `Fuel Component = ${c.fuelPct} % (F<sub>c</sub>)`, value: r.fuelValue }
        ];

        const basePeriodStr = PVCUtils.formatMonthYearLong(c.basePeriodMonth, c.basePeriodYear);

        const labourGeneric = FormulaRenderer.renderLabourGenericFormula();
        const labourCalc = FormulaRenderer.renderLabourCalculation(r.W, r.LQ, c.LB, c.labourPct);
        const materialGeneric = FormulaRenderer.renderMaterialGenericFormula();
        const materialCalc = FormulaRenderer.renderMaterialCalculation(r.W, r.MQ, c.MB, c.materialPct);
        
        const fuelGeneric = FormulaRenderer.renderFuelGenericFormula();
        const FQ_val = r.fuelValues ? PVCUtils.roundN(r.fuelValues.reduce((a,b)=>a+b,0)/r.fuelValues.length, 2) : 0;
        const fuelCalc = FormulaRenderer.renderFuelCalculation(r.W, FQ_val, c.FB || 0, c.fuelPct);
        
        let fuelFormulaHtml = `
                <div class="formula-row-compact">
                    <span class="formula-label">(C) Price variation for fuel component :</span>
                    <span class="formula-generic">${fuelGeneric}</span>
                    <span class="formula-calc">${fuelCalc.calcFraction}</span>
                    <span class="formula-result">= <strong>₹${r.fuelVariation.toFixed(dec)}</strong></span>
                </div>
        `;
        let totalFormulaStr = `(A+B+C) = ₹${r.labourVariation.toFixed(dec)} + ₹${r.materialVariation.toFixed(dec)} + ₹${r.fuelVariation.toFixed(dec)}`;

        const rowCount = Math.max(months.length, 3);
        const tableRowsHTML = [];
        for (let i = 0; i < rowCount; i++) {
            const m = months[i] || { label: '', amount: '' };
            const idxD = q.indexData[i] || { cpiIW: '', wpi: '' };
            const comp = componentRows[i] || { label: '', value: 0 };
            const cpiConv = r.convertedCPI[i] !== undefined ? r.convertedCPI[i].toFixed(2) : '';
            const rawCpi = idxD.cpiIW !== undefined && idxD.cpiIW !== '' ? parseFloat(idxD.cpiIW).toFixed(2) : '';
            const cpiDisplay = m.label ? (parseFloat(c.linkingFactor) === 1 ? cpiConv : `${rawCpi} x ${c.linkingFactor} = ${cpiConv}`) : '';
            const rawWpi = idxD.wpi !== undefined && idxD.wpi !== '' ? parseFloat(idxD.wpi).toFixed(2) : '';
            const amtDisplay = m.amount !== undefined && m.amount !== '' ? parseFloat(m.amount).toFixed(dec) : '';
            
            tableRowsHTML.push(`
                <tr>
                    <td>${m.label}</td>
                    <td class="text-right">${amtDisplay}</td>
                    ${i === 0 ? `<td rowspan="${rowCount}" class="font-bold" style="vertical-align:middle">${r.W.toFixed(dec)}</td>` : ''}
                    <td class="text-left" style="font-size:10.5px">${comp.label || ''}</td>
                    <td class="text-right">${comp.label ? comp.value.toFixed(dec) : ''}</td>
                    <td>${cpiDisplay}</td>
                    <td>${rawWpi}</td>
                </tr>
            `);
        }

        return `
            <h1>PVC for: ${periodLabel}</h1>
            <p class="doc-subtitle">Price variation as mentioned in clause 5.7.6 of general conditions of contract agreement.</p>

            <table class="contract-info-table">
                <tr><td class="info-label">Contract agreement no.:</td><td>${c.contractNumber}, dated ${PVCUtils.formatDateDot(c.contractDate)}</td></tr>
                <tr><td class="info-label">Name of work:</td><td>${c.workName}</td></tr>
                <tr><td class="info-label">PVC for the period:</td><td>${periodLabel}</td></tr>
                <tr><td class="info-label">Tender opening date:</td><td>${PVCUtils.formatDateDot(c.tenderDate)}</td></tr>
                <tr><td class="info-label">Base period:</td><td>${basePeriodStr}</td></tr>
            </table>

            <div class="base-info">
                <p>L<sub>B</sub>= Consumer price index number for industrial worker all India for the base period (${basePeriodStr})= ${c.LB} (L<sub>B</sub>)</p>
                <p>M<sub>B</sub>= Wholesale price index number for the base period (${basePeriodStr})=${c.MB} (M<sub>B</sub>)</p>
                <p>F<sub>B</sub>= Fuel & Power WPI for the base period (${basePeriodStr})=${c.FB || 0} (F<sub>B</sub>)</p>
                ${parseFloat(c.linkingFactor) !== 1 ? `<p>The linking factor of new series ${c.currentCpiYear || 2016}=100 to old series of CPI-IW (${c.contractCpiYear || 2001}=100) is <strong>${c.linkingFactor}</strong></p>` : ''}
            </div>

            <table class="pvc-table">
                <thead>
                    <tr>
                        <th style="width:60px">Month</th>
                        <th style="width:90px">Month Payable Amount</th>
                        <th style="width:100px">Total Amount Payable in said Quarter (W)</th>
                        <th style="width:170px">Percentage of Different Component</th>
                        <th style="width:80px">Value of Different Component in ₹</th>
                        <th style="width:140px">All India <em>Consumer Price</em> Index for Industrial Workers for Labour (Base ${parseFloat(c.linkingFactor) === 1 ? (c.currentCpiYear || 2016) : (c.contractCpiYear || 2001)}=100)</th>
                        <th style="width:100px">All India commodities <em>wholesale Price</em> Index For Material Component (Base 2011-12=100)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHTML.join('')}
                    <tr class="avg-row">
                        <td colspan="3"></td>
                        <td colspan="2" style="text-align:right;font-weight:700">Average price index</td>
                        <td class="font-bold">${r.LQ.toFixed(2)} (L<sub>Q</sub>)</td>
                        <td class="font-bold">${r.MQ.toFixed(2)} (M<sub>Q</sub>)</td>
                    </tr>
                </tbody>
            </table>

            <div class="formula-section">
                <p class="agreement-label">As per agreement:-</p>

                <div class="formula-row-compact">
                    <span class="formula-label">(A) Price variation for labour component :</span>
                    <span class="formula-generic">${labourGeneric}</span>
                    <span class="formula-calc">${labourCalc.calcFraction}</span>
                    <span class="formula-result">= <strong>₹${r.labourVariation.toFixed(dec)}</strong></span>
                </div>

                <div class="formula-row-compact">
                    <span class="formula-label">(B) Price variation for material component :</span>
                    <span class="formula-generic">${materialGeneric}</span>
                    <span class="formula-calc">${materialCalc.calcFraction}</span>
                    <span class="formula-result">= <strong>₹${r.materialVariation.toFixed(dec)}</strong></span>
                </div>

                ${fuelFormulaHtml}

                <div class="total-section">
                    <p><strong>Total price variation amount for: ${periodLabel}</strong> = ${totalFormulaStr}</p>
                    <p class="total-amount">= ₹${r.totalPVC.toFixed(dec)}</p>
                    <p class="amount-words">(In words) - ₹${r.amountInWords}</p>
                </div>
            </div>

            <div class="stamp-space"></div>
        `;
    },

    bindResultEvents() {
        // Events are bound via onclick attributes in the HTML
    },

    saveCurrentCalculation() {
        if (!this.lastCalcResult) {
            PVCUtils.showToast('No calculation to save.', 'error');
            return;
        }
        const saved = PVCStorage.saveCalculation(this.lastCalcResult);
        this.lastCalcResult.id = saved.id;
        PVCUtils.showToast('Calculation saved!', 'success');
    },

    // ==================== DATA MANAGEMENT ====================



    renderDataMgmt() {
        const contracts = PVCStorage.getContracts();
        const calculations = PVCStorage.getCalculations();
        const indexData = PVCStorage.getIndexData();

        return `
            <div class="page-header">
                <h1>Data Management</h1>
                <p class="page-subtitle">Backup, restore, and manage your data</p>
            </div>

            <div class="data-mgmt-grid">
                <div class="data-mgmt-card">
                    <div class="mgmt-icon">📥</div>
                    <h3>Export Backup</h3>
                    <p>Download all your data (contracts, calculations, index data) as a JSON file for backup.</p>
                    <p style="font-size:0.78rem; color: var(--text-muted);">
                        ${contracts.length} contracts • ${calculations.length} calculations • ${indexData.length} index records
                    </p>
                    <button class="btn btn-primary" onclick="PVCStorage.downloadBackup(); PVCUtils.showToast('Backup downloaded!', 'success')">📥 Download Backup</button>
                </div>

                <div class="data-mgmt-card">
                    <div class="mgmt-icon">📤</div>
                    <h3>Import Backup</h3>
                    <p>Restore data from a previously exported JSON backup file. This will merge with existing data.</p>
                    <input type="file" id="import-file" accept=".json" style="display:none">
                    <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">📤 Select Backup File</button>
                </div>

                <div class="data-mgmt-card">
                    <div class="mgmt-icon">🗑️</div>
                    <h3>Clear All Data</h3>
                    <p>Remove all saved contracts, calculations, and index data. This cannot be undone!</p>
                    <button class="btn btn-danger" onclick="App.clearAllData()">🗑️ Clear All Data</button>
                </div>
            </div>
        `;
    },

    bindDataMgmtEvents() {
        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        PVCStorage.importAll(data);
                        PVCUtils.showToast('Backup restored successfully!', 'success');
                        this.navigateTo('data-mgmt');
                    } catch (err) {
                        PVCUtils.showToast('Invalid backup file: ' + err.message, 'error');
                    }
                };
                reader.readAsText(file);
            });
        }
    },

    clearAllData() {
        this.showConfirm(
            '⚠️ Clear All Data?',
            'This will permanently delete ALL contracts, calculations, and index data. This action CANNOT be undone. Please export a backup first.',
            () => {
                PVCStorage.clearAll();
                PVCUtils.showToast('All data cleared.', 'success');
                this.navigateTo('dashboard');
            }
        );
    },

    // ==================== UTILITY: Confirm Modal ====================

    showConfirm(title, message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
                    <button class="btn btn-danger" id="modal-confirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#modal-confirm').addEventListener('click', () => {
            overlay.remove();
            onConfirm();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    // ==================== UTILITY: Local Master File Upload ====================

    async handleLocalMasterFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const lines = csvText.split('\n');
                const entries = [];
                for(let i=1; i<lines.length; i++) {
                    const line = lines[i].trim();
                    if(!line) continue;
                    const cols = line.split(',');
                    if(cols.length >= 4) {
                        const periodStr = cols[0].trim();
                        if (periodStr.length >= 10 && periodStr.toUpperCase().startsWith('INDX')) {
                            const month = parseInt(periodStr.substring(4, 6), 10);
                            const year = parseInt(periodStr.substring(6, 10), 10);
                            entries.push({
                                periodStr: periodStr.toUpperCase(),
                                year: year,
                                month: month,
                                cpiIW: parseFloat(cols[1]),
                                wpi: parseFloat(cols[2]),
                                fuelWPI: parseFloat(cols[3])
                            });
                        }
                    }
                }
                PVCStorage.setMasterIndexData(entries);
                PVCUtils.showToast('Master CSV Loaded Successfully!', 'success');
                this.navigateTo('calculate'); // Refresh page
            } catch (err) {
                PVCUtils.showToast('Failed to parse CSV.', 'error');
                console.error(err);
            }
        };
        reader.readAsText(file);
    }
};

// ==================== APP INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
