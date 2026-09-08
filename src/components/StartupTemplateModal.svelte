<script>
  import { gpaStore } from '../store/gpaStore.js';
  import { templateStore } from '../store/templateStore.js';
  import { fetchOnlineTemplates } from '../utils/firebaseService.js';
  import { 
    X, FolderOpen, UploadCloud, Search, Sparkles, FileJson, 
    ArrowRight, Loader2, Plus, AlertCircle
  } from 'lucide-svelte';

  let { isOpen = false, onClose = () => {} } = $props();

  let searchInput = $state('');
  let activeSearchQuery = $state('');
  let onlineTemplates = $state([]);
  let isLoading = $state(true);
  let isDraggingJson = $state(false);
  let errorMessage = $state('');
  let fileInputRef = $state(null);

  // Pre-configured fallback templates if offline or firestore takes time
  const FALLBACK_TEMPLATES = [
    {
      id: 'aupt202316',
      name: 'Anna university , Production Engineering, 2023(1-6sem)',
      description: 'Subject details for the production 2023 batch 1st to 6th semesters.',
      maxGpa: 10,
      semesters: [
        {
          id: 1,
          name: 'Semester 1',
          courses: [
            { code: 'IP3151', name: 'Induction Programme', credits: 0 },
            { code: 'HS3151', name: 'Professional English I', credits: 3 },
            { code: 'MA3151', name: 'Matrices and Calculus', credits: 4 },
            { code: 'PH3151', name: 'Engineering Physics', credits: 3 },
            { code: 'CY3151', name: 'Engineering Chemistry', credits: 3 },
            { code: 'GE3151', name: 'Problem Solving and Python Programming', credits: 3 }
          ]
        },
        {
          id: 2,
          name: 'Semester 2',
          courses: [
            { code: 'HS3251', name: 'Professional English II', credits: 2 },
            { code: 'MA3251', name: 'Statistics and Numerical Methods', credits: 4 },
            { code: 'BE3251', name: 'Basic Electrical & Electronics', credits: 3 }
          ]
        }
      ]
    },
    {
      id: 'aucse2021',
      name: 'Anna University , Computer Science & Engineering, 2021 Regulation',
      description: 'Official 8-semester course curriculum scheme for Computer Science & Engineering.',
      maxGpa: 10,
      semesters: [
        {
          id: 1,
          name: 'Semester 1',
          courses: [
            { code: 'HS3151', name: 'Professional English I', credits: 3 },
            { code: 'MA3151', name: 'Matrices and Calculus', credits: 4 },
            { code: 'PH3151', name: 'Engineering Physics', credits: 3 },
            { code: 'CY3151', name: 'Engineering Chemistry', credits: 3 }
          ]
        }
      ]
    },
    {
      id: 'us_standard_40',
      name: 'US University , Computer Science, Standard 4.0 Scheme',
      description: 'Standard 4.0 Max Scale college course layout.',
      maxGpa: 4,
      semesters: [
        {
          id: 1,
          name: 'Freshman Fall',
          courses: [
            { code: 'MATH101', name: 'Calculus I', credits: 4 },
            { code: 'ENG101', name: 'College Composition', credits: 3 },
            { code: 'CS101', name: 'Intro to Computer Science', credits: 4 }
          ]
        }
      ]
    }
  ];

  // Fetch online templates when modal opens
  $effect(() => {
    if (isOpen) {
      loadOnlineTemplates('');
    }
  });

  async function loadOnlineTemplates(query = '') {
    isLoading = true;
    errorMessage = '';
    try {
      const docs = await fetchOnlineTemplates(query);
      if (docs && docs.length > 0) {
        onlineTemplates = docs;
      } else {
        if (query) {
          const q = query.toLowerCase();
          onlineTemplates = FALLBACK_TEMPLATES.filter(t => 
            t.name.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q)
          );
        } else {
          onlineTemplates = FALLBACK_TEMPLATES;
        }
      }
    } catch (e) {
      console.error('Error loading online templates', e);
      onlineTemplates = FALLBACK_TEMPLATES;
    } finally {
      isLoading = false;
    }
  }

  function handleExecuteSearch() {
    activeSearchQuery = searchInput.trim();
    loadOnlineTemplates(activeSearchQuery);
  }

  function handleSelectTemplate(template) {
    try {
      gpaStore.loadTemplate(template);
      onClose();
    } catch (err) {
      errorMessage = err.message || 'Failed to load template';
    }
  }

  function handleFileRead(file) {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      errorMessage = 'Please select a valid .json template file.';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const imported = templateStore.importFromJson(text);
        gpaStore.loadTemplate(imported);
        onClose();
      } catch (err) {
        console.error('JSON parse error', err);
        errorMessage = err.message || 'Invalid JSON format.';
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    isDraggingJson = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileRead(files[0]);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    isDraggingJson = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    isDraggingJson = false;
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileRead(files[0]);
    }
  }
