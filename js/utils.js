/**
 * PVC Calculator - Utility Functions
 * Number formatting, date helpers, and general utilities
 */
const PVCUtils = {
    MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    MONTHS_FULL: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

    /**
     * Format number with Indian comma system (e.g., 1,12,387.64)
     */
    formatIndianNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0.00';
        const negative = num < 0;
        num = Math.abs(num);
        const parts = num.toFixed(2).split('.');
        let intPart = parts[0];
        const decPart = parts[1];

        let result = '';
        if (intPart.length <= 3) {
            result = intPart;
        } else {
            result = intPart.slice(-3);
            intPart = intPart.slice(0, -3);
            while (intPart.length > 2) {
                result = intPart.slice(-2) + ',' + result;
                intPart = intPart.slice(0, -2);
            }
            if (intPart) result = intPart + ',' + result;
        }

        return (negative ? '-' : '') + result + '.' + decPart;
    },

    /**
     * Convert number to Indian English words
     * Example: 112387.64 → "Rupees One Lacs Twelve Thousand Three Hundred Eighty Seven and Sixty Four Paisas Only."
     */
    numberToWords(num) {
        if (num === 0) return 'Rupees Zero Only.';
        const negative = num < 0;
        num = Math.abs(num);

        const parts = num.toFixed(2).split('.');
        const intPart = parseInt(parts[0]);
        const decPart = parseInt(parts[1]);

        let result = (negative ? 'Minus ' : '') + 'Rupees ' + this._intToWords(intPart);

        if (decPart > 0) {
            result += ' and ' + this._intToWords(decPart) + ' Paisas';
        }

        return result + ' Only.';
    },

    _intToWords(n) {
        if (n === 0) return 'Zero';

        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        let result = '';

        if (n >= 10000000) {
            result += this._intToWords(Math.floor(n / 10000000)) + ' Crores ';
            n %= 10000000;
        }
        if (n >= 100000) {
            result += this._intToWords(Math.floor(n / 100000)) + ' Lacs ';
            n %= 100000;
        }
        if (n >= 1000) {
            result += this._intToWords(Math.floor(n / 1000)) + ' Thousand ';
            n %= 1000;
        }
        if (n >= 100) {
            result += this._intToWords(Math.floor(n / 100)) + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            result += ones[n] + ' ';
        }

        return result.trim();
    },

    /** Format month-year short: "Jun-21" */
    formatMonthYearShort(month, year) {
        return this.MONTHS[month - 1] + '-' + String(year).slice(-2);
    },

    /** Format month-year long: "Nov-2018" */
    formatMonthYearLong(month, year) {
        return this.MONTHS[month - 1] + '-' + year;
    },

    /** Format date string to DD.MM.YYYY */
    formatDateDot(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return String(d.getDate()).padStart(2, '0') + '.' +
            String(d.getMonth() + 1).padStart(2, '0') + '.' +
            d.getFullYear();
    },

    /** Generate unique ID */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    /** Round to 2 decimal places */
    round2(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    },

    roundN(num, decimals) {
        const factor = Math.pow(10, decimals);
        return Math.round((num + Number.EPSILON) * factor) / factor;
    },

    /** Get next N months starting from a given month/year */
    getConsecutiveMonths(startMonth, startYear, count) {
        const months = [];
        let m = startMonth;
        let y = startYear;
        for (let i = 0; i < count; i++) {
            months.push({ month: m, year: y, label: this.formatMonthYearShort(m, y) });
            m++;
            if (m > 12) { m = 1; y++; }
        }
        return months;
    },

    /** Show toast notification */
    showToast(message, type = 'success') {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};
