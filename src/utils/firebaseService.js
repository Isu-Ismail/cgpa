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
