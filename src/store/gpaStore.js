import { writable, derived } from 'svelte/store';
import { DEFAULT_GRADE_POINTS, INITIAL_SEMESTERS } from '../types/defaults.js';
import { calculateSemesterStats, calculateOverallCGPA } from '../utils/gpaCalculator.js';

const STORAGE_KEY = 'neogpa_workspace_v2';

function getDefaultWorkspace() {
  return {
    templateId: 'custom-template',
    templateName: 'My Academic Scheme',
    templateDescription: '',
    maxGpa: 10,
    gradePoints: { ...DEFAULT_GRADE_POINTS },
    semesters: JSON.parse(JSON.stringify(INITIAL_SEMESTERS))
  };
}

function getInitialWorkspace() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading workspace state', e);
    }
  }
  return getDefaultWorkspace();
}

function createGpaStore() {
  const { subscribe, set, update } = writable(getInitialWorkspace());

  const persist = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('LocalStorage error', e);
    }
    return state;
  };

  return {
    subscribe,
    set: (state) => set(persist(state)),
    // Load template or full workspace backup (supports both clean templates & full data with grades!)
    loadTemplate: (template) => {
      update(state => {
        const isFullBackup = template.exportType === 'full_workspace_backup' || (template.semesters || []).some(s => (s.courses || []).some(c => c.grade));

        const newSemesters = (template.semesters || []).map((sem, sIdx) => ({
          id: sem.id ? String(sem.id) : `sem-${Date.now()}-${sIdx + 1}`,
          name: sem.name || `Semester ${sIdx + 1}`,
          courses: (sem.courses || []).map((c, cIdx) => ({
            id: c.id || `c-${Date.now()}-${sIdx}-${cIdx}`,
            code: c.code || '',
            name: c.name || '',
            credits: c.credits !== undefined ? Number(c.credits) : 3,
            grade: isFullBackup ? (c.grade || '') : ''
          }))
        }));

        const newState = {
          ...state,
          templateId: template.id || template.templateId || state.templateId,
          templateName: template.name || template.templateName || state.templateName,
          templateDescription: template.description || template.templateDescription || '',
          maxGpa: Number(template.maxGpa) || state.maxGpa,
          gradePoints: template.gradePoints || template.gradingScale || state.gradePoints,
          semesters: newSemesters.length > 0 ? newSemesters : state.semesters
        };
        return persist(newState);
      });
    },
    // Update Scale settings
    updateScaleSettings: (maxGpa, gradePoints) => {
      update(state => {
        const newState = {
          ...state,
          maxGpa: Number(maxGpa) || 10,
          gradePoints: { ...gradePoints }
        };
        return persist(newState);
      });
    },
    // Update Template Details
    updateTemplateMeta: (name, id, desc) => {
      update(state => {
        const newState = {
          ...state,
          templateName: name,
          templateId: id,
          templateDescription: desc
        };
        return persist(newState);
      });
    },
    // Add Semester
    addSemester: (customName) => {
      update(state => {
        const semNum = state.semesters.length + 1;
        const newSem = {
          id: `sem-${Date.now().toString(36)}`,
          name: customName || `Semester ${semNum}`,
          courses: [
            { id: `c-${Date.now()}-1`, code: '', name: '', credits: 3, grade: '' },
            { id: `c-${Date.now()}-2`, code: '', name: '', credits: 3, grade: '' },
            { id: `c-${Date.now()}-3`, code: '', name: '', credits: 3, grade: '' }
          ]
        };
        const newState = { ...state, semesters: [...state.semesters, newSem] };
        return persist(newState);
      });
    },
    // Rename Semester
    renameSemester: (semesterId, newName) => {
      update(state => {
        const newState = {
          ...state,
          semesters: state.semesters.map(s => s.id === semesterId ? { ...s, name: newName } : s)
        };
        return persist(newState);
      });
    },
    // Remove Semester
    removeSemester: (semesterId) => {
      update(state => {
        const newState = {
          ...state,
          semesters: state.semesters.filter(s => s.id !== semesterId)
        };
        return persist(newState);
      });
    },
    // Add Course Row at end
    addCourse: (semesterId, courseData = {}) => {
      update(state => {
        const newCourse = {
          id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          code: courseData.code || '',
          name: courseData.name || '',
          credits: courseData.credits !== undefined ? courseData.credits : 3,
          grade: courseData.grade || ''
        };

        const newState = {
          ...state,
          semesters: state.semesters.map(s => {
            if (s.id === semesterId) {
              return { ...s, courses: [...s.courses, newCourse] };
            }
            return s;
          })
        };
        return persist(newState);
      });
    },
    // Insert Course Row immediately after targetCourseId (Ctrl+Enter)
    insertCourseAfter: (semesterId, targetCourseId) => {
      update(state => {
        const newCourse = {
          id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          code: '',
          name: '',
          credits: 3,
          grade: ''
        };

        const newState = {
          ...state,
          semesters: state.semesters.map(s => {
            if (s.id === semesterId) {
              const targetIdx = s.courses.findIndex(c => c.id === targetCourseId);
              if (targetIdx >= 0) {
                const updatedCourses = [...s.courses];
                updatedCourses.splice(targetIdx + 1, 0, newCourse);
                return { ...s, courses: updatedCourses };
              }
              return { ...s, courses: [...s.courses, newCourse] };
            }
            return s;
          })
        };
        return persist(newState);
      });
    },
    // Rearrange/Move Course Up or Down
    moveCourse: (semesterId, courseId, direction) => {
      update(state => {
        const newState = {
          ...state,
          semesters: state.semesters.map(s => {
            if (s.id === semesterId) {
              const idx = s.courses.findIndex(c => c.id === courseId);
              if (idx === -1) return s;
              const newIdx = direction === 'up' ? idx - 1 : idx + 1;
              if (newIdx < 0 || newIdx >= s.courses.length) return s;

              const courses = [...s.courses];
              const temp = courses[idx];
              courses[idx] = courses[newIdx];
              courses[newIdx] = temp;
              return { ...s, courses };
            }
            return s;
          })
        };
        return persist(newState);
      });
    },
    // Update Course Row Field
    updateCourse: (semesterId, courseId, field, value) => {
      update(state => {
        const newState = {
          ...state,
          semesters: state.semesters.map(s => {
            if (s.id === semesterId) {
              return {
                ...s,
                courses: s.courses.map(c => {
                  if (c.id === courseId) {
                    return { ...c, [field]: value };
                  }
                  return c;
                })
              };
            }
            return s;
          })
        };
        return persist(newState);
      });
    },
    // Remove Course Row
    removeCourse: (semesterId, courseId) => {
      update(state => {
        const newState = {
          ...state,
          semesters: state.semesters.map(s => {
            if (s.id === semesterId) {
              return {
                ...s,
                courses: s.courses.filter(c => c.id !== courseId)
              };
            }
            return s;
          })
        };
        return persist(newState);
      });
    },
    // Batch Insert Courses
    batchInsertCourses: (semesterId, coursesList, options = { append: true }) => {
      update(state => {
        let semesters = [...state.semesters];
        const semExists = semesters.some(s => s.id === semesterId);

        if (!semExists) {
          const newSem = {
            id: semesterId || `sem-${Date.now().toString(36)}`,
            name: `Scanned Marksheet (${coursesList.length} Courses)`,
            courses: coursesList
          };
          semesters.push(newSem);
        } else {
          semesters = semesters.map(s => {
            if (s.id === semesterId) {
              const existing = options.append ? s.courses.filter(c => c.code || c.name) : [];
              return {
                ...s,
                courses: [...existing, ...coursesList]
              };
            }
            return s;
          });
        }

        const newState = { ...state, semesters };
        return persist(newState);
      });
    },
    // Reset to default
    resetAll: () => {
      const fresh = getDefaultWorkspace();
      set(persist(fresh));
    }
  };
}

export const gpaStore = createGpaStore();

export const semestersWithStats = derived(gpaStore, ($store) => {
  return $store.semesters.map(sem => {
    const stats = calculateSemesterStats(sem.courses, $store.gradePoints);
    return {
      ...sem,
      sgpa: stats.gpa,
      totalQualityPoints: stats.totalQualityPoints,
      totalCredits: stats.totalCredits,
      totalAllCredits: stats.totalAllCredits,
      gradedCount: stats.gradedCount,
      arrearCount: stats.arrearCount
    };
  });
});

export const overallCgpa = derived(semestersWithStats, ($semsWithStats) => {
  return calculateOverallCGPA($semsWithStats);
});
