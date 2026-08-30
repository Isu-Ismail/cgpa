import { createWorker } from 'tesseract.js';

/**
 * Preprocess image with smart inversion of dark background cells (e.g. Grade column in portal tables)
 * so white text on dark purple/magenta becomes dark text on light background for Tesseract.
 */
export async function preprocessImage(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const scale = Math.max(1, 2200 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Detect dark purple/magenta background cells (Grade column in Anna Univ portal)
        const isDarkMagentaOrDarkBox = (r > 60 && g < 75 && b > 25) || (gray < 115 && r > g + 15);

        if (isDarkMagentaOrDarkBox) {
          // Invert dark box: White grade letters (B+, A, S) become solid black text on light background!
          data[i] = 255 - r;
          data[i + 1] = 255 - g;
          data[i + 2] = 255 - b;
        } else {
          // Crisp contrast for dark text on white/light background
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
 * Clean course title to strip unclosed or stray brackets like [, ], (, ), []
 */
export function cleanCourseTitle(title) {
  if (!title) return '';

  let cleaned = title.replace(/[|_\\]/g, '').trim();

  // Remove empty brackets like [], [ ], (), ( )
  cleaned = cleaned.replace(/\[\s*\]/g, '').replace(/\(\s*\)/g, '');

  // Check for unclosed square brackets '['
  let openSquare = (cleaned.match(/\[/g) || []).length;
  let closeSquare = (cleaned.match(/\]/g) || []).length;
  if (openSquare > closeSquare) {
    // Remove trailing or unclosed '['
    cleaned = cleaned.replace(/\[(?![^]*\])/g, '');
  } else if (closeSquare > openSquare) {
    // Remove stray ']'
    cleaned = cleaned.replace(/\](?![^]*\[)/g, '');
  }

  // Check for unclosed parentheses '('
  let openParen = (cleaned.match(/\(/g) || []).length;
  let closeParen = (cleaned.match(/\)/g) || []).length;
  if (openParen > closeParen) {
    cleaned = cleaned.replace(/\((?![^]*\))/g, '');
  } else if (closeParen > openParen) {
    cleaned = cleaned.replace(/\)(?![^]*\()/g, '');
  }

  // Strip remaining standalone stray brackets
  cleaned = cleaned.replace(/^[\[\]\(\)]+|[\[\]\(\)]+$/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[,.-]+|[,.-]+$/g, '').trim();

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
 * Intelligent Academic Marksheet & Portal Table Parser
 * Extract course codes, titles, grades, and optional credits cleanly from official sheets & portal screenshots.
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

  // Explicit Credits column check
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

  const validGrades = ['O', 'S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'F', 'U', 'RA', 'AB', 'SA', 'W'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tokens = line.split(/\s+/);
    let codeMatch = null;
    let codeIndex = -1;

    for (let t = 0; t < tokens.length; t++) {
      let rawTok = tokens[t];
      let tok = rawTok.replace(/[^A-Za-z0-9]/g, '');

      // 1. Strip leading single digit or dot if attached (e.g. '9SD23C01' -> 'SD23C01')
      tok = tok.replace(/^[0-9]\.?(?=[A-Za-z]{2})/i, '');

      // 2. Fix common OCR misreads at prefix
      tok = tok.replace(/^5D/i, 'SD')
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
               .replace(/^M3/i, 'ME');

      // 3. Fix letter O vs zero at suffix
      tok = tok.replace(/C[O|o](\d{1,2})$/i, 'C0$1')
               .replace(/S[O|o](\d{1,2})$/i, 'S0$1')
               .replace(/U[O|o](\d{1,2})$/i, 'U0$1');

      // 4. Robust Course Code Matcher
      if (/^[A-Z]{2,4}[0-9A-Z]{3,5}$/i.test(tok) && /\d/.test(tok) && tok.length >= 5 && tok.length <= 8) {
        codeMatch = tok.toUpperCase();
        codeIndex = t;
        break;
      }
    }

    // Fallback search in line
    if (!codeMatch) {
      const lineCodeMatch = line.match(/\b([A-Z]{2,4}[0-9A-Z]{3,5})\b/i);
      if (lineCodeMatch) {
        let candidate = lineCodeMatch[1].replace(/[^A-Za-z0-9]/g, '');
        candidate = candidate.replace(/^5D/i, 'SD').replace(/^S0/i, 'SD').replace(/C[O|o](\d{1,2})$/i, 'C0$1');
        if (/\d/.test(candidate) && candidate.length >= 5 && candidate.length <= 8) {
          codeMatch = candidate.toUpperCase();
          codeIndex = tokens.findIndex(t => t.includes(lineCodeMatch[1]));
        }
      }
    }

    if (codeMatch) {
      let detectedGrade = '';
      let detectedCredits = '';

      const rightTokens = codeIndex >= 0 ? tokens.slice(codeIndex + 1) : tokens;

      // Scan rightmost tokens for Grade (e.g. A+, A, B+, S, O)
      for (let r = rightTokens.length - 1; r >= 0; r--) {
        let cleanTok = rightTokens[r].replace(/[^A-Za-z0-9+]/g, '').toUpperCase();

        // Normalize common OCR grade misreads
        if (cleanTok === 'A1' || cleanTok === 'A+') cleanTok = 'A+';
        else if (cleanTok === 'B1' || cleanTok === 'B+') cleanTok = 'B+';
        else if (cleanTok === 'C1' || cleanTok === 'C+') cleanTok = 'C+';
        else if (cleanTok === '5' && rightTokens[r].length <= 2) cleanTok = 'S';

        if (!detectedGrade && validGrades.includes(cleanTok)) {
          detectedGrade = cleanTok;
          rightTokens.splice(r, 1);
          continue;
        }

        // Extract Grade embedded inside punctuation or trailing tokens
        if (!detectedGrade) {
          const matchGrade = rightTokens[r].match(/\b(A\+|B\+|C\+|D\+|[O|S|A|B|C|D|E|F|U]|RA|AB)\b/i);
          if (matchGrade) {
            detectedGrade = matchGrade[1].toUpperCase();
            rightTokens.splice(r, 1);
            continue;
          }
        }

        // ONLY extract numeric credits if table header explicitly contains a Credits column!
        if (hasCreditsColumn && detectedCredits === '' && /^\d(\.\d)?$/.test(cleanTok)) {
          const cVal = parseFloat(cleanTok);
          if (cVal >= 0 && cVal <= 20) {
            detectedCredits = cVal;
            rightTokens.splice(r, 1);
            continue;
          }
        }
      }

      // Fallback: If Grade was not found in right tokens, search entire line
      if (!detectedGrade) {
        const lineGradeMatch = line.match(/\b(A\+|B\+|C\+|D\+|[O|S|A|B|C|D|E|F|U]|RA|AB)\b/i);
        if (lineGradeMatch) {
          detectedGrade = lineGradeMatch[1].toUpperCase();
        }
      }

      // Filter remaining tokens for Course Name
      const nameTokens = rightTokens.filter(t => {
        if (/^[\d.%-]+$/.test(t)) return false;
        if (/^(sl\.no|sl|no|course|code|name|credits|grade|att|assess|\*\*\*|end|statement)$/i.test(t)) return false;
        return true;
      });

      let rawCourseName = nameTokens.join(' ').trim();
      let courseName = cleanCourseTitle(rawCourseName);

      if (!courseName && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!/^[A-Z]{2,4}[0-9A-Z]{3,5}$/i.test(nextLine)) {
          courseName = cleanCourseTitle(nextLine);
        }
      }

      if (detectedCredits === '') {
        if (hasCreditsColumn) {
          detectedCredits = 3;
        } else {
          detectedCredits = '';
        }
      }

      courses.push({
        id: `c-${Date.now()}-${courses.length + 1}`,
        code: codeMatch,
        name: courseName || `Course ${codeMatch}`,
        credits: detectedCredits,
        grade: detectedGrade || ''
      });
    }
  }

  return { metadata, hasCreditsColumn, courses };
}
