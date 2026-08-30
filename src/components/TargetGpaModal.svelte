<script>
  import { gpaStore, overallCgpa } from '../store/gpaStore.js';
  import { calculateRequiredGpa } from '../utils/gpaCalculator.js';
  import { X, Target, CheckCircle2, AlertTriangle } from 'lucide-svelte';

  let { isOpen = false, onClose = () => {} } = $props();

  let targetCgpaInput = $state(9.0);
  let upcomingCreditsInput = $state(24);

  $effect(() => {
    if (isOpen) {
      targetCgpaInput = Math.min($gpaStore.maxGpa, Math.max(0, ($overallCgpa.cgpa || 8.0) + 0.5));
    }
  });

  let calculation = $derived(
    calculateRequiredGpa(
      $overallCgpa.totalCredits,
      $overallCgpa.cgpa,
      parseFloat(targetCgpaInput) || 0,
      parseFloat(upcomingCreditsInput) || 0,
      $gpaStore.maxGpa
    )
  );
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
    
    <div class="neo-box-xl bg-[#FAF7EE] w-full max-w-lg max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Modal Header -->
      <div class="bg-[#C084FC] border-b-3 border-black p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-black text-[#FFDE59] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_#000]">
            🎯
          </div>
          <div>
            <h3 class="font-display font-black text-xl text-black">Target CGPA Goal Planner</h3>
            <p class="text-xs font-mono text-black/80 font-bold">Calculate required average SGPA for future semesters</p>
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
        
        <div class="grid grid-cols-2 gap-3">
          <div class="neo-box bg-white p-3">
            <span class="text-[10px] font-mono font-bold uppercase text-zinc-500 block">Current CGPA</span>
            <span class="font-display font-black text-2xl text-black">{$overallCgpa.cgpa.toFixed(2)}</span>
          </div>

          <div class="neo-box bg-white p-3">
            <span class="text-[10px] font-mono font-bold uppercase text-zinc-500 block">Earned Credits</span>
            <span class="font-display font-black text-2xl text-black">{$overallCgpa.totalCredits}</span>
          </div>
        </div>

        <div class="neo-box bg-white p-4 space-y-4">
          <div>
            <label for="target-input-gpa" class="block text-xs font-mono font-bold text-black mb-1">
              Desired Target CGPA (Out of {$gpaStore.maxGpa}.0)
            </label>
            <input 
              id="target-input-gpa"
              type="number" 
              step="0.05"
              min="0"
              max={$gpaStore.maxGpa}
              bind:value={targetCgpaInput} 
              class="neo-input text-base font-mono font-bold py-2"
            />
          </div>

          <div>
            <label for="upcoming-credits-val" class="block text-xs font-mono font-bold text-black mb-1">
              Upcoming / Remaining Credits
            </label>
            <input 
              id="upcoming-credits-val"
              type="number" 
              step="1"
              min="1"
              max="200"
              bind:value={upcomingCreditsInput} 
              class="neo-input text-base font-mono font-bold py-2"
            />
            <p class="text-[11px] font-mono text-zinc-500 mt-1">Average semester is ~20-24 credits</p>
          </div>
        </div>

        {#if calculation}
          <div class="neo-box {calculation.isPossible ? 'bg-[#86EFAC]' : 'bg-[#FF70A6]'} p-4 text-black">
            <div class="flex items-start gap-3">
              {#if calculation.isPossible}
                <CheckCircle2 class="w-6 h-6 shrink-0 mt-1" />
                <div>
                  <span class="text-xs font-mono font-black uppercase tracking-wider block">Required Future GPA:</span>
                  <div class="font-display font-black text-3xl my-1">
                    {calculation.requiredGpa.toFixed(2)} <span class="text-sm font-bold">SGPA</span>
                  </div>
                  <p class="text-xs font-mono font-semibold">
                    You need an average SGPA of <strong>{calculation.requiredGpa.toFixed(2)}</strong> across the next {upcomingCreditsInput} credits to reach {targetCgpaInput} CGPA.
                  </p>
                </div>
              {:else}
                <AlertTriangle class="w-6 h-6 shrink-0 mt-1" />
                <div>
                  <span class="text-xs font-mono font-black uppercase tracking-wider block">Target Exceeds Scale Limit</span>
                  <div class="font-display font-black text-3xl my-1">
                    {calculation.requiredGpa.toFixed(2)} <span class="text-sm font-bold">SGPA</span>
                  </div>
                  <p class="text-xs font-mono font-semibold">
                    The required average exceeds the maximum scale ceiling of {$gpaStore.maxGpa}.00. Try adjusting the target or adding more credits.
                  </p>
                </div>
              {/if}
            </div>
          </div>
        {/if}

      </div>

      <!-- Modal Footer -->
      <div class="bg-[#FAF7EE] border-t-3 border-black p-4 flex items-center justify-end">
        <button 
          onclick={onClose}
          class="neo-btn bg-[#FFDE59] text-black px-5 py-2 text-xs font-black"
        >
          Got it!
        </button>
      </div>

    </div>
  </div>
{/if}
