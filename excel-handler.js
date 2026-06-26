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
            ['Instructions: Fill the values in column B and upload. You can add data for the entire contract period (as many months as needed).'],
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
            ['01-08-2021', 330387.76],
            ['01-09-2021', 315200.00],
            ['01-10-2021', 320450.00],
            ['01-11-2021', 325800.00],
            ['01-12-2021', 330100.00],
            ['01-01-2022', 335200.00],
            ['01-02-2022', 340500.00],
            ['01-03-2022', 345000.00],
            ['01-04-2022', 350000.00],
            ['01-05-2022', 355000.00]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
        
        // Highlight headers
        ws['A4'].s = { font: { bold: true } };
        ws['A18'].s = { font: { bold: true } };
        ws['A23'].s = { font: { bold: true } };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'QuarterData');
        XLSX.writeFile(wb, 'Multi_Quarter_Calculation_Template.xlsx');
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
                        const basePeriodStr = `INDX${bm < 10 ? '0' : ''}${bm}${by}`;
                        const idx = PVCStorage.getIndexForMonth(by, bm, basePeriodStr);
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
                        if (monthSectionStarted && jsonData[i][0] && jsonData[i][1] !== undefined && jsonData[i][1] !== '') {
                            const amt = parseFloat(jsonData[i][1]);
                            if (isNaN(amt)) continue;

                            let periodVal = jsonData[i][0];
                            let rowMonth = null;
                            let rowYear = null;
                            let rowPeriodStr = null;

                            if (typeof periodVal === 'number') {
                                try {
                                    const dateObj = XLSX.SSF.parse_date_code(periodVal);
                                    if (dateObj) {
                                        rowMonth = dateObj.m;
                                        rowYear = dateObj.y;
                                    }
                                } catch(e) {}
                            } else if (typeof periodVal === 'string') {
                                let pValStr = periodVal.trim().toUpperCase();
                                let indxMatch = pValStr.match(/INDX\s*-?\s*(\d{2})\s*-?\s*(\d{2,4})/);
                                if (indxMatch) {
                                    rowMonth = parseInt(indxMatch[1], 10);
                                    rowYear = parseInt(indxMatch[2].length === 2 ? '20'+indxMatch[2] : indxMatch[2], 10);
                                    rowPeriodStr = `INDX${rowMonth < 10 ? '0' : ''}${rowMonth}${rowYear}`;
                                } else {
                                    let parts = periodVal.split(/[-/.\s]+/);
                                    if (parts.length >= 2) {
                                        if (parts.length >= 3 && !isNaN(parts[1])) { // DD-MM-YYYY
                                            rowMonth = parseInt(parts[1], 10);
                                            rowYear = parseInt(parts[2].length === 2 ? '20'+parts[2] : parts[2], 10);
                                        } else { // MMM-YYYY or MM-YYYY
                                            let mStr = parts[0];
                                            if (isNaN(mStr)) { // MMM
                                                const mIdx = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].findIndex(m => mStr.startsWith(m));
                                                if (mIdx >= 0) rowMonth = mIdx + 1;
                                            } else { // MM
                                                rowMonth = parseInt(mStr, 10);
                                            }
                                            if (rowMonth) {
                                                let yStr = parts[1];
                                                rowYear = parseInt(yStr.length === 2 ? '20'+yStr : yStr, 10);
                                            }
                                        }
                                    }
                                }
                            }

                            if (rowMonth && rowYear && !rowPeriodStr) {
                                rowPeriodStr = `INDX${rowMonth < 10 ? '0' : ''}${rowMonth}${rowYear}`;
                            }

                            if (monthlyAmounts.length === 0 && rowMonth && rowYear) {
                                parsedStartMonth = rowMonth;
                                parsedStartYear = rowYear;
                            }

                            const rowIdx = PVCStorage.getIndexForMonth(rowYear, rowMonth, rowPeriodStr);

                            monthlyAmounts.push({
                                monthIndex: monthlyAmounts.length,
                                amount: amt,
                                cpiIW: rowIdx ? rowIdx.cpiIW : '',
                                wpi: rowIdx ? rowIdx.wpi : ''
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

    exportBulkExcel(data) {
        const wb = XLSX.utils.book_new();
        const c = data.contract;

        // Styles for xlsx-js-style
        const styleHeader = {
            font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1E293B" } },
            alignment: { vertical: "center", horizontal: "center" }
        };
        const styleSection = {
            font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: "1E293B" } },
            fill: { fgColor: { rgb: "E2E8F0" } },
            alignment: { vertical: "center", horizontal: "left" },
            border: { top: { style: "thin", color: { rgb: "CBD5E1" } }, bottom: { style: "thin", color: { rgb: "CBD5E1" } } }
        };
        const styleSubHeader = {
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "334155" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: { top: { style: "thin", color: { rgb: "94A3B8" } }, bottom: { style: "thin", color: { rgb: "94A3B8" } } }
        };
        const styleLabel = {
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: "334155" } },
            alignment: { vertical: "center", horizontal: "left" },
            border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } }
        };
        const styleData = {
            font: { name: 'Calibri', sz: 11, color: { rgb: "000000" } },
            alignment: { vertical: "center", horizontal: "right" },
            border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } }
        };
        const styleTextData = {
            font: { name: 'Calibri', sz: 11, color: { rgb: "000000" } },
            alignment: { vertical: "center", horizontal: "left" },
            border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } }
        };
        const styleTotal = {
            font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "DCFCE7" } },
            alignment: { vertical: "center", horizontal: "right" },
            border: { top: { style: "thin", color: { rgb: "16A34A" } }, bottom: { style: "double", color: { rgb: "16A34A" } } }
        };
        const styleTotalText = {
            font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "DCFCE7" } },
            alignment: { vertical: "center", horizontal: "left" },
            border: { top: { style: "thin", color: { rgb: "16A34A" } }, bottom: { style: "double", color: { rgb: "16A34A" } } }
        };
        const styleWords = {
            font: { name: 'Calibri', sz: 11, italic: true, bold: true, color: { rgb: "1E293B" } },
            alignment: { vertical: "center", horizontal: "left" }
        };

        // 1. Summary Sheet
        const summaryData = [
            ['PVC Calculation Bulk Summary'],
            [''],
            ['--- CONTRACT DETAILS ---'],
            ['Contract Agreement No.', c.contractNumber],
            ['Name of Work', c.workName],
            ['Contract Date', c.contractDate],
            ['Tender Opening Date', c.tenderDate],
            ['Base Period', PVCUtils.formatMonthYearLong(c.basePeriodMonth, c.basePeriodYear)],
            ['Base Indices', `LB: ${c.LB}, MB: ${c.MB}, FB: ${c.FB || 0}`],
            ['Component Percentages', `Labour: ${c.labourPct}%, Material: ${c.materialPct}%, Fuel: ${c.fuelPct}%`],
            ['Linking Factor', c.linkingFactor],
            [''],
            ['--- QUARTERS SUMMARY ---'],
            ['Quarter No.', 'Period', 'Total Payable (W)', 'Labour Variation (A)', 'Material Variation (B)', 'Fuel Variation (C)', 'Total PVC (₹)']
        ];

        let totalW = 0;
        let totalPVC = 0;

        data.quarters.forEach(q => {
            const r = q.result;
            summaryData.push([
                `Quarter-${q.quarterNumber}`,
                q.periodLabel,
                r.W,
                r.labourVariation,
                r.materialVariation,
                r.fuelVariation,
                r.totalPVC
            ]);
            totalW += r.W;
            totalPVC += r.totalPVC;
        });

        summaryData.push(['', 'Total', totalW, '', '', '', totalPVC]);

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        
        wsSummary['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title
            { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }, // Contract Details
            { s: { r: 12, c: 0 }, e: { r: 12, c: 6 } } // Quarters Summary
        ];
        
        for (let r = 0; r < summaryData.length; r++) {
            for (let c = 0; c < 7; c++) {
                const cellAddr = XLSX.utils.encode_cell({ r, c });
                if (!wsSummary[cellAddr]) wsSummary[cellAddr] = { v: '', t: 's' };
                
                if (r === 0) wsSummary[cellAddr].s = styleHeader;
                else if (r === 2 || r === 12) wsSummary[cellAddr].s = styleSection;
                else if (r >= 3 && r <= 10) {
                    wsSummary[cellAddr].s = c === 0 ? styleLabel : styleTextData;
                } else if (r === 13) {
                    wsSummary[cellAddr].s = styleSubHeader;
                } else if (r >= 14 && r < summaryData.length - 1) {
                    wsSummary[cellAddr].s = c < 2 ? styleTextData : { ...styleData, z: '#,##0.00' };
                } else if (r === summaryData.length - 1) {
                    wsSummary[cellAddr].s = c < 2 ? styleTotalText : { ...styleTotal, z: '#,##0.00' };
                }
            }
        }

        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // 2. Individual Quarter Sheets
        data.quarters.forEach(q => {
            const r = q.result;
            const qData = [
                [`PVC Calculation - Quarter ${q.quarterNumber}`],
                [`Period: ${q.periodLabel}`],
                [''],
                ['--- MONTHLY BREAKDOWN ---'],
                ['Month', 'Payable Amount (₹)', 'CPI-IW', 'Converted CPI', 'WPI', 'Fuel WPI']
            ];

            q.months.forEach((m, idx) => {
                const idxData = q.indexData[idx];
                qData.push([
                    m.label,
                    m.amount !== undefined ? parseFloat(m.amount) : '',
                    idxData.cpiIW ? parseFloat(parseFloat(idxData.cpiIW).toFixed(2)) : '',
                    r.convertedCPI[idx] !== undefined ? parseFloat(parseFloat(r.convertedCPI[idx]).toFixed(2)) : '',
                    idxData.wpi ? parseFloat(parseFloat(idxData.wpi).toFixed(2)) : '',
                    idxData.fuelWPI ? parseFloat(parseFloat(idxData.fuelWPI).toFixed(2)) : ''
                ]);
            });

            qData.push(['', '']);
            qData.push(['--- AVERAGE INDICES ---', '']);
            qData.push(['LQ (Average CPI-IW)', r.LQ]);
            qData.push(['MQ (Average WPI)', r.MQ]);
            qData.push(['']);
            qData.push(['--- VARIATION CALCULATIONS ---', '']);
            qData.push(['(A) Labour Variation', r.labourVariation]);
            qData.push(['(B) Material Variation', r.materialVariation]);
            qData.push(['(C) Fuel Variation', r.fuelVariation]);
            qData.push(['']);
            qData.push(['TOTAL PVC (₹)', r.totalPVC]);
            qData.push(['Amount in Words', r.amountInWords]);

            const wsQ = XLSX.utils.aoa_to_sheet(qData);
            wsQ['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
            
            const mCount = q.months.length;
            const startAvg = 5 + mCount + 1;
            const startVar = startAvg + 4;
            const totalRow = startVar + 5;
            const wordsRow = totalRow + 1;

            wsQ['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title
                { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Period Subtitle
                { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // Monthly Breakdown Section
                { s: { r: startAvg, c: 0 }, e: { r: startAvg, c: 5 } }, // Average Indices Section
                { s: { r: startVar, c: 0 }, e: { r: startVar, c: 5 } }, // Variation Calculations Section
                { s: { r: wordsRow, c: 1 }, e: { r: wordsRow, c: 5 } } // Amount in words merge
            ];

            for (let rRow = 0; rRow < qData.length; rRow++) {
                for (let cCol = 0; cCol < 6; cCol++) {
                    const cellAddr = XLSX.utils.encode_cell({ r: rRow, c: cCol });
                    if (!wsQ[cellAddr]) wsQ[cellAddr] = { v: '', t: 's' };

                    if (rRow === 0) wsQ[cellAddr].s = styleHeader;
                    else if (rRow === 1) wsQ[cellAddr].s = { ...styleHeader, font: { ...styleHeader.font, sz: 12, bold: false } };
                    else if (rRow === 3 || rRow === startAvg || rRow === startVar) wsQ[cellAddr].s = styleSection;
                    else if (rRow === 4) wsQ[cellAddr].s = styleSubHeader;
                    else if (rRow >= 5 && rRow < 5 + mCount) {
                        wsQ[cellAddr].s = cCol === 0 ? styleTextData : { ...styleData, z: '#,##0.00' };
                    } else if (rRow === startAvg + 1 || rRow === startAvg + 2 || (rRow >= startVar + 1 && rRow <= startVar + 3)) {
                        wsQ[cellAddr].s = cCol === 0 ? styleLabel : (cCol === 1 ? { ...styleData, z: '#,##0.00' } : {});
                    } else if (rRow === totalRow) {
                        wsQ[cellAddr].s = cCol === 0 ? styleTotalText : (cCol === 1 ? { ...styleTotal, z: '#,##0.00' } : {});
                    } else if (rRow === wordsRow) {
                        wsQ[cellAddr].s = cCol === 0 ? styleLabel : styleWords;
                    }
                }
            }

            XLSX.utils.book_append_sheet(wb, wsQ, `Quarter-${q.quarterNumber}`);
        });

        XLSX.writeFile(wb, `PVC_Bulk_Export_${c.contractNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
        PVCUtils.showToast('Bulk Excel exported successfully!', 'success');
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
            return entries;
        } catch(err) {
            console.error("Could not fetch master_index_data.csv automatically. (May be blocked by local file:// protocol)", err);
            throw err;
        }
    }
};
