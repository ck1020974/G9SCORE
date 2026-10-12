const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../cohorts.js'), 'utf8');

test('同頁的並行及重複資料請求只下載一次', async () => {
    let calls = 0;
    const context = vm.createContext({fetch: async () => {
        calls++;
        return {ok:true, json:async () => ({students:[{id:'student-1'}]})};
    }});
    vm.runInContext(source, context);
    const results = await Promise.all([context.loadJson('data/115.json'), context.loadJson('data/115.json')]);
    await context.loadJson('data/115.json');
    assert.equal(calls, 1);
    assert.equal(results[0].students[0].id, 'student-1');
    assert.deepEqual(results[0], results[1]);
});

test('失敗的下載不保留於快取，下次可重新取得資料', async () => {
    let calls = 0;
    const context = vm.createContext({fetch: async () => {
        calls++;
        return {ok:calls > 1, json:async () => ({ready:true})};
    }});
    vm.runInContext(source, context);
    await assert.rejects(context.loadJson('data/history.json'), /無法讀取/);
    assert.equal((await context.loadJson('data/history.json')).ready, true);
    assert.equal(calls, 2);
});

test('不同資料檔分開快取，重新載入頁面可取得新資料', async () => {
    let calls = 0;
    const fetch = async url => ({ok:true, json:async () => ({url,version:++calls})});
    const first = vm.createContext({fetch});
    vm.runInContext(source, first);
    assert.equal((await first.loadJson('data/114.json')).version, 1);
    assert.equal((await first.loadJson('data/115.json')).version, 2);
    const reloaded = vm.createContext({fetch});
    vm.runInContext(source, reloaded);
    assert.equal((await reloaded.loadJson('data/114.json')).version, 3);
});
