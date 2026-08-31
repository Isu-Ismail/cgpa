import { createWorker } from 'tesseract.js';

/**
 * High-Precision Image Preprocessor
 * Enhances contrast and selectively inverts dark magenta grade boxes for student portal tables.
 */
export async function preprocessImage(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 1. High Resolution Scaling (target 2400px width/height for maximum text clarity)
      const scale = Math.max(1, 2400 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Detect dark purple/magenta background cells (Portal table grade column: r > 60, b > 25, g < 75)
        const isDarkMagentaOrDarkBox = (r > 60 && g < 75 && b > 25) || (gray < 110 && r > g + 15);

        if (isDarkMagentaOrDarkBox) {
          // Invert dark box: White grade letters (B+, A, S) become solid black text on light background!
          data[i] = 255 - r;
          data[i + 1] = 255 - g;
          data[i + 2] = 255 - b;
        } else {
          // Crisp contrast enhancement for standard paper marksheets and light portal cells
          const factor = 1.35;
          let adjusted = factor * (gray - 128) + 128;
          adjusted = Math.min(255, Math.max(0, adjusted));

          data[i] = adjusted;
          data[i + 1] = adjusted;
          data[i + 2] = adjusted;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else if (imageSource instanceof File || imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Clean course title to strip unclosed or stray brackets, trailing punctuation, and 1-2 character OCR noise tokens
 */
export function cleanCourseTitle(title) {
  if (!title) return '';

  let cleaned = title.replace(/[|_\\]/g, '').trim();

  // Remove empty brackets like [], [ ], (), ( )
  cleaned = cleaned.replace(/\[\s*\]/g, '').replace(/\(\s*\)/g, '');

  // Remove unclosed '[' or ']' or '(' or ')'
  let openSquare = (cleaned.match(/\[/g) || []).length;
  let closeSquare = (cleaned.match(/\]/g) || []).length;
  if (openSquare > closeSquare) {
    cleaned = cleaned.replace(/\[(?![^]*\])/g, '');
  } else if (closeSquare > openSquare) {
    cleaned = cleaned.replace(/\](?![^]*\[)/g, '');
  }

  let openParen = (cleaned.match(/\(/g) || []).length;
  let closeParen = (cleaned.match(/\)/g) || []).length;
  if (openParen > closeParen) {
    cleaned = cleaned.replace(/\((?![^]*\))/g, '');
  } else if (closeParen > openParen) {
    cleaned = cleaned.replace(/\)(?![^]*\()/g, '');
  }

  // Strip standalone stray brackets and trailing apostrophes/quotes
  cleaned = cleaned.replace(/^[\[\]\(\)'`",.-]+|[\[\]\(\)'`",.-]+$/g, '');

  // Strip trailing 1-2 letter OCR noise tokens (e.g. 's', 'ge', 'Pp', 'ey', 'a0', 'Ss', 'BEN', 'as', 'i')
  // preserving valid Roman numerals (I, II, III, IV, V, VI)
  const validRoman = /^(I|II|III|IV|V|VI)$/i;
  let words = cleaned.split(/\s+/);
  while (words.length > 1) {
    const lastWord = words[words.length - 1];
    if (lastWord.length <= 3 && !validRoman.test(lastWord) && /^[A-Za-z0-9,.'`-]+$/.test(lastWord)) {
      if (lastWord.toLowerCase() !== 'lab' && lastWord.toLowerCase() !== 'ii') {
        words.pop();
        continue;
      }
    }
    break;
  }

  cleaned = words.join(' ').replace(/\s+/g, ' ').replace(/^[,.'`-]+|[,.'`-]+$/g, '').trim();
  return cleaned;
}

/**
 * Perform client-side OCR scan with real-time status callbacks
 */
export async function scanMarksheetImage(imageFile, onProgress = () => {}) {
  try {
    onProgress({ status: 'preprocessing', progress: 0.2, message: 'Enhancing marksheet contrast & inverted grade cells...' });
    const processedImageData = await preprocessImage(imageFile);

    onProgress({ status: 'loading-ocr', progress: 0.45, message: 'Loading neural OCR engine...' });
    
    let worker;
    try {
      worker = await createWorker('eng');
    } catch (e) {
      worker = await createWorker();
    }

    onProgress({ status: 'recognizing', progress: 0.75, message: 'Detecting course codes, titles & grades...' });
    const { data: { text } } = await worker.recognize(processedImageData);

    onProgress({ status: 'parsing', progress: 0.95, message: 'Formatting extracted subject table...' });
    await worker.terminate();

    const parsedResult = parseMarksheetText(text);

    onProgress({ status: 'done', progress: 1.0, message: 'Extraction completed successfully!' });
    return {
      rawText: text,
      metadata: parsedResult.metadata,
      hasCreditsColumn: parsedResult.hasCreditsColumn,
      courses: parsedResult.courses
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

/**
 * Extract Grade, Credits, and Course Name by strict right-to-left token popping
 * Works for both paper mark sheets and student portal tables with 8 assessment columns!
 */
function parseRowRightTokens(tokens) {
  let detectedGrade = '';
  let detectedCredits = '';

  const rightTokens = [...tokens];
  const validGrades = ['O', 'S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'F', 'U', 'RA', 'AB', 'SA', 'W'];

  // STEP 1: Inspect the rightmost 1-2 tokens strictly for Grade
  if (rightTokens.length >= 2) {
    const last2 = (rightTokens[rightTokens.length - 2] + rightTokens[rightTokens.length - 1]).replace(/[^A-Za-z0-9+]/g, '').toUpperCase();
    if (validGrades.includes(last2)) {
      detectedGrade = last2;
      rightTokens.pop();
      rightTokens.pop();
    }
  }

  // Check single rightmost token if not matched yet
  if (!detectedGrade && rightTokens.length >= 1) {
    const rawLast = rightTokens[rightTokens.length - 1];
    const last1Clean = rawLast.replace(/[^A-Za-z0-9+]/g, '').toUpperCase();
    
    // High Priority 1: Check for explicit plus grades (A+, B+, C+, D+)
    const plusMatch = last1Clean.match(/^(A\+|B\+|C\+|D\+)/i) || rawLast.match(/([A-D]\s*\+)/i);
    if (plusMatch) {
      detectedGrade = `${plusMatch[1].toUpperCase().replace('+', '')}+`;
      rightTokens.pop();
    } else {
      // High Priority 2: Pencil tick recovery (e.g. "B," or "B'" or "B." or "A," or "A'" -> B+ and A+)
      if (/^[AB][,.'`"v+\\/-]+$/i.test(rawLast) || /^[AB][,.'`"v+\\/-]$/i.test(rawLast)) {
        detectedGrade = `${rawLast[0].toUpperCase()}+`;
        rightTokens.pop();
      } else {
        // Strip trailing pencil checkmarks (e.g. "B+v" -> "B+", "Sv" -> "S", "Av" -> "A")
        const stripped = last1Clean.replace(/^(O|S|A\+|A|B\+|B|C\+|C|D\+|D|E|F|U|RA|AB|SA|W)[A-Z\/\.\\,-]+$/i, '$1');
        if (validGrades.includes(stripped)) {
          detectedGrade = stripped;
          rightTokens.pop();
        } else {
          const matchExact = last1Clean.match(/^(O|S|A|B|C|D|E|F|U|RA|AB|SA|W)$/i);
          if (matchExact) {
            detectedGrade = matchExact[1].toUpperCase();
            rightTokens.pop();
          }
        }
      }
    }
  }

  // STEP 2: Inspect remaining rightmost token for Credits (if explicit paper credits column exists)
  if (rightTokens.length >= 1) {
    const lastTok = rightTokens[rightTokens.length - 1];
    const cleanNum = lastTok.replace(/[^0-9]/g, '');
    if (cleanNum && /^\d+$/.test(cleanNum)) {
      const cVal = parseInt(cleanNum, 10);
      if (cVal >= 1 && cVal <= 12) {
        detectedCredits = cVal;
        rightTokens.pop(); // Remove credit token cleanly!
      }
    }
  }

  // STEP 3: Remaining rightTokens form the Course Name
  // Filter out assessment scores (16, 76, 100, 1=+, &8, 3€) and table header tokens
  const nameTokens = [];
  for (let t = 0; t < rightTokens.length; t++) {
    const tok = rightTokens[t];
    if (/^\d+$/.test(tok) || /^[\d.%=+\&\#€-]+$/.test(tok)) {
      break;
    }
    if (/^(sl\.no|sl|no|s\.no|course|code|name|credits|grade|att|assess|att\.\(%\)|i\.assess|\*\*\*|end|statement)$/i.test(tok)) {
      continue;
    }
    nameTokens.push(tok);
  }

  const courseName = cleanCourseTitle(nameTokens.join(' ').trim());

  return { detectedGrade, detectedCredits, courseName };
}

/**
 * Intelligent Academic Marksheet & Portal Table Parser
 * Extract course codes, titles, grades, and optional credits cleanly from official sheets & portal screenshots.
 * Supports multiline wrapped titles and up to 15+ subjects per semester!
 */
export function parseMarksheetText(rawText) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const courses = [];
  const metadata = {
    rollNumber: '',
    name: '',
    branch: '',
    semester: '',
    campus: '',
    regulation: ''
  };

  let hasCreditsColumn = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (/\bcredits?\b/i.test(line) && !lowerLine.includes('choice based credit system')) {
      hasCreditsColumn = true;
    }

    const rollMatch = line.match(/(?:Register\s*(?:Number|No)|Roll\s*(?:No|Number)|Reg\s*No)[\s:]*([0-9A-Za-z]+)/i);
    if (rollMatch && !metadata.rollNumber) metadata.rollNumber = rollMatch[1].trim();

    const nameMatch = line.match(/(?:Name\s*of\s*the\s*Candidate|Name)[\s:]*([A-Za-z\s.]+?)(?=\s+(?:Register|Roll|Degree|Branch|Semester|Campus|$))/i);
    if (nameMatch && !metadata.name && !lowerLine.includes('course name')) {
      metadata.name = nameMatch[1].trim();
    }

    const branchMatch = line.match(/(?:Branch)[\s:]*([A-Za-z0-9\s&.-]+?)(?=\s+(?:Semester|Department|Regulations|Campus|$))/i);
    if (branchMatch && !metadata.branch) metadata.branch = branchMatch[1].trim();

    const semMatch = line.match(/(?:Semester)[\s:]*(\d+)/i);
    if (semMatch && !metadata.semester) metadata.semester = semMatch[1].trim();

    const campusMatch = line.match(/(?:Campus)[\s:]*([A-Za-z\s]+)/i);
    if (campusMatch && !metadata.campus) metadata.campus = campusMatch[1].trim();

    const regMatch = line.match(/(?:Regulation)[\s:]*(\d{4})/i);
    if (regMatch && !metadata.regulation) metadata.regulation = regMatch[1].trim();
  }

  // Support up to 15+ subjects per semester with Multiline Title Continuation
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tokens = line.split(/\s+/);
    let codeMatch = null;
    let codeIndex = -1;

    for (let t = 0; t < tokens.length; t++) {
      let rawTok = tokens[t];

      // 1. Strip 1 or 2 leading serial number digits or dots if attached (e.g. '1CS23904' -> 'CS23904', '15PR23S01' -> 'PR23S01')
      let codeTok = rawTok.replace(/^0?([0-9]{1,2})[\.\,\:\-]?/i, '').replace(/[^A-Za-z0-9]/g, '');
      if (codeTok.length < 5) {
        codeTok = rawTok.replace(/[^A-Za-z0-9]/g, '');
      }

      // If preceding token was 'C' or '1C' and codeTok is 'S23904' -> restore 'CS23904'
      if (/^S\d{5}$/i.test(codeTok)) {
        if (t > 0 && /^(C|1C|1\s*C)$/i.test(tokens[t - 1])) {
          codeTok = `C${codeTok}`;
        } else {
          codeTok = `C${codeTok}`; // Restore missing C prefix for CS23904
        }
      }

      // 2. Fix common OCR misreads at prefix (including C5/C3 -> CS)
      codeTok = codeTok.replace(/^C5/i, 'CS')
                       .replace(/^C3/i, 'CS')
                       .replace(/^5D/i, 'SD')
                       .replace(/^S0/i, 'SD')
                       .replace(/^5S/i, 'SD')
                       .replace(/^E1/i, 'EI')
                       .replace(/^C1/i, 'CY')
                       .replace(/^G1/i, 'GE')
                       .replace(/^H1/i, 'HS')
                       .replace(/^M1/i, 'MA')
                       .replace(/^P1/i, 'PH')
                       .replace(/^A1/i, 'AE')
                       .replace(/^U1/i, 'UC')
                       .replace(/^M3/i, 'ME')
                       .replace(/^JC/i, 'UC'); // UC23U01 / UC23LXX misread as JC23U01

      // 3. Fix letter O vs zero at suffix
      codeTok = codeTok.replace(/C[O|o](\d{1,2})$/i, 'C0$1')
                       .replace(/S[O|o](\d{1,2})$/i, 'S0$1')
                       .replace(/U[O|o](\d{1,2})$/i, 'U0$1');

      // 4. Robust Course Code Matcher (2..4 letters + 3..7 numbers/alphanumerics, MUST contain at least 1 digit, length 5..10)
      if (/^[A-Z]{2,4}[0-9A-Z]{3,7}$/i.test(codeTok) && /\d/.test(codeTok) && codeTok.length >= 5 && codeTok.length <= 10) {
        if (!/^(COURSE|CREDIT|CREDITS|GRADE|THEORY|TITLE|RESULT|REGISTER|SEMESTER|STATEMENT|ANNA|UNIVERSITY)$/i.test(codeTok)) {
          codeMatch = codeTok.toUpperCase();
          codeIndex = t;
          break;
        }
      }
    }

    // Fallback search in line for codes like CS23904 / C523904 / UC23LXX (requires digit)
    if (!codeMatch) {
      const lineCodeMatch = line.match(/\b([A-Z0-9]{5,10})\b/i);
      if (lineCodeMatch) {
        let candidate = lineCodeMatch[1].replace(/[^A-Za-z0-9]/g, '');
        if (/^S\d{5}$/i.test(candidate)) candidate = `C${candidate}`;
        candidate = candidate.replace(/^C5/i, 'CS').replace(/^C3/i, 'CS').replace(/^5D/i, 'SD').replace(/^S0/i, 'SD').replace(/^JC/i, 'UC').replace(/C[O|o](\d{1,2})$/i, 'C0$1');
        if (/\d/.test(candidate) && candidate.length >= 5 && candidate.length <= 10) {
          if (!/^(COURSE|CREDIT|CREDITS|GRADE|THEORY|TITLE|RESULT|REGISTER|SEMESTER|STATEMENT|ANNA|UNIVERSITY)$/i.test(candidate)) {
            codeMatch = candidate.toUpperCase();
            codeIndex = tokens.findIndex(t => t.includes(lineCodeMatch[1]));
          }
        }
      }
    }

    if (codeMatch) {
      const rightTokens = codeIndex >= 0 ? tokens.slice(codeIndex + 1) : tokens;
      const parsedRow = parseRowRightTokens(rightTokens);

      let courseName = parsedRow.courseName;

      // If credits were parsed or if table header contains CREDITS
      let finalCredits = parsedRow.detectedCredits;
      if (finalCredits === '' && hasCreditsColumn) {
        finalCredits = 3;
      }

      courses.push({
        id: `c-${Date.now()}-${courses.length + 1}`,
        code: codeMatch,
        name: courseName || `Course ${codeMatch}`,
        credits: finalCredits,
        grade: parsedRow.detectedGrade || ''
      });
    } else {
      // Multiline Title Continuation (e.g. 'COMPONENTS' or 'SYSTEMS EY' wrapping onto a new line)
      if (courses.length > 0) {
        const textTokens = tokens.filter(t => !/^\d+$/.test(t) && !/^(sl\.no|sl|no|s\.no|course|code|name|credits|grade|att|assess|\*\*\*|end|statement)$/i.test(t));
        const extraText = cleanCourseTitle(textTokens.join(' '));
        if (extraText && !/^(course|code|name|credits|grade|att|assess|end|statement|semester)/i.test(extraText)) {
          const lastCourse = courses[courses.length - 1];
          // Append continuation line to previous course title if title was cut short
          if (lastCourse.name && !lastCourse.name.endsWith(extraText)) {
            lastCourse.name = cleanCourseTitle(`${lastCourse.name} ${extraText}`);
          }
        }
      }
    }
  }

  // If any row detected explicit credits, set hasCreditsColumn = true
  if (!hasCreditsColumn && courses.some(c => c.credits !== '')) {
    hasCreditsColumn = true;
  }

  return { metadata, hasCreditsColumn, courses };
}
