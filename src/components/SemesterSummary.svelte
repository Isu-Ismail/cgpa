<script>
  import { semestersWithStats, overallCgpa } from '../store/gpaStore.js';
  import { ChevronDown, ChevronUp, BarChart2, Award } from 'lucide-svelte';

  let isExpanded = $state(false); // Minimized by default as requested

  // Calculate running cumulative CGPA up to each semester
  let runningSemStats = $derived.by(() => {
    let cumulativePoints = 0;
    let cumulativeEarnedCredits = 0;

    return $semestersWithStats.map((sem) => {
      cumulativePoints += sem.totalQualityPoints || 0;
      cumulativeEarnedCredits += sem.totalCredits || 0;
      const runningCgpa = cumulativeEarnedCredits > 0 ? cumulativePoints / cumulativeEarnedCredits : 0;

      return {
        ...sem,
        runningCgpa: parseFloat(runningCgpa.toFixed(2))
      };
    });
  });
</script>

<div class="w-full max-w-7xl mx-auto mb-5 neo-box bg-white overflow-hidden">
  
  <!-- Collapsible Header Banner (Minimized by default) -->
  <button 
    onclick={() => isExpanded = !isExpanded}
    class="w-full bg-[#FAF7EE] hover:bg-[#FFF4B8] border-b-2 border-black p-3.5 px-5 flex items-center justify-between transition-colors cursor-pointer select-none"
  >
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 bg-[#FF8E3C] border-2 border-black text-white flex items-center justify-center font-black text-sm shadow-[1.5px_1.5px_0px_0px_#000]">
        <BarChart2 class="w-4 h-4" />
      </div>
      <div class="text-left">
        <h3 class="font-display font-black text-base text-black flex items-center gap-2">
          <span>Semester-by-Semester Summary</span>
          <span class="neo-badge bg-black text-[#FFDE59] text-[10px] py-0 px-1 font-mono">
            {$semestersWithStats.length} Semesters
          </span>
        </h3>
        <p class="text-[11px] font-mono font-semibold text-zinc-600">
          Click to {isExpanded ? 'collapse' : 'expand'} points earned, total credits, SGPA & running CGPA breakdown
        </p>
      </div>
    </div>

    <!-- Toggle Arrow -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-mono font-bold text-zinc-600 hidden sm:inline">
        {isExpanded ? 'Hide' : 'Show Summary'}
      </span>
      <div class="neo-btn bg-white p-1 text-black">
        {#if isExpanded}
          <ChevronUp class="w-4 h-4" />
        {:else}
          <ChevronDown class="w-4 h-4" />
        {/if}
      </div>
    </div>
  </button>

  <!-- Expanded Semester Grid Content -->
  {#if isExpanded}
    <div class="p-4 sm:p-5 bg-white space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
      
      {#if runningSemStats.length === 0}
        <p class="text-xs font-mono text-zinc-500 text-center py-4 font-bold">
          No semesters added yet. Create a semester to view summary statistics.
        </p>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {#each runningSemStats as sem (sem.id)}
            <div class="neo-box bg-[#FAF7EE] p-3.5 flex flex-col justify-between hover:shadow-brutal transition-shadow border-2">
              
              <!-- Card Header -->
              <div class="flex items-center justify-between border-b border-black/20 pb-2 mb-2">
                <span class="font-display font-black text-sm text-black truncate max-w-[130px]">{sem.name}</span>
                <span class="neo-badge bg-[#FFDE59] text-black text-[10px] py-0 px-1 font-mono">
                  SGPA: {sem.sgpa.toFixed(2)}
                </span>
              </div>

              <!-- Metrics -->
              <div class="grid grid-cols-2 gap-2 text-xs font-mono my-1">
                <div class="bg-white border border-black p-1.5 shadow-[1px_1px_0px_0px_#000]">
                  <span class="text-[10px] text-zinc-500 font-bold block">Points Earned:</span>
                  <strong class="font-black text-black text-sm">{sem.totalQualityPoints.toFixed(1)}</strong>
                </div>

                <div class="bg-white border border-black p-1.5 shadow-[1px_1px_0px_0px_#000]">
                  <span class="text-[10px] text-zinc-500 font-bold block">Earned Credits:</span>
                  <strong class="font-black text-black text-sm">{sem.totalCredits}</strong>
                </div>
              </div>

              <!-- Running CGPA Banner -->
              <div class="mt-2 pt-2 border-t border-black/20 flex items-center justify-between text-[11px] font-mono font-bold">
                <span class="text-zinc-600 flex items-center gap-1">
                  <Award class="w-3.5 h-3.5 text-[#FF8E3C]" />
                  <span>Running CGPA:</span>
                </span>
                <span class="bg-black text-[#86EFAC] px-1.5 py-0.2 border border-black font-black">
                  {sem.runningCgpa.toFixed(2)}
                </span>
              </div>

            </div>
          {/each}
        </div>
      {/if}

    </div>
  {/if}

</div>
