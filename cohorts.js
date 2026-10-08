let cohortRequest = 0;

async function loadJson(path) {
    const response = await fetch(path + '?v=' + Date.now());
    if (!response.ok) throw new Error('無法讀取級別資料');
    return response.json();
}

async function initializeCohorts() {
    const manifest = await loadJson('./data/cohorts.json');
    state.cohorts = manifest.cohorts;
    const select = document.getElementById('cohort-select');
    select.replaceChildren(...manifest.cohorts.map(c => new Option(c.label, c.id)));
    select.value = manifest.defaultCohort;
    select.addEventListener('change', () => switchCohort(select.value).catch(error => console.error(error.message)));
    await switchCohort(select.value);
}

async function switchCohort(id) {
    const request = ++cohortRequest;
    const select = document.getElementById('cohort-select');
    const status = document.getElementById('cohort-status');
    select.disabled = true;
    status.textContent = '載入資料中…';
    try {
        const entry = state.cohorts.find(c => c.id === id);
        const data = ScoreData.validate(await loadJson(entry.file), id);
        if (request !== cohortRequest) return;
        Object.values(state.charts).forEach(chart => chart?.destroy());
        Object.keys(state.charts).forEach(key => state.charts[key] = null);
        state.cohort = data;
        state.allData = data.students;
        state.classes = [...new Set(data.students.map(s => s.班級))].sort();
        state.availableExams = data.exams.filter(exam => data.students.some(s => s[exam] && Object.keys(s[exam]).length));
        state.filters = { className: 'all', studentSeat: null, group: 'all', rankingExam: '', rankingGroup: 'all', rankingClass: 'all' };
        const groups = [...new Set(data.students.flatMap(getStudentGroups))].sort();
        [elements.studentGroupSelect, elements.subjectGroupSelect, elements.cumulativeGroupSelect, elements.rankingGroupSelect].forEach(control => {
            control.replaceChildren(new Option('全校', 'all'), ...groups.map(g => new Option(g, g)));
        });
        elements.rankingExamSelect.replaceChildren(new Option('請選擇考試項目…', ''), ...state.availableExams.map(e => new Option(e, e)));
        populateClassSelect();
        populateRankingClassSelect();
        populateStudentSelect('all');
        elements.studentSearch.value = '';
        elements.gradesTableBody.replaceChildren();
        elements.rankingTableBody.replaceChildren();
        elements.subjectFilter.selectedIndex = 0;
        resetStudentView();
        document.querySelectorAll('.section-header h1').forEach(title => {
            let badge = title.querySelector('.cohort-badge');
            if (!badge) { badge = document.createElement('span'); badge.className = 'cohort-badge'; title.prepend(badge); }
            badge.textContent = entry.label;
        });
        document.getElementById('cohort-empty').hidden = data.students.length > 0;
        status.textContent = data.students.length ? `${data.students.length} 位學生・${state.availableExams.length} 項考試` : '尚未匯入資料';
        document.querySelector('#view-dashboard .subtitle').textContent = id === '114'
            ? '班級比較顯示九年級班級；最終直升生納入班群統計。外考生資料僅提供會考成績。'
            : `已匯入${state.availableExams.join('、') || '尚無考試資料'}。${groups.includes('未分組') ? '分組資料尚未提供。' : ''}`;
        renderDashboardView();
        renderRankingView();
        renderCumulativeView();
        if (state.currentView === 'subject') renderSubjectBarChart('all');
        document.querySelectorAll('#view-dashboard .canvas-container').forEach(container => container.hidden = data.students.length === 0);
        elements.loadingIndicator.classList.add('hidden');
    } catch (error) {
        status.textContent = '載入失敗：' + error.message;
        if (state.cohort) select.value = String(state.cohort.cohort);
        throw error;
    } finally {
        if (request === cohortRequest) select.disabled = false;
    }
}

// 共用考試設定，未匯入的考試不繪製資料列。
function createExamChart(ctx, config) {
    if (config.type === 'bar') config.data.datasets = config.data.datasets.filter(d => !ScoreData.exams.includes(d.label) || state.availableExams.includes(d.label));
    if (config.type === 'line') {
        const indices = config.data.labels.map((label, i) => state.availableExams.includes(label) ? i : -1).filter(i => i >= 0);
        config.data.labels = indices.map(i => config.data.labels[i]);
        config.data.datasets.forEach(dataset => dataset.data = indices.map(i => dataset.data[i]));
    }
    return new Chart(ctx, config);
}
