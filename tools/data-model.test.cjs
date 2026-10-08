const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../data-model.js');
test('114級遷移保留原始成績与121筆紀錄', () => {
    const before = require('../scores.json');
    const after = model.validate(require('../data/114.json'),'114');
    assert.equal(after.students.length,121);
    after.students.forEach((s,i) => Object.keys(before[i]).forEach(key => {
        if (key === '會考') {
            const expected = {...before[i][key], 作:model.essayGradeFromPoints(before[i][key].作), 作文原始積分:before[i][key].作};
            assert.deepEqual(s[key],expected);
        } else assert.deepEqual(s[key],before[i][key]);
    }));
    assert.equal(model.summary(after.students,'一模').count,110);
    assert.equal(model.summary(after.students,'會考').count,121);
});
test('空級別不产生假成绩', () => {
    const data = model.validate({schemaVersion:1,cohort:'115',exams:[],students:[]},'115');
    assert.deepEqual(model.summary(data.students,'一模'),{count:0,average:null});
});
test('零分计入平均，空白与无效值排除', () => {
    assert.deepEqual(model.summary([{一模:{總積分:0}},{一模:{總積分:'20'}},{一模:{總積分:''}},{一模:{總積分:null}}],'一模'),{count:2,average:10});
    assert.equal(model.score('12xyz'),null);
});
test('拒绝级别错配与重复ID', () => {
    const data = structuredClone(require('../data/114.json'));
    assert.throws(() => model.validate(data,'115'));
    data.students[1].id = data.students[0].id;
    assert.throws(() => model.validate(data,'114'));
});
test('僅一模資料時圖表不繪製後續考試，零分保留', () => {
    const fs = require('fs');
    const vm = require('vm');
    const context = vm.createContext({ ScoreData:model, state:{availableExams:['一模']}, Chart:function(ctx,config) { return config; } });
    vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../cohorts.js'),'utf8'),context);
    const config = {type:'line',data:{labels:model.exams,datasets:[{data:[0,null,null,null,null]}]}};
    context.config = config;
    vm.runInContext('createExamChart(null, config)',context);
    assert.equal(config.data.labels.join(','),'一模');
    assert.equal(config.data.datasets[0].data.length,1);
    assert.equal(config.data.datasets[0].data[0],0);
});
test('作文積分轉回六級分且保留缺漏與零分', () => {
    for (const [points,grade] of [[0,0],[0.1,1],[0.2,2],[0.4,3],[0.6,4],[0.8,5],[1,6]]) assert.equal(model.essayGradeFromPoints(points),grade);
    assert.equal(model.essayGradeFromPoints(null),null);
    assert.throws(() => model.essayGradeFromPoints(0.5));
});
test('115級一模匯入141人，作文六級分與來源積分一致', () => {
    const data = model.validate(require('../data/115.json'),'115');
    assert.equal(data.students.length,141);
    assert.deepEqual(data.exams,['一模']);
    assert.equal(model.summary(data.students,'一模').count,141);
    assert.ok(Math.abs(model.summary(data.students,'一模').average-21.44113475177305)<1e-10);
    assert.equal(data.students.filter(s=>s.一模.作 === null).length,1);
    data.students.forEach(s=>assert.equal(s.一模.作,model.essayGradeFromPoints(s.一模.作文原始積分)));
    assert.equal(require('../data/cohorts.json').defaultCohort,'115');
});
