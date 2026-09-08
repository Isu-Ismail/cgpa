<script>
  import {
    gpaStore,
    semestersWithStats,
    overallCgpa,
  } from "./store/gpaStore.js";
  import { templateStore } from "./store/templateStore.js";
  import Header from "./components/Header.svelte";
  import QuickStats from "./components/QuickStats.svelte";
  import SemesterSummary from "./components/SemesterSummary.svelte";
  import SemesterCard from "./components/SemesterCard.svelte";
  import ImageUploadModal from "./components/ImageUploadModal.svelte";
  import ScaleSettingsModal from "./components/ScaleSettingsModal.svelte";
  import TemplateManagerModal from "./components/TemplateManagerModal.svelte";
  import TargetGpaModal from "./components/TargetGpaModal.svelte";
  import WelcomeModal from "./components/WelcomeModal.svelte";
  import StartupTemplateModal from "./components/StartupTemplateModal.svelte";
  import ExportModal from "./components/ExportModal.svelte";
  import { generatePdfReport } from "./utils/pdfGenerator.js";
  import {
    Plus,
    ScanLine,
    Sparkles,
    FolderOpen,
    Download,
    BookOpen,
    Zap,
    Upload,
    Cloud,
  } from "lucide-svelte";

  // Modal visibility states
  let isOcrOpen = $state(false);
  let targetSemesterForOcr = $state(null);
  let pastedFileForOcr = $state(null);
  let isScaleOpen = $state(false);
  let isTemplatesOpen = $state(false);
  let templatesInitialTab = $state("online");
  let isStartupTemplateOpen = $state(false);
  let isTargetOpen = $state(false);
  let isWelcomeOpen = $state(false);
  let isExportOpen = $state(false);

  // Hidden DOM ref for direct JSON file picker
  let jsonFileInputRef = $state(null);

  // Auto-open Welcome Guide modal on first visit if not dismissed in cache
  $effect(() => {
    try {
      const dismissed = localStorage.getItem("neocgpa_tutorial_dismissed");
      if (!dismissed) {
        isWelcomeOpen = true;
      }
    } catch (e) {
      console.error("LocalStorage read error", e);
    }
  });

  function handleWelcomeClose() {
    isWelcomeOpen = false;
    // Open Startup Template Selector Modal immediately after Welcome guide is dismissed
    isStartupTemplateOpen = true;
  }

  function handleOpenTemplatesModal(tab = "online") {
    templatesInitialTab = tab;
    isTemplatesOpen = true;
  }

  function handleTriggerFilePicker() {
    if (jsonFileInputRef) {
      jsonFileInputRef.click();
    } else {
      handleOpenTemplatesModal("import");
    }
  }

  function handleDirectFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const imported = templateStore.importFromJson(text);
        gpaStore.loadTemplate(imported);
      } catch (err) {
        alert(`Error importing JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Global Ctrl + Z Undo Listener (Undo up to 5 history steps)
  $effect(() => {
    function handleGlobalUndo(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        const active = document.activeElement;
        const isEditingText =
          active &&
          active.tagName === "INPUT" &&
          active.type === "text" &&
          active.selectionStart !== active.selectionEnd;
        if (!isEditingText) {
          e.preventDefault();
          gpaStore.undo();
        }
      }
    }

    window.addEventListener("keydown", handleGlobalUndo);
    return () => window.removeEventListener("keydown", handleGlobalUndo);
  });

  function handleOpenOcr(semesterId = null, file = null) {
    targetSemesterForOcr = semesterId;
    pastedFileForOcr = file;
    isOcrOpen = true;
  }

  function handleAddSemester() {
    gpaStore.addSemester();
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  }

  function handleExportJson() {
    templateStore.exportAsFullUserDataJson({
      templateId: $gpaStore.templateId,
      templateName: $gpaStore.templateName,
      templateDesc: $gpaStore.templateDescription,
      maxGpa: $gpaStore.maxGpa,
      gradePoints: $gpaStore.gradePoints,
      semesters: $gpaStore.semesters,
    });
  }

  function handleExportCleanJson() {
    templateStore.exportAsCleanJson({
      templateId: $gpaStore.templateId,
      templateName: $gpaStore.templateName,
      templateDesc: $gpaStore.templateDescription,
      maxGpa: $gpaStore.maxGpa,
      gradePoints: $gpaStore.gradePoints,
      semesters: $gpaStore.semesters,
    });
  }

  function handleExportPdf() {
    generatePdfReport({
      store: $gpaStore,
      semestersWithStats: $semestersWithStats,
      overallStats: $overallCgpa,
    });
  }

  // Global Clipboard Paste Listener (Ctrl + V for image marksheet)
  $effect(() => {
    function handleGlobalPaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            handleOpenOcr(null, file);
            break;
          }
        }
      }
    }

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  });
</script>

<!-- Hidden File Input for Direct JSON Imports -->
<input
  type="file"
  accept=".json"
  bind:this={jsonFileInputRef}
  onchange={handleDirectFileImport}
  class="hidden"
/>

<div
  class="min-h-screen bg-retro-dots flex flex-col selection:bg-[#FFDE59] selection:text-black"
>
  <!-- Top Navigation Header -->
  <Header
    onOpenOcr={() => handleOpenOcr(null, null)}
    onOpenScale={() => (isScaleOpen = true)}
    onOpenTemplates={() => handleOpenTemplatesModal("online")}
    onOpenTarget={() => (isTargetOpen = true)}
    onOpenWelcome={() => (isWelcomeOpen = true)}
    onOpenExportModal={() => (isExportOpen = true)}
  />

  <!-- Main Workspace Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
    <!-- Hero / Stats Dashboard -->
    <QuickStats onOpenTarget={() => (isTargetOpen = true)} />

    <!-- Collapsible Semester-by-Semester Summary (Minimized by default) -->
    <SemesterSummary />

    <!-- Semesters Section Header Card (Solid background to prevent text & dot pattern merge) -->
    <div
      class="neo-box bg-[#FAF7EE] p-4 sm:p-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2.5"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-3.5 h-8 bg-[#FF8E3C] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
        ></div>
        <div>
          <h2 class="font-display font-black text-2xl text-black">
            Academic Semesters
          </h2>
          <p class="text-xs font-mono text-zinc-700 font-bold">
            Grid navigation: Arrow keys between cells, Ctrl+Enter to insert row
            below, Ctrl+V to paste marksheet image.
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
        <div
          class="w-14 h-14 bg-[#FFF4B8] border-2.5 border-black mx-auto flex items-center justify-center shadow-brutal text-black"
        >
          <BookOpen class="w-7 h-7 stroke-[2.5]" />
        </div>
        <h3 class="font-display font-black text-xl text-black">
          No Semesters Logged
        </h3>
        <p class="text-xs font-mono text-zinc-600 max-w-md mx-auto">
          Start by choosing an online university template, importing a JSON
          backup, or creating your first blank semester.
        </p>

        <div class="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onclick={() => handleOpenTemplatesModal("online")}
            class="neo-btn bg-[#38BDF8] text-black font-black text-xs px-4 py-2 flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <Cloud class="w-4 h-4" />
            <span>Browse Online Templates</span>
          </button>
          <button
            onclick={handleTriggerFilePicker}
            class="neo-btn bg-[#FF70A6] text-white font-black text-xs px-4 py-2 flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <Upload class="w-4 h-4" />
            <span>Import JSON Backup</span>
          </button>
          <button
            onclick={handleAddSemester}
            class="neo-btn bg-[#FFDE59] text-black font-black text-xs px-4 py-2 flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <Plus class="w-4 h-4 stroke-[3]" />
            <span>Create Blank Semester</span>
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
            onAddSemester={handleAddSemester}
          />
        {/each}
      </div>
    {/if}

    <!-- Bottom Actions Toolbar -->
    <div
      class="mt-8 flex flex-wrap items-center justify-between gap-4 p-4 neo-box bg-[#FAF7EE]"
    >
      <div class="text-xs font-mono text-zinc-700">
        <strong class="text-black">Pasting & Exporting Pro Tips:</strong><br />
        • Press <kbd class="neo-kbd">Ctrl + V</kbd> anywhere to paste a
        marksheet screenshot directly from your clipboard!<br />
        • Click <strong class="text-black">Import JSON</strong> to load saved backups
        or university scheme files instantly.
      </div>

      <div class="flex flex-wrap items-center gap-2 ml-auto">
        <button
          onclick={handleTriggerFilePicker}
          class="neo-btn bg-[#FF70A6] text-white font-black text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
        >
          <Upload class="w-4 h-4" />
          <span>Import JSON</span>
        </button>

        <button
          onclick={() => (isExportOpen = true)}
          class="neo-btn bg-[#4ADE80] text-black font-black text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
        >
          <Download class="w-4 h-4 stroke-[2.5]" />
          <span>Export Data</span>
        </button>

        <button
          onclick={() => handleOpenTemplatesModal("online")}
          class="neo-btn bg-[#38BDF8] text-black font-black text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
        >
          <FolderOpen class="w-4 h-4" />
          <span>Templates & Schemes</span>
        </button>
      </div>
    </div>
  </main>

  <!-- Modals -->
  <WelcomeModal isOpen={isWelcomeOpen} onClose={handleWelcomeClose} />

  <StartupTemplateModal
    isOpen={isStartupTemplateOpen}
    onClose={() => (isStartupTemplateOpen = false)}
  />

  <ExportModal
    isOpen={isExportOpen}
    onClose={() => (isExportOpen = false)}
    onExportJson={handleExportJson}
    onExportCleanJson={handleExportCleanJson}
    onExportPdf={handleExportPdf}
  />

  <ImageUploadModal
    isOpen={isOcrOpen}
    initialSemesterId={targetSemesterForOcr}
    initialPastedFile={pastedFileForOcr}
    onClose={() => {
      isOcrOpen = false;
      targetSemesterForOcr = null;
      pastedFileForOcr = null;
    }}
  />

  <ScaleSettingsModal
    isOpen={isScaleOpen}
    onClose={() => (isScaleOpen = false)}
  />

  <TemplateManagerModal
    isOpen={isTemplatesOpen}
    initialTab={templatesInitialTab}
    onClose={() => (isTemplatesOpen = false)}
  />

  <TargetGpaModal
    isOpen={isTargetOpen}
    onClose={() => (isTargetOpen = false)}
  />

  <!-- Footer -->
  <footer
    class="bg-[#FAF7EE] border-t-2.5 border-black py-3.5 px-6 mt-10 text-center text-xs font-mono font-bold text-zinc-600"
  >
    <div
      class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2"
    >
      <button
        onclick={() => (isWelcomeOpen = true)}
        class="hover:underline flex items-center gap-1.5"
      >
        <Zap class="w-4 h-4 text-[#FFDE59] fill-[#FFDE59]" />
        <span>NeoCGPA Calculator — Built with Svelte, Vite & TailwindCSS</span>
      </button>
      <span class="bg-black text-[#86EFAC] px-2 py-0.5 border border-black"
        >Clipboard Direct Paste Enabled</span
      >
    </div>
  </footer>
</div>
