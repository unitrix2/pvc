/**
 * PVC Calculator - Excel Handler
 * Uses SheetJS (xlsx) for Excel import/export of CPI/WPI index data
 */
const ExcelHandler = {

    /**
     * Generate and download a blank Excel template for CPI/WPI data entry
     */
    downloadTemplate() {
        const headers = ['Year', 'Month (1-12)', 'CPI-IW (New Series 2016=100)', 'WPI (Base 2011-12=100)'];

        // Create sample data rows
        const sampleData = [
            [2018, 11, 0, 0],
            [2018, 12, 0, 0],
            [2019, 1, 0, 0],
        ];

        const wsData = [headers, ...sampleData];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        ws['!cols'] = [
            { wch: 8 },   // Year
            { wch: 14 },  // Month
            { wch: 32 },  // CPI-IW
            { wch: 30 }   // WPI
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'CPI_WPI_Data');

        // Add instruction sheet
        const instructions = [
            ['PVC Calculator - CPI/WPI Data Template'],
            [''],
            ['Instructions:'],
            ['1. Fill in the Year and Month (1=Jan, 2=Feb, ..., 12=Dec)'],
            ['2. Enter CPI-IW values from the New Series (Base 2016=100)'],
            ['   Source: Labour Bureau India (labourbureau.gov.in)'],
            ['3. Enter WPI values (Base 2011-12=100)'],
            ['   Source: Office of Economic Adviser (eaindustry.nic.in)'],
            ['4. Save the file and upload it in the PVC Calculator app'],
            [''],
            ['Note: The app will convert CPI-IW to old series using the linking factor.'],
            ['You can add data for as many months as needed.'],
            ['Duplicate entries (same year+month) will be updated, not duplicated.']
        ];
        const wsInst = XLSX.utils.aoa_to_sheet(instructions);
        wsInst['!cols'] = [{ wch: 70 }];
        XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');

        XLSX.writeFile(wb, 'CPI_WPI_Template.xlsx');
    },

    /**
     * Parse uploaded Excel file and extract CPI/WPI data
     * @param {File} file - The uploaded Excel file
     * @returns {Promise<Array>} Array of {year, month, cpiIW, wpi} objects
     */
    parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Read first sheet
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    // Skip header row, parse data
                    const entries = [];
                    let errors = [];

                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length < 4) continue;

                        const year = parseInt(row[0]);
                        const month = parseInt(row[1]);
                        const cpiIW = parseFloat(row[2]);
                        const wpi = parseFloat(row[3]);

                        // Validate
                        if (isNaN(year) || year < 1900 || year > 2100) {
                            errors.push(`Row ${i + 1}: Invalid year "${row[0]}"`);
                            continue;
                        }
                        if (isNaN(month) || month < 1 || month > 12) {
                            errors.push(`Row ${i + 1}: Invalid month "${row[1]}" (must be 1-12)`);
                            continue;
                        }
                        if (isNaN(cpiIW) || cpiIW <= 0) {
                            errors.push(`Row ${i + 1}: Invalid CPI-IW "${row[2]}"`);
                            continue;
                        }
                        if (isNaN(wpi) || wpi <= 0) {
                            errors.push(`Row ${i + 1}: Invalid WPI "${row[3]}"`);
                            continue;
                        }

                        entries.push({ year, month, cpiIW, wpi });
                    }

                    if (entries.length === 0) {
                        reject(new Error('No valid data found in the Excel file. ' +
                            (errors.length > 0 ? 'Errors: ' + errors.slice(0, 3).join('; ') : '')));
                        return;
                    }

                    resolve({ entries, errors });
                } catch (err) {
                    reject(new Error('Failed to parse Excel file: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read the file.'));
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Export current index data to Excel file
     */
    exportIndexData() {
        const data = PVCStorage.getIndexData();
        if (data.length === 0) {
            PVCUtils.showToast('No index data to export.', 'error');
            return;
        }

        const headers = ['Year', 'Month (1-12)', 'CPI-IW (New Series 2016=100)', 'WPI (Base 2011-12=100)'];
        const rows = data.map(d => [d.year, d.month, d.cpiIW, d.wpi]);

        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [
            { wch: 8 },
            { wch: 14 },
            { wch: 32 },
            { wch: 30 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'CPI_WPI_Data');
        XLSX.writeFile(wb, `CPI_WPI_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
    },

    // === Quarter Calculation Data Upload (NEW) ===

    downloadCalcTemplate() {
        const data = [
            ['PVC Calculation Data Template'],
            ['Instructions: Fill the values in column B and upload.'],
            [''],
            ['--- CONTRACT DETAILS ---'],
            ['Contract Agreement No.', 'RS/Mech/OEA-CPA/CNB/16'],
            ['Contract Date (DD-MM-YYYY)', '25-07-2019'],
            ['Name of Work', 'Internal cleaning...'],
            ['Tender Opening Date (DD-MM-YYYY)', '12-11-2018'],
            ['Base Period Month (1-12)', 11],
            ['Base Period Year', 2018],
            ['Labour Component %', 70],
            ['Material Component %', 15],
            ['Fuel Component %', 0],
            ['Round Off Digits (e.g. 2, 8)', 2],
            [''],
            ['--- QUARTER DETAILS ---'],
            ['Quarter Number', 11],
            ['Start Month (1-12)', 6],
            ['Start Year', 2021],
            [''],
            ['--- MONTHLY PAYABLE AMOUNTS ---'],
            ['Period (DD-MM-YYYY or INDXMMYYYY)', 'Payable Amount (₹)'],
            ['01-06-2021', 202621.1],
            ['01-07-2021', 304199.48],
            ['01-08-2021', 330387.76]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
        
        // Highlight headers
        ws['A4'].s = { font: { bold: true } };
        ws['A18'].s = { font: { bold: true } };
        ws['A23'].s = { font: { bold: true } };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'QuarterData');
        XLSX.writeFile(wb, 'Quarter_Calculation_Template.xlsx');
    },

    parseCalcExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    // Helper to find row by label
                    const findVal = (label) => {
                        const row = jsonData.find(r => r[0] && r[0].toString().includes(label));
                        return row ? row[1] : null;
                    };

                    let bmVal = findVal('Base Period Month');
                    let byVal = findVal('Base Period Year');
                    let bm = parseInt(bmVal);
                    let by = parseInt(byVal);

                    if (isNaN(bm) && typeof bmVal === 'string') {
                        const mIdx = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].findIndex(m => bmVal.toUpperCase().startsWith(m));
                        if (mIdx >= 0) bm = mIdx + 1;
                    }
                    
                    // Auto-fetch Base Indices from master data
                    let lb = 0, mb = 0, fb = 0;
                    let lf = 1.0;
                    let contractCpi = 2016;
                    
                    if (bm && by) {
                        const idx = PVCStorage.getIndexForMonth(by, bm);
                        if (idx) {
                            lb = idx.cpiIW || 0;
                            mb = idx.wpi || 0;
                            fb = idx.fuelWPI || idx.wpi || 0;
                        }
                        if (by < 2020 || (by === 2020 && bm < 9)) {
                            lf = 2.88;
                            contractCpi = 2001;
                        }
                    }

                    const contractData = {
                        contractNumber: findVal('Contract Agreement No.'),
                        contractDate: findVal('Contract Date'),
                        workName: findVal('Name of Work'),
                        tenderDate: findVal('Tender Opening Date'),
                        basePeriodMonth: bm,
                        basePeriodYear: by,
                        LB: lb,
                        MB: mb,
                        FB: fb,
                        currentCpiYear: 2016,
                        contractCpiYear: contractCpi,
                        linkingFactor: lf,
                        labourPct: parseFloat(findVal('Labour Component')),
                        materialPct: parseFloat(findVal('Material Component')),
                        fuelPct: parseFloat(findVal('Fuel Component') || 0)
                    };

                    // We will parse Start Month and Start Year after checking the Period cells
                    let fallbackStartMonth = parseInt(findVal('Start Month'));
                    let fallbackStartYear = parseInt(findVal('Start Year'));

                    let parsedStartMonth = null;
                    let parsedStartYear = null;

                    const monthlyAmounts = [];
                    let monthSectionStarted = false;

                    for (let i = 0; i < jsonData.length; i++) {
                        if (jsonData[i][0]) {
                            const firstCol = jsonData[i][0].toString().toLowerCase().trim();
                            if (firstCol.startsWith('period (') || firstCol.startsWith('month number')) {
                                monthSectionStarted = true;
                                continue;
                            }
                        }
                        if (monthSectionStarted && jsonData[i][0] && monthlyAmounts.length < 3) {
                            let periodVal = jsonData[i][0];
                            
                            // Try to parse the exact month/year from the first amount row
                            if (monthlyAmounts.length === 0) {
                                if (typeof periodVal === 'number') {
                                    try {
                                        const dateObj = XLSX.SSF.parse_date_code(periodVal);
                                        if (dateObj) {
                                            parsedStartMonth = dateObj.m;
                                            parsedStartYear = dateObj.y;
                                        }
                                    } catch(e) {}
                                } else if (typeof periodVal === 'string') {
                                    let pValStr = periodVal.trim().toUpperCase();
                                    let indxMatch = pValStr.match(/INDX\s*-?\s*(\d{2})\s*-?\s*(\d{2,4})/);
                                    if (indxMatch) {
                                        parsedStartMonth = parseInt(indxMatch[1]);
                                        parsedStartYear = parseInt(indxMatch[2].length === 2 ? '20'+indxMatch[2] : indxMatch[2]);
                                    } else {
                                        let parts = periodVal.split(/[-/.\s]+/);
                                        if (parts.length >= 2) {
                                            if (parts.length >= 3 && !isNaN(parts[1])) { // DD-MM-YYYY
                                                parsedStartMonth = parseInt(parts[1]);
                                                parsedStartYear = parseInt(parts[2].length === 2 ? '20'+parts[2] : parts[2]);
                                            } else { // MMM-YYYY or MM-YYYY
                                                let mStr = parts[0];
                                                if (isNaN(mStr)) { // MMM
                                                    const mIdx = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].findIndex(m => mStr.startsWith(m));
                                                    if (mIdx >= 0) parsedStartMonth = mIdx + 1;
                                                } else { // MM
                                                    parsedStartMonth = parseInt(mStr);
                                                }
                                                if (parsedStartMonth) {
                                                    let yStr = parts[1];
                                                    parsedStartYear = parseInt(yStr.length === 2 ? '20'+yStr : yStr);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            monthlyAmounts.push({
                                monthIndex: monthlyAmounts.length,
                                amount: parseFloat(jsonData[i][1]),
                                cpiIW: '', // Fetched via app.js auto-fill
                                wpi: ''    // Fetched via app.js auto-fill
                            });
                        }
                    }

                    const quarterData = {
                        quarterNumber: parseInt(findVal('Quarter Number')),
                        startMonth: parsedStartMonth || fallbackStartMonth,
                        startYear: parsedStartYear || fallbackStartYear,
                        roundOff: parseInt(findVal('Round Off Digits'))
                    };
                    
                    if (isNaN(quarterData.roundOff)) quarterData.roundOff = 2;

                    if (!contractData.contractNumber) {
                        reject(new Error("Could not find Contract Agreement No. in the file."));
                        return;
                    }

                    resolve({ contractData, quarterData, monthlyAmounts });
                } catch (err) { reject(new Error('Failed to parse Calculation Excel file: ' + err.message)); }
            };
            reader.onerror = () => reject(new Error('Failed to read the file.'));
            reader.readAsArrayBuffer(file);
        });
    },

    // === Master Index Data Fetch (NEW) ===

    async fetchMasterData() {
        try {
            const response = await fetch('master_index_data.csv?v=' + new Date().getTime());
            if (!response.ok) throw new Error('Network response was not ok');
            const csvText = await response.text();
            
            const lines = csvText.split('\n');
            const entries = [];
            
            // Skip header
            for(let i=1; i<lines.length; i++) {
                const line = lines[i].trim();
                if(!line) continue;
                const cols = line.split(',');
                if(cols.length >= 4) {
                    const periodStr = cols[0].trim();
                    if (periodStr.length >= 10 && periodStr.toUpperCase().startsWith('INDX')) {
                        const month = parseInt(periodStr.substring(4, 6));
                        const year = parseInt(periodStr.substring(6, 10));
                        entries.push({
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
            return entries;
        } catch(err) {
            console.error("Could not fetch master_index_data.csv automatically. (May be blocked by local file:// protocol)", err);
            throw err;
        }
    }
};
