/**
 * Last War Battle Analyzer - Main Application
 * Supports multi-screenshot analysis with smart insights
 */

class BattleAnalyzerApp {
    constructor() {
        this.analyzer = new BattleAnalyzer();
        this.selectedFiles = [];
        this.currentAnalysis = null;
        this.currentScreenshots = [];
        this.battleHistory = JSON.parse(localStorage.getItem('battle_history') || '[]');
        this.currentInsights = null;

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadApiKey();
        this.renderHistory();
        this.updateHistoryStats();
        this.updateInsightsButton();
    }

    cacheElements() {
        // API Section
        this.apiKeyInput = document.getElementById('apiKey');
        this.toggleApiKeyBtn = document.getElementById('toggleApiKey');
        this.saveApiKeyBtn = document.getElementById('saveApiKey');
        this.apiStatus = document.getElementById('apiStatus');

        // Upload Section
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.previewContainer = document.getElementById('previewContainer');
        this.previewGrid = document.getElementById('previewGrid');
        this.fileCount = document.getElementById('fileCount');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.clearBtn = document.getElementById('clearBtn');

        // Results Section
        this.resultsSection = document.getElementById('resultsSection');
        this.loadingState = document.getElementById('loadingState');
        this.loadingText = document.getElementById('loadingText');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.overviewContent = document.getElementById('overviewContent');
        this.troopsContent = document.getElementById('troopsContent');
        this.damageContent = document.getElementById('damageContent');
        this.heroesContent = document.getElementById('heroesContent');
        this.insightsContent = document.getElementById('insightsContent');
        this.screenshotSources = document.getElementById('screenshotSources');

        // History Sidebar
        this.historySidebar = document.getElementById('historySidebar');
        this.historyList = document.getElementById('historyList');
        this.historyStats = document.getElementById('historyStats');
        this.toggleHistoryBtn = document.getElementById('toggleHistory');
        this.clearHistoryBtn = document.getElementById('clearHistory');
        this.mobileHistoryToggle = document.getElementById('mobileHistoryToggle');
        this.generateInsightsBtn = document.getElementById('generateInsightsBtn');
    }

