// Shared Application State
const state = {
    allData: [],
    classes: [],
    currentView: 'dashboard', // 'dashboard' or 'student'
    filters: {
        className: 'all',
        studentSeat: null,
        group: 'all',
        rankingExam: '',
        rankingGroup: 'all',
        rankingClass: 'all'
    },
    charts: {
        classAvg: null,
        groupAvg: null,
        progress: null,
        radar: null,
        subjectBar: null,
        pieM1: null,
        pieM2: null,
        pieM3: null,
        pieM4: null,
        pieCAP: null
    }
};

// DOM Elements
const elements = {
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn'),
    views: document.querySelectorAll('.view-section'),
    
    // Filters (Moved to respective views)
    studentGroupSelect: document.getElementById('student-group-select'),
    studentClassSelect: document.getElementById('student-class-select'),
    studentSelect: document.getElementById('student-select'),
    studentSearch: document.getElementById('student-search'),
    subjectClassSelect: document.getElementById('subject-class-select'),
    subjectGroupSelect: document.getElementById('subject-group-select'),
    cumulativeGroupSelect: document.getElementById('cumulative-group-select'),
    cumulativeClassSelect: document.getElementById('cumulative-class-select'),
    rankingExamSelect: document.getElementById('ranking-exam-select'),
    rankingGroupSelect: document.getElementById('ranking-group-select'),
    rankingClassSelect: document.getElementById('ranking-class-select'),
    rankingDashboardPlaceholder: document.getElementById('ranking-dashboard-content'),
    rankingDashboardActive: document.getElementById('ranking-dashboard-active'),
    rankingTableBody: document.getElementById('ranking-table-body'),
    rankingInfoDisplay: document.getElementById('ranking-info-display'),
    
    // Loading State
    loadingIndicator: document.getElementById('loading-indicator'),
    
    // Dashboard Stats
    totalStudents: document.getElementById('total-students'),
    avgM1: document.getElementById('avg-m1'),
    avgM2: document.getElementById('avg-m2'),
    avgM3: document.getElementById('avg-m3'),
    avgM4: document.getElementById('avg-m4'),
    avgCAP: document.getElementById('avg-cap'),
    
    // Student View Details
    studentNameDisplay: document.getElementById('student-name-display'),
    studentInfoDisplay: document.getElementById('student-info-display'),
    studentDashboardPlaceholder: document.getElementById('student-dashboard-content'),
    studentDashboardActive: document.getElementById('student-dashboard-active'),
    gradesTableBody: document.getElementById('grades-table-body'),

    // Subject Chart Details
    subjectFilter: document.getElementById('subject-filter'),
    subjectChartTitle: document.getElementById('subject-chart-title'),
    subjectNameDisplay: document.getElementById('subject-name-display'),
    subjectInfoDisplay: document.getElementById('subject-info-display'),
    subjectDashboardPlaceholder: document.getElementById('subject-dashboard-content'),
    subjectDashboardActive: document.getElementById('subject-dashboard-active'),

    // Cumulative Analysis Details
    cumulativeTableBody: document.getElementById('cumulative-table-body')
};

// Chart Colors corresponding to CSS variables for consistency
const colors = {
    primary: 'rgba(59, 130, 246, 1)',   // Blue
    primaryBg: 'rgba(59, 130, 246, 0.2)',
    accent1: 'rgba(139, 92, 246, 1)',   // Purple
    accent1Bg: 'rgba(139, 92, 246, 0.2)',
    accent2: 'rgba(236, 72, 153, 1)',   // Pink
    accent2Bg: 'rgba(236, 72, 153, 0.2)',
    success: 'rgba(16, 185, 129, 1)',
    successBg: 'rgba(16, 185, 129, 0.2)',
    warning: 'rgba(245, 158, 11, 1)',   // Amber
    warningBg: 'rgba(245, 158, 11, 0.2)',
    text: '#0f172a', // Dark text for light theme
    grid: 'rgba(0, 0, 0, 0.1)' // Dark grid lines
};

// Default Chart.js Configuration for light theme
Chart.defaults.color = colors.text;
Chart.defaults.font.family = "'Inter', 'Noto Sans TC', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#0f172a';
Chart.defaults.plugins.tooltip.bodyColor = '#334155';
Chart.defaults.plugins.tooltip.titleFont = { size: 14, weight: 'bold' };
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;

// Custom plugin to render text inside doughnut cutout
const doughnutCenterTextPlugin = {
    id: 'doughnutCenterText',
    beforeDraw: function(chart) {
        if (chart.config.options.plugins && chart.config.options.plugins.doughnutCenterText) {
            const ctx = chart.ctx;
            const centerConfig = chart.config.options.plugins.doughnutCenterText;
            const fontStyle = centerConfig.fontStyle || 'sans-serif';
            const txtLine1 = centerConfig.line1 || '';
            const txtLine2 = centerConfig.line2 || '';
            const color = centerConfig.color || '#000';
            
            const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
            const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
            
            ctx.save();
            
            // Line 1: 5A count
            ctx.font = "bold 15px " + fontStyle;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(txtLine1, centerX, centerY - 10);
            
            // Line 2: percentage
            ctx.font = "normal 12px " + fontStyle;
            ctx.fillStyle = 'rgba(100, 116, 139, 1)';
            ctx.fillText(txtLine2, centerX, centerY + 10);
            
            ctx.restore();
        }
    }
};
Chart.register(doughnutCenterTextPlugin);


// --- Initialization ---

