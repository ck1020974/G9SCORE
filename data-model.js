(function (root) {
    const exams = ['一模', '二模', '三模', '四模', '會考'];
    const subjects = ['國', '英', '數', '社', '自'];
    function score(value) {
        if (value === null || value === undefined || String(value).trim() === '') return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }
    function validate(data, cohort) {
        if (data.schemaVersion !== 1 || String(data.cohort) !== String(cohort) || !Array.isArray(data.students)) {
            throw new Error('資料版本、級別或學生清單格式不正確');
        }
        if (!Array.isArray(data.exams) || data.exams.some(e => !exams.includes(e)) || new Set(data.exams).size !== data.exams.length) {
            throw new Error('考試設定不正確');
        }
        const ids = new Set();
        data.students.forEach((s, i) => {
            if (!s.id || ids.has(s.id) || !s.姓名 || !s.班級 || String(s.級別) !== String(cohort)) {
                throw new Error(`第 ${i + 1} 筆學生識別資料缺漏或 ID 重複`);
            }
            ids.add(s.id);
            exams.forEach(exam => {
                const result = s[exam];
                if (!result || !Object.keys(result).length) return;
                if (!data.exams.includes(exam)) throw new Error(`第 ${i + 1} 筆考試未列入設定：${exam}`);
                ['總積分', '作'].forEach(key => {
                    const value = result[key];
                    if (value !== null && value !== undefined && String(value).trim() !== '' && (score(value) === null || score(value) < 0)) {
                        throw new Error(`第 ${i + 1} 筆 ${exam} ${key} 不是有效成績`);
                    }
                });
                const essay = score(result.作);
                if (data.essayScale === 'grade6' && essay !== null && (!Number.isInteger(essay) || essay > 6 || essay < 0)) {
                    throw new Error(`第 ${i + 1} 筆 ${exam} 作文不是0至6級分`);
                }
                subjects.forEach(key => {
                    // 舊資料以「0」標示缺少等第，保留原值但不計入等第分布。
                    if (result[key] && String(result[key]) !== '0' && !['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C'].includes(String(result[key]).replace(/\s/g, '').toUpperCase())) {
                        throw new Error(`第 ${i + 1} 筆 ${exam} ${key} 等第不正確`);
                    }
                });
            });
        });
        return data;
    }
    function summary(students, exam) {
        const values = students.map(s => score(s[exam]?.總積分)).filter(v => v !== null);
        return { count: values.length, average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null };
    }
    function essayGradeFromPoints(value) {
        const points = score(value);
        if (points === null) return null;
        const mapping = {0:0, 0.1:1, 0.2:2, 0.4:3, 0.6:4, 0.8:5, 1:6};
        if (!Object.prototype.hasOwnProperty.call(mapping,points)) throw new Error('作文積分無法換算');
        return mapping[points];
    }
    const api = { exams, score, validate, summary, essayGradeFromPoints };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.ScoreData = api;
})(typeof window !== 'undefined' ? window : globalThis);
