const comparisonState = { charts:[], request:0, ready:false };
const compareControl = id => document.getElementById('compare-' + id);
const comparisonFormat = (value,unit='') => value === null || value === undefined ? '尚無資料' : value.toFixed(1)+unit;

function updateComparisonMode() {
    const active = state.currentView === 'comparison';
    document.querySelector('.cohort-control').hidden = active;
    document.getElementById('cohort-empty').hidden = active || state.allData.length > 0;
}

async function renderComparisonView() {
    if (comparisonState.ready) {
        compareControl('results').hidden = false;
        requestAnimationFrame(() => {
            if (state.currentView === 'comparison') comparisonState.charts.forEach(chart => chart.resize());
        });
        return;
    }
    const request = ++comparisonState.request;
    comparisonState.charts.forEach(c=>c.destroy());
    comparisonState.charts = [];
    compareControl('results').hidden = true;
    compareControl('status').textContent = '載入跨年資料…';
    try {
        const entries = [...state.cohorts].sort((a,b)=>Number(a.id)-Number(b.id)).slice(-2);
        const ids = entries.map(entry=>String(entry.id));
        const [allCohorts,history] = await Promise.all([
            Promise.all(state.cohorts.map(async e=>ScoreData.validate(await loadJson(e.file),e.id))),
            loadJson('./data/history.json')
        ]);
        if (request !== comparisonState.request || state.currentView !== 'comparison') return;
        const data = ids.map(id=>allCohorts.find(d=>String(d.cohort)===id));
        const summaries = data.map(d=>ScoreData.exams.map(exam=>ScoreData.summary(d.students,exam)));
        compareControl('rows').replaceChildren(...entries.map((entry,i)=>{
            const row = document.createElement('section');
            row.className='compare-year-row compare-side-'+i;
            const title=document.createElement('h2'); title.textContent=entry.label+'總覽 ';
            const count=document.createElement('span'); count.className='title-student-count'; count.textContent=`（${data[i].students.length} 人）`; title.append(count);
            const cards=document.createElement('div'); cards.className='stats-grid compare-overview-grid';
            cards.innerHTML=ScoreData.exams.map((exam,j)=>`<div class="stat-card glass-panel"><h4>${exam}平均</h4><div class="stat-value${summaries[i][j].average===null?' stat-empty':''}">${comparisonFormat(summaries[i][j].average)}</div></div>`).join('');
            row.append(title,cards); return row;
        }));
        compareControl('status').textContent='';
        compareControl('results').hidden=false;
        renderHistory(history,allCohorts);
        comparisonState.ready = true;
    } catch(error) {
        if (request===comparisonState.request) {
            compareControl('results').hidden = true;
            comparisonState.charts.forEach(chart => chart.destroy());
            comparisonState.charts = [];
            compareControl('status').textContent='載入失敗：'+error.message+'，請切換分頁後重試。';
        }
    }
}

