import { writable, derived } from 'svelte/store';
import { DEFAULT_GRADE_POINTS } from '../types/defaults.js';
import { calculateSemesterStats, calculateOverallCGPA } from '../utils/gpaCalculator.js';

const STORAGE_KEY = 'neogpa_workspace_v2';
const MAX_UNDO_STEPS = 5;

// Undo History Stack (Up to 5 snapshots)
let undoStack = [];

function pushUndoSnapshot(state) {
  try {
    const clone = JSON.parse(JSON.stringify(state));
    undoStack.push(clone);
    if (undoStack.length > MAX_UNDO_STEPS) {
      undoStack.shift(); // Retain max 5 previous states
    }
  } catch (e) {
    console.error('Error creating undo snapshot', e);
  }
}

function getDefaultWorkspace() {
  return {
    templateId: 'custom-template',
    templateName: 'My Academic Scheme',
    templateDescription: '',
    maxGpa: 10,
    gradePoints: { ...DEFAULT_GRADE_POINTS },
    semesters: [] // Reset clears all semesters to show clean landing state
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

  const mutateState = (fn) => {
    update(state => {
      pushUndoSnapshot(state);
      const newState = fn(state);
      return persist(newState);
    });
  };

  return {
    subscribe,
    set: (state) => {
      update(curr => {
        pushUndoSnapshot(curr);
        return persist(state);
      });
    },

    // Undo up to 5 steps back
    undo: () => {
      if (undoStack.length === 0) return false;
      const prevState = undoStack.pop();
      set(persist(prevState));
      return true;
    },

    // Load template or full workspace backup
    loadTemplate: (template) => {
      mutateState(state => {
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

        return {
          ...state,
          templateId: template.id || template.templateId || state.templateId,
          templateName: template.name || template.templateName || state.templateName,
          templateDescription: template.description || template.templateDescription || '',
          maxGpa: Number(template.maxGpa) || state.maxGpa,
          gradePoints: template.gradePoints || template.gradingScale || state.gradePoints,
          semesters: newSemesters.length > 0 ? newSemesters : state.semesters
        };
      });
    },

    // Update Scale settings
    setScaleSettings: (scaleObj) => {
      mutateState(state => ({
        ...state,
        maxGpa: Number(scaleObj.maxGpa) || 10,
        gradePoints: { ...scaleObj.gradePoints }
      }));
    },

    // Update Template Details
    updateTemplateMeta: (name, id, desc) => {
      mutateState(state => ({
        ...state,
        templateName: name,
        templateId: id,
        templateDescription: desc
      }));
    },

    // Add Semester
    addSemester: (customName) => {
      mutateState(state => {
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
        return { ...state, semesters: [...state.semesters, newSem] };
      });
    },

    // Rename Semester
    renameSemester: (semesterId, newName) => {
      mutateState(state => ({
        ...state,
        semesters: state.semesters.map(s => s.id === semesterId ? { ...s, name: newName } : s)
      }));
    },

    // Remove Semester
    removeSemester: (semesterId) => {
      mutateState(state => ({
        ...state,
        semesters: state.semesters.filter(s => s.id !== semesterId)
      }));
    },

    // Add Course Row at end
    addCourse: (semesterId, courseData = {}) => {
      mutateState(state => {
        const newCourse = {
          id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          code: courseData.code || '',
          name: courseData.name || '',
          credits: courseData.credits !== undefined ? courseData.credits : 3,
          grade: courseData.grade || ''
        };

        return {
          ...state,
          semesters: state.semesters.map(s => {
            if (s.id === semesterId) {
              return { ...s, courses: [...s.courses, newCourse] };
            }
            return s;
          })
        };
      });
    },

    // Insert Course Row immediately after targetCourseId (Ctrl+Enter)
    insertCourseAfter: (semesterId, targetCourseId) => {
      mutateState(state => {
        const newCourse = {
          id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          code: '',
          name: '',
          credits: 3,
          grade: ''
        };

        return {
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
      });
    },

    // Rearrange/Move Course Up or Down
    moveCourse: (semesterId, courseId, direction) => {
      mutateState(state => ({
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
      }));
    },

    // Update Course Row Field
    updateCourse: (semesterId, courseId, field, value) => {
      mutateState(state => ({
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
      }));
    },

    // Remove Course Row
    removeCourse: (semesterId, courseId) => {
      mutateState(state => ({
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
      }));
    },

    // Batch Insert Courses
    batchInsertCourses: (semesterId, coursesList, options = { append: true }) => {
      mutateState(state => {
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

        return { ...state, semesters };
      });
    },

    // Reset to default empty state
    resetAll: () => {
      update(curr => {
        pushUndoSnapshot(curr);
        const fresh = getDefaultWorkspace();
        return persist(fresh);
      });
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
