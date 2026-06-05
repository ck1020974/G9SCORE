// Shared Application State
const state = {
    allData: [],
    classes: [],
    currentView: 'dashboard', // 'dashboard' or 'student'
    filters: {
        className: 'all',
        studentSeat: null,
        group: 'all'
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


// --- Initialization ---

async function initApp() {
    try {
        // In local development without a server, fetch might fail with CORS on file://
        // We'll try to fetch, if it fails, we fall back to a message.
        const response = await fetch('./scores.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        // Setup state
        state.allData = data;
        
        // Extract unique class list and sort
        state.classes = [...new Set(data.map(item => item.班級))].sort();
        
        // Populate UI
        populateClassSelect();
        
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
        const classesInGroup = new Set(state.allData.filter(s => s.組別 === state.filters.group).map(s => s.班級));
        classes = Array.from(classesInGroup).sort();
    }

    const optionsHTML = '<option value="all">所有班級</option>' + 
        classes.map(c => `<option value="${c}">${c} 班</option>`).join('');
    
    if(elements.studentClassSelect) elements.studentClassSelect.innerHTML = optionsHTML;
    if(elements.subjectClassSelect) elements.subjectClassSelect.innerHTML = optionsHTML;
    if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.innerHTML = optionsHTML;
}

function populateStudentSelect(className) {
    if (!elements.studentSelect) return;
    
    let students = state.allData;
    if (state.filters.group !== 'all') {
        students = students.filter(s => s.組別 === state.filters.group);
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
        option.value = student.座號;
        // Pad seat number with leading zero for UX
        const seatNum = String(student.座號).padStart(2, '0');
        option.textContent = `${seatNum} - ${student.姓名}`;
        elements.studentSelect.appendChild(option);
    });
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
            }
        });
    });

    // Student Group selection change
    if(elements.studentGroupSelect) {
        elements.studentGroupSelect.addEventListener('change', (e) => {
            state.filters.group = e.target.value;
            // update class dropdowns based on group
            populateClassSelect();
            state.filters.className = 'all';
            elements.studentClassSelect.value = 'all';
            if(elements.subjectClassSelect) elements.subjectClassSelect.value = 'all';
            if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.value = 'all';
            populateStudentSelect('all');
            resetStudentView();
        });
    }

    // Student Class selection change
    if(elements.studentClassSelect) {
        elements.studentClassSelect.addEventListener('change', (e) => {
            state.filters.className = e.target.value;
            if(elements.subjectClassSelect) elements.subjectClassSelect.value = state.filters.className;
            if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.value = state.filters.className;
            populateStudentSelect(state.filters.className);
            resetStudentView();
        });
    }

    // Subject Class selection change
    if(elements.subjectClassSelect) {
        elements.subjectClassSelect.addEventListener('change', (e) => {
            state.filters.className = e.target.value;
            if(elements.studentClassSelect) elements.studentClassSelect.value = state.filters.className;
            if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.value = state.filters.className;
            renderSubjectBarChart(state.filters.className);
        });
    }

    // Subject Group selection change
    if(elements.subjectGroupSelect) {
        elements.subjectGroupSelect.addEventListener('change', (e) => {
            state.filters.group = e.target.value;
            populateClassSelect();
            state.filters.className = 'all';
            elements.subjectClassSelect.value = 'all';
            if(elements.studentClassSelect) elements.studentClassSelect.value = 'all';
            if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.value = 'all';
            renderSubjectBarChart(state.filters.className);
        });
    }

    // Cumulative Group selection change
    if(elements.cumulativeGroupSelect) {
        elements.cumulativeGroupSelect.addEventListener('change', (e) => {
            state.filters.group = e.target.value;
            populateClassSelect();
            state.filters.className = 'all';
            if(elements.cumulativeClassSelect) elements.cumulativeClassSelect.value = 'all';
            if(elements.studentClassSelect) elements.studentClassSelect.value = 'all';
            if(elements.subjectClassSelect) elements.subjectClassSelect.value = 'all';
            renderCumulativeView();
        });
    }

    // Cumulative Class selection change
    if(elements.cumulativeClassSelect) {
        elements.cumulativeClassSelect.addEventListener('change', (e) => {
            state.filters.className = e.target.value;
            if(elements.studentClassSelect) elements.studentClassSelect.value = state.filters.className;
            if(elements.subjectClassSelect) elements.subjectClassSelect.value = state.filters.className;
            renderCumulativeView();
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
            elements.studentSelect.value = student.座號;
            state.filters.studentSeat = student.座號;
            renderStudentView();
        }
    });
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

    elements.totalStudents.textContent = totalCount;
    elements.avgM1.textContent = m1Count ? (m1Sum / m1Count).toFixed(1) : '--';
    elements.avgM2.textContent = m2Count ? (m2Sum / m2Count).toFixed(1) : '--';
    elements.avgM3.textContent = m3Count ? (m3Sum / m3Count).toFixed(1) : '--';
    elements.avgM4.textContent = m4Count ? (m4Sum / m4Count).toFixed(1) : '--';
    elements.avgCAP.textContent = capCount ? (capSum / capCount).toFixed(1) : '--';

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

    const chartLabels = state.classes.map(c => `${c}班`);
    const m1Data = state.classes.map(c => classStats[c].m1.count > 0 ? (classStats[c].m1.sum / classStats[c].m1.count).toFixed(1) : 0);
    const m2Data = state.classes.map(c => classStats[c].m2.count > 0 ? (classStats[c].m2.sum / classStats[c].m2.count).toFixed(1) : 0);
    const m3Data = state.classes.map(c => classStats[c].m3.count > 0 ? (classStats[c].m3.sum / classStats[c].m3.count).toFixed(1) : 0);
    const m4Data = state.classes.map(c => classStats[c].m4.count > 0 ? (classStats[c].m4.sum / classStats[c].m4.count).toFixed(1) : 0);
    const capData = state.classes.map(c => classStats[c].cap.count > 0 ? (classStats[c].cap.sum / classStats[c].cap.count).toFixed(1) : 0);

    renderClassAvgChart(chartLabels, m1Data, m2Data, m3Data, m4Data, capData);

    // Prepare Bar Chart Data (Group averages for all mocks and CAP)
    const groups = [...new Set(dataToProcess.map(s => s.組別))].filter(g => g).sort();
    const groupStats = {};
    groups.forEach(g => groupStats[g] = { 
        m1: {sum:0, count:0}, 
        m2: {sum:0, count:0}, 
        m3: {sum:0, count:0}, 
        m4: {sum:0, count:0},
        cap: {sum:0, count:0} 
    });

    dataToProcess.forEach(s => {
        if (!s.組別) return;
        if (groupStats[s.組別]) {
            if (s.一模 && s.一模.總積分) {
                groupStats[s.組別].m1.sum += parseFloatSafe(s.一模.總積分) || 0;
                groupStats[s.組別].m1.count++;
            }
            if (s.二模 && s.二模.總積分) {
                groupStats[s.組別].m2.sum += parseFloatSafe(s.二模.總積分) || 0;
                groupStats[s.組別].m2.count++;
            }
            if (s.三模 && s.三模.總積分) {
                groupStats[s.組別].m3.sum += parseFloatSafe(s.三模.總積分) || 0;
                groupStats[s.組別].m3.count++;
            }
            if (s.四模 && s.四模.總積分) {
                groupStats[s.組別].m4.sum += parseFloatSafe(s.四模.總積分) || 0;
                groupStats[s.組別].m4.count++;
            }
            if (s.會考 && s.會考.總積分) {
                groupStats[s.組別].cap.sum += parseFloatSafe(s.會考.總積分) || 0;
                groupStats[s.組別].cap.count++;
            }
        }
    });

    const groupLabels = groups;
    const gm1Data = groups.map(g => groupStats[g].m1.count > 0 ? (groupStats[g].m1.sum / groupStats[g].m1.count).toFixed(1) : 0);
    const gm2Data = groups.map(g => groupStats[g].m2.count > 0 ? (groupStats[g].m2.sum / groupStats[g].m2.count).toFixed(1) : 0);
    const gm3Data = groups.map(g => groupStats[g].m3.count > 0 ? (groupStats[g].m3.sum / groupStats[g].m3.count).toFixed(1) : 0);
    const gm4Data = groups.map(g => groupStats[g].m4.count > 0 ? (groupStats[g].m4.sum / groupStats[g].m4.count).toFixed(1) : 0);
    const gcapData = groups.map(g => groupStats[g].cap.count > 0 ? (groupStats[g].cap.sum / groupStats[g].cap.count).toFixed(1) : 0);

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
    
    // Use loose equality for seat because JSON might store integers but select returns strings
    const student = state.allData.find(s => s.班級 == cls && s.座號 == seat);
    
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
        students = students.filter(s => s.組別 === state.filters.group);
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
        allStudents = allStudents.filter(s => s.組別 === state.filters.group);
    }
    if (state.filters.className !== 'all') {
        allStudents = allStudents.filter(s => s.班級 === state.filters.className);
    }
    const exams = ['一模', '二模', '三模', '四模', '會考'];
    
    // Calculate data for Pie Charts
    const chartData = exams.map(exam => {
        let over30 = 0, between25and29 = 0, between10and24 = 0, under10 = 0;
        allStudents.forEach(s => {
            if (s[exam] && s[exam].總積分) {
                const score = parseFloatSafe(s[exam].總積分);
                if (score !== null) {
                    if (score >= 30) over30++;
                    else if (score >= 25) between25and29++;
                    else if (score >= 10) between10and24++;
                    else under10++;
                }
            }
        });
        return [over30, between25and29, between10and24, under10];
    });

    renderCumulativeCharts(chartData);
}

function renderCumulativeCharts(chartData) {
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
                    }
                }
            }
        });
    });
}

// Bootstrap
document.addEventListener('DOMContentLoaded', initApp);