function renderHistory(history,cohortData) {
    const avgHead=['學年度','統計人數','一模平均','二模平均','三模平均','四模平均','會考平均','會考較四模'];
    compareControl('history-average-head').innerHTML='<tr>'+avgHead.map(h=>`<th>${h}</th>`).join('')+'</tr>';
    compareControl('history-average-body').innerHTML=history.averages.map(row=>`<tr><td>${row.academicYear}</td><td>${row.count}</td>${ScoreData.exams.map(exam=>`<td>${row[exam]===null?'—':row[exam].toFixed(1)}</td>`).join('')}<td>${row.會考較四模===null?'—':(row.會考較四模>0?'+':'')+row.會考較四模.toFixed(1)}</td></tr>`).join('');
    renderHistoryPies(history.thresholds,cohortData);
    const palette=[colors.primary,colors.accent1,colors.accent2,colors.success,colors.warning,'#64748b'];
    comparisonState.charts.push(new Chart(compareControl('history-trend').getContext('2d'),{
        type:'line',data:{labels:ScoreData.exams,datasets:history.averages.map((row,i)=>({label:String(row.academicYear),data:ScoreData.exams.map(e=>row[e]),borderColor:palette[i%palette.length],backgroundColor:palette[i%palette.length],borderWidth:1.75,pointRadius:ScoreData.exams.filter(e=>row[e]!==null).length===1?5:3,tension:0.15,spanGaps:false}))},
        options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:15,max:30,ticks:{stepSize:5},title:{display:true,text:'平均總積分'},grid:{color:colors.grid}},x:{grid:{display:false}}},plugins:{legend:{labels:{boxWidth:16,boxHeight:6,padding:10}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}：${comparisonFormat(ctx.raw)} 分（來源統計 ${history.averages[ctx.datasetIndex].count} 人）`}}}}
    }));
}

function historyThresholdBands(row) {
    const values = [row.over30, row.over25-row.over30, row.over20-row.over25, 100-row.over20-row.under14_8, row.under14_8];
    if (values.some(value=>!Number.isFinite(value) || value<0 || value>100)) throw new Error('歷年門檻比例無法轉為互斥區間');
    return values.map(value=>Math.round(value*10)/10);
}

function historyStudentBands(students,exam) {
    const scores=students.map(s=>ScoreData.score(s[exam]?.總積分)).filter(value=>value!==null);
    const counts=[0,0,0,0,0];
    scores.forEach(value=>counts[value>=30?0:value>=25?1:value>=20?2:value>15?3:4]++);
    return {count:scores.length,counts,bands:counts.map(count=>scores.length?count/scores.length*100:0)};
}

function historyDistributionSelection(rows,cohortData) {
    const data=cohortData.filter(d=>d.students.some(s=>ScoreData.exams.some(exam=>ScoreData.score(s[exam]?.總積分)!==null))).sort((a,b)=>Number(a.cohort)-Number(b.cohort)).slice(-2);
    const current=data.map(d=>{
        const exam=[...ScoreData.exams].reverse().find(exam=>ScoreData.summary(d.students,exam).count);
        const stats=historyStudentBands(d.students,exam);
        return {title:d.cohort+'級 '+exam,cutoff:15,...stats};
    });
    const firstCurrentYear=data.length?Number(data[0].cohort):Infinity;
    return {current,older:rows.filter(row=>Number(row.capYear)<firstCurrentYear)};
}

function renderCurrentHistoryPies(rows,cohortData) {
    const {current,older}=historyDistributionSelection(rows,cohortData);
    buildHistoryPieCards(current,compareControl('current-pies'));
    buildHistoryPieCards(older.map(row=>({title:row.capYear+'年會考',cutoff:14.8,count:row.count,bands:historyThresholdBands(row)})),compareControl('history-pies'));
}

function renderHistoryPies(rows,cohortData) {
    compareControl('current-pies').replaceChildren();
    compareControl('history-pies').replaceChildren();
    renderCurrentHistoryPies(rows,cohortData);
}

function createScoreDistributionTable(labels,palette,counts,percentages,approximate=false) {
    const table=document.createElement('table');
    table.className='compare-pie-values';
    table.innerHTML='<thead><tr><th scope="col">分數區間</th><th scope="col">人數</th><th scope="col">比例</th></tr></thead><tbody>'+labels.map((label,i)=>`<tr><th scope="row"><span><i style="background:${palette[i]}" aria-hidden="true"></i>${label}</span></th><td class="distribution-count">${approximate?'約':''}${counts[i]}</td><td>${percentages[i].toFixed(1)}%</td></tr>`).join('')+'</tbody>';
    return table;
}

function buildHistoryPieCards(rows,container) {
    const palette = [colors.primary,colors.success,colors.warning,'#cbd5e1','#ef4444'];
    const cards = rows.map(row=>{
        const labels=['30分以上','25至未滿30分','20至未滿25分','超過15至未滿20分','15分以下'];
        const card=document.createElement('section');
        card.className='chart-wrapper glass-panel compare-pie-card';
        const title=document.createElement('h4'); title.textContent=row.title;
        const chartBox=document.createElement('div'); chartBox.className='canvas-container';
        const canvas=document.createElement('canvas');
        canvas.setAttribute('role','img'); canvas.setAttribute('aria-label',row.title+'分數區間比例');
        chartBox.append(canvas);
        const bands=row.bands;
        const counts=row.counts || bands.map(value=>Math.round(row.count*value/100));
        const countPrefix=row.counts?'':'約';
        const values=createScoreDistributionTable(labels,palette,counts,bands,!row.counts);
        card.append(title);
        if (row.caption) {
            const caption=document.createElement('p'); caption.className='compare-note'; caption.textContent=row.caption;
            card.append(caption);
        }
        card.append(chartBox,values);
        return {card,canvas,row,bands,labels,counts,countPrefix};
    });
    container.replaceChildren(...cards.map(item=>item.card));
    cards.forEach(({canvas,row,bands,labels,counts,countPrefix})=>comparisonState.charts.push(new Chart(canvas.getContext('2d'),{
        type:'doughnut',
        data:{labels,datasets:[{data:bands,backgroundColor:palette,borderWidth:2,borderColor:'#ffffff',hoverOffset:4}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{
            legend:{display:false},
            tooltip:{callbacks:{label:ctx=>`${ctx.label}：${countPrefix}${counts[ctx.dataIndex]} 人`}},
            doughnutCenterText:{line1:row.count+' 人',line2:'統計人數',color:colors.text,fontStyle:"'Noto Sans TC', 'Inter', sans-serif"}
        }}
    })));
}