    bindEvents() {
        // API Key events
        this.toggleApiKeyBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });

        // Upload events
        this.uploadZone.addEventListener('click', () => this.fileInput.click());
        this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Action buttons
        this.analyzeBtn.addEventListener('click', () => this.analyzeBattles());
        this.clearBtn.addEventListener('click', () => this.clearFiles());

        // Tab navigation
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // History events
        this.toggleHistoryBtn.addEventListener('click', () => this.toggleSidebar());
        this.mobileHistoryToggle.addEventListener('click', () => this.toggleSidebar());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.generateInsightsBtn.addEventListener('click', () => this.generateSmartInsights());
    }

    // API Key Management
    loadApiKey() {
        const savedKey = this.analyzer.getApiKey();
        if (savedKey) {
            this.apiKeyInput.value = savedKey;
            this.showApiStatus('API key loaded', 'saved');
        }
    }

    toggleApiKeyVisibility() {
        const type = this.apiKeyInput.type === 'password' ? 'text' : 'password';
        this.apiKeyInput.type = type;
        this.toggleApiKeyBtn.textContent = type === 'password' ? 'Show' : 'Hide';
    }

    saveApiKey() {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
            this.showApiStatus('Please enter an API key', 'error');
            return;
        }
        this.analyzer.setApiKey(key);
        this.showApiStatus('API key saved!', 'saved');
        this.updateAnalyzeButton();
    }

    showApiStatus(message, type) {
        this.apiStatus.textContent = message;
        this.apiStatus.className = `api-status ${type}`;
        setTimeout(() => {
            this.apiStatus.textContent = '';
            this.apiStatus.className = 'api-status';
        }, 3000);
    }

    // File Upload Handling
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadZone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadZone.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadZone.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            this.addFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.addFiles(files);
        }
        e.target.value = '';
    }

    addFiles(files) {
        this.selectedFiles = [...this.selectedFiles, ...files];
        this.renderPreviews();
        this.updateAnalyzeButton();
    }

    renderPreviews() {
        this.previewGrid.innerHTML = '';
        this.selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            item.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="${file.name}">
                <button class="remove-btn" data-index="${index}">x</button>
            `;
            item.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(index);
            });
            this.previewGrid.appendChild(item);
        });

        this.fileCount.textContent = this.selectedFiles.length;
        this.previewContainer.classList.toggle('active', this.selectedFiles.length > 0);

        // Update button text - multiple screenshots = same battle
        this.analyzeBtn.textContent = this.selectedFiles.length > 1
            ? `Analyze Battle (${this.selectedFiles.length} screenshots)`
            : 'Analyze Battle';
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderPreviews();
        this.updateAnalyzeButton();
    }

    clearFiles() {
        this.selectedFiles = [];
        this.renderPreviews();
        this.updateAnalyzeButton();
    }

    updateAnalyzeButton() {
        this.analyzeBtn.disabled = this.selectedFiles.length === 0 || !this.analyzer.hasApiKey();
    }

    // Battle Analysis - combines all screenshots into one battle analysis
    async analyzeBattles() {
        if (this.selectedFiles.length === 0) return;
        if (!this.analyzer.hasApiKey()) {
            this.showApiStatus('Please save your API key first', 'error');
            return;
        }

        this.showLoading(true);
        this.resultsSection.classList.add('active');
        this.currentScreenshots = [...this.selectedFiles]; // Store for display

        try {
            let analysis;

            if (this.selectedFiles.length === 1) {
                // Single screenshot analysis
                analysis = await this.analyzer.analyzeScreenshot(this.selectedFiles[0]);
            } else {
                // Multiple screenshots from SAME battle - combine into one analysis
                analysis = await this.analyzer.analyzeCombinedScreenshots(
                    this.selectedFiles,
                    (current, total, status) => {
                        this.updateProgress(current, total, status);
                    }
                );
            }

            this.currentAnalysis = analysis;
            this.addToHistory(analysis, this.selectedFiles.length);
            this.renderResults(analysis);
            this.renderScreenshotSources(this.currentScreenshots);

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    updateProgress(current, total, filename) {
        const percent = (current / total) * 100;
        this.progressFill.style.width = `${percent}%`;
        this.loadingText.textContent = `Analyzing ${current}/${total}: ${filename}`;
    }

    showLoading(show) {
        this.loadingState.classList.toggle('active', show);
        if (show) {
            this.progressFill.style.width = '0%';
            this.loadingText.textContent = 'Analyzing battle screenshot...';
        }
        this.tabContents.forEach(tc => {
            if (!show && tc.id === 'tab-overview') {
                tc.classList.add('active');
            } else if (show) {
                tc.classList.remove('active');
            }
        });
    }

    showError(message) {
        this.overviewContent.innerHTML = `
            <div class="error-message">
                <strong>Error:</strong> ${message}
            </div>
        `;
        this.switchTab('overview');
    }

    // Results Rendering
    renderResults(analysis) {
        this.renderOverview(analysis);
        this.renderTroops(analysis);
        this.renderDamage(analysis);
        this.renderHeroes(analysis);
        this.switchTab('overview');
    }

    renderOverview(analysis) {
        const isVictory = analysis.outcome?.toLowerCase() === 'victory';
        const stats = this.analyzer.calculateStats(analysis);
        const grade = this.analyzer.getPerformanceGrade(stats);

        this.overviewContent.innerHTML = `
            <div class="stat-card ${isVictory ? 'win' : 'loss'}">
                <div class="icon">${isVictory ? 'W' : 'L'}</div>
                <div class="value">${analysis.outcome || 'Unknown'}</div>
                <div class="label">Battle Result</div>
            </div>
            <div class="stat-card">
                <div class="grade-badge" style="border-color: ${grade.color}; color: ${grade.color};">${grade.grade}</div>
                <div class="value" style="font-size: 1rem;">${grade.label}</div>
                <div class="label">Performance</div>
            </div>
            <div class="stat-card">
                <div class="icon">PVP</div>
                <div class="value">${analysis.battleType || 'PVP'}</div>
                <div class="label">Battle Type</div>
            </div>
            <div class="stat-card">
                <div class="icon">VS</div>
                <div class="value">${analysis.opponent?.name || 'Unknown'}</div>
                <div class="label">Opponent</div>
            </div>
            <div class="stat-card">
                <div class="icon">PWR</div>
                <div class="value">${this.formatNumber(analysis.opponent?.power)}</div>
                <div class="label">Enemy Power</div>
            </div>
            <div class="stat-card">
                <div class="icon">DMG</div>
                <div class="value">${this.formatNumber(analysis.damage?.dealt?.total)}</div>
                <div class="label">Damage Dealt</div>
            </div>
            <div class="stat-card">
                <div class="icon">DEF</div>
                <div class="value">${this.formatNumber(analysis.damage?.received?.total)}</div>
                <div class="label">Damage Received</div>
            </div>
            <div class="stat-card">
                <div class="icon">K/D</div>
                <div class="value">${stats.killRatio}:1</div>
                <div class="label">Kill Ratio</div>
            </div>
            ${analysis.screenshotsAnalyzed > 1 ? `
                <div class="stat-card">
                    <div class="icon">IMG</div>
                    <div class="value">${analysis.screenshotsAnalyzed}</div>
                    <div class="label">Screenshots Combined</div>
                </div>
            ` : ''}
            ${analysis.notes ? `
                <div class="stat-card" style="grid-column: 1 / -1;">
                    <div class="icon">Notes</div>
                    <div class="label" style="text-align: left; white-space: pre-wrap;">${analysis.notes}</div>
                </div>
            ` : ''}
            <button class="toggle-raw" onclick="app.toggleRawData()">Show Raw Data</button>
            <div class="raw-data" id="rawData" style="display: none;">${JSON.stringify(analysis, null, 2)}</div>
        `;
    }

    toggleRawData() {
        const rawData = document.getElementById('rawData');
        const btn = document.querySelector('.toggle-raw');
        if (rawData.style.display === 'none') {
            rawData.style.display = 'block';
            btn.textContent = 'Hide Raw Data';
        } else {
            rawData.style.display = 'none';
            btn.textContent = 'Show Raw Data';
        }
    }

    renderTroops(analysis) {
        const troops = analysis.troops || {};

        this.troopsContent.innerHTML = `
            <div class="troops-column">
                <h4>Your Troops</h4>
                ${this.renderTroopList(troops.player)}
            </div>
            <div class="troops-column">
                <h4>Enemy Troops</h4>
                ${this.renderTroopList(troops.opponent)}
            </div>
        `;
    }

    renderTroopList(troopData) {
        if (!troopData) return '<p class="no-data">No troop data available</p>';

        const types = [
            { key: 'infantry', icon: 'INF', name: 'Infantry' },
            { key: 'vehicles', icon: 'VEH', name: 'Vehicles' },
            { key: 'aircraft', icon: 'AIR', name: 'Aircraft' }
        ];

        let html = '';
        types.forEach(type => {
            const data = troopData[type.key];
            if (data) {
                html += `
                    <div class="troop-item">
                        <span class="troop-name">[${type.icon}] ${type.name} ${data.tier ? `(${data.tier})` : ''}</span>
                        <span class="troop-count">${this.formatNumber(data.count)}</span>
                    </div>
                `;
            }
        });

        html += `
            <div class="troop-item" style="border-top: 2px solid var(--border-color); margin-top: 10px; padding-top: 15px;">
                <span class="troop-name"><strong>Total</strong></span>
                <span class="troop-count"><strong>${this.formatNumber(troopData.total)}</strong></span>
            </div>
        `;

        return html;
    }

    renderDamage(analysis) {
        const damage = analysis.damage || {};
        const dealt = damage.dealt || {};
        const received = damage.received || {};
        const casualties = analysis.casualties || {};

        const maxDamage = Math.max(dealt.total || 1, received.total || 1);

        this.damageContent.innerHTML = `
            <div class="damage-card">
                <h4>Damage Dealt</h4>
                <div class="damage-bar">
                    <div class="fill" style="width: ${((dealt.total || 0) / maxDamage) * 100}%"></div>
                </div>
                <div class="damage-value">
                    <span>Total</span>
                    <span>${this.formatNumber(dealt.total)}</span>
                </div>
                ${this.renderDamageBreakdown(dealt)}
            </div>
            <div class="damage-card">
                <h4>Damage Received</h4>
                <div class="damage-bar">
                    <div class="fill" style="width: ${((received.total || 0) / maxDamage) * 100}%; background: linear-gradient(90deg, #ef4444, #f87171);"></div>
                </div>
                <div class="damage-value">
                    <span>Total</span>
                    <span>${this.formatNumber(received.total)}</span>
                </div>
                ${this.renderDamageBreakdown(received)}
            </div>
            <div class="damage-card">
                <h4>Your Casualties</h4>
                <div class="damage-value">
                    <span>Killed</span>
                    <span>${this.formatNumber(casualties.player?.killed)}</span>
                </div>
                <div class="damage-value">
                    <span>Wounded</span>
                    <span>${this.formatNumber(casualties.player?.wounded)}</span>
                </div>
            </div>
            <div class="damage-card">
                <h4>Enemy Casualties</h4>
                <div class="damage-value">
                    <span>Killed</span>
                    <span>${this.formatNumber(casualties.opponent?.killed)}</span>
                </div>
                <div class="damage-value">
                    <span>Wounded</span>
                    <span>${this.formatNumber(casualties.opponent?.wounded)}</span>
                </div>
            </div>
        `;
    }

    renderDamageBreakdown(damageData) {
        const types = ['infantry', 'vehicles', 'aircraft'];
        return types.map(type => `
            <div class="damage-value">
                <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <span>${this.formatNumber(damageData[type])}</span>
            </div>
        `).join('');
    }

    renderHeroes(analysis) {
        const heroes = analysis.heroes || [];

        if (heroes.length === 0) {
            this.heroesContent.innerHTML = '<p class="no-data">No hero data available in this screenshot</p>';
            return;
        }

        this.heroesContent.innerHTML = heroes.map(hero => `
            <div class="hero-card">
                <div class="hero-header">
                    <div class="hero-avatar">${hero.side === 'player' ? 'P' : 'E'}</div>
                    <div>
                        <div class="hero-name">${hero.name || 'Unknown Hero'}</div>
                        <div class="hero-level">Level ${hero.level || '?'} ${'*'.repeat(hero.stars || 0)}</div>
                    </div>
                </div>
                <div class="hero-skills">
                    ${(hero.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
        `).join('');
    }

    // Smart Insights
    async generateSmartInsights() {
        if (this.battleHistory.length < 2) {
            alert('Need at least 2 battles in history to generate insights.');
            return;
        }

        this.showLoading(true);
        this.loadingText.textContent = 'Generating smart insights from your battle history...';
        this.resultsSection.classList.add('active');

        try {
            const insights = await this.analyzer.generateSmartInsights(this.battleHistory);
            this.currentInsights = insights;
            this.renderInsights(insights);
            this.switchTab('insights');
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderInsights(insights) {
        const perf = insights.overallPerformance || {};

        let trendClass = 'stable';
        if (perf.trend === 'Improving') trendClass = 'improving';
        else if (perf.trend === 'Declining') trendClass = 'declining';

        let html = `
            <!-- Performance Overview -->
            <div class="insight-section">
                <h3>Overall Performance</h3>
                <div class="performance-rating">
                    <div class="rating-grade" style="border-color: ${this.getRatingColor(perf.rating)}; color: ${this.getRatingColor(perf.rating)}">
                        ${perf.winRate?.toFixed(0) || 0}%
                    </div>
                    <div class="rating-details">
                        <div class="label">${perf.rating || 'Unknown'}</div>
                        <div class="trend ${trendClass}">Trend: ${perf.trend || 'Unknown'}</div>
                        <div style="color: var(--text-muted); margin-top: 5px;">
                            Damage Efficiency: ${perf.averageDamageEfficiency || 0}x
                        </div>
                    </div>
                </div>
            </div>

            <!-- Strengths & Weaknesses -->
            <div class="insight-section">
                <h3>Strengths & Weaknesses</h3>
                <div class="strengths-weaknesses">
                    <div>
                        <h4>Strengths</h4>
                        ${(insights.strengths || []).map(s => `
                            <div class="strength-item">
                                <span class="strength-icon">+</span>
                                <span>${s}</span>
                            </div>
                        `).join('') || '<p class="no-data">No strengths identified yet</p>'}
                    </div>
                    <div>
                        <h4>Areas to Improve</h4>
                        ${(insights.weaknesses || []).map(w => `
                            <div class="weakness-item">
                                <span class="weakness-icon">!</span>
                                <span>${w}</span>
                            </div>
                        `).join('') || '<p class="no-data">No weaknesses identified</p>'}
                    </div>
                </div>
            </div>

            <!-- Recommendations -->
            <div class="insight-section">
                <h3>Recommendations</h3>
                <div class="recommendations-list">
                    ${(insights.recommendations || []).map(r => `
                        <div class="recommendation-item ${r.priority?.toLowerCase() || 'medium'}">
                            <div class="recommendation-header">
                                <span class="recommendation-category">${r.category || 'General'}</span>
                                <span class="recommendation-priority ${r.priority?.toLowerCase() || 'medium'}">${r.priority || 'Medium'}</span>
                            </div>
                            <div class="recommendation-text">${r.suggestion}</div>
                        </div>
                    `).join('') || '<p class="no-data">Upload more battles for recommendations</p>'}
                </div>
            </div>

            <!-- Next Battle Tips -->
            <div class="insight-section">
                <h3>Tips for Your Next Battle</h3>
                <div class="tips-list">
                    ${(insights.nextBattleTips || []).map(tip => `
                        <div class="tip-item">
                            <span class="tip-icon">></span>
                            <span>${tip}</span>
                        </div>
                    `).join('') || '<p class="no-data">No tips available</p>'}
                </div>
            </div>

            <!-- Hero Analysis -->
            ${insights.heroAnalysis ? `
            <div class="insight-section">
                <h3>Hero Analysis</h3>
                <p><strong>Most Effective:</strong> ${insights.heroAnalysis.mostEffectiveHero || 'Unknown'}</p>
                <p style="margin-top: 10px; color: var(--text-secondary);">${insights.heroAnalysis.heroRecommendations || ''}</p>
            </div>
            ` : ''}

            <!-- Summary -->
            <div class="insight-section">
                <h3>Summary</h3>
                <div class="summary-box">
                    ${insights.summary || 'Continue analyzing battles to receive a personalized summary.'}
                </div>
            </div>
        `;

        this.insightsContent.innerHTML = html;
    }

    getRatingColor(rating) {
        switch (rating?.toLowerCase()) {
            case 'excellent': return '#4ade80';
            case 'good': return '#60a5fa';
            case 'average': return '#f7c548';
            case 'needs improvement': return '#ef4444';
            default: return '#a0a0b0';
        }
    }

    // Tab Navigation
    switchTab(tabName) {
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        this.tabContents.forEach(tc => {
            tc.classList.toggle('active', tc.id === `tab-${tabName}`);
        });
    }

    // Render screenshot sources info
    renderScreenshotSources(files) {
        if (!this.screenshotSources) return;

        if (files && files.length > 1) {
            this.screenshotSources.innerHTML = `
                <div class="screenshot-info">
                    <span class="screenshot-count">${files.length} screenshots combined</span>
                    <span class="screenshot-names">${files.map(f => f.name).join(', ')}</span>
                </div>
            `;
            this.screenshotSources.style.display = 'block';
        } else {
            this.screenshotSources.style.display = 'none';
        }
    }

    // History Management
    addToHistory(analysis, screenshotCount = 1) {
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            outcome: analysis.outcome || 'Unknown',
            opponent: analysis.opponent?.name || 'Unknown',
            battleType: analysis.battleType || 'PVP',
            damageDealt: analysis.damage?.dealt?.total || 0,
            damageReceived: analysis.damage?.received?.total || 0,
            enemyKilled: analysis.casualties?.opponent?.killed || 0,
            screenshotCount: screenshotCount,
            analysis: analysis
        };

        this.battleHistory.unshift(entry);
        if (this.battleHistory.length > 100) {
            this.battleHistory = this.battleHistory.slice(0, 100);
        }

        localStorage.setItem('battle_history', JSON.stringify(this.battleHistory));
        this.renderHistory();
        this.updateHistoryStats();
        this.updateInsightsButton();
    }

    renderHistory() {
        if (this.battleHistory.length === 0) {
            this.historyList.innerHTML = '<div class="no-history">No battles analyzed yet</div>';
            return;
        }

        this.historyList.innerHTML = this.battleHistory.slice(0, 20).map(entry => `
            <div class="history-item" data-id="${entry.id}">
                <div class="date">${new Date(entry.date).toLocaleDateString()} ${new Date(entry.date).toLocaleTimeString()}${entry.screenshotCount > 1 ? ` (${entry.screenshotCount} imgs)` : ''}</div>
                <div class="result ${entry.outcome?.toLowerCase() === 'victory' ? 'win' : 'loss'}">${entry.outcome}</div>
                <div class="opponent">vs ${entry.opponent}</div>
            </div>
        `).join('');

        this.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => this.loadHistoryEntry(parseInt(item.dataset.id)));
        });
    }

    loadHistoryEntry(id) {
        const entry = this.battleHistory.find(e => e.id === id);
        if (entry && entry.analysis) {
            this.currentAnalysis = entry.analysis;
            this.renderResults(entry.analysis);
            this.resultsSection.classList.add('active');

            // Show screenshot count info from history
            if (this.screenshotSources) {
                if (entry.screenshotCount > 1) {
                    this.screenshotSources.innerHTML = `
                        <div class="screenshot-info">
                            <span class="screenshot-count">${entry.screenshotCount} screenshots were combined for this analysis</span>
                        </div>
                    `;
                    this.screenshotSources.style.display = 'block';
                } else {
                    this.screenshotSources.style.display = 'none';
                }
            }

            if (window.innerWidth <= 1024) {
                this.historySidebar.classList.remove('open');
            }
        }
    }

    updateHistoryStats() {
        if (this.battleHistory.length === 0) {
            this.historyStats.innerHTML = '<div class="no-data">No stats yet</div>';
            return;
        }

        const wins = this.battleHistory.filter(e => e.outcome?.toLowerCase() === 'victory').length;
        const losses = this.battleHistory.length - wins;
        const winRate = ((wins / this.battleHistory.length) * 100).toFixed(1);
        const totalDamage = this.battleHistory.reduce((sum, e) => sum + (e.damageDealt || 0), 0);
        const totalKills = this.battleHistory.reduce((sum, e) => sum + (e.enemyKilled || 0), 0);

        this.historyStats.innerHTML = `
            <div class="stat-row">
                <span>Battles</span>
                <span>${this.battleHistory.length}</span>
            </div>
            <div class="stat-row">
                <span>Win Rate</span>
                <span style="color: ${parseFloat(winRate) >= 50 ? 'var(--accent-success)' : 'var(--accent-danger)'}">${winRate}%</span>
            </div>
            <div class="stat-row">
                <span>W / L</span>
                <span><span style="color: var(--accent-success)">${wins}</span> / <span style="color: var(--accent-danger)">${losses}</span></span>
            </div>
            <div class="stat-row">
                <span>Total Damage</span>
                <span>${this.formatNumber(totalDamage)}</span>
            </div>
            <div class="stat-row">
                <span>Total Kills</span>
                <span>${this.formatNumber(totalKills)}</span>
            </div>
        `;
    }

    updateInsightsButton() {
        this.generateInsightsBtn.style.display = this.battleHistory.length >= 2 ? 'block' : 'none';
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all battle history?')) {
            this.battleHistory = [];
            localStorage.setItem('battle_history', '[]');
            this.renderHistory();
            this.updateHistoryStats();
            this.updateInsightsButton();
            this.currentInsights = null;
        }
    }

    toggleSidebar() {
        this.historySidebar.classList.toggle('open');
    }

    // Utility
    formatNumber(num) {
        if (num === null || num === undefined) return '-';
        if (typeof num === 'string') num = parseFloat(num);
        if (isNaN(num)) return '-';

        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new BattleAnalyzerApp();
});
