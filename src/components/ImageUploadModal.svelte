<script>
  import { gpaStore } from '../store/gpaStore.js';
  import { scanMarksheetImage } from '../utils/ocrExtractor.js';
  import { X, Upload, Check, AlertCircle, Sparkles, BookOpen, Layers, ClipboardCheck, Info, Camera, Zap } from 'lucide-svelte';

  let { 
    isOpen = false, 
    initialSemesterId = null,
    initialPastedFile = null,
    onClose = () => {} 
  } = $props();

  let isScanning = $state(false);
  let scanProgress = $state({ status: '', progress: 0, message: '' });
  let scanError = $state('');
  let extractedResult = $state(null);
  let selectedTargetSemester = $state('new');
  let selectedCourses = $state({});
  let showSuccessBanner = $state(false);
  let isFromClipboard = $state(false);

  // Reset modal state to fresh upload state whenever opened
  $effect(() => {
    if (isOpen) {
      selectedTargetSemester = initialSemesterId || 'new';
      scanError = '';
      extractedResult = null;
      selectedCourses = {};
      isScanning = false;
      showSuccessBanner = false;

      if (initialPastedFile) {
        isFromClipboard = true;
        processFile(initialPastedFile);
      } else {
        isFromClipboard = false;
      }
    }
  });

  // Modal Clipboard Paste Handler (Ctrl + V when modal is already open)
  $effect(() => {
    function handleModalPaste(e) {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            isFromClipboard = true;
            processFile(file);
            break;
          }
        }
      }
    }

    window.addEventListener('paste', handleModalPaste);
    return () => window.removeEventListener('paste', handleModalPaste);
  });

  // Sample Presets
  const SAMPLE_ANNA_UNIV_SEM1 = [
    { id: 'sem1-1', code: 'CY3151', name: 'ENGINEERING CHEMISTRY', credits: 3, grade: 'B+' },
    { id: 'sem1-2', code: 'CY3161', name: 'CHEMISTRY LABORATORY', credits: 1, grade: 'A+' },
    { id: 'sem1-3', code: 'EI3151', name: 'ELECTRICAL, ELECTRONICS AND MEASUREMENT ENGINEERING', credits: 4, grade: 'B+' },
    { id: 'sem1-4', code: 'GE3154', name: 'HERITAGE OF TAMILS', credits: 1, grade: 'B+' },
    { id: 'sem1-5', code: 'GE3155', name: 'ENGINEERING DRAWING', credits: 4, grade: 'A' },
    { id: 'sem1-6', code: 'GE3161', name: 'ENGINEERING PRACTICES LABORATORY', credits: 2, grade: 'A+' },
    { id: 'sem1-7', code: 'GE3162', name: 'ENGLISH LABORATORY - I', credits: 1, grade: 'A+' },
    { id: 'sem1-8', code: 'HS3151', name: 'ENGLISH FOR COMMUNICATION - I', credits: 3, grade: 'A' },
    { id: 'sem1-9', code: 'MA3151', name: 'MATRICES AND CALCULUS', credits: 4, grade: 'B+' },
    { id: 'sem1-10', code: 'PH3151', name: 'ENGINEERING PHYSICS', credits: 3, grade: 'B+' }
  ];

  const SAMPLE_ANNA_UNIV_SEM3 = [
    { id: 'sem3-1', code: 'AE23C08', name: 'FLUID MECHANICS AND FLUID MACHINES', credits: 4, grade: 'B+' },
    { id: 'sem3-2', code: 'AU23C02', name: 'MECHANICS OF SOLIDS', credits: 4, grade: 'B+' },
    { id: 'sem3-3', code: 'MA23C08', name: 'NUMERICAL METHODS', credits: 4, grade: 'B+' },
    { id: 'sem3-4', code: 'MA3251', name: 'ORDINARY DIFFERENTIAL EQUATIONS AND TRANSFORM TECHNIQUES', credits: 4, grade: 'C' },
    { id: 'sem3-5', code: 'PR23301', name: 'FOUNDRY AND WELDING TECHNOLOGY', credits: 4, grade: 'A+' },
    { id: 'sem3-6', code: 'PR23302', name: 'METAL FORMING', credits: 4, grade: 'B+' },
    { id: 'sem3-7', code: 'PR23C01', name: 'THEORY OF MACHINES', credits: 4, grade: 'B+' },
    { id: 'sem3-8', code: 'PR23S01', name: 'ESSENTIALS FOR NX DESIGNERS', credits: 1, grade: 'A+' },
    { id: 'sem3-9', code: 'SD23C01', name: 'MICROSOFT DIGITAL SKILLS', credits: 2, grade: 'S' }
  ];

  const SAMPLE_ANNA_UNIV_SEM6 = [
    { id: 'sem6-1', code: 'CS23904', name: 'IMAGE PROCESSING', credits: 3, grade: 'B+' },
    { id: 'sem6-2', code: 'PR23001', name: 'PRODUCTION OF AUTOMOTIVE COMPONENTS', credits: 3, grade: 'A' },
    { id: 'sem6-3', code: 'PR23003', name: 'MATERIAL HANDLING AND STORAGE SYSTEMS', credits: 3, grade: 'B+' },
    { id: 'sem6-4', code: 'PR23006', name: 'DESIGN FOR MANUFACTURING AND ASSEMBLY', credits: 4, grade: 'A' },
    { id: 'sem6-5', code: 'PR23020', name: 'MANUFACTURING OF BIOMEDICAL COMPONENTS', credits: 3, grade: 'B+' },
    { id: 'sem6-6', code: 'PR23C02', name: 'COMPOSITE MATERIALS', credits: 3, grade: 'A+' },
    { id: 'sem6-7', code: 'PR23E02', name: 'FLEXIBLE ELECTRONICS MANUFACTURING', credits: 3, grade: 'A' },
    { id: 'sem6-8', code: 'PR23S04', name: 'ZERO DEFECT MANUFACTURING', credits: 3, grade: 'S' },
    { id: 'sem6-9', code: 'UC23LXX', name: 'SELF-LEARNING COURSE', credits: 2, grade: 'S' }
  ];

  function loadSamplePreset(presetType) {
    isFromClipboard = false;
    let coursesList = SAMPLE_ANNA_UNIV_SEM1;
    let semNum = '1';

    if (presetType === 'sem3') {
      coursesList = SAMPLE_ANNA_UNIV_SEM3;
      semNum = '3';
    } else if (presetType === 'sem6') {
      coursesList = SAMPLE_ANNA_UNIV_SEM6;
      semNum = '6';
    }

    const result = {
      metadata: {
        rollNumber: '2023507030',
        name: 'ISMAIL A M',
        branch: 'B.E FULL TIME PRODUCTION ENGINEERING',
        semester: semNum,
        campus: 'MADRAS INSTITUTE OF TECHNOLOGY'
      },
      hasCreditsColumn: true,
      courses: JSON.parse(JSON.stringify(coursesList))
    };

    onScanCompleted(result);
  }

  function initSelectedCourses(courses) {
    const sel = {};
    courses.forEach(c => { sel[c.id] = true; });
    selectedCourses = sel;
  }

  function onScanCompleted(result) {
    extractedResult = result;
    initSelectedCourses(result.courses);
    showSuccessBanner = true;

    // Smart Destination Auto-Selection:
    if (!initialSemesterId) {
      const scannedSemNum = result.metadata?.semester;
      if (scannedSemNum) {
        const existingSem = $gpaStore.semesters.find(s => 
          s.name.toLowerCase().includes(`semester ${scannedSemNum}`) || 
          s.name.toLowerCase().includes(`sem ${scannedSemNum}`)
        );

        if (existingSem) {
          selectedTargetSemester = existingSem.id;
        } else {
          selectedTargetSemester = 'new';
        }
      } else {
        selectedTargetSemester = 'new';
      }
    }
  }

  async function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    isFromClipboard = false;
    processFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      isFromClipboard = false;
      processFile(file);
    }
  }

  async function processFile(file) {
    isScanning = true;
    scanError = '';
    extractedResult = null;
    showSuccessBanner = false;

    try {
      const result = await scanMarksheetImage(file, (p) => {
        scanProgress = p;
      });

      if (result.courses.length === 0) {
        scanError = 'No course codes were recognized. Try uploading a clearer photo or test using the sample presets below.';
      } else {
        onScanCompleted(result);
      }
    } catch (err) {
      console.error(err);
      scanError = `Scan failed: ${err.message || 'Image processing error'}.`;
    } finally {
      isScanning = false;
    }
  }

  function toggleAllSelection(checked) {
    if (!extractedResult) return;
    const sel = {};
    extractedResult.courses.forEach(c => { sel[c.id] = checked; });
    selectedCourses = sel;
  }

  function handleImport() {
    if (!extractedResult) return;
    const coursesToImport = extractedResult.courses.filter(c => selectedCourses[c.id]);

    if (coursesToImport.length === 0) {
      alert('Please select at least one course.');
      return;
    }

    let targetSemId = selectedTargetSemester;

    if (targetSemId === 'new') {
      const semTitle = extractedResult.metadata?.semester 
        ? `Semester ${extractedResult.metadata.semester}` 
        : `Scanned Marksheet (${coursesToImport.length} Subjects)`;
      
      gpaStore.addSemester(semTitle);

      setTimeout(() => {
        const lastSem = $gpaStore.semesters[$gpaStore.semesters.length - 1];
        if (lastSem) {
          gpaStore.batchInsertCourses(lastSem.id, coursesToImport, { append: false });
        }
      }, 50);
    } else {
      gpaStore.batchInsertCourses(targetSemId, coursesToImport, { append: true });
    }

    extractedResult = null;
    onClose();
  }

  function handleCloseModal() {
    extractedResult = null;
    scanError = '';
    showSuccessBanner = false;
    isFromClipboard = false;
    onClose();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
    
    <div class="neo-box-xl bg-[#FAF7EE] w-full max-w-4xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Modal Header -->
      <div class="bg-[#FF70A6] border-b-3 border-black p-4 flex items-center justify-between text-white">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-black text-[#FFDE59] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_#000]">
            <Camera class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-display font-black text-xl text-black">Marksheet OCR Subject Extractor</h3>
            <p class="text-xs font-mono text-black/80 font-bold">Auto-extract Course Codes, Names, and Credits to corresponding semester</p>
          </div>
        </div>

        <button 
          onclick={handleCloseModal}
          class="neo-btn bg-white hover:bg-black hover:text-white text-black p-1.5 rounded-sm"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        
        <!-- Upload & Clipboard Area -->
        <div 
          role="region"
          aria-label="Image drag and drop upload area"
          ondragover={(e) => e.preventDefault()}
          ondrop={handleDrop}
          class="border-3 border-dashed border-black bg-white p-6 text-center shadow-[3px_3px_0px_0px_#000] hover:bg-[#FFFDF5] transition-colors"
        >
          <input 
            type="file" 
            accept="image/*" 
            onchange={handleFileInput}
            id="ocr-upload-input" 
            class="hidden"
          />

          {#if isScanning}
            <div class="py-6 space-y-4">
              <div class="relative w-16 h-16 border-3 border-black bg-[#FFDE59] mx-auto flex items-center justify-center shadow-[4px_4px_0px_0px_#000] text-black">
                <div class="absolute inset-0 bg-[#FF70A6] animate-ping opacity-30"></div>
                {#if isFromClipboard}
                  <ClipboardCheck class="w-8 h-8 stroke-[2.5] relative z-10" />
                {:else}
                  <Zap class="w-8 h-8 stroke-[2.5] relative z-10" />
                {/if}
              </div>
              
              <div>
                {#if isFromClipboard}
                  <div class="inline-flex items-center gap-1.5 neo-badge bg-[#38BDF8] text-black mb-2">
                    <ClipboardCheck class="w-3.5 h-3.5" />
                    <span>Clipboard Image Captured!</span>
                  </div>
                {/if}
                <p class="font-display font-black text-xl text-black">{scanProgress.message || 'Scanning Marksheet...'}</p>
                <p class="text-xs font-mono text-zinc-600 font-bold mt-1">Analyzing table structure & recognizing subject codes...</p>
              </div>

              <!-- Animated Progress Bar with Spinner -->
              <div class="w-72 mx-auto space-y-2">
                <div class="bg-zinc-100 border-2.5 border-black h-5 p-0.5 shadow-[2px_2px_0px_0px_#000]">
                  <div 
                    class="h-full bg-[#FF70A6] transition-all duration-300 flex items-center justify-end pr-1 text-[9px] font-mono font-bold text-white"
                    style="width: {Math.max(10, Math.round((scanProgress.progress || 0.2) * 100))}%"
                  >
                    {Math.round((scanProgress.progress || 0.2) * 100)}%
                  </div>
                </div>

                <div class="flex items-center justify-center gap-2 text-xs font-mono font-bold text-zinc-700">
                  <div class="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing client-side OCR...</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center gap-3">
              <div class="w-12 h-12 bg-[#38BDF8] border-3 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
                <Upload class="w-6 h-6 text-black" />
              </div>
              <div>
                <p class="font-display font-black text-lg text-black">Drag & drop, Browse file, or Paste Clipboard Image</p>
                <p class="text-xs font-mono text-zinc-600 font-semibold mt-0.5">Press <kbd class="bg-white px-1.5 py-0.5 border border-black font-bold text-black shadow-[1px_1px_0px_0px_#000]">Ctrl + V</kbd> anywhere to paste screenshot directly!</p>
              </div>

              <div class="flex flex-wrap items-center justify-center gap-2 mt-2">
                <label 
                  for="ocr-upload-input"
                  class="neo-btn bg-[#FFDE59] text-black px-5 py-2.5 text-xs font-black cursor-pointer shadow-[2px_2px_0px_0px_#000] hover:bg-[#ffe600]"
                >
                  Browse File
                </label>
              </div>
            </div>
          {/if}
        </div>

        {#if scanError}
          <div class="neo-box bg-[#FF4757] text-white p-3.5 flex items-start gap-3">
            <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
            <div class="text-xs font-mono font-bold">
              <p class="font-black text-sm mb-0.5">Scan Notice</p>
              <p>{scanError}</p>
            </div>
          </div>
        {/if}

        {#if showSuccessBanner && extractedResult}
          <div class="neo-box bg-[#4ADE80] text-black p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div class="flex items-center gap-2 text-xs font-mono font-bold">
              <span class="w-5 h-5 bg-black text-[#86EFAC] rounded-full flex items-center justify-center font-black">
                <Check class="w-3.5 h-3.5 text-[#86EFAC] stroke-[3]" />
              </span>
              <span>{isFromClipboard ? 'Clipboard image processed successfully!' : 'Extraction complete!'} <strong>{extractedResult.courses.length} subjects</strong> detected.</span>
            </div>
            <span class="text-[10px] font-mono font-bold bg-black text-white px-2 py-0.5">Ready for Import</span>
          </div>
        {/if}

        {#if extractedResult && extractedResult.hasCreditsColumn === false}
          <div class="neo-box bg-[#FFF4B8] text-black p-3 flex items-center gap-2 text-xs font-mono font-bold">
            <Info class="w-4 h-4 text-[#FF8E3C] shrink-0" />
            <span>No Credits column detected in this portal table (e.g. Assessment Marks table). Course credits left blank for manual entry!</span>
          </div>
        {/if}

        <!-- Extracted Review List -->
        {#if extractedResult}
          <div class="space-y-4">
            
            {#if extractedResult.metadata.name || extractedResult.metadata.rollNumber}
              <div class="neo-box bg-[#FFF4B8] p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold">
                <div class="flex flex-wrap items-center gap-3">
                  {#if extractedResult.metadata.name}
                    <span><strong class="text-zinc-600">Name:</strong> {extractedResult.metadata.name}</span>
                  {/if}
                  {#if extractedResult.metadata.rollNumber}
                    <span><strong class="text-zinc-600">Register No:</strong> {extractedResult.metadata.rollNumber}</span>
                  {/if}
                  {#if extractedResult.metadata.branch}
                    <span><strong class="text-zinc-600">Branch:</strong> {extractedResult.metadata.branch}</span>
                  {/if}
                </div>
                {#if extractedResult.metadata.semester}
                  <span class="neo-badge bg-[#86EFAC] text-black">Semester {extractedResult.metadata.semester}</span>
                {/if}
              </div>
            {/if}

            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <h4 class="font-display font-black text-lg text-black">
                  Detected Courses ({extractedResult.courses.length})
                </h4>
                <button 
                  onclick={() => toggleAllSelection(true)} 
                  class="text-xs font-mono font-bold text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <span class="text-zinc-400">|</span>
                <button 
                  onclick={() => toggleAllSelection(false)} 
                  class="text-xs font-mono font-bold text-zinc-600 hover:underline"
                >
                  Deselect All
                </button>
              </div>

              <!-- Target Destination Semester Selector -->
              <div class="flex items-center gap-2">
                {#if initialSemesterId}
                  {@const targetSem = $gpaStore.semesters.find(s => s.id === initialSemesterId)}
                  <span class="neo-badge bg-[#FFDE59] text-black font-black text-xs py-1.5 px-3 border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                    Direct Import to: {targetSem ? targetSem.name : 'Selected Semester'}
                  </span>
                {:else}
                  <label for="ocr-dest-sem" class="text-xs font-mono font-bold text-black">Target Semester:</label>
                  <select 
                    id="ocr-dest-sem"
                    bind:value={selectedTargetSemester}
                    class="border-2 border-black bg-[#FFDE59] text-black font-black text-xs py-1.5 px-2 font-mono shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    <option value="new">+ Create New Semester ({extractedResult.metadata.semester ? `Semester ${extractedResult.metadata.semester}` : 'Scanned Sheet'})</option>
                    {#each $gpaStore.semesters as s}
                      <option value={s.id}>{s.name}</option>
                    {/each}
                  </select>
                {/if}
              </div>
            </div>

            <!-- Editable Review Table -->
            <div class="neo-box bg-white overflow-x-auto max-h-72">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-black text-white font-mono uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th class="p-2 text-center w-8">Use</th>
                    <th class="p-2 border-l border-zinc-700 w-28">Code</th>
                    <th class="p-2 border-l border-zinc-700">Course Name</th>
                    <th class="p-2 border-l border-zinc-700 text-center w-20">Credits</th>
                    <th class="p-2 border-l border-zinc-700 text-center w-28">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {#each extractedResult.courses as course, i}
                    <tr class="border-b border-zinc-200 hover:bg-[#FAF7EE]">
                      <td class="p-2 text-center">
                        <input 
                          type="checkbox" 
                          bind:checked={selectedCourses[course.id]} 
                          class="w-4 h-4 accent-black cursor-pointer"
                        />
                      </td>
                      <td class="p-1 border-l border-zinc-200">
                        <input 
                          type="text" 
                          bind:value={course.code} 
                          class="neo-input text-xs font-mono font-bold py-1 px-1.5 uppercase"
                        />
                      </td>
                      <td class="p-1 border-l border-zinc-200">
                        <input 
                          type="text" 
                          bind:value={course.name} 
                          class="neo-input text-xs font-semibold py-1 px-1.5"
                        />
                      </td>
                      <td class="p-1 border-l border-zinc-200">
                        <input 
                          type="number" 
                          min="0" 
                          max="20"
                          bind:value={course.credits} 
                          placeholder={extractedResult.hasCreditsColumn === false ? "Manual" : "3"}
                          class="neo-input text-xs font-mono font-bold text-center py-1 px-1"
                        />
                      </td>
                      <td class="p-1 border-l border-zinc-200">
                        <select 
                          bind:value={course.grade}
                          class="border-2 border-black bg-white font-bold text-xs py-1 px-1.5 w-full font-mono shadow-[1px_1px_0px_0px_#000]"
                        >
                          <option value="">-- Select Grade --</option>
                          {#each Object.entries($gpaStore.gradePoints) as [gKey]}
                            <option value={gKey}>{gKey}</option>
                          {/each}
                        </select>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

          </div>
        {/if}

      </div>

      <!-- Modal Footer -->
      <div class="bg-[#FAF7EE] border-t-3 border-black p-4 flex items-center justify-between">
        <p class="text-xs font-mono font-bold text-zinc-500 hidden sm:block">
          All image data is analyzed 100% locally in your browser.
        </p>

        <div class="flex items-center gap-3 ml-auto">
          <button 
            onclick={handleCloseModal}
            class="neo-btn bg-white hover:bg-zinc-100 text-black px-4 py-2 text-xs font-bold"
          >
            Cancel
          </button>

          <button 
            onclick={handleImport}
            disabled={!extractedResult || extractedResult.courses.length === 0}
            class="neo-btn bg-[#4ADE80] hover:bg-[#22c55e] text-black px-5 py-2 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Check class="w-4 h-4 stroke-[3]" />
            <span>Import Courses into Selected Semester</span>
          </button>
        </div>
      </div>

    </div>
  </div>
{/if}
