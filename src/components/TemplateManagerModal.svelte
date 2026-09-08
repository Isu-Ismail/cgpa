<script>
  import { gpaStore } from '../store/gpaStore.js';
  import { templateStore } from '../store/templateStore.js';
  import { fetchOnlineTemplates } from '../utils/firebaseService.js';
  import ConfirmModal from './ConfirmModal.svelte';
  import { X, Search, Upload, Download, Trash2, Check, Copy, FolderCheck, FolderOpen, FileJson, Cloud, RefreshCw } from 'lucide-svelte';

  let { isOpen = false, initialTab = 'online', onClose = () => {} } = $props();

  let searchQuery = $state('');
  let activeTab = $state('online'); // 'online' | 'export' | 'library' | 'import'

  // Online Cloud Templates State
  let onlineTemplates = $state([]);
  let isLoadingCloud = $state(false);
  let cloudError = $state('');

  // Export metadata inputs
  let exportTplName = $state('');
  let exportTplId = $state('');
  let exportTplDesc = $state('');

  // Import JSON text state
  let importJsonText = $state('');
  let importError = $state('');
  let copyFeedbackId = $state('');
  let actionToastMessage = $state('');

  // Confirm Modal state for template loading
  let pendingLoadTpl = $state(null);
  let isLoadConfirmOpen = $state(false);

  $effect(() => {
    if (isOpen) {
      activeTab = initialTab || 'online';
      exportTplName = '';
      exportTplId = '';
      exportTplDesc = '';
      actionToastMessage = '';
      loadOnlineTemplates();
    }
  });

  async function loadOnlineTemplates() {
    isLoadingCloud = true;
    cloudError = '';
    try {
      onlineTemplates = await fetchOnlineTemplates();
    } catch (err) {
      cloudError = err.message || 'Failed to load online templates';
    } finally {
      isLoadingCloud = false;
    }
  }

  let filteredLocalTemplates = $derived(
    $templateStore.filter(t => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (t.name || '').toLowerCase().includes(q) ||
             (t.id || '').toLowerCase().includes(q);
    })
  );

  let filteredOnlineTemplates = $derived(
    onlineTemplates.filter(t => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (t.name || '').toLowerCase().includes(q) ||
             (t.docId || '').toLowerCase().includes(q) ||
             (t.id || '').toLowerCase().includes(q);
    })
  );

  function triggerToast(msg) {
    actionToastMessage = msg;
    setTimeout(() => { actionToastMessage = ''; }, 2500);
  }

  function getExportMetadata() {
    return {
      templateId: exportTplId.trim() || $gpaStore.templateId || `tpl-${Date.now().toString(36)}`,
      templateName: exportTplName.trim() || $gpaStore.templateName || 'Academic Course Template',
      templateDesc: exportTplDesc.trim() || $gpaStore.templateDescription || ''
    };
  }

  function handleExportCleanJson() {
    const meta = getExportMetadata();
    templateStore.exportAsCleanJson({
      templateId: meta.templateId,
      templateName: meta.templateName,
      templateDesc: meta.templateDesc,
      maxGpa: $gpaStore.maxGpa,
      gradePoints: $gpaStore.gradePoints,
      semesters: $gpaStore.semesters
    });
    triggerToast('Exported clean template JSON!');
  }

  function handleExportFullDataBackup() {
    const meta = getExportMetadata();
    templateStore.exportAsFullUserDataJson({
      templateId: meta.templateId,
      templateName: meta.templateName,
      templateDesc: meta.templateDesc,
      maxGpa: $gpaStore.maxGpa,
      gradePoints: $gpaStore.gradePoints,
      semesters: $gpaStore.semesters
    });
    triggerToast('Exported full workspace backup JSON!');
  }

  function handleSaveToLocalLibrary() {
    const meta = getExportMetadata();
    templateStore.saveTemplate({
      id: meta.templateId,
      name: meta.templateName,
      description: meta.templateDesc,
      maxGpa: $gpaStore.maxGpa,
      gradePoints: $gpaStore.gradePoints,
      semesters: $gpaStore.semesters
    });
    triggerToast(`Template "${meta.templateName}" saved to local library!`);
  }

  function promptLoadTemplate(tpl) {
    pendingLoadTpl = tpl;
    isLoadConfirmOpen = true;
  }

  function confirmLoadTemplate() {
    if (pendingLoadTpl) {
      gpaStore.loadTemplate(pendingLoadTpl);
      onClose();
    }
  }

  function handleCopyId(id) {
    navigator.clipboard.writeText(id);
    copyFeedbackId = id;
    setTimeout(() => { copyFeedbackId = ''; }, 1500);
  }

  function handleImportJson() {
    importError = '';
    try {
      if (!importJsonText.trim()) {
        throw new Error('Please paste JSON text.');
      }
      const imported = templateStore.importFromJson(importJsonText);
      gpaStore.loadTemplate(imported);
      importJsonText = '';
      onClose();
    } catch (err) {
      importError = err.message;
    }
  }

  function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const imported = templateStore.importFromJson(text);
        gpaStore.loadTemplate(imported);
        onClose();
      } catch (err) {
        importError = `Error importing file: ${err.message}`;
      }
    };
    reader.readAsText(file);
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
    
    <div class="neo-box-xl bg-[#FAF7EE] w-full max-w-4xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
      
      <!-- Modal Header -->
      <div class="bg-[#38BDF8] border-b-3 border-black p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-black text-[#FFDE59] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_#000]">
            <FolderOpen class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-display font-black text-xl text-black">Template Config & Cloud Manager</h3>
            <p class="text-xs font-mono text-zinc-800 font-bold">Browse Firebase online templates (au, pt, 2023), export clean schemes, or restore backups</p>
          </div>
        </div>

        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-black hover:text-white text-black p-1.5 rounded-sm"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Action Toast Banner -->
      {#if actionToastMessage}
        <div class="bg-[#4ADE80] border-b-2 border-black p-2 px-4 flex items-center gap-2 text-xs font-mono font-bold text-black animate-in fade-in slide-in-from-top-1 duration-150">
          <Check class="w-4 h-4 text-black stroke-[3]" />
          <span>{actionToastMessage}</span>
        </div>
      {/if}

      <!-- Tab Switcher -->
      <div class="bg-white border-b-3 border-black px-4 pt-3 flex gap-2 overflow-x-auto">
        <!-- Tab 1: Online Templates -->
        <button 
          onclick={() => activeTab = 'online'}
          class="px-4 py-2 text-xs font-mono font-black border-2 border-black border-b-0 transition-colors flex items-center gap-1.5 {activeTab === 'online' ? 'bg-[#FFDE59] shadow-[2px_-2px_0px_0px_#000]' : 'bg-[#FAF7EE] hover:bg-zinc-100'}"
        >
          <Cloud class="w-3.5 h-3.5 text-black" />
          <span>Online Templates ({onlineTemplates.length})</span>
        </button>

        <!-- Tab 2: Import JSON Backup -->
        <button 
          onclick={() => activeTab = 'import'}
          class="px-4 py-2 text-xs font-mono font-black border-2 border-black border-b-0 transition-colors {activeTab === 'import' ? 'bg-[#FF70A6] text-white shadow-[2px_-2px_0px_0px_#000]' : 'bg-[#FAF7EE] hover:bg-zinc-100'}"
        >
          Import JSON Backup
        </button>

        <!-- Tab 3: Export Data / Template -->
        <button 
          onclick={() => activeTab = 'export'}
          class="px-4 py-2 text-xs font-mono font-black border-2 border-black border-b-0 transition-colors {activeTab === 'export' ? 'bg-[#86EFAC] shadow-[2px_-2px_0px_0px_#000]' : 'bg-[#FAF7EE] hover:bg-zinc-100'}"
        >
          Export Data / Template
        </button>

        <!-- Tab 4: Local Library -->
        <button 
          onclick={() => activeTab = 'library'}
          class="px-4 py-2 text-xs font-mono font-black border-2 border-black border-b-0 transition-colors {activeTab === 'library' ? 'bg-[#38BDF8] shadow-[2px_-2px_0px_0px_#000]' : 'bg-[#FAF7EE] hover:bg-zinc-100'}"
        >
          Local Library ({$templateStore.length})
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        
        <!-- Search bar for Online & Local tabs -->
        {#if activeTab === 'online' || activeTab === 'library'}
          <div class="relative flex items-center gap-2">
            <div class="relative flex-1 flex items-center">
              <Search class="w-5 h-5 text-black absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search templates (e.g. au, pt, 2023, aupt202316)..." 
                bind:value={searchQuery}
                oninput={loadOnlineTemplates}
                class="neo-input !pl-10 pr-4 py-2.5 text-sm font-semibold"
                style="padding-left: 2.5rem !important;"
              />
            </div>
            {#if activeTab === 'online'}
              <button 
                onclick={loadOnlineTemplates} 
                class="neo-btn bg-white hover:bg-zinc-100 p-2.5 text-xs font-bold"
                title="Refresh Cloud Templates"
              >
                <RefreshCw class="w-4 h-4 {isLoadingCloud ? 'animate-spin' : ''}" />
              </button>
            {/if}
          </div>
        {/if}

        <!-- TAB 0: ONLINE CLOUD TEMPLATES (FIREBASE FIRESTORE) -->
        {#if activeTab === 'online'}
          {#if isLoadingCloud}
            <div class="text-center py-12 bg-white border-2 border-black p-6 space-y-3">
              <div class="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p class="font-mono text-xs font-bold text-black">Fetching latest online templates from Firebase...</p>
            </div>
          {:else if filteredOnlineTemplates.length === 0}
            <div class="text-center py-12 bg-white border-2 border-black p-6 space-y-2">
              <p class="font-display font-black text-lg text-black">No online templates found matching "{searchQuery}"</p>
              <p class="text-xs font-mono text-zinc-500">Try searching for "au", "pt", or "2023" to find published university schemes.</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each filteredOnlineTemplates as tpl (tpl.docId || tpl.id)}
                {@const nameParts = (tpl.name || '').split(',').map(p => p.trim())}
                {@const instName = tpl.institution || nameParts[0] || 'University Scheme'}
                {@const branchName = tpl.branch || nameParts[1] || ''}
                {@const yearVal = tpl.year || nameParts[2] || ''}
                {@const semCount = tpl.semestersCount || (tpl.semesters || []).length}
                {@const courseCount = tpl.coursesCount || (tpl.semesters || []).reduce((sum, s) => sum + (s.courses || []).length, 0)}

                <div class="neo-box bg-white p-4 flex flex-col justify-between space-y-3 hover:shadow-brutal-lg transition-shadow border-2">
                  <div class="space-y-2">
                    
                    <!-- Card Top Row: Institution + Badge -->
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <div class="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-800 uppercase tracking-wide">
                          <span class="text-sm">🏛️</span>
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
                      <span class="neo-badge bg-[#86EFAC] text-black text-[10px] font-bold border border-black shadow-[1px_1px_0px_0px_#000] shrink-0">
                        CLOUD TEMPLATE
                      </span>
                    </div>

                    <!-- Description Box -->
                    <div class="bg-[#FFFDF5] border border-black/20 p-2.5 text-xs font-mono text-zinc-700 leading-relaxed">
                      {tpl.description || 'Subject details & curriculum course scheme.'}
                    </div>

                    <!-- Stats Row -->
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-zinc-600 font-semibold pt-1">
                      <span class="flex items-center gap-1"><strong class="text-black">{semCount}</strong> Semesters</span>
                      <span>•</span>
                      <span class="flex items-center gap-1"><strong class="text-black">{courseCount}</strong> Courses</span>
                      <span>•</span>
                      <span class="bg-[#FFF4B8] text-black px-1.5 py-0.5 border border-black font-bold text-[10px]">{tpl.maxGpa || 10}.0 Scale</span>
                    </div>

                  </div>

                  <!-- Action Button -->
                  <div class="pt-2 border-t-2 border-black/10">
                    <button 
                      onclick={() => promptLoadTemplate(tpl)}
                      class="neo-btn bg-[#FFDE59] hover:bg-amber-400 text-black px-3 py-2 text-xs font-black w-full flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
                    >
                      <FolderCheck class="w-4 h-4 text-black" />
                      <span>Import & Apply Scheme</span>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}

        <!-- TAB 1: EXPORT OPTIONS -->
        {#if activeTab === 'export'}
          <div class="neo-box bg-white p-5 space-y-4 max-w-xl mx-auto">
            <div>
              <h4 class="font-display font-black text-lg text-black">Export Workspace Data or Template Scheme</h4>
              <p class="text-xs font-mono text-zinc-600 mt-1">
                Choose between exporting a <strong>full backup with your grades</strong> or a <strong>clean template scheme</strong> to share with friends.
              </p>
            </div>

            <div class="space-y-3">
              <div>
                <label for="exp-tpl-name" class="block text-xs font-mono font-bold text-black mb-1">Scheme / Backup Name</label>
                <input 
                  id="exp-tpl-name"
                  type="text" 
                  placeholder="e.g. Anna University, Production Engineering, 2023"
                  bind:value={exportTplName}
                  class="neo-input text-xs font-bold py-2"
                />
                <p class="text-[10px] font-mono text-zinc-500 mt-1">Hint: Leave blank to use active scheme name ({$gpaStore.templateName || 'Academic Course Template'})</p>
              </div>

              <div>
                <label for="exp-tpl-id" class="block text-xs font-mono font-bold text-black mb-1">ID</label>
                <input 
                  id="exp-tpl-id"
                  type="text" 
                  placeholder="e.g. au_prod_2023"
                  bind:value={exportTplId}
                  class="neo-input text-xs font-mono py-2"
                />
                <p class="text-[10px] font-mono text-zinc-500 mt-1">Hint: Leave blank to auto-generate unique ID</p>
              </div>

              <div>
                <label for="exp-tpl-desc" class="block text-xs font-mono font-bold text-black mb-1">Description</label>
                <textarea 
                  id="exp-tpl-desc"
                  placeholder="e.g. Subject details for 2023 batch 1st to 6th semesters..."
                  bind:value={exportTplDesc}
                  rows="2"
                  class="neo-input text-xs font-medium py-2"
                ></textarea>
              </div>
            </div>

            <div class="pt-2 space-y-2.5">
              <!-- Export Full Data JSON with Grades -->
              <button 
                onclick={handleExportFullDataBackup}
                class="neo-btn bg-[#4ADE80] hover:bg-[#22c55e] text-black w-full py-2.5 text-xs font-black flex items-center justify-center gap-2"
              >
                <Download class="w-4 h-4 stroke-[2.5]" />
                <span>Export Full Data JSON (WITH Grades - Personal Backup)</span>
              </button>

              <!-- Export Clean Scheme JSON without Grades -->
              <button 
                onclick={handleExportCleanJson}
                class="neo-btn bg-white hover:bg-zinc-100 text-black w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <FileJson class="w-4 h-4 text-[#38BDF8]" />
                <span>Export Clean Template JSON (NO Grades - For Friends)</span>
              </button>

              <!-- Save to Local Library -->
              <button 
                onclick={handleSaveToLocalLibrary}
                class="neo-btn bg-[#FFDE59] text-black w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Check class="w-4 h-4" />
                <span>Save Scheme to Local Library</span>
              </button>
            </div>
          </div>
        {/if}

        <!-- TAB 2: LIBRARY / SEARCH BY ID -->
        {#if activeTab === 'library'}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#if filteredLocalTemplates.length === 0}
              <div class="col-span-2 text-center py-12 bg-white border-2 border-black p-6">
                <p class="font-display font-black text-lg text-black">No saved templates matching "{searchQuery}"</p>
                <p class="text-xs font-mono text-zinc-500 mt-1">Export your current scheme as a template or import a JSON file.</p>
              </div>
            {:else}
              {#each filteredLocalTemplates as tpl (tpl.id)}
                <div class="neo-box bg-white p-4 flex flex-col justify-between hover:shadow-brutal-lg transition-shadow">
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <h4 class="font-display font-black text-base text-black">{tpl.name}</h4>
                      <span class="neo-badge bg-[#FFDE59] text-black shrink-0">{tpl.maxGpa}pt Scale</span>
                    </div>

                    <p class="text-xs font-medium text-zinc-600 mb-3">{tpl.description}</p>

                    <!-- Template ID -->
                    <div class="flex items-center gap-1.5 mb-3 bg-[#FAF7EE] border border-black p-1.5 px-2 text-xs font-mono">
                      <span class="text-zinc-500 font-bold">ID:</span>
                      <code class="font-black text-black select-all flex-1 truncate">{tpl.id}</code>
                      <button 
                        onclick={() => handleCopyId(tpl.id)}
                        class="p-1 hover:bg-zinc-200 border border-black text-[10px]"
                        title="Copy Template ID"
                      >
                        {#if copyFeedbackId === tpl.id}
                          <Check class="w-3 h-3 text-green-600" />
                        {:else}
                          <Copy class="w-3 h-3 text-black" />
                        {/if}
                      </button>
                    </div>

                    <div class="text-[11px] font-mono text-zinc-500 space-y-1 mb-4">
                      <div>Semesters: <strong class="text-black">{tpl.semesters?.length || 0}</strong></div>
                      <div>Grades: <strong class="text-black">{Object.keys(tpl.gradePoints || {}).join(', ')}</strong></div>
                    </div>
                  </div>

                  <div class="pt-3 border-t-2 border-black/10 flex items-center justify-between gap-2">
                    <button 
                      onclick={() => promptLoadTemplate(tpl)}
                      class="neo-btn bg-[#4ADE80] hover:bg-[#22c55e] text-black px-3 py-1.5 text-xs font-black flex items-center gap-1 flex-1 justify-center"
                    >
                      <FolderCheck class="w-3.5 h-3.5" />
                      <span>Load Course Scheme</span>
                    </button>

                    <button 
                      onclick={() => templateStore.deleteTemplate(tpl.id)}
                      class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white text-zinc-500 p-1.5 text-xs"
                      title="Delete Template"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}

        <!-- TAB 3: IMPORT -->
        {#if activeTab === 'import'}
          <div class="neo-box bg-white p-5 space-y-4 max-w-xl mx-auto">
            <h4 class="font-display font-black text-lg text-black">Import JSON Backup or Template</h4>
            <p class="text-xs font-mono text-zinc-600">
              Upload any exported JSON file (Full Data Backup or Clean Scheme) to restore courses & grades.
            </p>

            <div class="p-4 border-2 border-dashed border-black bg-[#FAF7EE] text-center space-y-2">
              <input 
                type="file" 
                accept=".json,application/json" 
                onchange={handleFileImport}
                id="tpl-file-upload-input" 
                class="hidden"
              />
              <label 
                for="tpl-file-upload-input"
                class="neo-btn bg-[#38BDF8] text-black px-4 py-2 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Upload class="w-4 h-4" />
                <span>Upload .JSON File</span>
              </label>
              <p class="text-[11px] font-mono text-zinc-500 font-semibold">Or paste JSON text below</p>
            </div>

            <div>
              <label for="import-json-area" class="block text-xs font-mono font-bold text-black mb-1">Paste JSON Text</label>
              <textarea 
                id="import-json-area"
                bind:value={importJsonText}
                rows="6"
                placeholder={'Paste JSON object...'}
                class="neo-input text-xs font-mono py-2 bg-zinc-50"
              ></textarea>
            </div>

            {#if importError}
              <p class="text-xs font-mono font-bold text-red-600 bg-red-50 p-2 border border-red-300">
                {importError}
              </p>
            {/if}

            <button 
              onclick={handleImportJson}
              class="neo-btn bg-[#FF70A6] text-white w-full py-2.5 text-xs font-black flex items-center justify-center gap-1.5"
            >
              <Check class="w-4 h-4 stroke-[3]" />
              <span>Import & Apply Workspace / Template</span>
            </button>
          </div>
        {/if}

      </div>

      <!-- Modal Footer -->
      <div class="bg-[#FAF7EE] border-t-3 border-black p-4 flex items-center justify-end">
        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-zinc-100 text-black px-5 py-2 text-xs font-bold"
        >
          Close
        </button>
      </div>

    </div>
  </div>
{/if}

<!-- Custom Load Scheme Confirm Modal -->
<ConfirmModal 
  isOpen={isLoadConfirmOpen}
  title="Load {pendingLoadTpl?.name || 'Template'}?"
  message="Loading this course scheme will update your workspace with the template's course list. Are you sure?"
  type="confirm"
  confirmText="Load Scheme"
  onConfirm={confirmLoadTemplate}
  onClose={() => { isLoadConfirmOpen = false; pendingLoadTpl = null; }}
/>