async function initApp() {
    try {
        // In local development without a server, fetch might fail with CORS on file://
        // We'll try to fetch, if it fails, we fall back to a message.
        const response = await fetch('./scores.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        console.log("Data loaded successfully. Total students:", data.length);
        console.log("First student record:", data[0]);
        
        // Setup state
        state.allData = data;
        
        // Extract unique class list and sort
        state.classes = [...new Set(data.map(item => item.班級))].sort();
        
        // Populate UI
        populateClassSelect();
        populateRankingClassSelect();
        
        // Hide loading
        elements.loadingIndicator.classList.add('hidden');
        
        // Initial render for Dashboard
        renderDashboardView();
        
        // Setup Event Listeners
        setupEventListeners();

    } catch (error) {
        console.error("Error loading data:", error);
        elements.loadingIndicator.innerHTML = `
            <div style="color: var(--danger); text-align: center;">
                <p>資料載入失敗</p>
                <p style="font-size: 0.8em; margin-top: 8px;">(提示：使用 Live Server 或本地伺服器開啟以支援資料讀取)</p>
            </div>
        `;
    }
}

// --- Data Helpers ---

// Helper to safely parse strings to float float
function parseFloatSafe(val) {
    if (!val || val === '') return null;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
}

function isExternalCandidate(student) {
    return student.外考生 === true;
}

function formatClassLabel(className) {
    return className === '外考' ? '外考生' : `${className} 班`;
}

function matchesGroup(student, groupName) {
    return groupName === 'all' ||
        student.組別 === groupName ||
        student.額外分組 === groupName;
}

function getStudentGroups(student) {
    return [...new Set([student.組別, student.額外分組].filter(Boolean))];
}

// Map grade letter to a numerical value for radar chart representation
// A++ (7), A+ (6), A (5), B++ (4), B+ (3), B (2), C (1)
function gradeToNumber(grade) {
    if (!grade) return 0;
    // Remove whitespace and convert to uppercase for robust matching
    const cleanGrade = grade.toString().replace(/\s/g, '').toUpperCase();
    const mapping = {
        'A++': 7, 'A+': 6, 'A': 5, 
        'B++': 4, 'B+': 3, 'B': 2, 
        'C': 1
    };
    return mapping[cleanGrade] || 0;
}

// Grade color class helper
function getGradeClass(grade) {
    if (!grade) return '';
    if (grade.includes('A')) return 'grade-A';
    if (grade.includes('B')) return 'grade-B';
    if (grade.includes('C')) return 'grade-C';
    return '';
}

// --- UI Updates ---

function populateClassSelect() {
    let classes = state.classes;
    if (state.filters.group !== 'all') {
        const classesInGroup = new Set(state.allData.filter(s => matchesGroup(s, state.filters.group)).map(s => s.班級));
        classes = Array.from(classesInGroup).sort();
    }

    const optionsHTML = '<option value="all">所有班級</option>' + 
        classes.map(c => `<option value="${c}">${formatClassLabel(c)}</option>`).join('');
    
    if(elements.studentClassSelect) elements.studentClassSelect.innerHTML = optionsHTML;
    if(elements.subjectClassSelect) elements.subjectClassSelect.innerHTML = optionsHTML;
    if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.innerHTML = optionsHTML;
}

function populateRankingClassSelect() {
    if (!elements.rankingClassSelect) return;
    
    let classes = state.classes;
    if (state.filters.rankingGroup !== 'all') {
        const classesInGroup = new Set(state.allData.filter(s => matchesGroup(s, state.filters.rankingGroup)).map(s => s.班級));
        classes = Array.from(classesInGroup).sort();
    }

    const optionsHTML = '<option value="all">所有班級</option>' + 
        classes.map(c => `<option value="${c}">${formatClassLabel(c)}</option>`).join('');
    
    elements.rankingClassSelect.innerHTML = optionsHTML;
}

function populateStudentSelect(className) {
    if (!elements.studentSelect) return;
    
    let students = state.allData;
    if (state.filters.group !== 'all') {
        students = students.filter(s => matchesGroup(s, state.filters.group));
    }

    if (className === 'all') {
        elements.studentSelect.innerHTML = '<option value="">請先選擇班級...</option>';
        elements.studentSelect.disabled = true;
        return;
    }

    elements.studentSelect.disabled = false;
    const filteredStudents = students.filter(s => s.班級 === className)
        .sort((a, b) => parseInt(a.座號) - parseInt(b.座號));

    elements.studentSelect.innerHTML = '<option value="">請選擇學生...</option>';
    filteredStudents.forEach(student => {
        const option = document.createElement('option');
        // 座號在高一重新編班後可能重複，使用姓名作為唯一選取值。
        option.value = student.姓名;
        // Pad seat number with leading zero for UX
        const seatNum = String(student.座號).padStart(2, '0');
        option.textContent = `${seatNum} - ${student.姓名}`;
        elements.studentSelect.appendChild(option);
    });
}

function updateGlobalGroup(groupValue) {
    state.filters.group = groupValue;
    populateClassSelect();
    
    state.filters.className = 'all';
    
    // 同步所有的 Group Selects (排除 rankingGroupSelect)
    if(elements.studentGroupSelect) elements.studentGroupSelect.value = groupValue;
    if(elements.subjectGroupSelect) elements.subjectGroupSelect.value = groupValue;
    if(elements.cumulativeGroupSelect) elements.cumulativeGroupSelect.value = groupValue;
    
    // 同步所有的 Class Selects 到 'all' (排除 rankingClassSelect)
    if(elements.studentClassSelect) elements.studentClassSelect.value = 'all';
    if(elements.subjectClassSelect) elements.subjectClassSelect.value = 'all';
    if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.value = 'all';
    
    populateStudentSelect('all');
    resetStudentView();
    
    triggerViewRender();
}

function updateGlobalClass(classValue) {
    state.filters.className = classValue;
    
    // 同步所有的 Class Selects (排除 rankingClassSelect)
    if(elements.studentClassSelect) elements.studentClassSelect.value = classValue;
    if(elements.subjectClassSelect) elements.subjectClassSelect.value = classValue;
    if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.value = classValue;
    
    if (elements.studentSelect) {
        populateStudentSelect(classValue);
        resetStudentView();
    }
    
    triggerViewRender();
}

function triggerViewRender() {
    if (state.currentView === 'subject') {
        renderSubjectBarChart(state.filters.className);
    } else if (state.currentView === 'cumulative') {
        renderCumulativeView();
    }
}

function setupEventListeners() {
    // Navigation
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active states
            elements.navBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Switch views
            const viewId = e.currentTarget.dataset.view;
            state.currentView = viewId;
            
            elements.views.forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${viewId}`).classList.add('active');
            
            // Auto render specific logic per view
            if (viewId === 'subject') {
                renderSubjectBarChart(state.filters.className);
            } else if (viewId === 'student') {
                if (state.filters.studentSeat) {
                    renderStudentView();
                }
            }
            
            // Ensure chart resizes correctly when container becomes visible
            if (state.charts.progress) state.charts.progress.resize();
            if (state.charts.radar) state.charts.radar.resize();
            if (state.charts.subjectBar) state.charts.subjectBar.resize();
            if (state.charts.classAvg) state.charts.classAvg.resize();
            if (state.charts.groupAvg) state.charts.groupAvg.resize();
            ['M1', 'M2', 'M3', 'M4', 'CAP'].forEach(m => {
                if(state.charts[`pie${m}`]) state.charts[`pie${m}`].resize();
            });

            if (viewId === 'cumulative') {
                renderCumulativeView();
            } else if (viewId === 'ranking') {
                renderRankingView();
            }
        });
    });

    // Group selection changes
    if(elements.studentGroupSelect) {
        elements.studentGroupSelect.addEventListener('change', (e) => updateGlobalGroup(e.target.value));
    }
    if(elements.subjectGroupSelect) {
        elements.subjectGroupSelect.addEventListener('change', (e) => updateGlobalGroup(e.target.value));
    }
    if(elements.cumulativeGroupSelect) {
        elements.cumulativeGroupSelect.addEventListener('change', (e) => updateGlobalGroup(e.target.value));
    }
    if(elements.rankingGroupSelect) {
        elements.rankingGroupSelect.addEventListener('change', (e) => {
            state.filters.rankingGroup = e.target.value;
            populateRankingClassSelect();
            state.filters.rankingClass = 'all';
            if (elements.rankingClassSelect) elements.rankingClassSelect.value = 'all';
            renderRankingView();
        });
    }

    // Class selection changes
    if(elements.studentClassSelect) {
        elements.studentClassSelect.addEventListener('change', (e) => updateGlobalClass(e.target.value));
    }
    if(elements.subjectClassSelect) {
        elements.subjectClassSelect.addEventListener('change', (e) => updateGlobalClass(e.target.value));
    }
    if(elements.cumulativeClassSelect) {
        elements.cumulativeClassSelect.addEventListener('change', (e) => updateGlobalClass(e.target.value));
    }
    if(elements.rankingClassSelect) {
        elements.rankingClassSelect.addEventListener('change', (e) => {
            state.filters.rankingClass = e.target.value;
            renderRankingView();
        });
    }

    // Ranking Exam selection change
    if(elements.rankingExamSelect) {
        elements.rankingExamSelect.addEventListener('change', (e) => {
            state.filters.rankingExam = e.target.value;
            renderRankingView();
        });
    }

    // Subject selection change (For the Distribution view)
    if (elements.subjectFilter) {
        elements.subjectFilter.addEventListener('change', () => {
            if (state.currentView === 'subject') {
                renderSubjectBarChart(state.filters.className);
            }
        });
    }

    // Student selection change
    elements.studentSelect.addEventListener('change', (e) => {
        const seat = e.target.value;
        if (!seat) {
            resetStudentView();
            return;
        }
        
        state.filters.studentSeat = seat;
        renderStudentView();
    });

    // Search input (debounce recommended but kept simple here)
    elements.studentSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (term.length === 0) return;
        
        // Find first matching student across all data
        const termLooseMatch = parseInt(term, 10);
        const student = state.allData.find(s =>
            s.姓名.toLowerCase().includes(term) ||
            s.座號 == termLooseMatch ||
            String(s.座號).padStart(2, '0') === term ||
            String(s.座號) === term
        );

        if (student) {
            // Auto update filters to match found student
            if (elements.studentClassSelect && elements.studentClassSelect.value !== student.班級) {
                elements.studentClassSelect.value = student.班級;
                if(elements.subjectClassSelect) elements.subjectClassSelect.value = student.班級;
                state.filters.className = student.班級;
                populateStudentSelect(student.班級);
            }
            elements.studentSelect.value = student.姓名;
            state.filters.studentSeat = student.姓名;
            renderStudentView();
        }
    });

    // Ranking Table name click delegation (Jump to student view)
    if(elements.rankingTableBody) {
        elements.rankingTableBody.addEventListener('click', (e) => {
            const link = e.target.closest('.student-link');
            if (link) {
                e.preventDefault();
                const cls = link.dataset.class;
                const seat = link.dataset.seat;
                navigateToStudentProfile(cls, seat);
            }
        });
    }
}

function navigateToStudentProfile(cls, seat) {
    // 1. 更新狀態
    state.currentView = 'student';
    state.filters.className = cls;
    state.filters.studentSeat = seat;
    
    // 2. 同步下拉選單 (分組/班級，排除已獨立的 ranking)
    if(elements.studentClassSelect) elements.studentClassSelect.value = cls;
    if(elements.subjectClassSelect) elements.subjectClassSelect.value = cls;
    if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.value = cls;
    
    // 3. 填入學生下拉選單並選中
    populateStudentSelect(cls);
    if(elements.studentSelect) elements.studentSelect.value = seat;
    
    // 4. 更新 Sidebar 按鈕選中狀態
    elements.navBtns.forEach(btn => {
        if (btn.dataset.view === 'student') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 5. 切換視圖 Section
    elements.views.forEach(v => {
        if (v.id === 'view-student') {
            v.classList.add('active');
        } else {
            v.classList.remove('active');
        }
    });
    
    // 6. 渲染個人表現
    renderStudentView();
    
    // 7. 觸發圖表 resize 確保正常繪製
    if (state.charts.progress) state.charts.progress.resize();
    if (state.charts.radar) state.charts.radar.resize();
}

// --- Dashboard View Rendering ---

function renderDashboardView() {
    let dataToProcess = state.allData;
    
    // Although Dashboard is 'Overall', if a class is selected, we might want to filter, 
    // but the design says "班級整體表現總覽". Let's show all classes by default or filter if requested.
    // For the bar chart, showing all classes is usually better.
    
    // Calculate global stats
    const totalCount = dataToProcess.length;
    
    // Averages
    let m1Sum = 0, m1Count = 0;
    let m2Sum = 0, m2Count = 0;
    let m3Sum = 0, m3Count = 0;
    let m4Sum = 0, m4Count = 0;
    let capSum = 0, capCount = 0;

    dataToProcess.forEach(s => {
        if (s.一模 && s.一模.總積分) { m1Sum += parseFloatSafe(s.一模.總積分) || 0; m1Count++; }
        if (s.二模 && s.二模.總積分) { m2Sum += parseFloatSafe(s.二模.總積分) || 0; m2Count++; }
        if (s.三模 && s.三模.總積分) { m3Sum += parseFloatSafe(s.三模.總積分) || 0; m3Count++; }
        if (s.四模 && s.四模.總積分) { m4Sum += parseFloatSafe(s.四模.總積分) || 0; m4Count++; }
        if (s.會考 && s.會考.總積分) { capSum += parseFloatSafe(s.會考.總積分) || 0; capCount++; }
    });

    if (elements.totalStudents) elements.totalStudents.textContent = totalCount;
    if (elements.avgM1) elements.avgM1.textContent = m1Count ? (m1Sum / m1Count).toFixed(1) : '--';
    if (elements.avgM2) elements.avgM2.textContent = m2Count ? (m2Sum / m2Count).toFixed(1) : '--';
    if (elements.avgM3) elements.avgM3.textContent = m3Count ? (m3Sum / m3Count).toFixed(1) : '--';
    if (elements.avgM4) elements.avgM4.textContent = m4Count ? (m4Sum / m4Count).toFixed(1) : '--';
    if (elements.avgCAP) elements.avgCAP.textContent = capCount ? (capSum / capCount).toFixed(1) : '--';

    // Prepare Bar Chart Data (Class averages for all mocks and CAP)
    const classStats = {};
    state.classes.forEach(c => classStats[c] = { 
        m1: {sum:0, count:0}, 
        m2: {sum:0, count:0}, 
        m3: {sum:0, count:0}, 
        m4: {sum:0, count:0},
        cap: {sum:0, count:0} 
    });

    dataToProcess.forEach(s => {
        if (classStats[s.班級]) {
            if (s.一模 && s.一模.總積分) {
                classStats[s.班級].m1.sum += parseFloatSafe(s.一模.總積分) || 0;
                classStats[s.班級].m1.count++;
            }
            if (s.二模 && s.二模.總積分) {
                classStats[s.班級].m2.sum += parseFloatSafe(s.二模.總積分) || 0;
                classStats[s.班級].m2.count++;
            }
            if (s.三模 && s.三模.總積分) {
                classStats[s.班級].m3.sum += parseFloatSafe(s.三模.總積分) || 0;
                classStats[s.班級].m3.count++;
            }
            if (s.四模 && s.四模.總積分) {
                classStats[s.班級].m4.sum += parseFloatSafe(s.四模.總積分) || 0;
                classStats[s.班級].m4.count++;
            }
            if (s.會考 && s.會考.總積分) {
                classStats[s.班級].cap.sum += parseFloatSafe(s.會考.總積分) || 0;
                classStats[s.班級].cap.count++;
            }
        }
    });

    const chartLabels = state.classes.map(formatClassLabel);
    const m1Data = state.classes.map(c => classStats[c].m1.count > 0 ? (classStats[c].m1.sum / classStats[c].m1.count).toFixed(1) : null);
    const m2Data = state.classes.map(c => classStats[c].m2.count > 0 ? (classStats[c].m2.sum / classStats[c].m2.count).toFixed(1) : null);
    const m3Data = state.classes.map(c => classStats[c].m3.count > 0 ? (classStats[c].m3.sum / classStats[c].m3.count).toFixed(1) : null);
    const m4Data = state.classes.map(c => classStats[c].m4.count > 0 ? (classStats[c].m4.sum / classStats[c].m4.count).toFixed(1) : null);
    const capData = state.classes.map(c => classStats[c].cap.count > 0 ? (classStats[c].cap.sum / classStats[c].cap.count).toFixed(1) : null);

    renderClassAvgChart(chartLabels, m1Data, m2Data, m3Data, m4Data, capData);

    // Prepare Bar Chart Data (Group averages for all mocks and CAP)
    const groups = [...new Set(dataToProcess.flatMap(getStudentGroups))].sort();
    const groupStats = {};
    groups.forEach(g => groupStats[g] = { 
        m1: {sum:0, count:0}, 
        m2: {sum:0, count:0}, 
        m3: {sum:0, count:0}, 
        m4: {sum:0, count:0},
        cap: {sum:0, count:0} 
    });

    dataToProcess.forEach(s => {
        getStudentGroups(s).forEach(groupName => {
            const stats = groupStats[groupName];
            if (!stats) return;
            if (s.一模 && s.一模.總積分) {
                stats.m1.sum += parseFloatSafe(s.一模.總積分) || 0;
                stats.m1.count++;
            }
            if (s.二模 && s.二模.總積分) {
                stats.m2.sum += parseFloatSafe(s.二模.總積分) || 0;
                stats.m2.count++;
            }
            if (s.三模 && s.三模.總積分) {
                stats.m3.sum += parseFloatSafe(s.三模.總積分) || 0;
                stats.m3.count++;
            }
            if (s.四模 && s.四模.總積分) {
                stats.m4.sum += parseFloatSafe(s.四模.總積分) || 0;
                stats.m4.count++;
            }
            if (s.會考 && s.會考.總積分) {
                stats.cap.sum += parseFloatSafe(s.會考.總積分) || 0;
                stats.cap.count++;
            }
        });
    });

    const groupLabels = groups;
    const gm1Data = groups.map(g => groupStats[g].m1.count > 0 ? (groupStats[g].m1.sum / groupStats[g].m1.count).toFixed(1) : null);
    const gm2Data = groups.map(g => groupStats[g].m2.count > 0 ? (groupStats[g].m2.sum / groupStats[g].m2.count).toFixed(1) : null);
    const gm3Data = groups.map(g => groupStats[g].m3.count > 0 ? (groupStats[g].m3.sum / groupStats[g].m3.count).toFixed(1) : null);
    const gm4Data = groups.map(g => groupStats[g].m4.count > 0 ? (groupStats[g].m4.sum / groupStats[g].m4.count).toFixed(1) : null);
    const gcapData = groups.map(g => groupStats[g].cap.count > 0 ? (groupStats[g].cap.sum / groupStats[g].cap.count).toFixed(1) : null);

    renderGroupAvgChart(groupLabels, gm1Data, gm2Data, gm3Data, gm4Data, gcapData);
}

function renderGroupAvgChart(labels, m1, m2, m3, m4, cap) {
    const ctx = document.getElementById('groupAvgChart').getContext('2d');
    
    if (state.charts.groupAvg) {
        state.charts.groupAvg.destroy();
    }

    state.charts.groupAvg = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '一模',
                    data: m1,
                    backgroundColor: colors.primaryBg,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '二模',
                    data: m2,
                    backgroundColor: colors.accent1Bg,
                    borderColor: colors.accent1,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '三模',
                    data: m3,
                    backgroundColor: colors.accent2Bg,
                    borderColor: colors.accent2,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '四模',
                    data: m4,
                    backgroundColor: colors.successBg,
                    borderColor: colors.success,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '會考',
                    data: cap,
                    backgroundColor: colors.warningBg,
                    borderColor: colors.warning,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: colors.grid, drawBorder: false },
                    ticks: { padding: 10 }
                },
                x: {
                    grid: { display: false, drawBorder: false }
                }
            },
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { color: colors.text }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

function renderClassAvgChart(labels, m1, m2, m3, m4, cap) {
    const ctx = document.getElementById('classAvgChart').getContext('2d');
    
    if (state.charts.classAvg) {
        state.charts.classAvg.destroy();
    }

    state.charts.classAvg = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '一模',
                    data: m1,
                    backgroundColor: colors.primaryBg,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '二模',
                    data: m2,
                    backgroundColor: colors.accent1Bg,
                    borderColor: colors.accent1,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '三模',
                    data: m3,
                    backgroundColor: colors.accent2Bg,
                    borderColor: colors.accent2,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '四模',
                    data: m4,
                    backgroundColor: colors.successBg,
                    borderColor: colors.success,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '會考',
                    data: cap,
                    backgroundColor: colors.warningBg,
                    borderColor: colors.warning,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: colors.grid, drawBorder: false },
                    ticks: { padding: 10 }
                },
                x: {
                    grid: { display: false, drawBorder: false }
                }
            },
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { color: colors.text }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

// --- Student View Rendering ---

function resetStudentView() {
    elements.studentDashboardPlaceholder.classList.remove('hidden');
    elements.studentDashboardActive.classList.add('hidden');
    elements.studentNameDisplay.textContent = '請選擇學生';
    elements.studentInfoDisplay.textContent = '班級: -- | 座號: --';

    if (elements.subjectDashboardPlaceholder) {
        elements.subjectDashboardPlaceholder.classList.remove('hidden');
        elements.subjectDashboardActive.classList.add('hidden');
    }
}

function renderStudentView() {
    const cls = state.filters.className;
    const seat = state.filters.studentSeat;
    
    // 高一重新編班後可能有重複座號，因此以班級與姓名選取學生。
    const student = state.allData.find(s => s.班級 == cls && s.姓名 === seat);
    
    if (!student) {
        resetStudentView();
        return;
    }

    // Toggle states
    elements.studentDashboardPlaceholder.classList.add('hidden');
    elements.studentDashboardActive.classList.remove('hidden');
    
    // Update Header
    elements.studentNameDisplay.textContent = student.姓名;
    elements.studentInfoDisplay.textContent = `班級: ${student.班級} | 座號: ${String(student.座號).padStart(2, '0')}`;

    // Extract Data safely
    const m1 = student.一模 || {};
    const m2 = student.二模 || {};
    const m3 = student.三模 || {};
    const m4 = student.四模 || {};
    const cap = student.會考 || {};

    // 1. Progress Chart (Line)
    const progressData = [
        parseFloatSafe(m1.總積分) || null,
        parseFloatSafe(m2.總積分) || null,
        parseFloatSafe(m3.總積分) || null,
        parseFloatSafe(m4.總積分) || null,
        parseFloatSafe(cap.總積分) || null
    ];
    renderProgressChart(['一模', '二模', '三模', '四模', '會考'], progressData);

    // 2. Radar Chart (Latest Exam)
    // Finding latest exam with data, checking CAP first
    let latestExam = cap;
    let examLabel = '會考';
    if (!latestExam.國) {
        latestExam = m4;
        examLabel = '四模';
    }
    if (!latestExam.國) {
        latestExam = m3;
        examLabel = '三模';
    }
    if (!latestExam.國) {
        latestExam = m2;
        examLabel = '二模';
    }
    if (!latestExam.國) {
        latestExam = m1;
        examLabel = '一模';
    }

    const radarData = [
        gradeToNumber(latestExam.國),
        gradeToNumber(latestExam.英),
        gradeToNumber(latestExam.數),
        gradeToNumber(latestExam.社),
        gradeToNumber(latestExam.自)
    ];
    renderRadarChart(['國文', '英文', '數學', '社會', '自然'], radarData, `各科能力狀態 (${examLabel})`);

    // 3. Populate Table
    populateGradesTable(m1, m2, m3, m4, cap);
}

function renderProgressChart(labels, data) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    if (state.charts.progress) {
        state.charts.progress.destroy();
    }

    // Gradient fill under line
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, colors.accent2Bg);
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');

    state.charts.progress = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '總積分',
                data: data,
                borderColor: colors.accent2,
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: colors.bg,
                pointBorderColor: colors.accent2,
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                fill: true,
                tension: 0.4 // smooth curve
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 36, // Max possible score
                    grid: { color: colors.grid, drawBorder: false }
                },
                x: {
                    grid: { display: false, drawBorder: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderRadarChart(labels, data, datasetLabel) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    if (state.charts.radar) {
        state.charts.radar.destroy();
    }

    state.charts.radar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: datasetLabel,
                data: data,
                borderColor: colors.primary,
                backgroundColor: colors.primaryBg,
                pointBackgroundColor: colors.primary,
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: colors.grid },
                    grid: { color: colors.grid },
                    pointLabels: {
                        color: colors.text,
                        font: { size: 14, family: "'Inter', sans-serif" }
                    },
                    min: 0,
                    max: 7,
                    ticks: {
                        display: false, // hide the numerical scale mapping
                        min: 0,
                        max: 7,
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: { 
                    labels: { color: colors.text }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // Reverse map number to grade for tooltip
                            const val = context.raw;
                            const reverseMap = {
                                7: 'A++', 6: 'A+', 5: 'A', 
                                4: 'B++', 3: 'B+', 2: 'B', 1: 'C'
                            };
                            return ` ${context.dataset.label}: ${reverseMap[val] || '無'}`;
                        }
                    }
                }
            }
        }
    });
}

function renderSubjectBarChart(className) {
    if (!elements.subjectDashboardActive || !document.getElementById('subjectBarChart')) return;
    
    if (!className) {
        elements.subjectDashboardPlaceholder.classList.remove('hidden');
        elements.subjectDashboardActive.classList.add('hidden');
        if(elements.subjectInfoDisplay) elements.subjectInfoDisplay.textContent = `請從左側選單選擇一個班級以檢視資料`;
        return;
    }

    // Toggle containers
    elements.subjectDashboardPlaceholder.classList.add('hidden');
    elements.subjectDashboardActive.classList.remove('hidden');
    
    // Update headers
    const subjectName = elements.subjectFilter.options[elements.subjectFilter.selectedIndex].text;
    const subjectKey = elements.subjectFilter.value; // e.g., '國', '英'
    
    const displayClassName = className === 'all' ? '所有班級 (全校)' : `${className} 班`;
    if(elements.subjectInfoDisplay) elements.subjectInfoDisplay.textContent = ``;
    if(elements.subjectChartTitle) elements.subjectChartTitle.textContent = `${displayClassName} ${subjectName}科 模考與會考比較`;

    // Filter students
    let students = state.allData;
    if (state.filters.group !== 'all') {
        students = students.filter(s => matchesGroup(s, state.filters.group));
    }
    if (className !== 'all') {
        students = students.filter(s => s.班級 === className);
    }

    const gradesOrder = ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C'];
    
    // Helper to count grades for a specific exam
    const countGrades = (examKey) => {
        const counts = { 'A++': 0, 'A+': 0, 'A': 0, 'B++': 0, 'B+': 0, 'B': 0, 'C': 0 };
        students.forEach(s => {
            if (s[examKey] && s[examKey][subjectKey]) {
                const grade = s[examKey][subjectKey].replace(/\s/g, '').toUpperCase();
                if (counts[grade] !== undefined) {
                    counts[grade]++;
                }
            }
        });
        return gradesOrder.map(g => counts[g]);
    };

    const m1Counts = countGrades('一模');
    const m2Counts = countGrades('二模');
    const m3Counts = countGrades('三模');
    const m4Counts = countGrades('四模');
    const capCounts = countGrades('會考');

    const ctx = document.getElementById('subjectBarChart').getContext('2d');
    if (state.charts.subjectBar) {
        state.charts.subjectBar.destroy();
    }

    state.charts.subjectBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: gradesOrder,
            datasets: [
                {
                    label: '一模',
                    data: m1Counts,
                    backgroundColor: colors.primaryBg,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '二模',
                    data: m2Counts,
                    backgroundColor: colors.accent1Bg,
                    borderColor: colors.accent1,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '三模',
                    data: m3Counts,
                    backgroundColor: colors.accent2Bg,
                    borderColor: colors.accent2,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '四模',
                    data: m4Counts,
                    backgroundColor: colors.successBg,
                    borderColor: colors.success,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '會考',
                    data: capCounts,
                    backgroundColor: colors.warningBg,
                    borderColor: colors.warning,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: colors.grid },
                    title: {
                        display: true,
                        text: '人數',
                        color: colors.text
                    }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { color: colors.text }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} 人`;
                        }
                    }
                }
            }
        }
    });
}