</script>

{#if isOpen}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="startup-modal-title"
  >
    <!-- Modal Container -->
    <div class="neo-box bg-[#FAF7EE] w-full max-w-3xl overflow-hidden shadow-[8px_8px_0px_0px_#000] my-auto flex flex-col max-h-[92vh]">
      
      <!-- Header Bar -->
      <div class="bg-[#FFDE59] border-b-3 border-black p-3 sm:p-4 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2 text-black">
          <div class="w-9 h-9 bg-black text-[#FFDE59] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_#000]">
            <FolderOpen class="w-5 h-5" />
          </div>
          <div>
            <h2 id="startup-modal-title" class="font-display font-black text-lg sm:text-xl text-black tracking-tight">
              START WITH A CURRICULUM TEMPLATE
            </h2>
            <p class="text-xs font-mono text-black/80 font-bold">
              Pick an online university scheme, import a JSON backup, or start blank
            </p>
          </div>
        </div>
        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-black hover:text-white p-1.5 sm:p-2 text-black transition-colors"
          title="Start Blank Workspace"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
        
        {#if errorMessage}
          <div class="neo-box bg-[#FF70A6] text-white p-3 flex items-center justify-between text-xs font-mono font-bold">
            <div class="flex items-center gap-2">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onclick={() => errorMessage = ''} class="underline">Dismiss</button>
          </div>
        {/if}

        <!-- SECTION 1: Online University Templates Header & Search -->
        <div class="space-y-3">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-black/10 pb-3">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-[#FF8E3C]" />
              <h3 class="font-display font-black text-sm text-black uppercase tracking-wider">
                Online University Schemes
              </h3>
            </div>
            
            <!-- Search Bar with Explicit Search Button -->
            <div class="flex items-center gap-1.5 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Search CSE, ECE, Anna..." 
                bind:value={searchInput}
                onkeydown={(e) => e.key === 'Enter' && handleExecuteSearch()}
                class="neo-input text-xs font-mono py-1.5 px-3 bg-white min-w-[200px] flex-1 sm:flex-initial"
              />
              <button 
                onclick={handleExecuteSearch}
                class="neo-btn bg-[#38BDF8] hover:bg-[#0ea5e9] text-black font-black text-xs px-3.5 py-1.5 flex items-center gap-1.5 shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]"
                title="Search templates"
              >
                <Search class="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Search</span>
              </button>
            </div>
          </div>

          <!-- Templates Cards List -->
          {#if isLoading}
            <div class="p-8 text-center space-y-2 neo-box bg-white">
              <Loader2 class="w-6 h-6 animate-spin text-black mx-auto" />
              <p class="text-xs font-mono font-bold text-zinc-600">Fetching online university templates...</p>
            </div>
          {:else if onlineTemplates.length === 0}
            <div class="p-6 text-center neo-box bg-white space-y-1">
              <p class="text-xs font-mono font-black text-black text-sm">No matching online templates found</p>
              <p class="text-xs font-mono text-zinc-600">
                "{activeSearchQuery}" did not return any published schemes. Try searching for "Anna" or "CSE".
              </p>
            </div>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {#each onlineTemplates as tpl (tpl.id || tpl.docId)}
                {@const nameParts = (tpl.name || '').split(',').map(p => p.trim())}
                {@const instName = tpl.institution || nameParts[0] || 'University Scheme'}
                {@const branchName = tpl.branch || nameParts[1] || ''}
                {@const yearVal = tpl.year || nameParts[2] || ''}
                {@const semCount = tpl.semestersCount || (tpl.semesters || []).length}
                {@const courseCount = tpl.coursesCount || (tpl.semesters || []).reduce((sum, s) => sum + (s.courses || []).length, 0)}

                <div class="neo-box bg-white p-4 flex flex-col justify-between space-y-3 hover:shadow-brutal-lg transition-shadow border-2">
                  <div class="space-y-2">
                    
                    <!-- Card Top Row: Institution + Scale Badge -->
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-1 text-xs font-mono font-bold text-amber-800 uppercase tracking-wide">
                          <span>🏛️</span>
                          <span>{instName}</span>
                        </div>
                        {#if branchName}
                          <h4 class="font-display font-black text-sm text-black leading-snug mt-0.5">
                            {branchName} {#if yearVal}<span class="text-zinc-500 font-mono text-xs font-normal">({yearVal})</span>{/if}
                          </h4>
                        {:else}
                          <h4 class="font-display font-black text-sm text-black leading-snug mt-0.5">
                            {tpl.name}
                          </h4>
                        {/if}
                      </div>
                      <span class="neo-badge bg-[#FFF4B8] text-black text-[10px] font-bold border border-black shadow-[1px_1px_0px_0px_#000] shrink-0">
                        {tpl.maxGpa || 10}.0 SCALE
                      </span>
                    </div>

                    <!-- Description Box -->
                    <div class="bg-[#FFFDF5] border border-black/20 p-2 text-xs font-mono text-zinc-700 leading-relaxed line-clamp-2">
                      {tpl.description || 'Subject details & curriculum course scheme.'}
                    </div>

                    <!-- Stats Row -->
                    <div class="flex items-center justify-between text-[10px] font-mono text-zinc-600 font-bold pt-1">
                      <span>📚 {semCount} Semesters</span>
                      <span>•</span>
                      <span>📝 {courseCount} Courses</span>
                    </div>

                  </div>

                  <!-- Use Template Button -->
                  <button 
                    onclick={() => handleSelectTemplate(tpl)}
                    class="neo-btn bg-[#86EFAC] hover:bg-[#4ADE80] text-black text-xs font-black py-2 w-full flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
                  >
                    <span>Use Template</span>
                    <ArrowRight class="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- SECTION 2: Drag & Drop JSON Import Area -->
        <div class="space-y-2">
          <div class="flex items-center gap-2 border-b-2 border-black/10 pb-1.5">
            <FileJson class="w-4 h-4 text-[#38BDF8]" />
            <h3 class="font-display font-black text-sm text-black uppercase tracking-wider">
              Import Custom JSON File or Backup
            </h3>
          </div>

          <!-- Drag & Drop Target Box -->
          <button 
            type="button"
            ondrop={handleDrop}
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            onclick={() => fileInputRef && fileInputRef.click()}
            class="w-full neo-box p-5 text-center cursor-pointer transition-all border-2 border-dashed border-black {isDraggingJson ? 'bg-[#FFF4B8] border-solid scale-[0.99]' : 'bg-white hover:bg-[#FAF7EE]'}"
          >
            <input 
              type="file" 
              accept=".json"
              bind:this={fileInputRef}
              onchange={handleFileSelect}
              class="hidden"
            />
            
            <div class="w-10 h-10 bg-[#38BDF8] border-2 border-black mx-auto flex items-center justify-center text-black mb-2 shadow-[2px_2px_0px_0px_#000]">
              <UploadCloud class="w-5 h-5 stroke-[2.5]" />
            </div>

            <h4 class="font-display font-black text-sm text-black">
              {isDraggingJson ? 'Drop JSON File Here!' : 'Drag & Drop .json File Here'}
            </h4>
            <p class="text-xs font-mono text-zinc-600 mt-0.5">
              or <span class="text-black font-bold underline">click to browse</span> workspace backup / scheme files
            </p>
          </button>
        </div>

      </div>

      <!-- Modal Footer Bar -->
      <div class="bg-white border-t-3 border-black p-3 sm:p-4 flex items-center justify-between shrink-0">
        <div class="text-[11px] font-mono text-zinc-500 hidden sm:block">
          Prefer to add subjects manually? Start with an empty sheet!
        </div>

        <button 
          onclick={onClose}
          class="neo-btn bg-[#FAF7EE] hover:bg-black hover:text-white text-black font-black text-xs px-5 py-2 flex items-center gap-2 border-2 border-black shadow-[2px_2px_0px_0px_#000] ml-auto"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>START BLANK WORKSPACE</span>
        </button>
      </div>

    </div>
  </div>
{/if}
