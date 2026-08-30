<script>
  import { gpaStore } from '../store/gpaStore.js';
  import { templateStore } from '../store/templateStore.js';
  import ConfirmModal from './ConfirmModal.svelte';
  import Logo from './Logo.svelte';
  import { ScanLine, Sliders, FolderOpen, Target, RotateCcw, FileJson, Download } from 'lucide-svelte';

  let { 
    onOpenOcr = () => {},
    onOpenScale = () => {},
    onOpenTemplates = () => {},
    onOpenTarget = () => {}
  } = $props();

  let isResetConfirmOpen = $state(false);

  function handleExportCleanTemplate() {
    templateStore.exportAsCleanJson({
      templateId: $gpaStore.templateId,
      templateName: $gpaStore.templateName,
      templateDesc: $gpaStore.templateDescription,
      maxGpa: $gpaStore.maxGpa,
      gradePoints: $gpaStore.gradePoints,
      semesters: $gpaStore.semesters
    });
  }

  function handleExportFullDataBackup() {
    templateStore.exportAsFullUserDataJson({
      templateId: $gpaStore.templateId,
      templateName: $gpaStore.templateName,
      templateDesc: $gpaStore.templateDescription,
      maxGpa: $gpaStore.maxGpa,
      gradePoints: $gpaStore.gradePoints,
      semesters: $gpaStore.semesters
    });
  }

  function confirmResetAll() {
    gpaStore.resetAll();
  }
</script>

<header class="w-full bg-[#FAF7EE] border-b-2 sm:border-b-3 border-black sticky top-0 z-30 px-3 sm:px-6 py-2 shadow-xs">
  <div class="max-w-7xl mx-auto flex flex-row items-center justify-between gap-2">
    
    <!-- Logo & Title -->
    <div class="flex items-center gap-2.5 shrink-0">
      <Logo size="md" class="rotate-[-2deg]" />
      <div>
        <div class="flex items-center gap-1.5">
          <h1 class="font-display font-black text-lg sm:text-2xl tracking-tight text-black flex items-center gap-1">
            Neo<span class="bg-[#FF8E3C] px-1 py-0.2 border border-black shadow-[1.5px_1.5px_0px_0px_#000] text-white">CGPA</span>
          </h1>
          <span class="neo-badge bg-[#86EFAC] text-black font-black text-[9px] sm:text-[10px] py-0 px-1">v2.0</span>
        </div>
        <p class="text-[10px] sm:text-[11px] font-mono font-semibold text-zinc-600 hidden sm:block">Compact Retro GPA Calculator</p>
      </div>
    </div>

    <!-- Quick Action Toolbar (Scrollable & Icon-Only on Mobile!) -->
    <div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full py-0.5 no-scrollbar whitespace-nowrap">
      
      <!-- Marksheet Scanner OCR Button -->
      <button 
        onclick={onOpenOcr} 
        class="neo-btn bg-[#FF70A6] hover:bg-[#ff5b98] text-white px-2 sm:px-2.5 py-1 text-xs font-black flex items-center gap-1 shrink-0"
        title="Scan marksheet image"
      >
        <ScanLine class="w-3.5 h-3.5 stroke-[2.5]" />
        <span class="hidden sm:inline">Scan Sheet</span>
        <span class="bg-black text-[#FFDE59] text-[9px] px-1 py-0 rounded-xs font-bold">OCR</span>
      </button>

      <!-- Grade Scale -->
      <button 
        onclick={onOpenScale} 
        class="neo-btn bg-[#FFF4B8] hover:bg-[#FFDE59] text-black px-2 sm:px-2.5 py-1 text-xs font-bold flex items-center gap-1 shrink-0"
        title="Configure Scale Points"
      >
        <Sliders class="w-3.5 h-3.5" />
        <span class="hidden md:inline">Scale</span>
        <span class="neo-badge bg-white text-[9px] py-0 px-0.5 border font-mono font-bold">{$gpaStore.maxGpa}pt</span>
      </button>

      <!-- Export Full Data JSON (WITH Grades) -->
      <button 
        onclick={handleExportFullDataBackup}
        class="neo-btn bg-[#4ADE80] hover:bg-[#22c55e] text-black px-2 sm:px-2.5 py-1 text-xs font-black flex items-center gap-1 shrink-0"
        title="Export Full Data with Grades for Backup & Restore"
      >
        <Download class="w-3.5 h-3.5 stroke-[2.5]" />
        <span class="hidden md:inline">Export Data</span>
      </button>

      <!-- Export Clean Template JSON (NO Grades) -->
      <button 
        onclick={handleExportCleanTemplate}
        class="neo-btn bg-white hover:bg-zinc-100 text-black px-2 sm:px-2.5 py-1 text-xs font-bold flex items-center gap-1 shrink-0"
        title="Export Clean Template Scheme (No Grades) for Friends"
      >
        <FileJson class="w-3.5 h-3.5 text-[#38BDF8]" />
        <span class="hidden lg:inline">Clean Scheme</span>
      </button>

      <!-- Templates Manager -->
      <button 
        onclick={onOpenTemplates} 
        class="neo-btn bg-[#38BDF8] hover:bg-[#0ea5e9] text-black px-2 sm:px-2.5 py-1 text-xs font-bold flex items-center gap-1 shrink-0"
        title="Manage Templates & Configs"
      >
        <FolderOpen class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Templates</span>
      </button>

      <!-- Target Goal -->
      <button 
        onclick={onOpenTarget} 
        class="neo-btn bg-[#C084FC] hover:bg-[#a855f7] text-black px-2 py-1 text-xs font-bold flex items-center gap-1 shrink-0"
        title="Target Goal Planner"
      >
        <Target class="w-3.5 h-3.5" />
        <span class="hidden lg:inline">Target</span>
      </button>

      <!-- Reset Button -->
      <button 
        onclick={() => isResetConfirmOpen = true} 
        class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white text-zinc-700 p-1.5 text-xs shrink-0"
        title="Reset workspace to default"
      >
        <RotateCcw class="w-3.5 h-3.5" />
      </button>

    </div>
  </div>
</header>

<!-- Custom Reset Workspace Modal -->
<ConfirmModal 
  isOpen={isResetConfirmOpen}
  title="Reset Workspace to Default?"
  message="Are you sure you want to reset all semesters and courses to default? Any unsaved changes will be lost."
  type="reset"
  confirmText="Reset All Data"
  onConfirm={confirmResetAll}
  onClose={() => isResetConfirmOpen = false}
/>
