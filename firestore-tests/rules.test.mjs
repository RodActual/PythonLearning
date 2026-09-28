// Security rule tests for firestore.rules. Run with: npm test (starts the Firestore emulator).
import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { arrayUnion, deleteDoc, deleteField, doc, FieldPath, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-python-learning',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
const progress = (uid, owner = uid) => doc(db(uid), 'user_progress', owner);

/** Writes a document directly, bypassing the rules (test setup). */
const seed = (owner, data) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'user_progress', owner), data));

test('owner can save a completed step the way the app does', async () => {
  await assertSucceeds(
    setDoc(progress('alice'), { version: 2, done: { 'lesson-01': arrayUnion('s01') } }, { merge: true }),
  );
  await assertSucceeds(
    setDoc(
      progress('alice'),
      { version: 2, done: { 'lesson-01': arrayUnion('s02') }, first_try_ids: { 'lesson-01': arrayUnion('s02') } },
      { merge: true },
    ),
  );
});

test('owner can read their own progress', async () => {
  await seed('alice', { version: 2, done: {}, first_try_ids: {} });
  await assertSucceeds(getDoc(progress('alice')));
});

test('other users and signed-out visitors cannot read or write it', async () => {
  await seed('alice', { version: 2, done: {}, first_try_ids: {} });
  await assertFails(getDoc(progress('bob', 'alice')));
  await assertFails(setDoc(progress('bob', 'alice'), { version: 2, done: {} }, { merge: true }));
  await assertFails(getDoc(progress(null, 'alice')));
  await assertFails(setDoc(progress(null, 'alice'), { version: 2 }));
});

test('owner can reset one lesson and reset everything', async () => {
  await seed('alice', { version: 2, done: { 'lesson-01': ['s01'] }, first_try_ids: { 'lesson-01': ['s01'] } });
  await assertSucceeds(
    updateDoc(progress('alice'), new FieldPath('done', 'lesson-01'), deleteField(), new FieldPath('first_try_ids', 'lesson-01'), deleteField()),
  );
  await assertSucceeds(setDoc(progress('alice'), { version: 2, done: {}, first_try_ids: {} }));
});

test('an old-format document can be migrated in place', async () => {
  await seed('alice', { completed_steps: { 'lesson-01': 3 }, first_try: { 'lesson-01': [1] } });
  await assertSucceeds(
    setDoc(progress('alice'), { version: 2, done: { 'lesson-01': ['s01', 's02', 's03'] }, first_try_ids: { 'lesson-01': ['s02'] } }, { merge: true }),
  );
});

test('unknown fields are rejected', async () => {
  await assertFails(setDoc(progress('alice'), { version: 2, done: {}, isAdmin: true }));
});

test('wrong field types are rejected', async () => {
  await assertFails(setDoc(progress('alice'), { version: '2' }));
  await assertFails(setDoc(progress('alice'), { version: 2, done: ['s01'] }));
  await assertFails(setDoc(progress('alice'), { version: 2, first_try_ids: 'all of them' }));
});

test('oversized progress maps are rejected', async () => {
  const huge = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`lesson-${i}`, ['s01']]));
  await assertFails(setDoc(progress('alice'), { version: 2, done: huge }));
});

test('progress documents cannot be deleted', async () => {
  await seed('alice', { version: 2, done: {} });
  await assertFails(deleteDoc(progress('alice')));
});

test('everything else is closed', async () => {
  await assertFails(getDoc(doc(db('alice'), 'lessons', 'lesson-01')));
  await assertFails(setDoc(doc(db('alice'), 'anything', 'x'), { a: 1 }));
});