function processTableRow(examName, examData) {
    if (!examData || Object.keys(examData).length === 0 || !examData.總積分) {
        return `<tr><td style="color: var(--text-muted);">${examName}</td><td colspan="7" style="color: var(--text-muted);">無資料</td></tr>`;
    }
    
    const d = examData;
    return `
        <tr>
            <td style="font-weight: 600; color: var(--text-muted);">${examName}</td>
            <td style="font-weight: bold; color: var(--text-color);">${d.總積分 || '-'}</td>
            <td class="${getGradeClass(d.國)}">${d.國 || '-'}</td>
            <td class="${getGradeClass(d.英)}">${d.英 || '-'}</td>
            <td class="${getGradeClass(d.數)}">${d.數 || '-'}</td>
            <td class="${getGradeClass(d.社)}">${d.社 || '-'}</td>
            <td class="${getGradeClass(d.自)}">${d.自 || '-'}</td>
            <td style="color: var(--warning); font-weight: 600;">${d.作 || '-'}</td>
        </tr>
    `;
}

function populateGradesTable(m1, m2, m3, m4, cap) {
    let html = '';
    html += processTableRow('一模', m1);
    html += processTableRow('二模', m2);
    html += processTableRow('三模', m3);
    html += processTableRow('四模', m4);
    html += processTableRow('會考', cap);
    elements.gradesTableBody.innerHTML = html;
}

