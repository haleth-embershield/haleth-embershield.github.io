// Get all input elements
const inputs = {
    btcAmount: document.getElementById('btcAmount'),
    marginPercentage: document.getElementById('marginPercentage'),
    marginRate: document.getElementById('marginRate'),
    ibitMaintenanceRatio: document.getElementById('ibitMaintenanceRatio'),
    mstyPrice: document.getElementById('mstyPrice'),
    mstyDividend: document.getElementById('mstyDividend'),
    taxRate: document.getElementById('taxRate')
};

// Get elements for results display
const accumulationMonthsEl = document.getElementById('accumulationMonths');
const resultsContainer = document.getElementById('results');

// Add event listeners to all inputs
Object.values(inputs).forEach(input => {
    input.addEventListener('input', calculateAndDisplayResults);
});

// Format currency
const formatCurrency = (amount) => {
    if (isNaN(amount) || !isFinite(amount)) return '$ --';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

// Format percentage
const formatPercent = (value) => {
    if (isNaN(value) || !isFinite(value)) return '-- %';
    return `${(value * 100).toFixed(2)}%`;
};

// Calculate all results
function calculateResults() {
    // Get and validate input values
    let initialIbitValue = parseFloat(inputs.btcAmount.value);
    let marginPercentage = parseFloat(inputs.marginPercentage.value) / 100;
    let annualMarginRate = parseFloat(inputs.marginRate.value) / 100;
    let maintenanceRatio = parseFloat(inputs.ibitMaintenanceRatio.value) / 100;
    let mstyPrice = parseFloat(inputs.mstyPrice.value);
    let mstyMonthlyDividendPerShare = parseFloat(inputs.mstyDividend.value);
    let taxRate = parseFloat(inputs.taxRate.value) / 100;

    // Default to 0 if input is invalid
    if (isNaN(initialIbitValue) || initialIbitValue < 0) initialIbitValue = 0;
    if (isNaN(marginPercentage) || marginPercentage < 0) marginPercentage = 0;
    if (isNaN(annualMarginRate) || annualMarginRate < 0) annualMarginRate = 0;
    if (isNaN(maintenanceRatio) || maintenanceRatio < 0 || maintenanceRatio >= 1) maintenanceRatio = 0; // Maintenance ratio must be < 1
    if (isNaN(mstyPrice) || mstyPrice <= 0) mstyPrice = 0; // Price must be > 0 for division
    if (isNaN(mstyMonthlyDividendPerShare) || mstyMonthlyDividendPerShare < 0) mstyMonthlyDividendPerShare = 0;
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 1) taxRate = 0; // Tax rate between 0 and 1

    // --- Core Calculations ---
    const marginAmount = initialIbitValue * marginPercentage;
    const mstyShares = marginAmount > 0 && mstyPrice > 0 ? marginAmount / mstyPrice : 0;
    const grossMonthlyDividend = mstyShares * mstyMonthlyDividendPerShare;
    const monthlyMarginInterest = (marginAmount * annualMarginRate) / 12;
    const monthlyNetBeforeTax = grossMonthlyDividend - monthlyMarginInterest;
    const monthlyTaxReserve = monthlyNetBeforeTax > 0 ? monthlyNetBeforeTax * taxRate : 0;
    const netMonthlyCashFlow = monthlyNetBeforeTax - monthlyTaxReserve;

    // --- Margin Call Calculation ---
    // Check maintenanceRatio is valid for division (not 1)
    const denominator = 1 - maintenanceRatio;
    const marginCallIbitValue = marginAmount > 0 && denominator > 0 ? marginAmount / denominator : 0;

    const allowableIbitDecreaseValue = initialIbitValue - marginCallIbitValue;
    const allowableIbitDecreasePercent = initialIbitValue > 0 ? allowableIbitDecreaseValue / initialIbitValue : 0;

    // --- Accumulation Calculation ---
    const monthsToAccumulate = marginAmount > 0 && netMonthlyCashFlow > 0 ? marginAmount / netMonthlyCashFlow : Infinity;

    return {
        initialIbitValue,
        marginAmount,
        mstyShares,
        grossMonthlyDividend,
        monthlyMarginInterest,
        monthlyTaxReserve,
        netMonthlyCashFlow,
        marginCallIbitValue,
        allowableIbitDecreaseValue,
        allowableIbitDecreasePercent,
        monthsToAccumulate
    };
}

// Update results display in the grid
function updateResultsDisplay(resultsData) {
    const results = [
        { label: 'Margin Loan Amount', value: formatCurrency(resultsData.marginAmount) },
        { label: 'MSTY Shares Purchased', value: resultsData.mstyShares.toFixed(2) },
        { label: 'Gross Monthly Dividend', value: formatCurrency(resultsData.grossMonthlyDividend) },
        { label: 'Monthly Margin Interest', value: formatCurrency(resultsData.monthlyMarginInterest) },
        { label: 'Monthly Tax Reserve', value: formatCurrency(resultsData.monthlyTaxReserve) },
        { label: 'Net Monthly Cash Flow', value: formatCurrency(resultsData.netMonthlyCashFlow), positiveColor: resultsData.netMonthlyCashFlow >= 0 },
        { label: 'IBIT Margin Call Value', value: formatCurrency(resultsData.marginCallIbitValue) },
        { label: 'Allowable IBIT Decrease', value: `${formatCurrency(resultsData.allowableIbitDecreaseValue)} (${formatPercent(resultsData.allowableIbitDecreasePercent)})` , positiveColor: resultsData.allowableIbitDecreaseValue >= 0},
    ];

    // Clear previous results and append new ones
    resultsContainer.innerHTML = ''; // Clear existing results
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <h3>${result.label}</h3>
            <p style="color: ${result.positiveColor === false ? '#e74c3c' : (result.positiveColor === true ? '#27ae60' : 'inherit')}">${result.value}</p>
        `;
        resultsContainer.appendChild(item);
    });


    // Update accumulation text separately
    accumulationMonthsEl.textContent = isFinite(resultsData.monthsToAccumulate) ? `${resultsData.monthsToAccumulate.toFixed(1)} months` : 'N/A (No positive cash flow)';
}

// Main function to calculate and update everything
function calculateAndDisplayResults() {
    // Get the LTV input element specifically for styling
    const ltvInput = inputs.marginPercentage;

    // Perform calculations
    const resultsData = calculateResults();

    // Update the results display
    updateResultsDisplay(resultsData);

    // --- LTV Warning Check ---
    // Get the raw percentage values for comparison
    const ltvPercent = parseFloat(inputs.marginPercentage.value);
    const maintenancePercent = parseFloat(inputs.ibitMaintenanceRatio.value);

    // Check if inputs are valid numbers before comparing
    if (!isNaN(ltvPercent) && !isNaN(maintenancePercent)) {
        const maxLtvPercent = 100 - maintenancePercent;
        if (ltvPercent > maxLtvPercent) {
            ltvInput.classList.add('warning-input');
            // Optional: Add a title attribute for hover explanation
            ltvInput.title = `LTV (${ltvPercent}%) exceeds maximum allowed (${maxLtvPercent.toFixed(0)}%) based on Maintenance Ratio.`;
        } else {
            ltvInput.classList.remove('warning-input');
            ltvInput.title = ''; // Remove title when valid
        }
    } else {
        // If inputs are invalid, remove warning
        ltvInput.classList.remove('warning-input');
        ltvInput.title = '';
    }
}

// Initial calculation on page load
calculateAndDisplayResults(); 