const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({ScoreData:require('../data-model.js')});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../comparison-overview.js'),'utf8'),context);
const bands = row => Array.from(context.historyThresholdBands(row));
const history = require('../data/history.json');
test('分布圖保留最新兩級與最近有效考試，歷年只顯示較早年份',()=>{
    const cohorts=[require('../data/114.json'),require('../data/115.json')];
    const selection=context.historyDistributionSelection(history.thresholds,cohorts);
    assert.deepEqual(Array.from(selection.current,c=>c.title),['114級 會考','115級 一模']);
    assert.deepEqual(Array.from(selection.older,c=>c.capYear),[110,111,112,113]);
    const next={cohort:'116',students:[{二模:{總積分:20}}],exams:['一模','二模','會考']};
    const future=context.historyDistributionSelection(history.thresholds,[next,...cohorts]);
    assert.deepEqual(Array.from(future.current,c=>c.title),['115級 一模','116級 二模']);
});
test('累積門檻換為圓餅區間，總和100且重組後保留來源比例',()=>{
    assert.deepEqual(bands(history.thresholds[0]),[9.1,7.9,19.4,31.8,31.8]);
    assert.deepEqual(bands(history.thresholds.at(-1)),[13.6,10.9,29.1,30,16.4]);
    history.thresholds.forEach(row=>{
        const values=bands(row);
        assert.ok(Math.abs(values.reduce((sum,v)=>sum+v,0)-100)<1e-10);
        assert.ok(Math.abs(values.slice(0,3).reduce((sum,v)=>sum+v,0)-row.over20)<1e-10);
        assert.ok(Math.abs(values[0]+values[1]-row.over25)<1e-10);
    });
});
test('矛盾的門檻比例不繪製誤導圓餅圖',()=>{
    assert.throws(()=>bands({over30:20,over25:10,over20:50,under14_8:20}));
    assert.throws(()=>bands({over30:10,over25:20,over20:80,under14_8:30}));
});
test('15分邊界、零分與缺漏成績正確計入各區間',()=>{
    const students=[0,15,15.1,19.9,20,24.9,25,29.9,30,null,''].map(value=>({會考:{總積分:value}}));
    const result=context.historyStudentBands(students,'會考');
    assert.equal(result.count,9);
    assert.deepEqual(Array.from(result.counts),[1,2,2,2,2]);
});
test('114會考與115一模全體重算，其餘歷年來源維持不變',()=>{
    const previous=JSON.stringify(history);
    const d114=require('../data/114.json'),d115=require('../data/115.json');
    const cap=context.historyStudentBands(d114.students,'會考');
    const mock=context.historyStudentBands(d115.students,'一模');
    assert.equal(cap.count,121);
    assert.deepEqual(Array.from(cap.counts),[16,15,38,33,19]);
    assert.equal(mock.count,141);
    assert.deepEqual(Array.from(mock.counts),[15,24,39,39,24]);
    assert.equal(JSON.stringify(history),previous);
});
