/**
 * Firebase Firestore Service for Public Course Templates
 * Project ID: cgpa-c2cae
 * Path: /templates/{template_id}
 *
 * Uses the official Firestore SDK instead of raw REST fetches. The SDK keeps a persistent
 * connection open, which avoids paying a full TLS+HTTP handshake on every single call — that
 * per-request overhead (not payload size) was the actual cause of ~2s template-search lag
 * measured with raw REST. The SDK import itself is dynamic (see getDb() below), so it's not
 * in the main bundle — it only loads the first time a template-cloud feature is actually used.
 */

const firebaseConfig = {
  apiKey: 'AIzaSyApJuqff-sxHnpsw4ZE-2q_ap0ctgAy5-0',
  authDomain: 'cgpa-c2cae.firebaseapp.com',
  projectId: 'cgpa-c2cae',
  storageBucket: 'cgpa-c2cae.firebasestorage.app',
  messagingSenderId: '982401131143',
  appId: '1:982401131143:web:7380ea51489c0cd6c78e22'
};

let dbPromise = null;
let firestoreModule = null;

// Lazy-init: firebase/app and firebase/firestore are only fetched the first time this runs.
function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const [{ initializeApp }, fs] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore')
      ]);
      firestoreModule = fs;
      const app = initializeApp(firebaseConfig);
      return fs.getFirestore(app);
    })();
  }
  return dbPromise;
}

/**
 * Start downloading the Firestore SDK chunk and opening its connection in the background,
 * before the user has opened any template-cloud UI. The ~1-2s felt on first opening the
 * Template Manager isn't payload size (confirmed — the whole catalog is a few KB) — it's the
 * one-time cost of fetching+parsing the lazy-loaded SDK chunk plus Firestore's realtime
 * channel handshake on a cold connection. Neither of those can be made faster, but they CAN
 * be moved off the critical path: call this once, early (e.g. after initial page idle), so
 * that cost is already paid by the time the user actually clicks "Templates". Safe to call
 * multiple times — getDb() caches the one in-flight/resolved promise.
 */
export function prewarmFirestore() {
  getDb().catch(() => {});
}

// List-view shape: ONLY the already-separate top-level metadata fields (name, institution,
// branch, year, counts). Deliberately does NOT touch/parse `template_detials` — that field
// holds the full semesters+courses JSON, which the list cards never display and which can get
// large as a catalog grows. Parsing it for every row in the list was wasted CPU work that
// scaled with the WHOLE catalog's content size, not just what's shown. Full schema is only
// fetched (and parsed) on demand, per-template, via fetchSingleCloudTemplate() — see below.
function mapDocToTemplateMeta(docId, data) {
  return {
    docId,
    id: docId,
    name: data.name || docId,
    institution: data.institution || '',
    branch: data.branch || '',
    year: data.year || '',
    maxGpa: data.maxGpa !== undefined ? Number(data.maxGpa) : 10,
    semestersCount: data.semestersCount !== undefined ? Number(data.semestersCount) : 0,
    coursesCount: data.coursesCount !== undefined ? Number(data.coursesCount) : 0,
    createdAt: data.createdAt || '',
    description: data.description || 'University Course Scheme'
  };
}

// Full-schema shape: parses `template_detials` for the ONE template actually being loaded or
// edited. Used by fetchSingleCloudTemplate() only — never for the list.
function mapDocToFullTemplate(docId, data) {
  let details = {};
  const rawJsonStr = data.template_detials || data.template_details || '';
  if (rawJsonStr) {
    try {
      details = JSON.parse(rawJsonStr);
    } catch (e) {
      console.error(`Error parsing template payload for doc ${docId}`, e);
    }
  }

  const meta = mapDocToTemplateMeta(docId, data);
  return {
    ...meta,
    id: details.id || docId,
    institution: meta.institution || details.institution || details.instituion || '',
    branch: meta.branch || details.branch || '',
    year: meta.year || details.year || '',
    maxGpa: data.maxGpa !== undefined ? Number(data.maxGpa) : (details.maxGpa || 10),
    semestersCount: data.semestersCount !== undefined ? Number(data.semestersCount) : (details.semesters || []).length,
    coursesCount: data.coursesCount !== undefined
      ? Number(data.coursesCount)
      : (details.semesters || []).reduce((sum, s) => sum + (s.courses || []).length, 0),
    passcodeHash: data.passcodeHash || '',
    description: details.description || data.description || 'University Course Scheme',
    gradePoints: details.gradePoints || {},
    semesters: details.semesters || []
  };
}

export async function fetchOnlineTemplates(searchQuery = '') {
  try {
    const db = await getDb();
    const { collection, getDocs, query, limit } = firestoreModule;

    const snap = await getDocs(query(collection(db, 'templates'), limit(50)));

    const templates = snap.docs
      // Soft-deleted templates (passcode-verified delete sets deleted: true via a rules-checked
      // update, since a Firestore DELETE request carries no body for rules to check a passcode
      // against) never show up in listings.
      .filter(d => !d.data().deleted)
      .map(d => mapDocToTemplateMeta(d.id, d.data()));

    // Client-side instant filter across name, institution, branch, year, docId — Firestore
    // has no native substring/full-text search, so this stays client-side.
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return templates.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.institution || '').toLowerCase().includes(q) ||
        (t.branch || '').toLowerCase().includes(q) ||
        (t.year || '').toLowerCase().includes(q) ||
        (t.docId || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q)
      );
    }

    return templates;
  } catch (err) {
    console.error('Error fetching online templates from Firestore:', err);
    return [];
  }
}

