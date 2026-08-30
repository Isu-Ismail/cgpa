import { writable } from 'svelte/store';

const STORAGE_KEY = 'neogpa_saved_templates_v2';

function getInitialTemplates() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved templates', e);
    }
  }
  return [];
}

function createTemplateStore() {
  const { subscribe, set, update } = writable(getInitialTemplates());

  return {
    subscribe,
    // Save template to local library (ensuring no student grades are stored in the template config)
    saveTemplate: (template) => {
      update(list => {
        const id = template.id || `tpl-${Date.now().toString(36)}`;
        
        // Strip student grades from template courses
        const cleanSemesters = (template.semesters || []).map((sem, sIdx) => ({
          id: sem.id || (sIdx + 1),
          name: sem.name || `Semester ${sIdx + 1}`,
          courses: (sem.courses || []).map(c => ({
            code: c.code || '',
            name: c.name || '',
            credits: Number(c.credits) || 0
          }))
        }));

        const cleanTemplate = {
          id,
          name: template.name || 'Untitled Template',
          description: template.description || '',
          maxGpa: Number(template.maxGpa) || 10,
          gradePoints: template.gradePoints || template.gradingScale || {},
          semesters: cleanSemesters,
          updatedAt: new Date().toISOString()
        };

        const existingIdx = list.findIndex(t => t.id === id);
        let newList;
        if (existingIdx >= 0) {
          newList = [...list];
          newList[existingIdx] = cleanTemplate;
        } else {
          newList = [cleanTemplate, ...list];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
        return newList;
      });
    },
    // Delete custom template
    deleteTemplate: (id) => {
      update(list => {
        const newList = list.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
        return newList;
      });
    },
    // Import template from JSON string or file
    importFromJson: (jsonStr) => {
      try {
        const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (!parsed.name && !parsed.templateName) {
          throw new Error('Invalid JSON: Missing "name" attribute');
        }

        const cleanSemesters = (parsed.semesters || []).map((sem, sIdx) => ({
          id: sem.id || (sIdx + 1),
          name: sem.name || `Semester ${sIdx + 1}`,
          courses: (sem.courses || []).map(c => ({
            code: c.code || '',
            name: c.name || '',
            credits: Number(c.credits) || 0,
            grade: c.grade || ''
          }))
        }));

        const template = {
          id: parsed.id || parsed.templateId || `tpl-import-${Date.now().toString(36)}`,
          name: parsed.name || parsed.templateName,
          description: parsed.description || parsed.templateDescription || 'Imported course template',
          maxGpa: Number(parsed.maxGpa) || 10,
          gradePoints: parsed.gradePoints || parsed.gradingScale || {},
          semesters: cleanSemesters
        };

        update(list => {
          const filtered = list.filter(t => t.id !== template.id);
          const newList = [template, ...filtered];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
          return newList;
        });

        return template;
      } catch (err) {
        throw new Error(`Failed to import JSON: ${err.message}`);
      }
    },

    // 1. Export Clean Course Template JSON (NO grades included! For sharing with friends)
    exportAsCleanJson: ({ templateId, templateName, templateDesc, maxGpa, gradePoints, semesters }) => {
      const cleanSemesters = semesters.map((sem, sIdx) => ({
        id: sIdx + 1,
        name: sem.name,
        courses: sem.courses.map(c => ({
          code: c.code,
          name: c.name,
          credits: Number(c.credits) || 0
        }))
      }));

      const exportPayload = {
        exportType: 'clean_template',
        id: templateId || `tpl-${Date.now().toString(36)}`,
        name: templateName || 'Academic Course Template',
        description: templateDesc || '',
        maxGpa: Number(maxGpa) || 10,
        gradePoints: gradePoints || {},
        semesters: cleanSemesters
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${(exportPayload.name || 'template').toLowerCase().replace(/\s+/g, '_')}_clean_scheme.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    },

    // 2. Export Full User Workspace JSON (WITH grades included! For personal backup & restore)
    exportAsFullUserDataJson: ({ templateId, templateName, templateDesc, maxGpa, gradePoints, semesters }) => {
      const fullSemesters = semesters.map((sem, sIdx) => ({
        id: sem.id || `sem-${sIdx + 1}`,
        name: sem.name,
        courses: sem.courses.map(c => ({
          code: c.code,
          name: c.name,
          credits: Number(c.credits) || 0,
          grade: c.grade || ''
        }))
      }));

      const exportPayload = {
        exportType: 'full_workspace_backup',
        id: templateId || `backup-${Date.now().toString(36)}`,
        name: templateName || 'My Personal CGPA Backup',
        description: templateDesc || 'Full workspace with student grades preserved',
        maxGpa: Number(maxGpa) || 10,
        gradePoints: gradePoints || {},
        exportedAt: new Date().toISOString(),
        semesters: fullSemesters
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${(exportPayload.name || 'my_cgpa_backup').toLowerCase().replace(/\s+/g, '_')}_with_grades.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };
}

export const templateStore = createTemplateStore();
