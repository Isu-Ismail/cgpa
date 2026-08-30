/**
 * Firebase Firestore Service for Online Public Templates
 * Project ID: cgpa-c2cae
 * Collection: templates
 */

const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/cgpa-c2cae/databases/(default)/documents/templates';

export async function fetchOnlineTemplates(searchQuery = '') {
  try {
    const res = await fetch(`${FIRESTORE_BASE_URL}?pageSize=20`);
    if (!res.ok) {
      throw new Error(`Firestore HTTP error! Status: ${res.status}`);
    }

    const data = await res.json();
    const documents = data.documents || [];

    const templates = documents.map(doc => {
      // Document name path: projects/cgpa-c2cae/databases/(default)/documents/templates/aupt202316
      const docPath = doc.name || '';
      const docId = docPath.split('/').pop();
      const fields = doc.fields || {};

      let details = {};
      if (fields.template_detials?.stringValue) {
        try {
          details = JSON.parse(fields.template_detials.stringValue);
        } catch (e) {
          console.error(`Error parsing template_detials string for doc ${docId}`, e);
        }
      } else if (fields.template_details?.stringValue) {
        try {
          details = JSON.parse(fields.template_details.stringValue);
        } catch (e) {
          console.error(`Error parsing template_details string for doc ${docId}`, e);
        }
      }

      return {
        docId,
        id: details.id || docId,
        name: details.name || docId,
        description: details.description || `Anna University Course Scheme (${docId})`,
        maxGpa: Number(details.maxGpa) || 10,
        gradePoints: details.gradePoints || {},
        semesters: details.semesters || []
      };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return templates.filter(t => 
        (t.name || '').toLowerCase().includes(q) ||
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
