/**
 * Last War Battle Analyzer - Main Application
 * Supports multi-screenshot analysis with smart insights
 * Uses backend proxy for API calls (no API key needed from users)
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
        this.renderHistory();
        this.updateHistoryStats();
        this.updateInsightsButton();
        this.updateAnalyzeButton();
    }

    cacheElements() {
        // Usage Banner
        this.usageBanner = document.getElementById('usageBanner');
        this.usageCount = document.getElementById('usageCount');
        this.usageLimit = document.getElementById('usageLimit');
        this.usageRemaining = document.getElementById('usageRemaining');

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
        this.armyContent = document.getElementById('armyContent');
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

    // Update usage display
    updateUsageDisplay(usageInfo) {
        if (!usageInfo) return;

        this.usageCount.textContent = usageInfo.requests_today || 0;
        this.usageLimit.textContent = usageInfo.daily_limit || 50;

        const remaining = usageInfo.remaining || 0;
        if (remaining <= 5) {
            this.usageRemaining.textContent = `(${remaining} left today)`;
            this.usageRemaining.style.color = 'var(--accent-danger)';
        } else if (remaining <= 15) {
            this.usageRemaining.textContent = `(${remaining} left today)`;
            this.usageRemaining.style.color = 'var(--accent-secondary)';
        } else {
            this.usageRemaining.textContent = '';
        }
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
        this.analyzeBtn.disabled = this.selectedFiles.length === 0;
    }

    // Battle Analysis - combines all screenshots into one battle analysis
    async analyzeBattles() {
        if (this.selectedFiles.length === 0) return;

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

            // Update usage display
            if (analysis._usage) {
                this.updateUsageDisplay(analysis._usage);
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
        this.renderArmy(analysis);
        this.switchTab('overview');
    }

    renderOverview(analysis) {
        const stats = this.analyzer.calculateStats(analysis);
        const grade = this.analyzer.getPerformanceGrade(stats);

        // Use neutral labels - don't assume which side is the uploader
        const sideA = analysis.player || {};
        const sideB = analysis.opponent || {};

        // Squad type badge
        const squadType = analysis.squadType || null;
        const squadTypeBadge = squadType ? `
            <span class="squad-type-badge ${squadType.toLowerCase()}">${squadType}</span>
        ` : '';

        // Battle analysis section
        const battleAnalysis = analysis.battleAnalysis;
        const battleAnalysisHtml = battleAnalysis ? `
            <div class="battle-analysis" style="grid-column: 1 / -1;">
                <h4>Battle Analysis ${battleAnalysis.winner ? `<span class="winner-badge ${battleAnalysis.winner}">${battleAnalysis.winner === 'player' ? 'Side A Wins' : 'Side B Wins'}</span>` : ''}</h4>
                ${battleAnalysis.keyFactors && battleAnalysis.keyFactors.length > 0 ? `
                    <div class="key-factors">
                        ${battleAnalysis.keyFactors.map(f => `
                            <div class="factor-item factor-${(f.impact || 'medium').toLowerCase()}">
                                <div class="factor-header">
                                    <span class="factor-name">${f.factor || 'Unknown Factor'}</span>
                                    <span class="factor-impact ${(f.impact || 'medium').toLowerCase()}">${f.impact || 'Medium'}</span>
                                </div>
                                <div class="factor-description">${f.description || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${battleAnalysis.winReason ? `
                    <div class="win-reason">
                        <strong>Summary:</strong> ${battleAnalysis.winReason}
                    </div>
                ` : ''}
            </div>
        ` : '';

        this.overviewContent.innerHTML = `
            <!-- Performance Grade - Make it prominent -->
            <div class="stat-card highlight" style="grid-column: 1 / -1;">
                <div class="grade-badge large" style="border-color: ${grade.color}; color: ${grade.color};">${grade.grade}</div>
                <div class="value" style="font-size: 1.2rem;">${grade.label} Performance</div>
                <div class="label">Based on damage efficiency and casualty ratios</div>
                ${squadTypeBadge ? `<div style="margin-top: 10px;">${squadTypeBadge}</div>` : ''}
            </div>

            <!-- Side A Stats -->
            <div class="stat-card">
                <div class="icon">A</div>
                <div class="value">${sideA.name || 'Side A'}</div>
                <div class="label">Combatant</div>
            </div>
            <div class="stat-card">
                <div class="icon">PWR</div>
                <div class="value">${this.formatNumber(sideA.power)}</div>
                <div class="label">Side A Power</div>
            </div>
            <div class="stat-card">
                <div class="icon">DMG</div>
                <div class="value">${this.formatNumber(analysis.damage?.dealt?.total)}</div>
                <div class="label">Side A Damage</div>
            </div>

            <!-- Side B Stats -->
            <div class="stat-card">
                <div class="icon">B</div>
                <div class="value">${sideB.name || 'Side B'}</div>
                <div class="label">Combatant</div>
            </div>
            <div class="stat-card">
                <div class="icon">PWR</div>
                <div class="value">${this.formatNumber(sideB.power)}</div>
                <div class="label">Side B Power</div>
            </div>
            <div class="stat-card">
                <div class="icon">DMG</div>
                <div class="value">${this.formatNumber(analysis.damage?.received?.total)}</div>
                <div class="label">Side B Damage</div>
            </div>

            ${battleAnalysisHtml}

            ${this.renderStrategicAnalysis(analysis)}

            ${analysis.notes ? `
                <div class="stat-card analysis-notes" style="grid-column: 1 / -1;">
                    <div class="icon">Notes</div>
                    <div class="label" style="text-align: left; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5;">${analysis.notes}</div>
                </div>
            ` : ''}
            <button class="toggle-raw" onclick="app.toggleRawData()">Show Raw Data</button>
            <div class="raw-data" id="rawData" style="display: none;">${JSON.stringify(analysis, null, 2)}</div>
        `;
    }

    renderStrategicAnalysis(analysis) {
        const strat = analysis.strategicAnalysis;
        if (!strat) return '';

        // Type advantage section
        const typeAdv = strat.typeAdvantage;
        const typeAdvHtml = typeAdv ? `
            <div class="type-advantage-section">
                <div class="advantage-card player-adv">
                    <h5>Side A Advantages</h5>
                    <p>${typeAdv.playerAdvantage || 'None identified'}</p>
                </div>
                <div class="advantage-card opponent-adv">
                    <h5>Side B Advantages</h5>
                    <p>${typeAdv.opponentAdvantage || 'None identified'}</p>
                </div>
            </div>
            ${typeAdv.overallEdge ? `
                <div class="overall-edge ${typeAdv.overallEdge.toLowerCase()}">
                    Type Matchup Edge: ${typeAdv.overallEdge === 'player' ? 'Side A' : typeAdv.overallEdge === 'opponent' ? 'Side B' : 'Neutral'}
                </div>
            ` : ''}
        ` : '';

        // Positioning issues
        const posIssues = strat.positioningIssues || [];
        const posIssuesHtml = posIssues.length > 0 ? `
            <div class="positioning-issues">
                <h5>Positioning Issues</h5>
                ${posIssues.map(issue => `
                    <div class="positioning-issue-item">
                        <div class="issue-hero">${issue.hero}</div>
                        <div class="issue-problem">${issue.issue}</div>
                        <div class="issue-fix">Recommendation: ${issue.recommendation}</div>
                    </div>
                `).join('')}
            </div>
        ` : '';

        // Hero performance notes
        const perfNotes = strat.heroPerformanceNotes || [];
        const perfNotesHtml = perfNotes.length > 0 ? `
            <div class="hero-perf-notes">
                <h5>Hero Performance Notes</h5>
                ${perfNotes.map(note => {
                    const obsClass = (note.observation || '').toLowerCase().replace(/\s+/g, '-');
                    return `
                        <div class="perf-note-item">
                            <span class="note-hero">${note.hero}</span>
                            <span class="note-observation ${obsClass}">${note.observation}</span>
                            <span class="note-detail">${note.detail}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '';

        // Skill efficacy
        const skillEff = strat.skillEfficacy || [];
        const skillEffHtml = skillEff.length > 0 ? `
            <div class="skill-efficacy">
                <h5>Skill Impact Analysis</h5>
                ${skillEff.map(skill => `
                    <div class="skill-efficacy-item">
                        <span class="skill-name">${skill.skill}</span>
                        <span class="skill-hero">(${skill.hero})</span>
                        <span class="skill-impact ${(skill.impact || 'medium').toLowerCase()}">${skill.impact}</span>
                        <span class="skill-desc">${skill.description}</span>
                    </div>
                `).join('')}
            </div>
        ` : '';

        if (!typeAdvHtml && !posIssuesHtml && !perfNotesHtml && !skillEffHtml) {
            return '';
        }

        return `
            <div class="strategic-analysis" style="grid-column: 1 / -1;">
                <h4>Strategic Analysis</h4>
                ${typeAdvHtml}
                ${posIssuesHtml}
                ${perfNotesHtml}
                ${skillEffHtml}
            </div>
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
        const sideAName = analysis.player?.name || 'Side A';
        const sideBName = analysis.opponent?.name || 'Side B';

        this.troopsContent.innerHTML = `
            <div class="troops-column">
                <h4>${sideAName} Troops</h4>
                ${this.renderTroopList(troops.player)}
            </div>
            <div class="troops-column">
                <h4>${sideBName} Troops</h4>
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
        const sideAName = analysis.player?.name || 'Side A';
        const sideBName = analysis.opponent?.name || 'Side B';

        const maxDamage = Math.max(dealt.total || 1, received.total || 1);

        this.damageContent.innerHTML = `
            <div class="damage-card">
                <h4>${sideAName} Damage</h4>
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
                <h4>${sideBName} Damage</h4>
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
                <h4>${sideAName} Casualties</h4>
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
                <h4>${sideBName} Casualties</h4>
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

        this.heroesContent.innerHTML = heroes.map(hero => {
            // Exclusive weapon display
            const weapon = hero.exclusiveWeapon;
            const weaponHtml = weapon && weapon.name ? `
                <div class="exclusive-weapon">
                    ${weapon.name}
                    ${weapon.level ? ` Lv.${weapon.level}` : ''}
                    ${weapon.stars ? `<span class="weapon-stars">${'*'.repeat(weapon.stars)}</span>` : ''}
                </div>
            ` : '';

            // Red gear count display
            const redGearHtml = hero.redGearCount != null && hero.redGearCount > 0 ? `
                <span class="red-gear-count">
                    <span class="gear-icon">*</span>${hero.redGearCount}/6 Red Gear
                </span>
            ` : '';

            // Hero power display
            const powerHtml = hero.power ? `
                <div class="hero-power">Power: ${this.formatNumber(hero.power)}</div>
            ` : '';

            // Hero type badge
            const heroType = hero.heroType;
            const heroTypeBadge = heroType ? `
                <span class="hero-type-badge ${heroType.toLowerCase()}">${heroType}</span>
            ` : '';

            // Hero role badge
            const heroRole = hero.role;
            const heroRoleBadge = heroRole ? `
                <span class="hero-role-badge ${heroRole.toLowerCase().replace(' ', '-')}-role">${heroRole}</span>
            ` : '';

            // Performance metrics
            const perf = hero.performance;
            const performanceHtml = perf ? `
                <div class="hero-performance">
                    <div class="hero-performance-row">
                        <span class="perf-label">Damage Dealt</span>
                        <span class="perf-value damage-dealt">${this.formatNumber(perf.damageDealt)}</span>
                    </div>
                    <div class="hero-performance-row">
                        <span class="perf-label">Damage Taken</span>
                        <span class="perf-value damage-taken">${this.formatNumber(perf.damageTaken)}</span>
                    </div>
                    <div class="hero-performance-row">
                        <span class="perf-label">Status</span>
                        <span class="survival-badge ${(perf.survivalStatus || 'unknown').toLowerCase()}">${perf.survivalStatus || 'Unknown'}</span>
                    </div>
                    ${perf.skillsActivated && perf.skillsActivated.length > 0 ? `
                        <div class="hero-performance-row">
                            <span class="perf-label">Skills Used</span>
                            <span class="perf-value">${perf.skillsActivated.join(', ')}</span>
                        </div>
                    ` : ''}
                    ${perf.targetingBehavior ? `
                        <div class="hero-targeting">
                            <strong>Targeting:</strong> ${perf.targetingBehavior}
                        </div>
                    ` : ''}
                </div>
            ` : '';

            return `
                <div class="hero-card">
                    <div class="hero-header">
                        <div class="hero-avatar">${hero.side === 'player' ? 'A' : 'B'}</div>
                        <div>
                            <div class="hero-name">${hero.name || 'Unknown Hero'}</div>
                            <div class="hero-level">Level ${hero.level || '?'} ${'*'.repeat(hero.stars || 0)}</div>
                            ${powerHtml}
                        </div>
                    </div>
                    <div class="hero-stats-row">
                        ${heroTypeBadge}
                        ${heroRoleBadge}
                        ${weaponHtml}
                        ${redGearHtml}
                    </div>
                    <div class="hero-skills">
                        ${(hero.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                    ${performanceHtml}
                </div>
            `;
        }).join('');
    }

    renderArmy(analysis) {
        const armyDetails = analysis.armyDetails;

        if (!armyDetails || (!armyDetails.player && !armyDetails.opponent)) {
            this.armyContent.innerHTML = `
                <div class="army-no-data">
                    <p>No Army data available in this screenshot</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">Upload a screenshot of the Army tab to see detailed breakdowns</p>
                </div>
            `;
            return;
        }

        const renderArmyColumn = (data, title) => {
            if (!data) {
                return `
                    <div class="army-column">
                        <h4>${title}</h4>
                        <p class="no-data">Not visible in screenshots</p>
                    </div>
                `;
            }

            // Drone section
            const drone = data.drone;
            const droneHtml = drone ? `
                <div class="drone-card">
                    <h5>Drone ${drone.level ? `(Level ${drone.level})` : ''}</h5>
                    ${drone.attributeBoosts ? `
                        <div class="drone-attributes">
                            <div class="drone-attr">
                                <div class="attr-label">ATK</div>
                                <div class="attr-value">+${this.formatNumber(drone.attributeBoosts.attack || 0)}</div>
                            </div>
                            <div class="drone-attr">
                                <div class="attr-label">DEF</div>
                                <div class="attr-value">+${this.formatNumber(drone.attributeBoosts.defense || 0)}</div>
                            </div>
                            <div class="drone-attr">
                                <div class="attr-label">HP</div>
                                <div class="attr-value">+${this.formatNumber(drone.attributeBoosts.hp || 0)}</div>
                            </div>
                        </div>
                    ` : ''}
                    ${drone.skillChip && drone.skillChip.name ? `
                        <div class="skill-chip">
                            ${drone.skillChip.name} ${'*'.repeat(drone.skillChip.stars || 0)}
                        </div>
                    ` : ''}
                </div>
            ` : '';

            // Army stats
            const stats = [
                { label: 'Tech', value: data.tech?.power },
                { label: 'Decoration', value: data.decoration?.power },
                { label: 'Units', value: data.units?.power },
                { label: 'Wall of Honor', value: data.wallOfHonor?.power },
                { label: 'Overlord', value: data.overlord?.power, extra: data.overlord?.level ? ` (Lv.${data.overlord.level})` : '' },
                { label: 'Tactics Cards', value: data.tacticsCards?.power },
                { label: 'Cosmetics', value: data.cosmetics?.power }
            ];

            const statsHtml = stats.map(stat => {
                const value = stat.value;
                if (value === null || value === undefined || value === 0) {
                    return `
                        <div class="army-stat">
                            <span class="label">${stat.label}</span>
                            <span class="value" style="color: var(--text-muted);">-</span>
                        </div>
                    `;
                }
                return `
                    <div class="army-stat">
                        <span class="label">${stat.label}${stat.extra || ''}</span>
                        <span class="value">${this.formatNumber(value)}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="army-column">
                    <h4>${title}</h4>
                    ${droneHtml}
                    ${statsHtml}
                </div>
            `;
        };

        const sideAName = analysis.player?.name || 'Side A';
        const sideBName = analysis.opponent?.name || 'Side B';

        this.armyContent.innerHTML = `
            <div class="army-comparison">
                ${renderArmyColumn(armyDetails.player, sideAName)}
                ${renderArmyColumn(armyDetails.opponent, sideBName)}
            </div>
        `;
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

            // Update usage display
            if (insights._usage) {
                this.updateUsageDisplay(insights._usage);
            }

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
                <div class="date">${new Date(entry.date).toLocaleDateString()} ${new Date(entry.date).toLocaleTimeString()}</div>
                <div class="opponent">${entry.analysis?.player?.name || 'Side A'} vs ${entry.opponent || 'Side B'}</div>
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
