<script>
  import { gpaStore } from '../store/gpaStore.js';
  import { X, Plus, Trash2, Check, Sliders } from 'lucide-svelte';

  let { isOpen = false, onClose = () => {} } = $props();

  let maxGpaInput = $state(10);
  let gradeEntries = $state([]);
  let newGradeLetter = $state('');
  let newGradePoint = $state(0);

  $effect(() => {
    if (isOpen) {
      maxGpaInput = $gpaStore.maxGpa;
      const pointsMap = $gpaStore.gradePoints || {};
      gradeEntries = Object.entries(pointsMap).map(([grade, point], index) => ({
        id: `g-${index}-${grade}`,
        grade,
        point
      }));
      newGradeLetter = '';
      newGradePoint = 0;
    }
  });

  function handleAddGrade() {
    const trimmed = newGradeLetter.trim().toUpperCase();
    if (!trimmed) return;

    const existingIndex = gradeEntries.findIndex(e => e.grade.toUpperCase() === trimmed);
    if (existingIndex >= 0) {
      gradeEntries[existingIndex].point = Number(newGradePoint) || 0;
    } else {
      gradeEntries.push({
        id: `g-${Date.now()}-${trimmed}`,
        grade: trimmed,
        point: Number(newGradePoint) || 0
      });
    }

    newGradeLetter = '';
    newGradePoint = 0;
  }

  function handleRemoveGrade(gradeToRemove) {
    gradeEntries = gradeEntries.filter(e => e.grade !== gradeToRemove);
  }

  function handleSave() {
    const updatedGradePoints = {};
    for (const entry of gradeEntries) {
      if (entry.grade.trim()) {
        updatedGradePoints[entry.grade.trim().toUpperCase()] = Number(entry.point) || 0;
      }
    }

    gpaStore.setScaleSettings({
      maxGpa: Number(maxGpaInput) || 10,
      gradePoints: updatedGradePoints
    });

    onClose();
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
    
    <div class="neo-box-xl bg-[#FAF7EE] w-full max-w-2xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Modal Header -->
      <div class="bg-[#FFF4B8] border-b-3 border-black p-3.5 sm:p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-black text-[#FFDE59] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_#000]">
            <Sliders class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-display font-black text-lg sm:text-xl text-black">Grade Scale & Point Variables</h3>
            <p class="text-xs font-mono text-zinc-600 font-bold">Configure Total Out Of ceiling and letter grade points</p>
          </div>
        </div>

        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white p-1 text-black"
          title="Close Modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body (Smooth Scrolling) -->
      <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 scroll-smooth">
        
        <!-- Compact Max GPA Ceiling Box -->
        <div class="neo-box bg-white p-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <label for="max-gpa-input" class="block font-display font-black text-sm text-black">
              Max GPA Ceiling (Out of)
            </label>
            <p class="text-[11px] font-mono text-zinc-500 font-medium">
              Maximum possible GPA for your university (e.g. 10.0 or 4.0)
            </p>
          </div>
          <div class="flex items-center gap-2">
            <input 
              id="max-gpa-input"
              type="number" 
              step="0.1" 
              min="1" 
              max="100" 
              bind:value={maxGpaInput} 
              class="neo-input text-base font-mono font-black text-center w-24 py-1 px-2"
            />
            <span class="text-xs font-mono font-bold text-zinc-500">/ 10.0</span>
          </div>
        </div>

        <!-- Grade Letter to Points Map -->
        <div class="neo-box bg-white p-3.5 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-display font-black text-sm text-black">Grade Point Mapping</h4>
              <p class="text-[11px] font-mono text-zinc-500">Define grade letters and their numeric point value</p>
            </div>
            <span class="neo-badge bg-[#86EFAC] text-black text-xs">{gradeEntries.length} Grades</span>
          </div>

          <!-- Grade List Table -->
          <div class="border-2 border-black">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-black text-white font-mono uppercase text-[10px]">
                <tr>
                  <th class="p-2 w-32">Grade Letter</th>
                  <th class="p-2 border-l border-zinc-700">Point Value</th>
                  <th class="p-2 border-l border-zinc-700 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody>
                {#each gradeEntries as entry (entry.id)}
                  <tr class="border-b border-zinc-200 hover:bg-[#FAF7EE]">
                    <td class="p-1.5">
                      <input 
                        type="text" 
                        bind:value={entry.grade} 
                        class="neo-input text-xs font-mono font-black py-1 px-2 uppercase"
                      />
                    </td>
                    <td class="p-1.5 border-l border-zinc-200">
                      <input 
                        type="number" 
                        step="0.1" 
                        bind:value={entry.point} 
                        class="neo-input text-xs font-mono font-bold py-1 px-2"
                      />
                    </td>
                    <td class="p-1.5 border-l border-zinc-200 text-center">
                      <button 
                        onclick={() => handleRemoveGrade(entry.grade)}
                        class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white p-1 text-zinc-500 border"
                        title="Delete Grade"
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

      </div>

      <!-- Modal Footer Bar with + Add Grade Form & Save Button -->
      <div class="bg-[#FAF7EE] border-t-3 border-black p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        <!-- Add New Grade Form -->
        <form onsubmit={(e) => { e.preventDefault(); handleAddGrade(); }} class="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="New Grade (e.g. O or A-)" 
            bind:value={newGradeLetter} 
            class="neo-input text-xs font-mono font-bold py-1.5 px-2 uppercase w-36 bg-white"
          />
          <input 
            type="number" 
            placeholder="Points" 
            step="0.1" 
            bind:value={newGradePoint} 
            class="neo-input text-xs font-mono font-bold py-1.5 px-2 w-20 bg-white"
          />
          <button 
            type="submit" 
            class="neo-btn bg-[#4ADE80] text-black px-3 py-1.5 text-xs font-black shrink-0 flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <Plus class="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Grade</span>
          </button>
        </form>

        <!-- Save Button ("Save" text) -->
        <button 
          onclick={handleSave}
          class="neo-btn bg-[#FFDE59] hover:bg-[#FDB813] text-black px-6 py-2 text-xs font-black flex items-center gap-1.5 w-full sm:w-auto justify-center shadow-[2px_2px_0px_0px_#000]"
        >
          <Check class="w-4 h-4 stroke-[3]" />
          <span>Save</span>
        </button>

      </div>

    </div>
  </div>
{/if}
