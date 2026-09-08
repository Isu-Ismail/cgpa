<script>
  import { gpaStore, overallCgpa } from '../store/gpaStore.js';
  import confetti from 'canvas-confetti';
  import { BookOpen, Calculator, Sparkles, Target } from 'lucide-svelte';
  import { DEFAULT_GRADE_COLORS } from '../types/defaults.js';

  let { onOpenTarget = () => {} } = $props();

  function triggerCelebration() {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  let percentage = $derived(
    $gpaStore.maxGpa > 0 ? Math.min(100, Math.round(($overallCgpa.cgpa / $gpaStore.maxGpa) * 100)) : 0
  );

  let performanceRemark = $derived.by(() => {
    const ratio = $gpaStore.maxGpa > 0 ? $overallCgpa.cgpa / $gpaStore.maxGpa : 0;
    if (ratio >= 0.9) return { text: 'OUTSTANDING', bg: 'bg-[#4ADE80]' };
    if (ratio >= 0.8) return { text: 'EXCELLENT', bg: 'bg-[#86EFAC]' };
    if (ratio >= 0.7) return { text: 'VERY GOOD', bg: 'bg-[#38BDF8]' };
    if (ratio >= 0.6) return { text: 'GOOD', bg: 'bg-[#FFDE59]' };
    if (ratio >= 0.5) return { text: 'AVERAGE', bg: 'bg-[#FF8E3C]' };
    return { text: 'IN PROGRESS', bg: 'bg-[#FF70A6]' };
  });
</script>

<div class="w-full max-w-7xl mx-auto mb-5">
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
    
    <!-- Hero Cumulative CGPA Box (Col span 2) -->
    <div class="neo-box bg-[#FFDE59] p-3.5 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
      <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-white/40 border-2 border-black rounded-full pointer-events-none"></div>
      
      <div>
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="neo-badge bg-black text-white font-mono text-[10px]">CUMULATIVE CGPA</span>
            <span class="neo-badge {performanceRemark.bg} text-black font-black text-[10px]">{performanceRemark.text}</span>
            <button 
              onclick={onOpenTarget}
              class="neo-btn bg-[#C084FC] hover:bg-[#a855f7] text-black px-2 py-0.5 text-[10px] font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] ml-1 transition-transform hover:scale-105"
              title="Set Target CGPA Goal & Planner"
            >
              <Target class="w-3 h-3 stroke-[2.5]" />
              <span>Set Target</span>
            </button>
          </div>
          <button 
            onclick={triggerCelebration}
            class="neo-btn bg-white hover:bg-zinc-100 p-1 rounded-xs"
            title="Celebrate!"
          >
            <Sparkles class="w-3.5 h-3.5 text-black" />
          </button>
        </div>

        <div class="flex items-baseline gap-2 my-1">
          <span class="font-display font-black text-4xl sm:text-5xl text-black tracking-tight drop-shadow-xs">
            {$overallCgpa.cgpa.toFixed(2)}
          </span>
          <span class="font-display font-bold text-xl text-black/70">
            / {$gpaStore.maxGpa}.00
          </span>
        </div>
      </div>

      <div>
        <!-- Custom Progress Bar -->
        <div class="w-full bg-white border border-black h-3.5 p-0.5 relative mb-1 shadow-[1px_1px_0px_0px_#000]">
          <div 
            class="h-full bg-[#121212] transition-all duration-500" 
            style="width: {percentage}%"
          ></div>
        </div>
        <div class="flex justify-between text-[10px] font-mono font-bold text-black">
          <span>Formula: ∑(Points) / ∑(Credits)</span>
          <span>{$overallCgpa.totalCourses} Courses Logged</span>
        </div>
      </div>
    </div>

    <!-- Total Credits Box -->
    <div class="neo-box bg-[#86EFAC] p-3.5 flex flex-col justify-between">
      <div class="flex items-center justify-between mb-1">
        <span class="neo-badge bg-white text-black font-mono text-[10px]">TOTAL CREDITS</span>
        <BookOpen class="w-4 h-4 text-black" />
      </div>
      <div>
        <div class="font-display font-black text-3xl sm:text-4xl text-black my-0.5">
          {$overallCgpa.totalCredits}
        </div>
        <p class="text-[10px] font-bold text-black/80 font-mono">∑ Credits of Graded Subjects</p>
      </div>
      <div class="mt-2 pt-1 border-t border-black/30 flex items-center justify-between text-[10px] font-mono font-bold">
        <span>Semesters:</span>
        <span class="bg-white px-1.5 py-0.2 border border-black shadow-[1px_1px_0px_0px_#000]">{$gpaStore.semesters.length}</span>
      </div>
    </div>

    <!-- Total Points Box -->
    <div class="neo-box bg-[#38BDF8] p-3.5 flex flex-col justify-between">
      <div class="flex items-center justify-between mb-1">
        <span class="neo-badge bg-white text-black font-mono text-[10px]">QUALITY POINTS</span>
        <Calculator class="w-4 h-4 text-black" />
      </div>
      <div>
        <div class="font-display font-black text-3xl sm:text-4xl text-black my-0.5">
          {$overallCgpa.totalQualityPoints.toFixed(1)}
        </div>
        <p class="text-[10px] font-bold text-black/80 font-mono">∑ (Credit × GradePoint)</p>
      </div>
      <div class="mt-2 pt-1 border-t border-black/30 flex items-center justify-between text-[10px] font-mono font-bold">
        <span class="truncate max-w-[110px]" title={$gpaStore.templateName}>{$gpaStore.templateName}</span>
        <span class="bg-black text-white px-1 py-0.2 text-[10px] font-bold">{$gpaStore.maxGpa} Max</span>
      </div>
    </div>

  </div>

  <!-- Grade Distribution Bar if any grades entered -->
  {#if Object.keys($overallCgpa.gradeCounts).length > 0}
    <div class="mt-3 neo-box bg-white p-2 flex flex-wrap items-center gap-1.5">
      <span class="text-[10px] font-mono font-black uppercase tracking-wider text-black mr-1">Grades:</span>
      {#each Object.entries($overallCgpa.gradeCounts) as [grade, count]}
        <div class="neo-badge {DEFAULT_GRADE_COLORS[grade] || 'bg-zinc-200'} text-black flex items-center gap-1 py-0 px-1 text-[10px]">
          <span class="font-black">{grade}</span>
          <span class="bg-black text-white text-[9px] px-1 py-0.2 rounded-xs">{count}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