// --- Cumulative View Rendering ---

function renderCumulativeView() {
    let allStudents = state.allData;
    if (state.filters.group !== 'all') {
        allStudents = allStudents.filter(s => matchesGroup(s, state.filters.group));
    }
    if (state.filters.className !== 'all') {
        allStudents = allStudents.filter(s => s.班級 === state.filters.className);
    }
    const exams = ['一模', '二模', '三模', '四模', '會考'];
    
    // Calculate data for Pie Charts
    const fiveAStats = [];
    const chartData = exams.map(exam => {
        let over30 = 0, between25and29 = 0, between10and24 = 0, under10 = 0;
        let fiveACount = 0;
        let validCount = 0;
        
        allStudents.forEach(s => {
            if (s[exam] && s[exam].總積分) {
                const score = parseFloatSafe(s[exam].總積分);
                if (score !== null) {
                    validCount++;
                    if (score >= 30) over30++;
                    else if (score >= 25) between25and29++;
                    else if (score >= 10) between10and24++;
                    else under10++;
                    
                    // 5A 判定 (國、英、數、社、自皆達 A 以上)
                    const examData = s[exam];
                    if (examData.國 && examData.英 && examData.數 && examData.社 && examData.自) {
                        const is5A = ['國', '英', '數', '社', '自'].every(sub => examData[sub] && examData[sub].includes('A'));
                        if (is5A) {
                            fiveACount++;
                        }
                    }
                }
            }
        });
        
        const percent = validCount > 0 ? ((fiveACount / validCount) * 100).toFixed(1) : '0.0';
        fiveAStats.push({
            count: fiveACount,
            percentage: percent
        });
        
        return [over30, between25and29, between10and24, under10];
    });

    renderCumulativeCharts(chartData, fiveAStats);
}

