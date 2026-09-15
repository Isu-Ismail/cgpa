/**
 * Firebase Firestore Service for Public Course Templates
 * Project ID: cgpa-c2cae
 * Path: /templates/{template_id}
 */

const PROJECT_ID = 'cgpa-c2cae';
const FIRESTORE_TEMPLATES_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/templates`;

export async function fetchOnlineTemplates(searchQuery = '') {
  try {
    const res = await fetch(`${FIRESTORE_TEMPLATES_URL}?pageSize=50`);
    if (!res.ok) {
      throw new Error(`Firestore HTTP ${res.status}`);
    }

    const data = await res.json();
    const documents = data.documents || [];

    const templates = documents.map(doc => {
      const docPath = doc.name || '';
      const docId = docPath.split('/').pop();
      const fields = doc.fields || {};

      // Parse inner template JSON details
      let details = {};
      const rawJsonStr = fields.template_detials?.stringValue || fields.template_details?.stringValue || '';
      if (rawJsonStr) {
        try {
          details = JSON.parse(rawJsonStr);
        } catch (e) {
          console.error(`Error parsing template payload for doc ${docId}`, e);
        }
      }

      // Top-level fields with fallback to parsed payload
      const name = fields.name?.stringValue || details.name || docId;
      const institution = fields.institution?.stringValue || details.institution || details.instituion || '';
      const branch = fields.branch?.stringValue || details.branch || '';
      const year = fields.year?.stringValue || details.year || '';
      
      const maxGpa = fields.maxGpa?.integerValue !== undefined 
        ? Number(fields.maxGpa.integerValue) 
        : (fields.maxGpa?.doubleValue !== undefined ? Number(fields.maxGpa.doubleValue) : (details.maxGpa || 10));

      const semestersCount = fields.semestersCount?.integerValue !== undefined 
        ? Number(fields.semestersCount.integerValue) 
        : (details.semesters || []).length;

      const coursesCount = fields.coursesCount?.integerValue !== undefined 
        ? Number(fields.coursesCount.integerValue) 
        : (details.semesters || []).reduce((sum, s) => sum + (s.courses || []).length, 0);

      const createdAt = fields.createdAt?.stringValue || details.createdAt || '';

      return {
        docId,
        id: details.id || docId,
        name,
        institution,
        branch,
        year,
        maxGpa,
        semestersCount,
        coursesCount,
        createdAt,
        description: details.description || fields.description?.stringValue || 'University Course Scheme',
        gradePoints: details.gradePoints || {},
        semesters: details.semesters || []
      };
    });

    // Client-side instant filter across name, institution, branch, year, docId
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
    const res = await fetch(`${FIRESTORE_TEMPLATES_URL}/${cleanId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    }

    const doc = await res.json();
    const docPath = doc.name || '';
    const actualDocId = docPath.split('/').pop() || cleanId;
    const fields = doc.fields || {};

    let details = {};
    const rawJsonStr = fields.template_detials?.stringValue || fields.template_details?.stringValue || '';
    if (rawJsonStr) {
      try { details = JSON.parse(rawJsonStr); } catch (e) {}
    }

    const name = fields.name?.stringValue || details.name || actualDocId;
    const institution = fields.institution?.stringValue || details.institution || details.instituion || '';
    const branch = fields.branch?.stringValue || details.branch || '';
    const year = fields.year?.stringValue || details.year || '';
    const maxGpa = fields.maxGpa?.integerValue !== undefined 
      ? Number(fields.maxGpa.integerValue) 
      : (details.maxGpa || 10);
    const semestersCount = fields.semestersCount?.integerValue !== undefined 
      ? Number(fields.semestersCount.integerValue) 
      : (details.semesters || []).length;
    const coursesCount = fields.coursesCount?.integerValue !== undefined 
      ? Number(fields.coursesCount.integerValue) 
      : (details.semesters || []).reduce((sum, s) => sum + (s.courses || []).length, 0);

    return {
      docId: actualDocId,
      id: details.id || actualDocId,
      name,
      institution,
      branch,
      year,
      maxGpa,
      semestersCount,
      coursesCount,
      createdAt: fields.createdAt?.stringValue || '',
      passcodeHash: fields.passcodeHash?.stringValue || '',
      description: details.description || fields.description?.stringValue || 'University Course Scheme',
      gradePoints: details.gradePoints || {},
      semesters: details.semesters || []
    };
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
    const res = await fetch(`${FIRESTORE_TEMPLATES_URL}/${cleanId}`);
    if (res.status === 404) return { exists: false, passcodeHash: null };
    if (!res.ok) return { exists: false, passcodeHash: null };

    const doc = await res.json();
    const fields = doc.fields || {};
    const passcodeHash = fields.passcodeHash?.stringValue || null;

    return { exists: true, passcodeHash };
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

  const requestBody = {
    fields: {
      name: { stringValue: metadata.name || payload.name || cleanId },
      institution: { stringValue: metadata.institution || '' },
      branch: { stringValue: metadata.branch || '' },
      year: { stringValue: String(metadata.year || '') },
      maxGpa: { integerValue: Number(payload.maxGpa || 10) },
      semestersCount: { integerValue: semsCount },
      coursesCount: { integerValue: coursesCount },
      passcodeHash: { stringValue: providedHash },
      createdAt: { stringValue: new Date().toISOString() },
      template_detials: { stringValue: JSON.stringify(payload) }
    }
  };

  const res = await fetch(`${FIRESTORE_TEMPLATES_URL}/${cleanId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Firestore HTTP ${res.status}`);
  }

  return { success: true, docId: cleanId, isUpdate: existing.exists };
}

