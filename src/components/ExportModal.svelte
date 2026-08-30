<script>
  import { X, FileText, FileJson, Download, Check, Sparkles, AlertCircle } from 'lucide-svelte';

  let { 
    isOpen = false, 
    onClose = () => {},
    onExportJson = () => {},
    onExportPdf = () => {}
  } = $props();

  function handleSelectPdf() {
    onExportPdf();
    onClose();
  }

  function handleSelectJson() {
    onExportJson();
    onClose();
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-modal-title"
  >
    <!-- Modal Container -->
    <div class="neo-box bg-[#FAF7EE] w-full max-w-lg overflow-hidden shadow-[8px_8px_0px_0px_#000] my-auto flex flex-col">
      
      <!-- Header Bar -->
      <div class="bg-[#4ADE80] border-b-3 border-black p-4 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <Download class="w-6 h-6 text-black stroke-[2.5]" />
          <h2 id="export-modal-title" class="font-display font-black text-xl text-black tracking-tight uppercase">
            EXPORT WORKSPACE DATA
          </h2>
        </div>
        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white p-1.5 text-black transition-colors"
          aria-label="Close export modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Content Body -->
      <div class="p-5 space-y-4 font-mono">
        <p class="text-xs text-zinc-700 font-bold leading-relaxed">
          Choose your preferred export format. You can generate a clean printable PDF report or download a complete JSON data backup.
        </p>

        <!-- Option Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          
          <!-- Option 1: PDF Document Report -->
          <button 
            onclick={handleSelectPdf}
            class="neo-box bg-white hover:bg-[#FFF4B8] p-4 text-left border-3 border-black shadow-[4px_4px_0px_0px_#000] transition-all group flex flex-col justify-between"
          >
            <div class="space-y-2">
              <div class="w-10 h-10 bg-[#FF70A6] text-white border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#000] group-hover:scale-105 transition-transform">
                <FileText class="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 class="font-display font-black text-base text-black uppercase tracking-tight">
                PDF REPORT
              </h3>
              <p class="text-[11px] text-zinc-600 leading-normal">
                Generates a clean multi-page document with CGPA summary on Page 1 and individual semester course tables on subsequent pages.
              </p>
            </div>

            <div class="pt-4 flex items-center gap-1.5 text-xs font-black text-black group-hover:underline">
              <span>Generate PDF</span>
              <span>→</span>
            </div>
          </button>

          <!-- Option 2: JSON Backup File -->
          <button 
            onclick={handleSelectJson}
            class="neo-box bg-white hover:bg-[#DCFCE7] p-4 text-left border-3 border-black shadow-[4px_4px_0px_0px_#000] transition-all group flex flex-col justify-between"
          >
            <div class="space-y-2">
              <div class="w-10 h-10 bg-[#38BDF8] text-black border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#000] group-hover:scale-105 transition-transform">
                <FileJson class="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 class="font-display font-black text-base text-black uppercase tracking-tight">
                JSON BACKUP
              </h3>
              <p class="text-[11px] text-zinc-600 leading-normal">
                Downloads a raw `.json` file containing all your semesters, subjects, credits, and grades for future restore and editing.
              </p>
            </div>

            <div class="pt-4 flex items-center gap-1.5 text-xs font-black text-black group-hover:underline">
              <span>Export JSON</span>
              <span>→</span>
            </div>
          </button>

        </div>

        <!-- Note info -->
        <div class="bg-[#FFFDF5] p-3 border-2 border-black text-[11px] text-zinc-600 flex items-start gap-2">
          <Sparkles class="w-4 h-4 text-[#FF8E3C] shrink-0 mt-0.5" />
          <span>Both options are generated 100% locally in your browser. Nothing is uploaded to any server.</span>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="bg-white border-t-3 border-black p-3.5 px-5 flex items-center justify-end">
        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-zinc-100 text-black font-bold text-xs px-4 py-2"
        >
          Cancel
        </button>
      </div>

    </div>
  </div>
{/if}
