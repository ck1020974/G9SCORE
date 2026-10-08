// Validate a prepared cohort JSON before replacing that cohort's data file.
const fs = require('fs');
const path = require('path');
const model = require('../data-model.js');
const [id, source, mode] = process.argv.slice(2);
if (!/^\d{3}$/.test(id || '') || !source || (mode && mode !== '--write')) {
    console.error('用法：node tools/import-cohort.cjs 115 待匯入.json [--write]');
    process.exit(1);
}
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'data/cohorts.json'),'utf8'));
if (!manifest.cohorts.some(c => c.id === id)) throw new Error('級別尚未登錄');
const data = model.validate(JSON.parse(fs.readFileSync(path.resolve(source),'utf8').replace(/^\uFEFF/,'')),id);
const report = { cohort: id, students: data.students.length, exams: Object.fromEntries(data.exams.map(e => [e, model.summary(data.students,e)])) };
console.log(JSON.stringify(report,null,2));
if (mode === '--write') {
    const target = path.join(root,'data',id+'.json');
    fs.copyFileSync(target,target+'.backup');
    fs.writeFileSync(target+'.tmp',JSON.stringify(data,null,2)+'\n');
    fs.renameSync(target+'.tmp',target);
    console.log('匯入完成，原資料保留為 .backup');
} else console.log('檢查完成；未修改正式資料。');
