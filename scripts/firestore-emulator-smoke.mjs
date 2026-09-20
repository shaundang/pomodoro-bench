const base = 'http://127.0.0.1:8080/v1/projects/pomodoro-bench/databases/(default)/documents';
const path = `${base}/syncs/ci-smoke`;
const body = {
  fields: {
    skillMarks: { mapValue: { fields: { Work: { integerValue: '300' } } } }
  }
};

const write = await fetch(path, {
  method: 'PATCH',
  headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
if (!write.ok) throw new Error(`Firestore emulator write failed: ${write.status} ${await write.text()}`);

const read = await fetch(path, { headers: { Authorization: 'Bearer owner' } });
if (!read.ok) throw new Error(`Firestore emulator read failed: ${read.status} ${await read.text()}`);
const document = await read.json();
const value = document.fields?.skillMarks?.mapValue?.fields?.Work?.integerValue;
if (value !== '300') throw new Error(`Expected skillMarks.Work=300, got ${value}`);
console.log('Firestore emulator smoke test passed: skillMarks.Work=300');
