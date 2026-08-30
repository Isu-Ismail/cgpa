/**
 * Default Grade Scales and Presets
 */

export const DEFAULT_GRADE_POINTS = {
  "O": 10,
  "S": 10,
  "A+": 9,
  "A": 8,
  "B+": 7,
  "B": 6,
  "C": 5,
  "U": 0,
  "RA": 0,
  "SA": 0,
  "W": 0
};

export const DEFAULT_GRADE_COLORS = {
  "O": "bg-[#4ADE80] text-black",
  "S": "bg-[#4ADE80] text-black",
  "A+": "bg-[#86EFAC] text-black",
  "A": "bg-[#A3E635] text-black",
  "A-": "bg-[#BEF264] text-black",
  "B+": "bg-[#38BDF8] text-black",
  "B": "bg-[#67E8F9] text-black",
  "B-": "bg-[#BAE6FD] text-black",
  "C+": "bg-[#FFDE59] text-black",
  "C": "bg-[#FFF08A] text-black",
  "C-": "bg-[#FEF08A] text-black",
  "D+": "bg-[#FF8E3C] text-black",
  "D": "bg-[#FDBA74] text-black",
  "E": "bg-[#FF70A6] text-black",
  "F": "bg-[#FF4757] text-white",
  "U": "bg-[#FF4757] text-white",
  "RA": "bg-[#FF4757] text-white",
  "SA": "bg-[#71717A] text-white",
  "AB": "bg-[#71717A] text-white",
  "W": "bg-[#CBD5E1] text-black"
};

export const INITIAL_SEMESTERS = [
  {
    id: "sem-1",
    name: "Semester 1",
    courses: [
      { id: "c-1", code: "CS23904", name: "IMAGE PROCESSING", credits: 3, grade: "" },
      { id: "c-2", code: "PR23001", name: "PRODUCTION OF AUTOMOTIVE COMPONENTS", credits: 3, grade: "" },
      { id: "c-3", code: "PR23003", name: "MATERIAL HANDLING AND STORAGE SYSTEMS", credits: 3, grade: "" },
      { id: "c-4", code: "PR23006", name: "DESIGN FOR MANUFACTURING AND ASSEMBLY", credits: 4, grade: "" },
      { id: "c-5", code: "PR23020", name: "MANUFACTURING OF BIOMEDICAL COMPONENTS", credits: 3, grade: "" },
      { id: "c-6", code: "PR23C02", name: "COMPOSITE MATERIALS", credits: 3, grade: "" }
    ]
  }
];