/**
 * SHA-256 Client-side Cryptographic Passcode Hasher
 */
export async function hashPasscode(passcode) {
  if (!passcode) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch a single template by Document ID (e.g. TMP-pt2023)
 */
export async function fetchSingleCloudTemplate(docId) {
  if (!docId) return null;
  const cleanId = docId.trim();

  try {
    const db = await getDb();
    const { doc, getDoc } = firestoreModule;

    const snap = await getDoc(doc(db, 'templates', cleanId));
    if (!snap.exists()) return null;

    const data = snap.data();
    if (data.deleted) return null;

    return mapDocToFullTemplate(snap.id, data);
  } catch (err) {
    console.error(`Error fetching single template "${cleanId}":`, err);
    return null;
  }
}

/**
 * Check if a Template ID exists and return stored passcodeHash
 */
export async function checkTemplateIdExists(docId) {
  if (!docId) return { exists: false, passcodeHash: null };
  const cleanId = docId.trim();

  try {
    const db = await getDb();
    const { doc, getDoc } = firestoreModule;

    const snap = await getDoc(doc(db, 'templates', cleanId));
    if (!snap.exists()) return { exists: false, passcodeHash: null };

    const data = snap.data();
    // A soft-deleted template is treated as not-existing — its ID becomes reusable.
    if (data.deleted) return { exists: false, passcodeHash: null };

    return { exists: true, passcodeHash: data.passcodeHash || null };
  } catch (e) {
    return { exists: false, passcodeHash: null };
  }
}

/**
 * Publish or Update a Cloud Template with Secret Passcode Protection
 */
export async function publishCloudTemplate({ docId, metadata, payload, secretPasscode }) {
  if (!docId || !docId.trim()) throw new Error('Template ID is required.');
  if (!secretPasscode || secretPasscode.trim().length < 4) throw new Error('Secret Passcode must be at least 4 characters.');

  const cleanId = docId.trim();
  const providedHash = await hashPasscode(secretPasscode.trim());

  // Check if document already exists
  const existing = await checkTemplateIdExists(cleanId);
  if (existing.exists) {
    if (existing.passcodeHash && existing.passcodeHash !== providedHash) {
      throw new Error('Incorrect Secret Passcode! This Template ID is owned by another publisher.');
    }
  }

  const semsCount = (payload.semesters || []).length;
  const coursesCount = (payload.semesters || []).reduce((sum, s) => sum + (s.courses || []).length, 0);

  const docData = {
    name: metadata.name || payload.name || cleanId,
    institution: metadata.institution || '',
    branch: metadata.branch || '',
    year: String(metadata.year || ''),
    maxGpa: Number(payload.maxGpa || 10),
    semestersCount: semsCount,
    coursesCount: coursesCount,
    // Stored as its own top-level field (not just buried in template_detials) so the
    // metadata-only list fetch can show it without parsing the full semesters/courses blob.
    description: payload.description || metadata.description || 'University Course Scheme',
    passcodeHash: providedHash,
    createdAt: new Date().toISOString(),
    template_detials: JSON.stringify(payload)
  };

  try {
    const db = await getDb();
    const { doc, setDoc } = firestoreModule;
    // Full-replace write (not merge) — matches firestore.rules' isValidTemplate(), which
    // expects the complete expected shape on every write, same behavior as the old REST PATCH.
    await setDoc(doc(db, 'templates', cleanId), docData);
  } catch (err) {
    throw new Error(err.message || 'Failed to publish to Firestore.');
  }

  return { success: true, docId: cleanId, isUpdate: existing.exists };
}

/**
 * Soft-Delete a Cloud Template by ID with Passcode Verification
 *
 * This is NOT a real Firestore delete. A Firestore delete carries no document body, so
 * firestore.rules has nothing to check a passcode against on a real delete — that path is
 * permanently disabled (`allow delete: if false`) to stop anyone bypassing the app and
 * deleting templates directly. Instead this performs a passcode-checked UPDATE that sets
 * `deleted: true`, which rules DO validate (the resubmitted passcodeHash must match what's
 * already stored). Soft-deleted templates are filtered out of listings and single-template
 * fetches, and their ID becomes available for reuse.
 */
export async function deleteCloudTemplate({ docId, secretPasscode }) {
  if (!docId || !docId.trim()) throw new Error('Template ID is required.');
  if (!secretPasscode || !secretPasscode.trim()) throw new Error('Secret Passcode is required to delete.');

  const cleanId = docId.trim();
  const providedHash = await hashPasscode(secretPasscode.trim());

  const db = await getDb();
  const { doc, getDoc, setDoc } = firestoreModule;

  const docRef = doc(db, 'templates', cleanId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`Template "${cleanId}" does not exist on cloud.`);
  }

  const existingData = snap.data();

  if (existingData.deleted) {
    throw new Error(`Template "${cleanId}" does not exist on cloud.`);
  }

  if (existingData.passcodeHash && existingData.passcodeHash !== providedHash) {
    throw new Error('Incorrect Secret Passcode! You do not have permission to delete this template.');
  }

  // Full-replace write carrying every existing field forward unchanged, plus deleted: true —
  // matches firestore.rules' isValidTemplate() (requires the complete expected shape) and its
  // passcodeHash-must-match-existing check.
  try {
    await setDoc(docRef, { ...existingData, deleted: true });
  } catch (err) {
    throw new Error(err.message || 'Failed to delete template.');
  }

  return { success: true, docId: cleanId };
}
