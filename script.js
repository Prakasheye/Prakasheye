// ============================================
// LOAN CALCULATOR APPLICATION
// ============================================

class LoanCalculator {
    constructor() {
        try {
            console.log('Initializing LoanCalculator...');
            this.principal = 100000;
            this.rate = 9.5;
            this.term = 20; // in years
            this.frequency = 12; // monthly
            this.fee = 2500;
            this.history = this.loadHistory();
            
            // Initialize properties first
            this.charts = {};
            this.sparklineCharts = {};
            this.amortizationData = [];
            this.metalsHistory = {};

            // Wait for Chart.js to be available
            if (typeof Chart === 'undefined') {
                console.error('Chart.js not loaded yet');
                return;
            }

            this.initializeEventListeners();
            this.calculateLoan();
            this.loadMetalsData();
            this.initializeCharts();
            console.log('LoanCalculator initialized successfully');
        } catch (error) {
            console.error('Error initializing LoanCalculator:', error);
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    initializeEventListeners() {
        console.log('Initializing event listeners...');
        
        // Verify DOM elements exist
        const requiredElements = [
            'principalInput', 'principalSlider',
            'interestInput', 'interestSlider',
            'termInput', 'termSlider',
            'feeInput',
            'monthlyPayment', 'totalInterest', 'totalPayable',
            'effectiveRate', 'totalPayments'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements);
            throw new Error('Required DOM elements not found');
        }

        // Calculator inputs
        const inputs = [
            { id: 'principalInput', sliderId: 'principalSlider' },
            { id: 'interestInput', sliderId: 'interestSlider' },
            { id: 'termInput', sliderId: 'termSlider' },
            { id: 'feeInput' }
        ];

        inputs.forEach(({ id, sliderId }) => {
            const input = document.getElementById(id);
            const slider = document.getElementById(sliderId);
            
            if (input) {
                input.addEventListener('input', (e) => {
                    if (sliderId) {
                        document.getElementById(sliderId).value = e.target.value;
                    }
                    this.handleInputChange(id);
                });
            }
            
            if (slider) {
                slider.addEventListener('input', (e) => {
                    document.getElementById(id).value = e.target.value;
                    this.handleInputChange(id);
                });
            }
        });

        // Rate preset buttons
        document.querySelectorAll('.rate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('interestInput').value = btn.dataset.rate;
                document.getElementById('interestSlider').value = btn.dataset.rate;
                this.handleInputChange('interestInput');
            });
        });

        // Frequency buttons
        document.querySelectorAll('.freq-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.frequency = parseInt(btn.dataset.freq);
                this.calculateLoan();
            });
        });

        // Navigation tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Metals conversion
        document.getElementById('goldAmount').addEventListener('input', (e) => {
            // goldPriceText contains 'INR' + number (possibly with commas), strip non-numeric except '.'
            const goldPrice = parseFloat(document.getElementById('goldPrice').textContent.replace(/[^0-9.]/g, '')) || 0;
            const grams = parseFloat(e.target.value) || 0;
            document.getElementById('goldResult').textContent = this.formatCurrency(grams * goldPrice);
        });

        document.getElementById('silverAmount').addEventListener('input', (e) => {
            const silverPrice = parseFloat(document.getElementById('silverPrice').textContent.replace(/[^0-9.]/g, '')) || 0;
            const grams = parseFloat(e.target.value) || 0;
            document.getElementById('silverResult').textContent = this.formatCurrency(grams * silverPrice);
        });

        // History search
        document.getElementById('searchBtn').addEventListener('click', () => this.searchHistory());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchHistory();
        });
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());

        // Metals refresh
        document.getElementById('refreshMetals').addEventListener('click', () => this.refreshMetalsData());
    }

    // Format numbers as INR strings (e.g., INR1,23,456.00)
    formatCurrency(value) {
        const num = Number(value) || 0;
        return 'INR' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    handleInputChange(id) {
        if (id === 'principalInput') this.principal = parseFloat(document.getElementById('principalInput').value);
        if (id === 'interestInput') this.rate = parseFloat(document.getElementById('interestInput').value);
        if (id === 'termInput') this.term = parseFloat(document.getElementById('termInput').value);
        if (id === 'feeInput') this.fee = parseFloat(document.getElementById('feeInput').value);
        
        this.calculateLoan();
    }

    switchTab(tabName) {
        // Hide all sections
        document.querySelectorAll('.tab-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Refresh charts if switching to analytics
        if (tabName === 'analytics') {
            setTimeout(() => {
                this.updateCharts();
            }, 100);
        }
    }

    // ============================================
    // LOAN CALCULATIONS
    // ============================================

    calculateLoan() {
        const monthlyRate = this.rate / 100 / this.frequency;
        const numberOfPayments = this.term * this.frequency;
        
        // Calculate payment using formula
        const monthlyPayment = (this.principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                              (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        
        const totalPaid = monthlyPayment * numberOfPayments;
        const totalInterest = totalPaid - this.principal;
        const totalPayable = totalPaid + this.fee;
        
        // Calculate effective rate (including fees)
        const effectiveRate = ((totalInterest + this.fee) / this.principal / this.term * 100).toFixed(2);
        
        // Update UI
    document.getElementById('monthlyPayment').textContent = this.formatCurrency(monthlyPayment);
        document.getElementById('totalInterest').textContent = this.formatCurrency(totalInterest);
        document.getElementById('totalPayable').textContent = this.formatCurrency(totalPayable);
        document.getElementById('effectiveRate').textContent = effectiveRate + '%';
        document.getElementById('totalPayments').textContent = numberOfPayments.toString();
        
        // Update amortization schedule
        this.generateAmortizationSchedule(monthlyRate, numberOfPayments, monthlyPayment);
        
        // Save to history
        this.saveToHistory(monthlyPayment, totalInterest, totalPayable);
    }

    generateAmortizationSchedule(monthlyRate, numberOfPayments, monthlyPayment) {
        let balance = this.principal;
        const tbody = document.getElementById('amortizationBody');
        tbody.innerHTML = '';
        
        const amortizationData = [];
        
        for (let i = 1; i <= Math.min(12, numberOfPayments); i++) {
            const interestPayment = balance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            balance -= principalPayment;
            
            amortizationData.push({
                paymentNumber: i,
                payment: monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                balance: Math.max(0, balance)
            });
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${i}</td>
                <td>${this.formatCurrency(monthlyPayment)}</td>
                <td>${this.formatCurrency(principalPayment)}</td>
                <td>${this.formatCurrency(interestPayment)}</td>
                <td>${this.formatCurrency(Math.max(0, balance))}</td>
            `;
        }
        
        // Store for charts
        this.amortizationData = amortizationData;
    }

    // ============================================
    // HISTORY MANAGEMENT
    // ============================================

    saveToHistory(monthlyPayment, totalInterest, totalPayable) {
        const entry = {
            id: Date.now(),
            principal: this.principal,
            rate: this.rate,
            term: this.term,
            frequency: this.frequency,
            monthlyPayment: monthlyPayment,
            totalInterest: totalInterest,
            totalPayable: totalPayable,
            date: new Date().toLocaleString()
        };
        
        // Check if identical calculation exists
        const exists = this.history.some(h =>
            h.principal === entry.principal &&
            h.rate === entry.rate &&
            h.term === entry.term
        );
        
        if (!exists) {
            this.history.unshift(entry);
            if (this.history.length > 50) this.history.pop();
            this.persistHistory();
            this.updateHistoryTable();
        }
    }

    persistHistory() {
        localStorage.setItem('loanCalculatorHistory', JSON.stringify(this.history));
    }

    loadHistory() {
        const stored = localStorage.getItem('loanCalculatorHistory');
        return stored ? JSON.parse(stored) : [];
    }

    updateHistoryTable() {
        const tbody = document.getElementById('historyBody');
        
        if (this.history.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="8">No calculation history yet. Your calculations will appear here.</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.history.map(entry => `
            <tr>
                <td>${this.formatCurrency(entry.principal)}</td>
                <td>${entry.rate.toFixed(2)}%</td>
                <td>${entry.term} years</td>
                <td>${this.formatCurrency(entry.monthlyPayment)}</td>
                <td>${this.formatCurrency(entry.totalInterest)}</td>
                <td>${this.formatCurrency(entry.totalPayable)}</td>
                <td>${entry.date}</td>
                <td>
                    <button onclick="loanCalc.loadFromHistory(${entry.id})" style="cursor: pointer; background: none; border: none; color: var(--accent-blue); text-decoration: underline;">Load</button>
                </td>
            </tr>
        `).join('');
    }

    loadFromHistory(id) {
        const entry = this.history.find(h => h.id === id);
        if (entry) {
            document.getElementById('principalInput').value = entry.principal;
            document.getElementById('principalSlider').value = entry.principal;
            document.getElementById('interestInput').value = entry.rate;
            document.getElementById('interestSlider').value = entry.rate;
            document.getElementById('termInput').value = entry.term;
            document.getElementById('termSlider').value = entry.term;
            this.frequency = entry.frequency;
            
            // Update frequency buttons
            document.querySelectorAll('.freq-btn').forEach(btn => {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.freq) === entry.frequency) {
                    btn.classList.add('active');
                }
            });
            
            this.principal = entry.principal;
            this.rate = entry.rate;
            this.term = entry.term;
            this.calculateLoan();
            this.switchTab('calculator');
        }
    }

    searchHistory() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const tbody = document.getElementById('historyBody');
        
        const filtered = this.history.filter(entry =>
            entry.principal.toString().includes(searchTerm) ||
            entry.rate.toString().includes(searchTerm) ||
            entry.date.toLowerCase().includes(searchTerm)
        );
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="8">No results found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(entry => `
            <tr>
                <td>${this.formatCurrency(entry.principal)}</td>
                <td>${entry.rate.toFixed(2)}%</td>
                <td>${entry.term} years</td>
                <td>${this.formatCurrency(entry.monthlyPayment)}</td>
                <td>${this.formatCurrency(entry.totalInterest)}</td>
                <td>${this.formatCurrency(entry.totalPayable)}</td>
                <td>${entry.date}</td>
                <td>
                    <button onclick="loanCalc.loadFromHistory(${entry.id})" style="cursor: pointer; background: none; border: none; color: var(--accent-blue); text-decoration: underline;">Load</button>
                </td>
            </tr>
        `).join('');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
            this.history = [];
            this.persistHistory();
            this.updateHistoryTable();
        }
    }

    // ============================================
    // PRECIOUS METALS DATA
    // ============================================

    loadMetalsData() {
        // Mock historical data for metals (in production, would use real API)
        // Internally generate mock prices per troy oz then convert to per-gram pricing (1 troy oz = 31.1034768 g)
        const troyToGram = 31.1034768;
        this.metalsHistory = {
            gold: Array.from({ length: 24 }, () => (2100 + Math.random() * 100) / troyToGram),
            silver: Array.from({ length: 24 }, () => (25 + Math.random() * 8) / troyToGram),
            platinum: Array.from({ length: 24 }, () => (1000 + Math.random() * 100) / troyToGram),
            palladium: Array.from({ length: 24 }, () => (1100 + Math.random() * 200) / troyToGram)
        };
        
        this.updateMetalsDisplay();
    }

    updateMetalsDisplay() {
        // Create a fresh per-gram price by sampling from metalsHistory and adding a small jitter
        const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const goldPerGram = sample(this.metalsHistory.gold) * (1 + (Math.random() - 0.5) * 0.02);
        const silverPerGram = sample(this.metalsHistory.silver) * (1 + (Math.random() - 0.5) * 0.03);
        const platinumPerGram = sample(this.metalsHistory.platinum) * (1 + (Math.random() - 0.5) * 0.02);
        const palladiumPerGram = sample(this.metalsHistory.palladium) * (1 + (Math.random() - 0.5) * 0.04);

        document.getElementById('goldPrice').textContent = this.formatCurrency(goldPerGram);
        document.getElementById('goldChange').textContent = (Math.random() > 0.5 ? '↑ +' : '↓ -') + (Math.random() * 2).toFixed(2) + '%';
        document.getElementById('goldChange').className = 'metal-change ' + (Math.random() > 0.5 ? 'positive' : 'negative');

        document.getElementById('silverPrice').textContent = this.formatCurrency(silverPerGram);
        document.getElementById('silverChange').textContent = (Math.random() > 0.5 ? '↑ +' : '↓ -') + (Math.random() * 1.5).toFixed(2) + '%';
        document.getElementById('silverChange').className = 'metal-change ' + (Math.random() > 0.5 ? 'positive' : 'negative');

        document.getElementById('platinumPrice').textContent = this.formatCurrency(platinumPerGram);
        document.getElementById('platinumChange').textContent = (Math.random() > 0.5 ? '↑ +' : '↓ -') + (Math.random() * 1).toFixed(2) + '%';
        document.getElementById('platinumChange').className = 'metal-change ' + (Math.random() > 0.5 ? 'positive' : 'negative');

        document.getElementById('palladiumPrice').textContent = this.formatCurrency(palladiumPerGram);
        document.getElementById('palladiumChange').textContent = (Math.random() > 0.5 ? '↑ +' : '↓ -') + (Math.random() * 2.5).toFixed(2) + '%';
        document.getElementById('palladiumChange').className = 'metal-change ' + (Math.random() > 0.5 ? 'positive' : 'negative');

        // Update converter outputs to reflect per-gram INRs for current amounts
        const gAmtEl = document.getElementById('goldAmount');
        const sAmtEl = document.getElementById('silverAmount');
        const gAmt = gAmtEl ? (parseFloat(gAmtEl.value) || 0) : 0;
        const sAmt = sAmtEl ? (parseFloat(sAmtEl.value) || 0) : 0;
        const goldResEl = document.getElementById('goldResult');
        const silverResEl = document.getElementById('silverResult');
        if (goldResEl) goldResEl.textContent = this.formatCurrency(gAmt * goldPerGram);
        if (silverResEl) silverResEl.textContent = this.formatCurrency(sAmt * silverPerGram);

         // Update sparklines
         this.updateSparklines();
         
         // Update time
         document.getElementById('metalTime').textContent = new Date().toLocaleTimeString();
    }

    updateSparklines() {
        const createSparklineChart = (canvasId, data) => {
            const ctx = document.getElementById(canvasId);
            if (!ctx || this.sparklineCharts[canvasId]) {
                if (this.sparklineCharts[canvasId]) {
                    this.sparklineCharts[canvasId].destroy();
                }
            }
            
            if (ctx) {
                const chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: Array.from({ length: data.length }, (_, i) => i),
                        datasets: [{
                            label: 'Price',
                            data: data,
                            borderColor: '#d4af37',
                            backgroundColor: 'rgba(212, 175, 55, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            pointRadius: 0,
                            tension: 0.4,
                            borderCapStyle: 'round'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: { 
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (context) => this.formatCurrency(context.parsed.y || context.raw || 0)
                                }
                            }
                        },
                        scales: {
                            x: { display: false },
                            y: { display: false }
                        }
                    }
                });
                
                this.sparklineCharts[canvasId] = chart;
            }
        };

        createSparklineChart('goldChart', this.metalsHistory.gold);
        createSparklineChart('silverChart', this.metalsHistory.silver);
        createSparklineChart('platinumChart', this.metalsHistory.platinum);
        createSparklineChart('palladiumChart', this.metalsHistory.palladium);
    }

    refreshMetalsData() {
        const btn = document.getElementById('refreshMetals');
        btn.classList.add('loading');
        
        setTimeout(() => {
            this.metalsHistory.gold = Array.from({ length: 24 }, () => 2100 + Math.random() * 100);
            this.metalsHistory.silver = Array.from({ length: 24 }, () => 25 + Math.random() * 8);
            this.metalsHistory.platinum = Array.from({ length: 24 }, () => 1000 + Math.random() * 100);
            this.metalsHistory.palladium = Array.from({ length: 24 }, () => 1100 + Math.random() * 200);
            
            this.updateMetalsDisplay();
            btn.classList.remove('loading');
        }, 1000);
    }

    // ============================================
    // CHARTS INITIALIZATION & UPDATES
    // ============================================

    charts = {};
    sparklineCharts = {};

    initializeCharts() {
        this.updateCharts();
    }

    updateCharts() {
        const monthlyRate = this.rate / 100 / this.frequency;
        const numberOfPayments = this.term * this.frequency;
        const monthlyPayment = (this.principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                              (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        
        // Generate data for charts
        let balance = this.principal;
        const principalData = [];
        const interestData = [];
        const balanceData = [];
        const labels = [];
        
        for (let i = 1; i <= numberOfPayments; i++) {
            const interestPayment = balance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            balance -= principalPayment;
            
            if (i % Math.ceil(numberOfPayments / 24) === 0 || i === 1) {
                labels.push(`${i}`);
                principalData.push(principalPayment);
                interestData.push(interestPayment);
                balanceData.push(Math.max(0, balance));
            }
        }

        this.updatePaymentChart(labels, principalData, interestData);
        this.updatePieChart();
        this.updateBalanceChart(labels, balanceData);
        this.updateAnnualChart();
    }

    updatePaymentChart(labels, principalData, interestData) {
        const ctx = document.getElementById('paymentChart');
        if (!ctx) return;
        if (this.charts.paymentChart) this.charts.paymentChart.destroy();

        const ctx2d = ctx.getContext ? ctx.getContext('2d') : null;
        const gradPrincipal = ctx2d ? ctx2d.createLinearGradient(0, 0, 0, 300) : '#00d9ff';
        if (ctx2d) { gradPrincipal.addColorStop(0, 'rgba(0,217,255,0.9)'); gradPrincipal.addColorStop(1, 'rgba(0,217,255,0.08)'); }
        const gradInterest = ctx2d ? ctx2d.createLinearGradient(0, 0, 0, 300) : '#d4af37';
        if (ctx2d) { gradInterest.addColorStop(0, 'rgba(212,175,55,0.9)'); gradInterest.addColorStop(1, 'rgba(212,175,55,0.08)'); }

        this.charts.paymentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Principal',
                        data: principalData,
                        backgroundColor: gradPrincipal,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Interest',
                        data: interestData,
                        backgroundColor: gradInterest,
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: { duration: 700, easing: 'easeOutCubic' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, labels: { color: '#b0b5c1', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (context) => this.formatCurrency(context.raw || 0) } }
                },
                scales: {
                    x: { stacked: false, grid: { color: 'rgba(61, 70, 86, 0.06)' }, ticks: { color: '#8a8f9e', font: { size: 10 } } },
                    y: { stacked: false, grid: { color: 'rgba(61, 70, 86, 0.06)' }, ticks: { color: '#8a8f9e', font: { size: 10 }, callback: (val) => this.formatCurrency(val) } }
                }
            }
        });
    }

    updatePieChart() {
        const ctx = document.getElementById('piChart');
        if (!ctx) return;

        const monthlyRate = this.rate / 100 / this.frequency;
        const numberOfPayments = this.term * this.frequency;
        const monthlyPayment = (this.principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                              (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        
        const totalInterest = (monthlyPayment * numberOfPayments) - this.principal;

        if (this.charts.piChart) this.charts.piChart.destroy();

        this.charts.piChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest', 'Fees'],
                datasets: [{
                    data: [this.principal, totalInterest, this.fee],
                    backgroundColor: ['#00d9ff', '#d4af37', '#ef4444'],
                    borderColor: '#1a1f2e',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#b0b5c1', font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw || 0;
                                return `${context.label}: ${this.formatCurrency(val)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateBalanceChart(labels, balanceData) {
        const ctx = document.getElementById('balanceChart');
        if (!ctx) return;

        if (this.charts.balanceChart) this.charts.balanceChart.destroy();

        this.charts.balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Remaining Balance',
                    data: balanceData,
                    borderColor: '#00d9ff',
                    backgroundColor: 'rgba(0, 217, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#d4af37',
                    pointBorderColor: '#1a1f2e',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, labels: { color: '#b0b5c1', font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (context) => this.formatCurrency(context.parsed.y || context.raw || 0)
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(61, 70, 86, 0.1)' },
                        ticks: { color: '#8a8f9e', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(61, 70, 86, 0.1)' },
                        ticks: { color: '#8a8f9e', font: { size: 10 }, callback: (val) => this.formatCurrency(val) }
                    }
                }
            }
        });
    }

    updateAnnualChart() {
        const ctx = document.getElementById('annualChart');
        if (!ctx) return;

        const monthlyRate = this.rate / 100 / this.frequency;
        const monthsPerPeriod = Math.ceil(this.term / 5);
        const monthlyPayment = (this.principal * monthlyRate * Math.pow(1 + monthlyRate, this.term * this.frequency)) / 
                              (Math.pow(1 + monthlyRate, this.term * this.frequency) - 1);
        
        let balance = this.principal;
        const annualPrincipal = [];
        const annualInterest = [];
        const labels = [];

        for (let year = 0; year < this.term; year++) {
            let yearPrincipal = 0;
            let yearInterest = 0;
            
            for (let month = 0; month < this.frequency && balance > 0; month++) {
                const interestPayment = balance * monthlyRate;
                const principalPayment = monthlyPayment - interestPayment;
                balance -= principalPayment;
                
                yearPrincipal += principalPayment;
                yearInterest += interestPayment;
            }
            
            annualPrincipal.push(yearPrincipal);
            annualInterest.push(yearInterest);
            labels.push(`Year ${year + 1}`);
        }

        if (this.charts.annualChart) this.charts.annualChart.destroy();

        this.charts.annualChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Principal',
                        data: annualPrincipal,
                        backgroundColor: '#00d9ff',
                        borderRadius: 4,
                        borderSkipped: false
                    },
                    {
                        label: 'Interest',
                        data: annualInterest,
                        backgroundColor: '#d4af37',
                        borderRadius: 4,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: { display: true, labels: { color: '#b0b5c1', font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (context) => this.formatCurrency(context.raw || context.parsed?.x || 0)
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(61, 70, 86, 0.1)' },
                        ticks: { color: '#8a8f9e', font: { size: 10 }, callback: (val) => this.formatCurrency(val) }
                    },
                    y: {
                        stacked: true,
                        ticks: { color: '#8a8f9e', font: { size: 10 } }
                    }
                }
            }
        });
    }
}

// ============================================
// INITIALIZE APPLICATION
// ============================================

let loanCalc;

function initializeApp() {
    try {
        console.log('Starting app initialization...');
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded, retrying in 100ms...');
            setTimeout(initializeApp, 100);
            return;
        }
        loanCalc = new LoanCalculator();
        window.loanCalc = loanCalc; // Make it globally available
        console.log('App initialization complete');
    } catch (error) {
        console.error('Error during app initialization:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

// Prevent negative values
document.addEventListener('change', (e) => {
    if (e.target.type === 'number' && e.target.value < 0) {
        e.target.value = 0;
    }
});