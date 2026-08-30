<script>
  import { gpaStore, semestersWithStats } from './store/gpaStore.js';
  import Header from './components/Header.svelte';
  import QuickStats from './components/QuickStats.svelte';
  import SemesterSummary from './components/SemesterSummary.svelte';
  import SemesterCard from './components/SemesterCard.svelte';
  import ImageUploadModal from './components/ImageUploadModal.svelte';
  import ScaleSettingsModal from './components/ScaleSettingsModal.svelte';
  import TemplateManagerModal from './components/TemplateManagerModal.svelte';
  import TargetGpaModal from './components/TargetGpaModal.svelte';
  import WelcomeModal from './components/WelcomeModal.svelte';
  import { Plus, ScanLine, Sparkles, FolderOpen } from 'lucide-svelte';

  // Modal visibility states
  let isOcrOpen = $state(false);
  let targetSemesterForOcr = $state(null);
  let pastedFileForOcr = $state(null);
  let isScaleOpen = $state(false);
  let isTemplatesOpen = $state(false);
  let isTargetOpen = $state(false);
  let isWelcomeOpen = $state(false);

  // Auto-open Welcome Guide modal on first visit if not dismissed in cache
  $effect(() => {
    try {
      const dismissed = localStorage.getItem('neocgpa_tutorial_dismissed');
      if (!dismissed) {
        isWelcomeOpen = true;
      }
    } catch (e) {
      console.error('LocalStorage read error', e);
    }
  });

  function handleOpenOcr(semesterId = null, file = null) {
    targetSemesterForOcr = semesterId;
    pastedFileForOcr = file;
    isOcrOpen = true;
  }

  function handleAddSemester() {
    gpaStore.addSemester();
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  // Global Clipboard Paste Listener (Ctrl + V for image marksheet)
  $effect(() => {
    function handleGlobalPaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            handleOpenOcr(null, file);
            break;
          }
        }
      }
    }

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  });
</script>

<div class="min-h-screen bg-retro-dots flex flex-col selection:bg-[#FFDE59] selection:text-black">
  
  <!-- Top Navigation Header -->
  <Header 
    onOpenOcr={() => handleOpenOcr(null, null)}
    onOpenScale={() => isScaleOpen = true}
    onOpenTemplates={() => isTemplatesOpen = true}
    onOpenTarget={() => isTargetOpen = true}
    onOpenWelcome={() => isWelcomeOpen = true}
  />

  <!-- Main Workspace Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
    
    <!-- Hero / Stats Dashboard -->
    <QuickStats />

    <!-- Collapsible Semester-by-Semester Summary (Minimized by default) -->
    <SemesterSummary />

    <!-- Semesters Section Header Card (Solid background to prevent text & dot pattern merge) -->
    <div class="neo-box bg-[#FAF7EE] p-4 sm:p-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2.5">
      <div class="flex items-center gap-3">
        <div class="w-3.5 h-8 bg-[#FF8E3C] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"></div>
        <div>
          <h2 class="font-display font-black text-2xl text-black">
            Academic Semesters
          </h2>
          <p class="text-xs font-mono text-zinc-700 font-bold">
            Grid navigation: Arrow keys between cells, Ctrl+Enter to insert row below, Ctrl+V to paste marksheet image.
          </p>
        </div>
      </div>

      <!-- Header Action Buttons -->
      <div class="flex items-center gap-2">
        <button 
          onclick={() => handleOpenOcr(null, null)}
          class="neo-btn bg-[#FF70A6] text-white px-3 py-1.5 text-xs font-black flex items-center gap-1.5"
        >
          <ScanLine class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Upload Marksheet</span>
        </button>

        <button 
          onclick={handleAddSemester}
          class="neo-btn bg-[#FFDE59] text-black px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5"
        >
          <Plus class="w-3.5 h-3.5 stroke-[3]" />
          <span>Add Semester</span>
        </button>
      </div>
    </div>

    <!-- Semesters List -->
    {#if $semestersWithStats.length === 0}
      <div class="neo-box-lg bg-white p-10 text-center my-6 space-y-3">
        <div class="w-14 h-14 bg-[#FFF4B8] border-2.5 border-black mx-auto flex items-center justify-center font-display font-black text-2xl shadow-brutal">
          📚
        </div>
        <h3 class="font-display font-black text-xl text-black">No Semesters Logged</h3>
        <p class="text-xs font-mono text-zinc-600 max-w-md mx-auto">
          Start by creating your first semester, loading a template, or pasting a marksheet screenshot with Ctrl+V.
        </p>

        <div class="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button 
            onclick={handleAddSemester}
            class="neo-btn bg-[#FFDE59] text-black font-black text-xs px-4 py-2"
          >
            + Create Semester 1
          </button>
          <button 
            onclick={() => isTemplatesOpen = true}
            class="neo-btn bg-[#38BDF8] text-black font-black text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <FolderOpen class="w-4 h-4" />
            <span>Template Config Manager</span>
          </button>
        </div>
      </div>
    {:else}
      <div class="space-y-6">
        {#each $semestersWithStats as semester, index (semester.id)}
          <SemesterCard 
            {semester} 
            semesterIndex={index} 
            onOpenOcrForSemester={(semId) => handleOpenOcr(semId, null)}
          />
        {/each}
      </div>
    {/if}

    <!-- Bottom Actions Toolbar -->
    <div class="mt-8 flex flex-wrap items-center justify-between gap-4 p-4 neo-box bg-[#FAF7EE]">
      <div class="text-xs font-mono text-zinc-700">
        <strong class="text-black">Pasting & Exporting Pro Tips:</strong><br />
        • Press <kbd class="neo-kbd">Ctrl + V</kbd> anywhere to paste a marksheet screenshot directly from your clipboard!<br />
        • Click <strong class="text-black">Export Data</strong> to backup your full workspace with grades saved.
      </div>

      <button 
        onclick={() => isTemplatesOpen = true}
        class="neo-btn bg-[#86EFAC] text-black font-black text-xs px-4 py-2 flex items-center gap-1.5 ml-auto"
      >
        <Sparkles class="w-3.5 h-3.5" />
        <span>Templates & Config JSON</span>
      </button>
    </div>

  </main>

  <!-- Modals -->
  <WelcomeModal 
    isOpen={isWelcomeOpen}
    onClose={() => isWelcomeOpen = false}
  />

  <ImageUploadModal 
    isOpen={isOcrOpen}
    initialSemesterId={targetSemesterForOcr}
    initialPastedFile={pastedFileForOcr}
    onClose={() => { isOcrOpen = false; targetSemesterForOcr = null; pastedFileForOcr = null; }}
  />

  <ScaleSettingsModal 
    isOpen={isScaleOpen}
    onClose={() => isScaleOpen = false}
  />

  <TemplateManagerModal 
    isOpen={isTemplatesOpen}
    onClose={() => isTemplatesOpen = false}
  />

  <TargetGpaModal 
    isOpen={isTargetOpen}
    onClose={() => isTargetOpen = false}
  />

  <!-- Footer -->
  <footer class="bg-[#FAF7EE] border-t-2.5 border-black py-3.5 px-6 mt-10 text-center text-xs font-mono font-bold text-zinc-600">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
      <button onclick={() => isWelcomeOpen = true} class="hover:underline flex items-center gap-1">
        <span>⚡ NeoCGPA Calculator — Built with Svelte, Vite & TailwindCSS</span>
      </button>
      <span class="bg-black text-[#86EFAC] px-2 py-0.5 border border-black">Clipboard Direct Paste Enabled</span>
    </div>
  </footer>

</div>