function renderCumulativeCharts(chartData, fiveAStats) {
    const labels = ['30分以上', '25-29分', '10-24分', '10分以下'];
    const colorsArr = [
        colors.primary,     // Blue for >=30
        colors.success,     // Green for 25-29
        '#cbd5e1',          // Gray for 10-24
        '#ef4444'           // Red for <10
    ];
    
    ['M1', 'M2', 'M3', 'M4', 'CAP'].forEach((exam, index) => {
        const canvas = document.getElementById(`pieChart${exam}`);
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (state.charts[`pie${exam}`]) {
            state.charts[`pie${exam}`].destroy();
        }

        const stats = fiveAStats[index];

        state.charts[`pie${exam}`] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: chartData[index],
                    backgroundColor: colorsArr,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { 
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                const dataset = context.dataset.data;
                                const total = dataset.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` 本區段 (${context.label}): ${val} 人 (${percentage}%)`;
                            }
                        }
                    },
                    doughnutCenterText: {
                        line1: `5A: ${stats.count}人`,
                        line2: `${stats.percentage}%`,
                        color: colors.text,
                        fontStyle: "'Noto Sans TC', 'Inter', sans-serif"
                    }
                }
            }
        });
    });
}

function compareStudents(a, b, examKey) {
    // 降序排序: 若 b 的值優於 a 的值，應回傳正數
    
    // 先比總積分
    if (b.score !== a.score) {
        return b.score - a.score;
    }
    
    const examA = a.student[examKey];
    const examB = b.student[examKey];
    
    // 1. 比寫作 (作)
    const essayA = parseFloatSafe(examA.作) || 0;
    const essayB = parseFloatSafe(examB.作) || 0;
    if (essayB !== essayA) {
        return essayB - essayA;
    }
    
    // 2. 比國文
    const chiA = gradeToNumber(examA.國);
    const chiB = gradeToNumber(examB.國);
    if (chiB !== chiA) {
        return chiB - chiA;
    }
    
    // 3. 比英文
    const engA = gradeToNumber(examA.英);
    const engB = gradeToNumber(examB.英);
    if (engB !== engA) {
        return engB - engA;
    }
    
    // 4. 比數學
    const mathA = gradeToNumber(examA.數);
    const mathB = gradeToNumber(examB.數);
    if (mathB !== mathA) {
        return mathB - mathA;
    }
    
    // 5. 比社會
    const socA = gradeToNumber(examA.社);
    const socB = gradeToNumber(examB.社);
    if (socB !== socA) {
        return socB - socA;
    }
    
    // 6. 比自然
    const sciA = gradeToNumber(examA.自);
    const sciB = gradeToNumber(examB.自);
    if (sciB !== sciA) {
        return sciB - sciA;
    }
    
    return 0;
}

