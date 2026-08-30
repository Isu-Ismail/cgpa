<script>
  import { gpaStore } from '../store/gpaStore.js';
  import { X, Plus, Trash2, Check } from 'lucide-svelte';

  let { isOpen = false, onClose = () => {} } = $props();

  let maxGpaInput = $state(10);
  let gradeEntries = $state([]);
  let newGradeLetter = $state('');
  let newGradePoint = $state(0);

  $effect(() => {
    if (isOpen) {
      maxGpaInput = $gpaStore.maxGpa;
      gradeEntries = Object.entries($gpaStore.gradePoints).map(([grade, point]) => ({
        id: `ge-${grade}-${Date.now()}`,
        grade,
        point: Number(point)
      }));
    }
  });

  function handleAddGrade() {
    const letter = (newGradeLetter || '').trim().toUpperCase();
    if (!letter) return;

    if (gradeEntries.some(e => e.grade === letter)) {
      alert(`Grade "${letter}" already exists.`);
      return;
    }

    gradeEntries = [
      ...gradeEntries,
      { id: `ge-${letter}-${Date.now()}`, grade: letter, point: parseFloat(newGradePoint) || 0 }
    ];
    newGradeLetter = '';
    newGradePoint = 0;
  }

  function handleRemoveGrade(gradeLetter) {
    if (gradeEntries.length <= 1) {
      alert('You must have at least one grade in the scale.');
      return;
    }
    gradeEntries = gradeEntries.filter(e => e.grade !== gradeLetter);
  }

  function handleSave() {
    const scaleObj = {};
    gradeEntries.forEach(e => {
      if (e.grade.trim()) {
        scaleObj[e.grade.trim().toUpperCase()] = parseFloat(e.point) || 0;
      }
    });

    const parsedMax = parseFloat(maxGpaInput) || 10;
    gpaStore.updateScaleSettings(parsedMax, scaleObj);
    onClose();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
    
    <div class="neo-box-xl bg-[#FAF7EE] w-full max-w-2xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Modal Header -->
      <div class="bg-[#FFF4B8] border-b-3 border-black p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-black text-[#FFDE59] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_#000]">
            ⚙️
          </div>
          <div>
            <h3 class="font-display font-black text-xl text-black">Grade Scale & Point Variables</h3>
            <p class="text-xs font-mono text-zinc-600 font-bold">Configure Total Out Of ceiling and letter grade points</p>
          </div>
        </div>

        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-black hover:text-white text-black p-1.5 rounded-sm"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        
        <!-- Max GPA Setup -->
        <div class="neo-box bg-white p-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label for="max-gpa-input" class="font-display font-black text-base text-black block">Total Out Of Ceiling (Max GPA)</label>
              <p class="text-xs font-mono text-zinc-600">The total top GPA possible (e.g. 10.0, 5.0, 4.0, or custom)</p>
            </div>

            <div class="flex items-center gap-2">
              <input 
                id="max-gpa-input"
                type="number" 
                step="0.1" 
                min="1" 
                max="100"
                bind:value={maxGpaInput} 
                class="neo-input text-lg font-mono font-black text-center w-28 py-1.5 px-2"
              />
              <span class="font-mono font-black text-sm text-black">Points</span>
            </div>
          </div>
        </div>

        <!-- Grade Letter to Points Map -->
        <div class="neo-box bg-white p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-display font-black text-base text-black">Grade Point Mapping</h4>
              <p class="text-xs font-mono text-zinc-600">Define grade letters and their numeric point value</p>
            </div>
            <span class="neo-badge bg-[#86EFAC] text-black">{gradeEntries.length} Grades</span>
          </div>

          <!-- Grade List Table -->
          <div class="border-2 border-black max-h-60 overflow-y-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-black text-white font-mono uppercase text-[10px] sticky top-0">
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

          <!-- Add New Grade Row Form -->
          <div class="bg-[#FAF7EE] border-2 border-black p-3 flex flex-col sm:flex-row items-center gap-2">
            <div class="flex-1 flex items-center gap-2 w-full">
              <input 
                type="text" 
                placeholder="New Letter (e.g. O or A-)" 
                bind:value={newGradeLetter} 
                class="neo-input text-xs font-mono font-bold py-1.5 px-2 uppercase flex-1 bg-white"
              />
              <input 
                type="number" 
                placeholder="Points" 
                step="0.1" 
                bind:value={newGradePoint} 
                class="neo-input text-xs font-mono font-bold py-1.5 px-2 w-24 bg-white"
              />
            </div>
            <button 
              type="button" 
              onclick={handleAddGrade}
              class="neo-btn bg-[#4ADE80] text-black px-3 py-1.5 text-xs font-black w-full sm:w-auto flex items-center justify-center gap-1"
            >
              <Plus class="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Grade</span>
            </button>
          </div>

        </div>

      </div>

      <!-- Modal Footer -->
      <div class="bg-[#FAF7EE] border-t-3 border-black p-4 flex items-center justify-end gap-3">
        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-zinc-100 text-black px-4 py-2 text-xs font-bold"
        >
          Cancel
        </button>

        <button 
          onclick={handleSave}
          class="neo-btn bg-[#FFDE59] hover:bg-[#FDB813] text-black px-5 py-2 text-xs font-black flex items-center gap-1.5"
        >
          <Check class="w-4 h-4 stroke-[3]" />
          <span>Save Scale Settings</span>
        </button>
      </div>

    </div>
  </div>
{/if}
