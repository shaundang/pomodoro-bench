const base = 'http://127.0.0.1:8080/v1/projects/pomodoro-bench/databases/(default)/documents';
const authBase = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-pomodoro-bench';
const path = `${base}/syncs/ci-smoke`;
const body = {
  fields: {
    skillMarks: { mapValue: { fields: { Work: { integerValue: '300' } } } },
    categories: { arrayValue: { values: [{ stringValue: 'Work' }] } }
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
const category = document.fields?.categories?.arrayValue?.values?.[0]?.stringValue;
if (category !== 'Work') throw new Error(`Expected categories[0]=Work, got ${category}`);

const signup = async (email) => {
  const response = await fetch(authBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'test-password-123', returnSecureToken: true })
  });
  if (!response.ok) throw new Error(`Auth emulator signup failed: ${response.status} ${await response.text()}`);
  return response.json();
};

const firstUser = await signup('ci-owner@example.com');
const secondUser = await signup('ci-other@example.com');
const securedPath = `${base}/syncs/${firstUser.localId}`;
const ownWrite = await fetch(securedPath, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${firstUser.idToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { skillMarks: { mapValue: { fields: { Learning: { integerValue: '120' } } } } } })
});
if (!ownWrite.ok) throw new Error(`Authenticated own write failed: ${ownWrite.status} ${await ownWrite.text()}`);

const otherRead = await fetch(securedPath, { headers: { Authorization: `Bearer ${secondUser.idToken}` } });
if (otherRead.status !== 403) throw new Error(`Expected cross-user read 403, got ${otherRead.status}`);

const anonymousRead = await fetch(securedPath);
if (anonymousRead.status !== 403) throw new Error(`Expected anonymous read 403, got ${anonymousRead.status}`);

const eventPath = `${securedPath}/recommendationEvents/event-1`;
const eventBody = {
  fields: {
    type: { stringValue: 'applied' },
    runId: { stringValue: 'run-1' },
    focusMinutes: { integerValue: '50' }
  }
};
const ownEventCreate = await fetch(eventPath, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${firstUser.idToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(eventBody)
});
if (!ownEventCreate.ok) throw new Error(`Authenticated event create failed: ${ownEventCreate.status} ${await ownEventCreate.text()}`);

const ownEventRead = await fetch(eventPath, { headers: { Authorization: `Bearer ${firstUser.idToken}` } });
if (!ownEventRead.ok) throw new Error(`Authenticated event read failed: ${ownEventRead.status} ${await ownEventRead.text()}`);

const ownEventUpdate = await fetch(eventPath, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${firstUser.idToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { ...eventBody.fields, type: { stringValue: 'completed' } } })
});
if (ownEventUpdate.status !== 403) throw new Error(`Expected event update 403, got ${ownEventUpdate.status}`);

const ownEventDelete = await fetch(eventPath, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${firstUser.idToken}` }
});
if (ownEventDelete.status !== 403) throw new Error(`Expected event delete 403, got ${ownEventDelete.status}`);

const otherEventCreate = await fetch(`${securedPath}/recommendationEvents/event-2`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${secondUser.idToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(eventBody)
});
if (otherEventCreate.status !== 403) throw new Error(`Expected cross-user event create 403, got ${otherEventCreate.status}`);

console.log('Firestore and Auth emulator security tests passed');