function renderRankingView() {
    const examKey = state.filters.rankingExam;
    
    // 1. 檢查前置條件
    if (!examKey) {
        if (elements.rankingDashboardPlaceholder) elements.rankingDashboardPlaceholder.classList.remove('hidden');
        if (elements.rankingDashboardActive) elements.rankingDashboardActive.classList.add('hidden');
        if (elements.rankingInfoDisplay) elements.rankingInfoDisplay.textContent = '請選擇考試項目以載入排名計分板';
        return;
    }
    
    if (elements.rankingDashboardPlaceholder) elements.rankingDashboardPlaceholder.classList.add('hidden');
    if (elements.rankingDashboardActive) elements.rankingDashboardActive.classList.remove('hidden');
    if (elements.rankingInfoDisplay) elements.rankingInfoDisplay.textContent = '';
    
    // 2. 篩選資料
    let filteredStudents = state.allData.filter(s => {
        // 必須在該次考試有總積分資料
        if (!s[examKey] || s[examKey].總積分 === undefined || s[examKey].總積分 === null || s[examKey].總積分 === '') {
            return false;
        }

        // 分組篩選
        if (!matchesGroup(s, state.filters.rankingGroup)) {
            return false;
        }
        
        // 班級篩選
        if (state.filters.rankingClass !== 'all' && s.班級 !== state.filters.rankingClass) {
            return false;
        }
        
        return true;
    });
    
    // 3. 排序資料 (依總積分降序排序，若相同則依序比作、國、英、數、社、自)
    const sortedItems = filteredStudents.map(s => {
        return {
            student: s,
            score: parseFloatSafe(s[examKey].總積分) || 0
        };
    }).sort((a, b) => compareStudents(a, b, examKey));
    
    // 4. 計算名次 (標準競賽平局排名，但以同分判優破局：只有當全部科目均完全平手時才並列名次)
    let currentRank = 1;
    const rankedStudents = [];
    for (let i = 0; i < sortedItems.length; i++) {
        if (i > 0) {
            // 與前一位完全平手 (compareResult === 0) 則並列名次；否則名次跳到 index + 1 (i + 1)
            const isDifferent = compareStudents(sortedItems[i-1], sortedItems[i], examKey) !== 0;
            if (isDifferent) {
                currentRank = i + 1;
            }
        }
        rankedStudents.push({
            ...sortedItems[i],
            rank: currentRank
        });
    }
    
    // 5. 更新表格標題
    const displayGroup = state.filters.rankingGroup === 'all' ? '全校' : state.filters.rankingGroup;
    const displayClass = state.filters.rankingClass === 'all' ? '所有班級' : formatClassLabel(state.filters.rankingClass);
    const tableTitle = document.getElementById('ranking-table-title');
    if (tableTitle) {
        tableTitle.textContent = `${displayGroup} | ${displayClass} | ${examKey} 排名結果 (共 ${rankedStudents.length} 人)`;
    }
    
    // 6. 渲染表格
    if (rankedStudents.length === 0) {
        elements.rankingTableBody.innerHTML = `
            <tr>
                <td colspan="11" style="color: var(--text-muted); text-align: center; padding: 32px;">
                    無符合條件之排名資料
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    rankedStudents.forEach(item => {
        const s = item.student;
        const examData = s[examKey];
        
        html += `
            <tr>
                <td style="font-weight: 700; color: var(--text-color);">${item.rank}</td>
                <td style="font-weight: 600;">
                    <a href="#" class="student-link" data-class="${s.班級}" data-seat="${s.姓名}">${s.姓名}</a>
                </td>
                <td>${formatClassLabel(s.班級)}</td>
                <td>${s.組別 || '-'}</td>
                <td style="font-weight: bold; color: var(--text-color);">${item.score.toFixed(1)}</td>
                <td class="${getGradeClass(examData.國)}">${examData.國 || '-'}</td>
                <td class="${getGradeClass(examData.英)}">${examData.英 || '-'}</td>
                <td class="${getGradeClass(examData.數)}">${examData.數 || '-'}</td>
                <td class="${getGradeClass(examData.社)}">${examData.社 || '-'}</td>
                <td class="${getGradeClass(examData.自)}">${examData.自 || '-'}</td>
                <td style="color: var(--warning); font-weight: 600;">${examData.作 || '-'}</td>
            </tr>
        `;
    });
    elements.rankingTableBody.innerHTML = html;
}

// Bootstrap
document.addEventListener('DOMContentLoaded', initApp);
