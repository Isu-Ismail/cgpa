<script>
  import { 
    X, ScanLine, Sliders, FolderOpen, Target, FileJson, 
    Download, ShieldCheck, AlertTriangle, Keyboard, Sparkles, Check, BookOpen, Rocket, Lightbulb 
  } from 'lucide-svelte';

  let { isOpen = false, onClose = () => {} } = $props();

  function handleGotIt() {
    try {
      localStorage.setItem('neocgpa_tutorial_dismissed', 'true');
    } catch (e) {
      console.error('LocalStorage error', e);
    }
    onClose();
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="welcome-modal-title"
  >
    <!-- Modal Container -->
    <div class="neo-box bg-[#FAF7EE] w-full max-w-3xl overflow-hidden shadow-[8px_8px_0px_0px_#000] my-auto flex flex-col max-h-[90vh]">
      
      <!-- Header Bar -->
      <div class="bg-[#FF70A6] border-b-3 border-black p-3 sm:p-4 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2 text-white">
          <Sparkles class="w-5 h-5 sm:w-6 sm:h-6 text-[#FFDE59] fill-[#FFDE59]" />
          <h2 id="welcome-modal-title" class="font-display font-black text-lg sm:text-2xl text-black tracking-tight flex items-center gap-1.5">
            WELCOME TO <span class="bg-[#FFDE59] px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_#000]">NEOCGPA!</span>
          </h2>
        </div>
        <button 
          onclick={handleGotIt}
          class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white p-1.5 sm:p-2 text-black transition-colors"
          aria-label="Close welcome guide"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
        
        <!-- Welcome Hero Banner -->
        <div class="neo-box bg-white p-4 sm:p-5 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
          <h3 class="font-display font-black text-base sm:text-xl text-black uppercase tracking-tight flex items-center gap-2">
            <Rocket class="w-5 h-5 text-[#FF8E3C]" />
            <span>YOUR RETRO GPA & CGPA WORKSPACE</span>
          </h3>
          <p class="text-xs sm:text-sm font-mono text-zinc-700 mt-1 leading-relaxed">
            Welcome! <strong class="text-black">NeoCGPA v2.0</strong> is an all-in-one local GPA calculator, neural OCR marksheet scanner, and academic template manager designed for university students.
          </p>
        </div>

        <!-- Tool Directory Card Grid -->
        <div class="neo-box bg-[#FFFDF5] p-4 sm:p-5 border-3 border-black shadow-[4px_4px_0px_0px_#000] space-y-4">
          <div class="border-b-2 border-black pb-2 flex items-center justify-between">
            <h4 class="font-display font-black text-sm sm:text-base text-black uppercase tracking-tight flex items-center gap-2">
              <BookOpen class="w-4 h-4 text-[#FF8E3C]" />
              WORKSPACE TOOLS DIRECTORY
            </h4>
            <span class="neo-badge bg-[#FFDE59] text-[10px] font-bold">Quick Feature Guide</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-mono">
            
            <!-- Scan Sheet OCR -->
            <div class="bg-white p-3 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-black text-sm">
                <ScanLine class="w-4 h-4 text-[#FF70A6] stroke-[2.5]" />
                <span class="bg-[#FF70A6] text-white px-1 py-0.2 rounded-xs">Scan Sheet (OCR)</span>
              </div>
              <p class="text-zinc-600 text-[11px] leading-normal">
                Drag & drop, browse file, or press <kbd class="neo-kbd text-[9px] px-1">Ctrl + V</kbd> anywhere to paste a marksheet screenshot. Auto-detects codes, titles, credits, and grades!
              </p>
            </div>

            <!-- Export Full Data -->
            <div class="bg-white p-3 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-black text-sm">
                <Download class="w-4 h-4 text-[#4ADE80] stroke-[2.5]" />
                <span class="bg-[#4ADE80] text-black px-1 py-0.2 rounded-xs">Export Data</span>
              </div>
              <p class="text-zinc-600 text-[11px] leading-normal">
                Export your full workspace with grades saved into a JSON file for personal backup and future editing.
              </p>
            </div>

            <!-- Export Clean Scheme -->
            <div class="bg-white p-3 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-black text-sm">
                <FileJson class="w-4 h-4 text-[#38BDF8] stroke-[2.5]" />
                <span class="bg-white border border-black px-1 py-0.2 rounded-xs">Clean Scheme</span>
              </div>
              <p class="text-zinc-600 text-[11px] leading-normal">
                Export a clean syllabus template (without your personal grades) to share with friends and classmates.
              </p>
            </div>

            <!-- Templates Manager -->
            <div class="bg-white p-3 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-black text-sm">
                <FolderOpen class="w-4 h-4 text-[#38BDF8] stroke-[2.5]" />
                <span class="bg-[#38BDF8] text-black px-1 py-0.2 rounded-xs">Templates Manager</span>
              </div>
              <p class="text-zinc-600 text-[11px] leading-normal">
                Browse real-time cloud templates from Firebase or import custom JSON templates to pre-fill semester courses.
              </p>
            </div>

            <!-- Scale Point Settings -->
            <div class="bg-white p-3 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-black text-sm">
                <Sliders class="w-4 h-4 text-[#FFDE59] stroke-[2.5]" />
                <span class="bg-[#FFF4B8] text-black px-1 py-0.2 rounded-xs">Grade Scale</span>
              </div>
              <p class="text-zinc-600 text-[11px] leading-normal">
                Configure grade point values (<code class="font-bold text-black">O=10, S=10, A+=9, A=8...</code>) and max scale (10.0pt, 4.0pt).
              </p>
            </div>

            <!-- Target Goal Planner -->
            <div class="bg-white p-3 border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-black text-sm">
                <Target class="w-4 h-4 text-[#C084FC] stroke-[2.5]" />
                <span class="bg-[#C084FC] text-black px-1 py-0.2 rounded-xs">Target Planner</span>
              </div>
              <p class="text-zinc-600 text-[11px] leading-normal">
                Calculate the required SGPA needed in remaining semesters to achieve your target CGPA goal.
              </p>
            </div>

          </div>
        </div>

        <!-- Keyboard Shortcuts Pro-Tips -->
        <div class="neo-box bg-[#F4F4F5] p-3.5 border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-start gap-3">
          <Keyboard class="w-5 h-5 text-black shrink-0 mt-0.5" />
          <div class="text-xs font-mono space-y-1">
            <span class="font-black text-black uppercase">Keyboard Grid Shortcuts:</span>
            <div class="flex flex-wrap gap-2 text-[11px] text-zinc-700">
              <span><kbd class="neo-kbd text-[9px] px-1">Ctrl + ↑ ↓ ← →</kbd> Navigate cells</span>
              <span>•</span>
              <span><kbd class="neo-kbd text-[9px] px-1">Type Letter</kbd> Select grade (e.g. A ➔ A+, press A ➔ A)</span>
              <span>•</span>
              <span><kbd class="neo-kbd text-[9px] px-1">Ctrl + Enter</kbd> Insert row</span>
              <span>•</span>
              <span><kbd class="neo-kbd text-[9px] px-1">Ctrl + Delete</kbd> Delete row</span>
              <span>•</span>
              <span><kbd class="neo-kbd text-[9px] px-1">Ctrl + Z</kbd> Undo (5 steps)</span>
            </div>
          </div>
        </div>

        <!-- Privacy & Disclaimer Box -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          
          <!-- 100% Client-Side Privacy Notice -->
          <div class="neo-box bg-[#DCFCE7] p-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-start gap-2.5">
            <ShieldCheck class="w-5 h-5 text-[#166534] shrink-0 mt-0.5" />
            <div>
              <h5 class="font-black text-[#166534] text-xs uppercase">100% Client-Side Local Privacy</h5>
              <p class="text-[11px] text-zinc-800 leading-normal mt-0.5">
                All images, marksheet scans, grades, and GPA data are processed <strong class="text-black">100% locally in your browser</strong>. Nothing is sent to any external server.
              </p>
            </div>
          </div>

          <!-- OCR Verification Disclaimer -->
          <div class="neo-box bg-[#FEF08A] p-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-start gap-2.5">
            <AlertTriangle class="w-5 h-5 text-[#854D0E] shrink-0 mt-0.5" />
            <div>
              <h5 class="font-black text-[#854D0E] text-xs uppercase">OCR Accuracy Disclaimer</h5>
              <p class="text-[11px] text-zinc-800 leading-normal mt-0.5">
                Neural OCR image scanning may contain misread characters; please <strong class="text-black">cross-check extracted courses and grades</strong> before saving.
              </p>
            </div>
          </div>

        </div>

      </div>

      <!-- Modal Footer -->
      <div class="bg-white border-t-3 border-black p-3 sm:p-4 flex items-center justify-between shrink-0">
        <p class="text-[11px] font-mono text-zinc-500 hidden sm:flex items-center gap-1.5">
          <Lightbulb class="w-3.5 h-3.5 text-[#FF8E3C] shrink-0" />
          <span>Click the header logo anytime to re-open this guide!</span>
        </p>
        <button 
          onclick={handleGotIt}
          class="neo-btn bg-[#C084FC] hover:bg-[#a855f7] text-black font-black text-xs sm:text-sm px-5 py-2.5 flex items-center gap-2 ml-auto shadow-[3px_3px_0px_0px_#000]"
        >
          <span>GOT IT, LET'S CALCULATE!</span>
          <Check class="w-4 h-4 stroke-[3]" />
        </button>
      </div>

    </div>
  </div>
{/if}
