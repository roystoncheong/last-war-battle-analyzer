/**
 * Last War Battle Analyzer - AI Vision Module
 * Uses backend proxy to securely call Claude API
 */

class BattleAnalyzer {
    constructor() {
        // Use relative path for API - works on same domain
        this.apiEndpoint = '/api/analyze';
        this.usageEndpoint = '/api/usage';
        this.lastUsageInfo = null;
    }

    /**
     * Check if API is ready (always true with backend)
     */
    hasApiKey() {
        return true; // Backend handles the API key
    }

    /**
     * Get last usage info
     */
    getUsageInfo() {
        return this.lastUsageInfo;
    }

    /**
     * Convert image file to base64
     */
    async imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get the media type from file
     */
    getMediaType(file) {
        const type = file.type;
        if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
        if (type === 'image/png') return 'image/png';
        if (type === 'image/gif') return 'image/gif';
        if (type === 'image/webp') return 'image/webp';
        return 'image/jpeg'; // default
    }

    /**
     * Analyze single battle screenshot using Claude Vision
     */
    async analyzeScreenshot(imageFile) {
        const base64Image = await this.imageToBase64(imageFile);
        const mediaType = this.getMediaType(imageFile);

        const prompt = `You are an expert analyzer for the mobile game "Last War: Survival". Analyze this PVP battle screenshot and extract all relevant battle information.

Please provide a detailed analysis in the following JSON format:

{
    "battleType": "PVP/Rally/Alliance War/etc",
    "outcome": "Victory/Defeat/Draw",
    "player": {
        "name": "player name if visible",
        "power": "power level if visible",
        "alliance": "alliance name if visible"
    },
    "opponent": {
        "name": "opponent name if visible",
        "power": "power level if visible",
        "alliance": "alliance name if visible"
    },
    "troops": {
        "player": {
            "infantry": {"count": 0, "tier": "T1-T10"},
            "vehicles": {"count": 0, "tier": "T1-T10"},
            "aircraft": {"count": 0, "tier": "T1-T10"},
            "total": 0
        },
        "opponent": {
            "infantry": {"count": 0, "tier": "T1-T10"},
            "vehicles": {"count": 0, "tier": "T1-T10"},
            "aircraft": {"count": 0, "tier": "T1-T10"},
            "total": 0
        }
    },
    "damage": {
        "dealt": {
            "total": 0,
            "infantry": 0,
            "vehicles": 0,
            "aircraft": 0
        },
        "received": {
            "total": 0,
            "infantry": 0,
            "vehicles": 0,
            "aircraft": 0
        }
    },
    "casualties": {
        "player": {
            "killed": 0,
            "wounded": 0
        },
        "opponent": {
            "killed": 0,
            "wounded": 0
        }
    },
    "heroes": [
        {
            "name": "hero name",
            "level": 0,
            "stars": 0,
            "skills": ["skill1", "skill2"],
            "side": "player/opponent"
        }
    ],
    "resources": {
        "gained": {},
        "lost": {}
    },
    "notes": "Any additional observations about the battle"
}

Important instructions:
1. Extract ALL visible numbers and statistics from the screenshot
2. If a value is not visible or unclear, use null instead of guessing
3. Pay attention to troop tiers (T1-T10) as they significantly impact battle analysis
4. Note any special battle conditions or buffs visible
5. Include hero information if commanders/heroes are shown
6. The game uses terms like "Infantry", "Vehicles/Tanks", "Aircraft/Helicopters"

Respond ONLY with the JSON object, no additional text.`;

        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mediaType,
                            data: base64Image
                        }
                    },
                    {
                        type: 'text',
                        text: prompt
                    }
                ]
            }
        ];

        return this.callApi(messages);
    }

    /**
     * Analyze multiple screenshots from the SAME battle and combine into one analysis
     */
    async analyzeCombinedScreenshots(imageFiles, progressCallback) {
        if (progressCallback) {
            progressCallback(0, imageFiles.length, 'Preparing images...');
        }

        // Prepare all images for the API call
        const imageContents = [];
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            if (progressCallback) {
                progressCallback(i + 1, imageFiles.length, `Processing ${file.name}...`);
            }
            const base64Image = await this.imageToBase64(file);
            const mediaType = this.getMediaType(file);
            imageContents.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Image
                }
            });
        }

        if (progressCallback) {
            progressCallback(imageFiles.length, imageFiles.length, 'Analyzing battle...');
        }

        const prompt = `You are an expert analyzer for the mobile game "Last War: Survival".

I am providing you with ${imageFiles.length} screenshot(s) from the SAME battle. These screenshots may show different tabs or views of the same battle report (e.g., overview tab, troop details tab, damage breakdown tab, hero stats tab).

Analyze ALL screenshots together and combine the information into a single comprehensive battle analysis. Extract data from whichever screenshot shows it most clearly.

Please provide a detailed analysis in the following JSON format:

{
    "battleType": "PVP/Rally/Alliance War/etc",
    "outcome": "Victory/Defeat/Draw",
    "player": {
        "name": "player name if visible",
        "power": "power level if visible",
        "alliance": "alliance name if visible"
    },
    "opponent": {
        "name": "opponent name if visible",
        "power": "power level if visible",
        "alliance": "alliance name if visible"
    },
    "troops": {
        "player": {
            "infantry": {"count": 0, "tier": "T1-T10"},
            "vehicles": {"count": 0, "tier": "T1-T10"},
            "aircraft": {"count": 0, "tier": "T1-T10"},
            "total": 0
        },
        "opponent": {
            "infantry": {"count": 0, "tier": "T1-T10"},
            "vehicles": {"count": 0, "tier": "T1-T10"},
            "aircraft": {"count": 0, "tier": "T1-T10"},
            "total": 0
        }
    },
    "damage": {
        "dealt": {
            "total": 0,
            "infantry": 0,
            "vehicles": 0,
            "aircraft": 0
        },
        "received": {
            "total": 0,
            "infantry": 0,
            "vehicles": 0,
            "aircraft": 0
        }
    },
    "casualties": {
        "player": {
            "killed": 0,
            "wounded": 0
        },
        "opponent": {
            "killed": 0,
            "wounded": 0
        }
    },
    "heroes": [
        {
            "name": "hero name",
            "level": 0,
            "stars": 0,
            "skills": ["skill1", "skill2"],
            "side": "player/opponent"
        }
    ],
    "resources": {
        "gained": {},
        "lost": {}
    },
    "screenshotsAnalyzed": ${imageFiles.length},
    "notes": "Any additional observations about the battle, mention which screenshots provided which data"
}

Important instructions:
1. Combine information from ALL ${imageFiles.length} screenshots into ONE unified analysis
2. Extract ALL visible numbers and statistics from any screenshot that shows them
3. If the same data appears in multiple screenshots, use the most complete/clear value
4. If a value is not visible in ANY screenshot, use null instead of guessing
5. Pay attention to troop tiers (T1-T10) as they significantly impact battle analysis
6. Note any special battle conditions or buffs visible
7. Include hero information if commanders/heroes are shown in any screenshot
8. The game uses terms like "Infantry", "Vehicles/Tanks", "Aircraft/Helicopters"

Respond ONLY with the JSON object, no additional text.`;

        const messages = [
            {
                role: 'user',
                content: [
                    ...imageContents,
                    {
                        type: 'text',
                        text: prompt
                    }
                ]
            }
        ];

        return this.callApi(messages);
    }

    /**
     * Call the backend API
     */
    async callApi(messages) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(data.error || 'Rate limit exceeded. Please wait before trying again.');
                }
                throw new Error(data.error || `API error: ${response.status}`);
            }

            // Store usage info
            if (data.usage_info) {
                this.lastUsageInfo = data.usage_info;
            }

            const content = data.content[0].text;

            // Parse the JSON response
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    result._usage = this.lastUsageInfo;
                    return result;
                }
                throw new Error('No valid JSON found in response');
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                return {
                    rawResponse: content,
                    parseError: true,
                    notes: 'Could not parse structured data. See raw response.',
                    _usage: this.lastUsageInfo
                };
            }
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    /**
     * Generate smart insights from battle history using Claude
     */
    async generateSmartInsights(battleHistory) {
        if (battleHistory.length < 2) {
            return this.generateBasicInsights(battleHistory);
        }

        // Prepare battle summary for analysis
        const battleSummary = battleHistory.slice(0, 20).map(battle => ({
            date: battle.date,
            outcome: battle.outcome,
            opponent: battle.opponent,
            opponentPower: battle.analysis?.opponent?.power,
            battleType: battle.battleType,
            damageDealt: battle.damageDealt,
            damageReceived: battle.damageReceived,
            enemyKilled: battle.enemyKilled,
            playerKilled: battle.analysis?.casualties?.player?.killed,
            troops: battle.analysis?.troops,
            heroes: battle.analysis?.heroes
        }));

        const prompt = `You are an expert game analyst for "Last War: Survival". Analyze this player's battle history using your knowledge of the game's combat mechanics.

=== LAST WAR GAME MECHANICS KNOWLEDGE ===

**TROOP TYPE COUNTER SYSTEM (Rock-Paper-Scissors):**
- Tanks > Aircraft (20% damage bonus + 20% damage reduction = 40% effective swing)
- Aircraft > Missile Vehicles (20% damage bonus + 20% damage reduction)
- Missile Vehicles > Tanks (20% damage bonus + 20% damage reduction)
- Type advantage provides ~44% effective power swing (1.44x vs 0.64x = 2.25x difference)

**2025 META:**
- Tank-heavy formations dominate (3-4 Tanks standard, 60-80% tank ratio optimal)
- 3-4 tank compositions represent 85%+ of successful competitive teams
- Control heroes are now mandatory (1-2 dedicated control specialists required)
- Solo excellence insufficient - alliance coordination critical

**FORMATION BONUSES (after Capitol conquest):**
- 3 same-type heroes: +5% HP/ATK/DEF
- 3 same + 2 different: +10% HP/ATK/DEF
- 4 same-type heroes: +15% HP/ATK/DEF
- 5 same-type heroes: +20% HP/ATK/DEF

**MORALE MECHANICS:**
- Morale Bonus = 1 + (Your Morale - Enemy Morale) / 100
- +100% morale advantage = DOUBLE damage
- Can range from draw to 300% attack power at extremes
- Most underutilized mechanic - can overcome significant power disadvantages

**DAMAGE FORMULA:**
Final Damage = Base Attack × Type Modifier × Morale Modifier × Formation Bonus × Skill Multipliers × Equipment × Critical Hit × (1 - Enemy Defense)

**TOP TIER HEROES (2025):**
S-Tier: Kimberly (AoE tank), DVA (single-target burst), Tesla (endgame scaling), Murphy (best tank)
A-Tier: Williams (defensive backbone), Marshall (consistent), Fiona (short-mid encounters)
Best F2P core: Kimberly, Murphy, Mason

**RALLY STRATEGY:**
- 25%+ power advantage recommended for reliable wins
- War Fever provides 1% damage boost (must trigger manually)
- Rally prep times: 5min (active), 10min (standard), 30min (cross-timezone), 60min (max participation)
- R4/R5 rally participation gives +5% damage boost

**KEY INSIGHTS:**
- A 3.5M power player with optimal bonuses can fight like 12.6M power (360% increase)
- Smart fighters beat strong fighters through mechanics mastery
- Buildings get +25% damage vs Aircraft (aircraft vulnerable in base defense)

=== PLAYER BATTLE HISTORY ===
${JSON.stringify(battleSummary, null, 2)}

=== ANALYSIS REQUIRED ===
Based on the battle data AND the game mechanics above, provide strategic insights:

{
    "overallPerformance": {
        "rating": "Excellent/Good/Average/Needs Improvement",
        "winRate": 0,
        "averageDamageEfficiency": 0,
        "trend": "Improving/Stable/Declining"
    },
    "strengths": [
        "Specific strength observed (reference game mechanics)"
    ],
    "weaknesses": [
        "Specific weakness based on game mechanics understanding"
    ],
    "patterns": {
        "bestPerformingTroopType": "Tank/Missile/Aircraft",
        "worstPerformingTroopType": "Tank/Missile/Aircraft",
        "typeCounterUsage": "Analysis of whether player uses counters effectively",
        "formationAnalysis": "Whether player achieves type bonuses",
        "riskyOpponents": ["Characteristics of opponents that cause losses"]
    },
    "recommendations": [
        {
            "priority": "High/Medium/Low",
            "category": "Troops/Heroes/Counters/Morale/Formation/Rally",
            "suggestion": "Specific actionable recommendation based on game mechanics",
            "reasoning": "Why this matters mechanically"
        }
    ],
    "counterStrategy": {
        "againstTanks": "Recommendation for fighting tank-heavy enemies",
        "againstAircraft": "Recommendation for fighting aircraft-heavy enemies",
        "againstMissiles": "Recommendation for fighting missile-heavy enemies"
    },
    "nextBattleTips": [
        "Immediate tips referencing specific game mechanics"
    ],
    "heroAnalysis": {
        "detectedHeroes": ["List of heroes seen in battles"],
        "heroTierAssessment": "Assessment based on S/A/B/C tier list",
        "heroRecommendations": "Suggestions based on current meta"
    },
    "moraleAndBuffs": {
        "moraleUsage": "Assessment of morale advantage usage",
        "formationBonusUsage": "Assessment of type bonus usage",
        "improvementTips": "How to leverage these mechanics better"
    },
    "summary": "2-3 sentence summary with specific game mechanics references"
}

IMPORTANT: Reference specific game mechanics in your recommendations. Be specific about counter relationships, formation bonuses, and morale advantages.
Respond ONLY with the JSON object.`;

        const messages = [
            {
                role: 'user',
                content: prompt
            }
        ];

        try {
            return await this.callApi(messages);
        } catch (error) {
            console.error('Smart insights error:', error);
            return this.generateBasicInsights(battleHistory);
        }
    }

    /**
     * Generate basic insights without AI (fallback)
     */
    generateBasicInsights(battleHistory) {
        const total = battleHistory.length;
        const wins = battleHistory.filter(b => b.outcome?.toLowerCase() === 'victory').length;
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

        const totalDamageDealt = battleHistory.reduce((sum, b) => sum + (b.damageDealt || 0), 0);
        const totalDamageReceived = battleHistory.reduce((sum, b) => sum + (b.damageReceived || 0), 0);
        const damageEfficiency = totalDamageReceived > 0 ? (totalDamageDealt / totalDamageReceived).toFixed(2) : 0;

        // Calculate trend from last 5 battles
        const recent = battleHistory.slice(0, 5);
        const recentWins = recent.filter(b => b.outcome?.toLowerCase() === 'victory').length;
        const recentWinRate = recent.length > 0 ? (recentWins / recent.length) * 100 : 0;

        let trend = 'Stable';
        if (recentWinRate > parseFloat(winRate) + 10) trend = 'Improving';
        else if (recentWinRate < parseFloat(winRate) - 10) trend = 'Declining';

        let rating = 'Average';
        if (parseFloat(winRate) >= 70) rating = 'Excellent';
        else if (parseFloat(winRate) >= 55) rating = 'Good';
        else if (parseFloat(winRate) < 40) rating = 'Needs Improvement';

        return {
            overallPerformance: {
                rating,
                winRate: parseFloat(winRate),
                averageDamageEfficiency: parseFloat(damageEfficiency),
                trend
            },
            strengths: total >= 3 && parseFloat(winRate) >= 50 ?
                ['Maintaining positive win rate'] :
                ['Keep analyzing more battles for insights'],
            weaknesses: parseFloat(damageEfficiency) < 1 ?
                ['Taking more damage than dealing - consider defensive improvements'] :
                ['Continue tracking battles for pattern analysis'],
            patterns: {
                bestPerformingTroopType: 'Analyze more battles to determine',
                worstPerformingTroopType: 'Analyze more battles to determine',
                optimalBattleType: 'PVP',
                riskyOpponents: ['Higher power opponents']
            },
            recommendations: [
                {
                    priority: 'High',
                    category: 'Strategy',
                    suggestion: 'Upload more battle screenshots for detailed pattern analysis'
                }
            ],
            nextBattleTips: [
                'Review your troop composition before engaging',
                'Check opponent power level before attacking'
            ],
            heroAnalysis: {
                mostEffectiveHero: 'Upload more battles to analyze',
                heroRecommendations: 'Include hero details in screenshots for analysis'
            },
            summary: `You have a ${winRate}% win rate across ${total} battles. ${trend === 'Improving' ? 'Your performance is improving!' : trend === 'Declining' ? 'Recent performance shows room for improvement.' : 'Your performance is consistent.'}`
        };
    }

    /**
     * Compare two battles
     */
    compareBattles(battle1, battle2) {
        const comparison = {
            damageDealtDiff: (battle1.damageDealt || 0) - (battle2.damageDealt || 0),
            damageReceivedDiff: (battle1.damageReceived || 0) - (battle2.damageReceived || 0),
            killsDiff: (battle1.enemyKilled || 0) - (battle2.enemyKilled || 0),
            outcomeChange: battle1.outcome !== battle2.outcome,
            improvement: false
        };

        // Determine if battle1 is an improvement over battle2
        comparison.improvement =
            comparison.damageDealtDiff > 0 ||
            comparison.killsDiff > 0 ||
            (battle1.outcome === 'Victory' && battle2.outcome !== 'Victory');

        return comparison;
    }

    /**
     * Calculate battle statistics from analysis
     */
    calculateStats(analysis) {
        const stats = {
            killRatio: 0,
            damageEfficiency: 0,
            troopEfficiency: 0,
            powerDifference: 0
        };

        if (analysis.casualties) {
            const playerKills = analysis.casualties.opponent?.killed || 0;
            const playerDeaths = analysis.casualties.player?.killed || 0;
            stats.killRatio = playerDeaths > 0 ? (playerKills / playerDeaths).toFixed(2) : playerKills;
        }

        if (analysis.damage) {
            const dealt = analysis.damage.dealt?.total || 0;
            const received = analysis.damage.received?.total || 0;
            stats.damageEfficiency = received > 0 ? (dealt / received).toFixed(2) : dealt;
        }

        if (analysis.troops) {
            const playerTroops = analysis.troops.player?.total || 0;
            const opponentTroops = analysis.troops.opponent?.total || 0;
            if (playerTroops > 0 && opponentTroops > 0) {
                const playerLosses = analysis.casualties?.player?.killed || 0;
                const opponentLosses = analysis.casualties?.opponent?.killed || 0;
                stats.troopEfficiency = ((opponentLosses / opponentTroops) / (playerLosses / playerTroops || 1)).toFixed(2);
            }
        }

        // Calculate power difference if available
        if (analysis.player?.power && analysis.opponent?.power) {
            const playerPower = parseInt(analysis.player.power) || 0;
            const opponentPower = parseInt(analysis.opponent.power) || 0;
            stats.powerDifference = playerPower - opponentPower;
        }

        return stats;
    }

    /**
     * Get performance grade
     */
    getPerformanceGrade(stats) {
        let score = 0;

        if (stats.killRatio >= 2) score += 30;
        else if (stats.killRatio >= 1) score += 20;
        else if (stats.killRatio >= 0.5) score += 10;

        if (stats.damageEfficiency >= 2) score += 30;
        else if (stats.damageEfficiency >= 1) score += 20;
        else if (stats.damageEfficiency >= 0.5) score += 10;

        if (stats.troopEfficiency >= 2) score += 40;
        else if (stats.troopEfficiency >= 1) score += 25;
        else if (stats.troopEfficiency >= 0.5) score += 15;

        if (score >= 80) return { grade: 'S', label: 'Exceptional', color: '#ffd700' };
        if (score >= 65) return { grade: 'A', label: 'Excellent', color: '#4ade80' };
        if (score >= 50) return { grade: 'B', label: 'Good', color: '#60a5fa' };
        if (score >= 35) return { grade: 'C', label: 'Average', color: '#f7c548' };
        if (score >= 20) return { grade: 'D', label: 'Below Average', color: '#fb923c' };
        return { grade: 'F', label: 'Needs Work', color: '#ef4444' };
    }
}

// Export for use in app.js
window.BattleAnalyzer = BattleAnalyzer;
