<script>
  import { checkTemplateIdExists, publishCloudTemplate } from '../utils/firebaseService.js';
  import { gpaStore } from '../store/gpaStore.js';
  import { 
    X, Plus, Trash2, Check, Copy, FolderCheck, Cloud, RefreshCw, 
    Lock, ShieldCheck, Sparkles, AlertTriangle, Edit3, BookOpen, Layers
  } from 'lucide-svelte';

  let { isOpen = false, initialTemplate = null, onClose = () => {} } = $props();

  // Isolated Template State (Does NOT touch gpaStore!)
  let docIdSuffix = $state('');
  let passcode = $state('');
  let institution = $state('');
  let branch = $state('');
  let year = $state('');
  let description = $state('');
  let maxGpa = $state(10);
  let semesters = $state([]);

  // Cloud Publish Status
  let idCheckStatus = $state('idle'); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  let isPublishing = $state(false);
  let publishError = $state('');
  let publishSuccess = $state(null);

  // Dirty state snapshot tracking
  let initialSnapshot = $state('');

  function getFormSnapshot() {
    return JSON.stringify({
      docIdSuffix: (docIdSuffix || '').trim().toLowerCase(),
      passcode: (passcode || '').trim(),
      institution: (institution || '').trim(),
      branch: (branch || '').trim(),
      year: (year || '').trim(),
      description: (description || '').trim(),
      semesters: (semesters || []).map(s => ({
        name: (s.name || '').trim(),
        courses: (s.courses || []).map(c => ({
          code: (c.code || '').trim().toUpperCase(),
          name: (c.name || '').trim(),
          credits: Number(c.credits) || 0
        }))
      }))
    });
  }

  let isDirty = $derived(
    initialTemplate === null ? true : getFormSnapshot() !== initialSnapshot
  );

  // Device Rate-Limit Cooldown Lock (3 Minutes Cooldown)
  let cooldownRemaining = $state(0);
  let cooldownTimer = null;

  function checkDeviceCooldown() {
    try {
      const lastTime = parseInt(localStorage.getItem('neocgpa_last_pub_time') || '0', 10);
      const COOLDOWN_MS = 180 * 1000; // 3 minutes rate limit
      const elapsed = Date.now() - lastTime;
      if (elapsed < COOLDOWN_MS) {
        cooldownRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        startCooldownCountdown();
      } else {
        cooldownRemaining = 0;
      }
    } catch (e) {}
  }

  function startCooldownCountdown() {
    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      if (cooldownRemaining > 1) {
        cooldownRemaining--;
      } else {
        cooldownRemaining = 0;
        clearInterval(cooldownTimer);
      }
    }, 1000);
  }

  // Alphanumeric Captcha State (Case Sensitive e.g. 55sh3)
  let captchaCode = $state('55sh3');
  let captchaUserAnswer = $state('');
  let isCaptchaVerified = $derived(
    (captchaUserAnswer || '').trim() === captchaCode
  );

  function resetCaptcha() {
    const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    captchaCode = code;
    captchaUserAnswer = '';
  }

  let wasOpen = false;
  $effect(() => {
    if (isOpen && !wasOpen) {
      wasOpen = true;
      publishError = '';
      publishSuccess = null;
      resetCaptcha();
      checkDeviceCooldown();

      if (initialTemplate) {
        // Load initial template into isolated editor state
        const docId = initialTemplate.docId || initialTemplate.id || '';
        docIdSuffix = docId.replace(/^TMP-/, '');
        institution = initialTemplate.institution || '';
        branch = initialTemplate.branch || '';
        year = initialTemplate.year || '';
        description = initialTemplate.description || '';
        maxGpa = initialTemplate.maxGpa || 10;
        passcode = initialTemplate.passcode || '';

        // Clone semesters and courses deeply so edits don't mutate original objects
        if (Array.isArray(initialTemplate.semesters) && initialTemplate.semesters.length > 0) {
          semesters = initialTemplate.semesters.map((s, i) => ({
            id: s.id || i + 1,
            name: s.name || `Semester ${i + 1}`,
            courses: Array.isArray(s.courses)
              ? s.courses.map(c => ({
                  code: c.code || '',
                  name: c.name || '',
                  credits: Number(c.credits) || 0
                }))
              : []
          }));
        } else {
          semesters = [createDefaultSemester(1)];
        }
      } else {
        // Fresh blank template draft
        docIdSuffix = '';
        institution = '';
        branch = '';
        year = '';
        description = 'University Course Scheme';
        maxGpa = 10;
        semesters = [createDefaultSemester(1)];
      }

      initialSnapshot = getFormSnapshot();

      if (docIdSuffix) {
        handleSuffixInput();
      } else {
        idCheckStatus = 'idle';
      }
    } else if (!isOpen) {
      wasOpen = false;
      clearInterval(cooldownTimer);
    }
  });

  function createDefaultSemester(num) {
    return {
      id: num,
      name: `Semester ${num}`,
      courses: [
        { code: '', name: 'Subject 1', credits: 3 },
        { code: '', name: 'Subject 2', credits: 4 }
      ]
    };
  }

  let checkTimer = null;
  function handleSuffixInput() {
    publishError = '';
    const cleanSuffix = (docIdSuffix || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!cleanSuffix) {
      idCheckStatus = 'idle';
      clearTimeout(checkTimer);
      return;
    }

    if (cleanSuffix.length < 3) {
      idCheckStatus = 'invalid';
      clearTimeout(checkTimer);
      return;
    }

    if (publishSuccess && `TMP-${cleanSuffix}` !== publishSuccess.docId) {
      publishSuccess = null;
    }

    idCheckStatus = 'checking';
    clearTimeout(checkTimer);
    checkTimer = setTimeout(async () => {
      const fullDocId = `TMP-${cleanSuffix}`;
      const res = await checkTemplateIdExists(fullDocId);
      if (res.exists) {
        idCheckStatus = 'taken';
      } else {
        idCheckStatus = 'available';
      }
    }, 350);
  }

  function handleAddSemester() {
    const nextNum = semesters.length + 1;
    semesters = [...semesters, createDefaultSemester(nextNum)];
  }

  function handleRemoveSemester(index) {
    if (semesters.length <= 1) return;
    semesters = semesters.filter((_, i) => i !== index);
  }

  function handleAddCourse(semIndex) {
    semesters[semIndex].courses = [
      ...semesters[semIndex].courses,
      { code: '', name: 'New Course', credits: 3 }
    ];
  }

  function handleRemoveCourse(semIndex, courseIndex) {
    semesters[semIndex].courses = semesters[semIndex].courses.filter((_, cI) => cI !== courseIndex);
  }

  let isJustUploaded = $state(false);

  async function handlePublishToCloud() {
    if (!isCaptchaVerified) {
      publishError = 'Please solve the anti-bot math challenge first.';
      return;
    }

    const cleanSuffix = (docIdSuffix || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (cleanSuffix.length < 3) {
      publishError = 'Template ID suffix must be at least 3 characters.';
      return;
    }

    if (!passcode || passcode.trim().length < 4) {
      publishError = 'Secret Passcode must be at least 4 characters long.';
      return;
    }

    const fullDocId = `TMP-${cleanSuffix}`;
    isPublishing = true;
    publishError = '';

    try {
      const metadata = {
        name: [institution, branch, year].filter(Boolean).join(', ') || fullDocId,
        institution,
        branch,
        year
      };

      const payload = {
        exportType: 'clean_template',
        id: fullDocId,
        name: metadata.name,
        institution,
        branch,
        year,
        description: description || 'University Course Scheme',
        maxGpa,
        gradePoints: { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "U": 0 },
        semesters: semesters.map((s, i) => ({
          id: i + 1,
          name: s.name,
          courses: (s.courses || []).map(c => ({
            code: c.code || '',
            name: c.name || '',
            credits: Number(c.credits) || 0
          }))
        }))
      };

      const result = await publishCloudTemplate({
        docId: fullDocId,
        metadata,
        payload,
        secretPasscode: passcode.trim()
      });

      // Record last device publication timestamp for 3-minute rate limit lock
      try {
        localStorage.setItem('neocgpa_last_pub_time', Date.now().toString());
      } catch (e) {}

      initialSnapshot = getFormSnapshot();
      checkDeviceCooldown();

      const origin = window.location.origin + window.location.pathname;
      const shareUrl = `${origin}?tpl=${fullDocId}`;

      publishSuccess = {
        docId: fullDocId,
        shareUrl,
        passcode: passcode.trim(),
        isUpdate: result.isUpdate
      };

      isJustUploaded = true;
      setTimeout(() => {
        isJustUploaded = false;
      }, 3500);
    } catch (err) {
      publishError = err.message || 'Failed to publish cloud template.';
    } finally {
      isPublishing = false;
    }
  }

  function handleApplyToWorkspace() {
    const name = [institution, branch, year].filter(Boolean).join(', ') || 'Custom Scheme';
    gpaStore.loadTemplate({
      id: docIdSuffix ? `TMP-${docIdSuffix}` : 'custom-scheme',
      name,
      institution,
      branch,
      year,
      description,
      maxGpa,
      semesters
    });
    onClose();
  }

  function handleCopyShareUrl(url) {
    navigator.clipboard.writeText(url);
    alert('Direct share link copied to clipboard!');
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
    
    <div class="neo-box-xl bg-[#FAF7EE] w-full max-w-5xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
      
      <!-- Modal Header -->
      <div class="bg-[#FF70A6] border-b-3 border-black p-4 flex items-center justify-between text-white">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-black text-[#86EFAC] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_#000]">
            <Edit3 class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-display font-black text-xl text-black">Template Scheme Editor Studio</h3>
              <span class="bg-black text-[#86EFAC] text-[10px] font-mono font-bold px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000]">
                ISOLATED MODE — Personal Workspace Untouched
              </span>
            </div>
            <p class="text-xs font-mono text-zinc-900 font-bold">Edit university courses, subjects, and credits directly without modifying your active GPA calculations.</p>
          </div>
        </div>

        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-black hover:text-white text-black p-1.5 rounded-sm"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Editor Content Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        
        <!-- Published Share Result Banner -->
        {#if publishSuccess}
          <div class="neo-box bg-[#DCFCE7] p-4 border-2 border-black space-y-3 animate-in fade-in zoom-in-95">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 font-mono text-xs font-black text-[#166534]">
                <Sparkles class="w-4 h-4 text-green-700" />
                <span>{publishSuccess.isUpdate ? '✅ Cloud Scheme Updated Successfully!' : '🎉 Published to Cloud Successfully!'}</span>
              </div>
              <span class="font-mono text-[10px] font-bold bg-white border border-black px-1.5 py-0.5">ID: {publishSuccess.docId}</span>
            </div>

            <div>
              <label for="editor-share-url-input" class="block text-[11px] font-mono font-bold text-black mb-1">Direct Teammate Share Link:</label>
              <div class="flex items-center gap-2">
                <input 
                  id="editor-share-url-input"
                  type="text" 
                  readonly 
                  value={publishSuccess.shareUrl}
                  class="neo-input text-xs font-mono font-bold bg-white flex-1 select-all"
                />
                <button 
                  onclick={() => handleCopyShareUrl(publishSuccess.shareUrl)}
                  class="neo-btn bg-[#FFDE59] hover:bg-amber-400 text-black px-3 py-2 text-xs font-black flex items-center gap-1 shrink-0"
                >
                  <Copy class="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        {/if}

        <!-- SECTION A: TEMPLATE CONFIGURATION & METADATA -->
        <div class="neo-box bg-white p-5 space-y-4 border-2">
          <h4 class="font-display font-black text-base text-black flex items-center gap-2 border-b-2 border-black/10 pb-2">
            <Cloud class="w-4 h-4 text-[#38BDF8]" />
            <span>Scheme Metadata & Passcode Lock</span>
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <!-- Template ID Suffix -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="editor-id-suffix" class="text-xs font-mono font-bold text-black">Template ID * (Prefix: TMP-)</label>
                {#if idCheckStatus === 'idle'}
                  <span class="text-[10px] text-zinc-500 font-mono">Enter 3-8 chars</span>
                {:else if idCheckStatus === 'checking'}
                  <span class="text-[10px] text-zinc-500 font-mono">Checking...</span>
                {:else if idCheckStatus === 'available'}
                  <span class="text-[10px] text-green-700 font-mono font-bold bg-green-100 border border-green-800 px-1">✅ Available ID</span>
                {:else if idCheckStatus === 'taken'}
                  <span class="text-[10px] text-amber-900 font-mono font-bold bg-amber-100 border border-amber-800 px-1">⚠️ ID Taken (Passcode Required)</span>
                {:else if idCheckStatus === 'invalid'}
                  <span class="text-[10px] text-red-600 font-mono font-bold">Min 3 chars</span>
                {/if}
              </div>

              <div class="flex items-center">
                <span class="bg-black text-[#FFDE59] text-xs font-mono font-black px-3 py-2 border-2 border-black border-r-0 shadow-[1.5px_1.5px_0px_0px_#000] shrink-0">
                  TMP-
                </span>
                <input 
                  id="editor-id-suffix"
                  type="text" 
                  placeholder="e.g. pt2023"
                  bind:value={docIdSuffix}
                  oninput={handleSuffixInput}
                  maxlength="8"
                  class="neo-input text-xs font-mono font-black py-2 uppercase"
                />
              </div>
            </div>

            <!-- Secret Passcode -->
            <div>
              <label for="editor-passcode" class="block text-xs font-mono font-bold text-black mb-1 flex items-center gap-1">
                <Lock class="w-3.5 h-3.5 text-amber-600" />
                <span>Secret Passcode * (min 4 chars)</span>
              </label>
              <input 
                id="editor-passcode"
                type="password" 
                placeholder="Enter secret passcode to lock editing..."
                bind:value={passcode}
                class="neo-input text-xs font-mono font-bold py-2"
              />
            </div>

            <!-- Institution -->
            <div>
              <label for="editor-inst" class="block text-xs font-mono font-bold text-black mb-1">Institution / University</label>
              <input 
                id="editor-inst"
                type="text" 
                placeholder="e.g. Anna University"
                bind:value={institution}
                class="neo-input text-xs font-semibold py-2"
              />
            </div>

            <!-- Branch -->
            <div>
              <label for="editor-branch" class="block text-xs font-mono font-bold text-black mb-1">Branch / Major</label>
              <input 
                id="editor-branch"
                type="text" 
                placeholder="e.g. Production Engineering"
                bind:value={branch}
                class="neo-input text-xs font-semibold py-2"
              />
            </div>

            <!-- Batch Year -->
            <div>
              <label for="editor-year" class="block text-xs font-mono font-bold text-black mb-1">Batch Year</label>
              <input 
                id="editor-year"
                type="text" 
                placeholder="e.g. 2023"
                bind:value={year}
                class="neo-input text-xs font-semibold py-2"
              />
            </div>

            <!-- Description -->
            <div>
              <label for="editor-desc" class="block text-xs font-mono font-bold text-black mb-1">Description</label>
              <input 
                id="editor-desc"
                type="text" 
                placeholder="e.g. 1st to 6th semesters scheme"
                bind:value={description}
                class="neo-input text-xs font-semibold py-2"
              />
            </div>

          </div>
        </div>

        <!-- SECTION B: SEMESTERS AND SUBJECT COURSES EDITOR -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-display font-black text-lg text-black flex items-center gap-2">
              <BookOpen class="w-5 h-5 text-[#FF70A6]" />
              <span>Semesters & Course Subjects ({semesters.length} Semesters)</span>
            </h4>

            <button 
              onclick={handleAddSemester}
              class="neo-btn bg-[#FFDE59] text-black px-3 py-1.5 text-xs font-black flex items-center gap-1.5"
            >
              <Plus class="w-4 h-4 stroke-[3]" />
              <span>Add Semester</span>
            </button>
          </div>

          <!-- Semesters List -->
          <div class="space-y-4">
            {#each semesters as sem, semIdx (sem.id || semIdx)}
              <div class="neo-box bg-white p-4 space-y-3 border-2">
                
                <!-- Semester Header Row -->
                <div class="flex items-center justify-between gap-3 border-b-2 border-black/10 pb-2">
                  <div class="flex items-center gap-2 flex-1">
                    <span class="w-3 h-3 bg-[#FF70A6] border border-black shrink-0"></span>
                    <input 
                      type="text" 
                      bind:value={sem.name} 
                      placeholder="Semester Name (e.g. Semester 1)"
                      class="neo-input text-xs font-black py-1 px-2 max-w-xs"
                    />
                    <span class="text-xs font-mono font-bold text-zinc-500">({sem.courses.length} subjects)</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <button 
                      onclick={() => handleAddCourse(semIdx)}
                      class="neo-btn bg-[#86EFAC] text-black px-2.5 py-1 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus class="w-3.5 h-3.5" />
                      <span>Add Course</span>
                    </button>

                    {#if semesters.length > 1}
                      <button 
                        onclick={() => handleRemoveSemester(semIdx)}
                        class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white text-zinc-600 p-1 text-xs"
                        title="Delete Semester"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Course Table -->
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs font-mono">
                    <thead>
                      <tr class="bg-[#FAF7EE] border-b-2 border-black text-black">
                        <th class="p-2 w-28 font-black">Course Code</th>
                        <th class="p-2 font-black">Course / Subject Name</th>
                        <th class="p-2 w-24 font-black">Credits</th>
                        <th class="p-2 w-12 text-center font-black">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y border-b border-black">
                      {#each sem.courses as course, cIdx (cIdx)}
                        <tr class="hover:bg-amber-50/50">
                          <td class="p-1.5">
                            <input 
                              type="text" 
                              bind:value={course.code} 
                              placeholder="e.g. CV315"
                              class="neo-input text-xs font-mono font-bold py-1 px-2 w-full uppercase"
                            />
                          </td>
                          <td class="p-1.5">
                            <input 
                              type="text" 
                              bind:value={course.name} 
                              placeholder="e.g. ENGINEERING CHEMISTRY"
                              class="neo-input text-xs font-semibold py-1 px-2 w-full"
                            />
                          </td>
                          <td class="p-1.5">
                            <input 
                              type="number" 
                              bind:value={course.credits} 
                              min="0"
                              max="30"
                              class="neo-input text-xs font-mono font-black py-1 px-2 w-full text-center"
                            />
                          </td>
                          <td class="p-1.5 text-center">
                            <button 
                              onclick={() => handleRemoveCourse(semIdx, cIdx)}
                              class="neo-btn bg-white hover:bg-red-500 hover:text-white text-zinc-500 p-1 rounded-xs"
                              title="Delete Course"
                            >
                              <Trash2 class="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>

              </div>
            {/each}
          </div>
        </div>

        <!-- SECTION C: ANTI-BOT CAPTCHA & PUBLISH ACTION -->
        <div class="neo-box bg-[#FFFDF5] p-4 space-y-4 border-2">
          
          <!-- Anti-Bot Alphanumeric Captcha Widget (No Tick Badge) -->
          <div class="neo-box bg-[#FAF7EE] p-3.5 border-2 border-black space-y-2">
            <div class="flex items-center justify-between gap-2">
              <label for="editor-captcha-input" class="text-xs font-mono font-bold text-black flex items-center gap-1.5">
                <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Anti-Bot Verification (Case-Sensitive Match)</span>
              </label>

              <button 
                type="button"
                onclick={resetCaptcha}
                class="neo-btn bg-white hover:bg-zinc-100 p-1 text-xs"
                title="Refresh Captcha Code"
              >
                <RefreshCw class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="flex items-center gap-3">
              <div class="bg-[#FFDE59] border-2 border-black px-3 py-1.5 font-mono text-base font-black tracking-widest text-black shadow-[2px_2px_0px_0px_#000] select-none italic underline decoration-wavy decoration-black/40 shrink-0">
                {captchaCode}
              </div>

              <input 
                id="editor-captcha-input"
                type="text" 
                placeholder="Type code (e.g. {captchaCode})"
                bind:value={captchaUserAnswer}
                class="neo-input text-xs font-mono font-bold py-2 px-3 flex-1"
              />
            </div>
          </div>

          <!-- Error Message Banner -->
          {#if publishError}
            <div class="neo-box bg-[#FFD1D1] border-2 border-black p-3 text-xs font-mono font-black text-black flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]">
              <AlertTriangle class="w-4 h-4 text-red-700 shrink-0 stroke-[2.5]" />
              <span class="text-black font-black">{publishError}</span>
            </div>
          {/if}

          <!-- Action Buttons -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onclick={handlePublishToCloud}
              disabled={isPublishing || !isCaptchaVerified || (!isDirty && !isJustUploaded) || (cooldownRemaining > 0 && !isJustUploaded)}
              class="neo-btn py-3 text-xs font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#000] transition-colors {isJustUploaded ? 'bg-[#4ADE80] text-black border-2 border-black font-black' : cooldownRemaining > 0 ? 'bg-zinc-200 text-black border-2 border-black font-black opacity-100' : !isDirty ? 'bg-zinc-100 text-zinc-800 opacity-70 border-2 border-black' : 'bg-[#38BDF8] hover:bg-[#0ea5e9] text-black'}"
            >
              <Cloud class="w-4 h-4 text-black stroke-[2.5]" />
              <span class="text-black font-black">
                {#if isJustUploaded}
                  🎉 Scheme Uploaded Successfully!
                {:else if cooldownRemaining > 0}
                  ⏳ Cooldown Lock ({cooldownRemaining}s)
                {:else if !isDirty}
                  🔒 Save Disabled (No Changes Made)
                {:else if idCheckStatus === 'taken'}
                  ✏️ Update Cloud Template (TMP-{docIdSuffix})
                {:else}
                  🚀 Publish Cloud Template (TMP-{docIdSuffix})
                {/if}
              </span>
            </button>

            <button 
              onclick={handleApplyToWorkspace}
              class="neo-btn bg-[#FFDE59] hover:bg-amber-400 text-black py-3 text-xs font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#000]"
            >
              <FolderCheck class="w-4 h-4" />
              <span>📂 Load Scheme to My Personal Workspace</span>
            </button>
          </div>

        </div>

      </div>

      <!-- Modal Footer -->
      <div class="bg-[#FAF7EE] border-t-3 border-black p-4 flex items-center justify-between">
        <span class="text-xs font-mono font-bold text-zinc-600">
          Editing this scheme in studio mode does not alter your active GPA calculation.
        </span>

        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-zinc-100 text-black px-5 py-2 text-xs font-bold"
        >
          Close Studio Editor
        </button>
      </div>

    </div>
  </div>
{/if}
