/**
 * GPA & CGPA Calculation Engine
 * 
 * Formula:
 * - Quality Points = Summation of (Credits × GradePoint)
 * - Earned Credits = Summation of Credits for PASSED courses (Grade Point > 0). Failed/Arrear courses (U, RA, SA, AB, W with 0 points) do NOT add to earned credits!
 * - Semester GPA = (Total Quality Points in Semester) / (Total Earned Credits in Semester)
 * - Cumulative CGPA = (Sum of Quality Points across all Semesters) / (Sum of Earned Credits across all Semesters)
 */

export function calculateSemesterStats(courses, gradePointsMap) {
  let totalQualityPoints = 0;
  let totalCredits = 0; // Earned credits used in GPA denominator (only gradePoint > 0)
  let totalAllCredits = 0;
  let gradedCount = 0;
  let passedCount = 0;
  let arrearCount = 0;

  for (const course of courses) {
    const credits = parseFloat(course.credits) || 0;
    totalAllCredits += credits;

    const grade = (course.grade || '').trim().toUpperCase();

    if (grade && grade in gradePointsMap && credits > 0) {
      const point = parseFloat(gradePointsMap[grade]);
      if (!isNaN(point)) {
        totalQualityPoints += credits * point;
        gradedCount++;

        // Only count credits towards GPA denominator if grade point > 0 (Passed course)
        // Courses with 0 points (U, RA, AB, SA, W) do NOT add to earned credits!
        if (point > 0) {
          totalCredits += credits;
          passedCount++;
        } else {
          arrearCount++;
        }
      }
    }
  }

  const gpa = totalCredits > 0 ? totalQualityPoints / totalCredits : 0;

  return {
    gpa: parseFloat(gpa.toFixed(2)),
    gpaRaw: gpa,
    totalQualityPoints: parseFloat(totalQualityPoints.toFixed(2)),
    totalCredits: totalCredits, // Earned credits (passed courses)
    totalAllCredits: totalAllCredits, // All registered credits
    gradedCount,
    passedCount,
    arrearCount
  };
}

export function calculateOverallCGPA(semestersWithStats) {
  let grandTotalPoints = 0;
  let grandTotalEarnedCredits = 0;
  let grandTotalAllCredits = 0;
  let totalCourses = 0;
  let totalArrears = 0;
  let gradeCounts = {};

  for (const sem of semestersWithStats) {
    grandTotalPoints += sem.totalQualityPoints || 0;
    grandTotalEarnedCredits += sem.totalCredits || 0;
    grandTotalAllCredits += sem.totalAllCredits || 0;
    totalArrears += sem.arrearCount || 0;

    for (const c of sem.courses) {
      totalCourses++;
      const g = (c.grade || '').trim().toUpperCase();
      if (g) {
        gradeCounts[g] = (gradeCounts[g] || 0) + 1;
      }
    }
  }

  const cgpa = grandTotalEarnedCredits > 0 ? grandTotalPoints / grandTotalEarnedCredits : 0;

  return {
    cgpa: parseFloat(cgpa.toFixed(2)),
    cgpaRaw: cgpa,
    totalQualityPoints: parseFloat(grandTotalPoints.toFixed(2)),
    totalCredits: grandTotalEarnedCredits,
    totalAllCredits: grandTotalAllCredits,
    totalCourses,
    totalArrears,
    gradeCounts
  };
}

export function calculateRequiredGpa(currentEarnedCredits, currentCgpa, targetCgpa, upcomingCredits, maxGpa) {
  if (upcomingCredits <= 0) return null;
  const currentQP = currentEarnedCredits * currentCgpa;
  const targetQP = (currentEarnedCredits + upcomingCredits) * targetCgpa;
  const neededQP = targetQP - currentQP;
  const requiredGpa = neededQP / upcomingCredits;

  return {
    requiredGpa: parseFloat(requiredGpa.toFixed(2)),
    isPossible: requiredGpa <= maxGpa && requiredGpa >= 0,
    neededQualityPoints: parseFloat(neededQP.toFixed(2))
  };
}
