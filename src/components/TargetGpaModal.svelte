<script>
  import { gpaStore, overallCgpa } from '../store/gpaStore.js';
  import { 
    X, Target, CheckCircle2, AlertTriangle, Plus, Trash2, 
    RotateCcw, Sparkles, Sliders, Info, Layers
  } from 'lucide-svelte';

  let { isOpen = false, onClose = () => {} } = $props();

  // Settings & Current Record state
  let useWorkspaceData = $state(true);
  let customCgpa = $state(8.0);
  let customCredits = $state(0);
  let targetCgpaInput = $state(8.5);

  // Dynamic Upcoming Semesters list state
  let upcomingSemesters = $state([
    { id: 1, name: 'Upcoming Semester 1', credits: 24, customSgpa: null }
  ]);

  // Sync workspace data when modal opens or sync checkbox toggled
  $effect(() => {
    if (isOpen) {
      if (useWorkspaceData) {
        customCgpa = $overallCgpa.cgpa || 0;
        customCredits = $overallCgpa.totalCredits || 0;
      }
      if (!targetCgpaInput || targetCgpaInput <= 0) {
        targetCgpaInput = Math.min($gpaStore.maxGpa, Math.max(0, (customCgpa || 8.0) + 0.5));
      }
    }
  });

  function handleToggleWorkspaceSync(e) {
    useWorkspaceData = e.target.checked;
    if (useWorkspaceData) {
      customCgpa = $overallCgpa.cgpa || 0;
      customCredits = $overallCgpa.totalCredits || 0;
    }
  }

  function handleManualCurrentEdit() {
    useWorkspaceData = false;
  }

  function addUpcomingSemester() {
    const nextNum = upcomingSemesters.length + 1;
    upcomingSemesters = [
      ...upcomingSemesters,
      { id: Date.now(), name: `Upcoming Semester ${nextNum}`, credits: 22, customSgpa: null }
    ];
  }

  function removeUpcomingSemester(id) {
    if (upcomingSemesters.length <= 1) return;
    upcomingSemesters = upcomingSemesters.filter(s => s.id !== id);
  }

  function setPresetSemesters(count) {
    const newSemesters = [];
    for (let i = 1; i <= count; i++) {
      newSemesters.push({
        id: Date.now() + i,
        name: `Upcoming Semester ${i}`,
        credits: 22,
        customSgpa: null
      });
    }
    upcomingSemesters = newSemesters;
  }

  function clearCustomSimulation(id) {
    upcomingSemesters = upcomingSemesters.map(s => 
      s.id === id ? { ...s, customSgpa: null } : s
    );
  }

  // Total Upcoming Credits derived
  let totalUpcomingCredits = $derived(
    upcomingSemesters.reduce((sum, sem) => sum + (parseFloat(sem.credits) || 0), 0)
  );

  // Overall & Per-Semester Calculation derived
  let mathResult = $derived.by(() => {
    const currentC = Math.max(0, parseFloat(customCredits) || 0);
    const currentG = Math.max(0, parseFloat(customCgpa) || 0);
    const targetG = Math.max(0, parseFloat(targetCgpaInput) || 0);
    const maxG = $gpaStore.maxGpa || 10.0;
    const upC = totalUpcomingCredits;

    if (upC <= 0) {
      return {
        isPossible: false,
        requiredAverageSgpa: 0,
        neededQualityPoints: 0,
        message: 'Please add at least 1 credit in upcoming semesters.',
        semesterBreakdown: []
      };
    }

    const currentQP = currentC * currentG;
    const totalCredits = currentC + upC;
    const targetQP = totalCredits * targetG;
    const neededQP = targetQP - currentQP;
    const requiredAvg = neededQP / upC;

    const isPossible = requiredAvg <= maxG && requiredAvg >= 0;

    // Per semester breakdown calculation
    let totalCustomQP = 0;
    let totalCustomCredits = 0;
    let remainingCredits = 0;

    upcomingSemesters.forEach(sem => {
      const c = Math.max(0, parseFloat(sem.credits) || 0);
      if (sem.customSgpa !== null && sem.customSgpa !== '' && !isNaN(parseFloat(sem.customSgpa))) {
        const val = parseFloat(sem.customSgpa);
        totalCustomQP += c * val;
        totalCustomCredits += c;
      } else {
        remainingCredits += c;
      }
    });

    const remNeededQP = neededQP - totalCustomQP;
    const remRequiredAvg = remainingCredits > 0 ? remNeededQP / remainingCredits : 0;

    const semesterBreakdown = upcomingSemesters.map(sem => {
      const c = Math.max(0, parseFloat(sem.credits) || 0);
      let reqSgpa = requiredAvg;
      let isSimulated = false;

      if (sem.customSgpa !== null && sem.customSgpa !== '' && !isNaN(parseFloat(sem.customSgpa))) {
        reqSgpa = parseFloat(sem.customSgpa);
        isSimulated = true;
      } else if (totalCustomCredits > 0) {
        reqSgpa = remRequiredAvg;
      }

      const semIsPossible = reqSgpa <= maxG && reqSgpa >= 0;

      return {
        id: sem.id,
        name: sem.name,
        credits: c,
        requiredSgpa: parseFloat(reqSgpa.toFixed(2)),
        isPossible: semIsPossible,
        isSimulated
      };
    });

    return {
      currentC,
      currentG,
      targetG,
      totalCredits,
      upC,
      currentQP: parseFloat(currentQP.toFixed(2)),
      neededQualityPoints: parseFloat(neededQP.toFixed(2)),
      requiredAverageSgpa: parseFloat(requiredAvg.toFixed(2)),
      remRequiredAvg: parseFloat(remRequiredAvg.toFixed(2)),
      isPossible,
      hasCustomSimulation: totalCustomCredits > 0,
      semesterBreakdown
    };
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
    
    <div class="neo-box-xl bg-[#FAF7EE] w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Modal Header -->
      <div class="bg-[#C084FC] border-b-3 border-black p-4 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-black text-[#FFDE59] border-2 border-black flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_#000]">
            <Target class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-display font-black text-xl text-black">Target CGPA Goal Planner</h3>
            <p class="text-xs font-mono text-black/80 font-bold">Flexible multi-semester planner & target simulator</p>
          </div>
        </div>

        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-black hover:text-white text-black p-1.5 rounded-sm"
          title="Close Modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
        
        <!-- SECTION 1: Current Academic Record -->
        <div class="neo-box bg-white p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-black/10">
            <div class="flex items-center gap-2">
              <Sliders class="w-4 h-4 text-black" />
              <h4 class="font-display font-black text-sm text-black">Current Academic Record</h4>
            </div>

            <!-- Workspace Sync Checkbox -->
            <label class="flex items-center gap-2 text-xs font-mono font-bold text-black cursor-pointer bg-[#FFF4B8] border-1.5 border-black px-2.5 py-1 shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-[#FFDE59] transition-colors">
              <input 
                type="checkbox"
                checked={useWorkspaceData}
                onchange={handleToggleWorkspaceSync}
                class="w-4 h-4 accent-black cursor-pointer"
              />
              <span>Sync with workspace cards ({$overallCgpa.totalCredits} credits)</span>
            </label>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label for="current-cgpa-val" class="block text-xs font-mono font-bold text-zinc-700 mb-1">
                Current CGPA
              </label>
              <input 
                id="current-cgpa-val"
                type="number" 
                step="0.01"
                min="0"
                max={$gpaStore.maxGpa}
                bind:value={customCgpa}
                oninput={handleManualCurrentEdit}
                class="neo-input text-base font-mono font-bold py-1.5 bg-[#FAF7EE]"
              />
            </div>

            <div>
              <label for="current-credits-val" class="block text-xs font-mono font-bold text-zinc-700 mb-1">
                Earned / Completed Credits
              </label>
              <input 
                id="current-credits-val"
                type="number" 
                step="1"
                min="0"
                max="300"
                bind:value={customCredits}
                oninput={handleManualCurrentEdit}
                class="neo-input text-base font-mono font-bold py-1.5 bg-[#FAF7EE]"
              />
            </div>
          </div>
        </div>

        <!-- SECTION 2: Desired Target CGPA Goal -->
        <div class="neo-box bg-[#FEF08A] p-4 space-y-2 border-2.5">
          <label for="target-cgpa-goal" class="block text-xs font-mono font-black text-black uppercase tracking-wider">
            Desired Target CGPA Goal (Scale: {$gpaStore.maxGpa}.00)
          </label>
          <div class="flex items-center gap-3">
            <input 
              id="target-cgpa-goal"
              type="number" 
              step="0.05"
              min="0"
              max={$gpaStore.maxGpa}
              bind:value={targetCgpaInput} 
              class="neo-input text-xl font-display font-black py-2 bg-white flex-1"
            />
            <div class="neo-box bg-white px-3 py-2 text-center shrink-0">
              <span class="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Required Scale</span>
              <span class="font-display font-black text-sm text-black">{$gpaStore.maxGpa}.00 Max</span>
            </div>
          </div>
        </div>

        <!-- SECTION 3: Upcoming Semesters & Credit Breakdown -->
        <div class="neo-box bg-white p-4 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-black/10">
            <div>
              <h4 class="font-display font-black text-sm text-black flex items-center gap-2">
                <Layers class="w-4 h-4 text-black" />
                <span>Upcoming Semesters & Credits Split</span>
              </h4>
              <p class="text-[11px] font-mono text-zinc-500">Divide remaining credits across future semesters</p>
            </div>

            <!-- Preset Buttons -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-mono font-bold text-zinc-500 mr-1 hidden sm:inline">Presets:</span>
              <button 
                onclick={() => setPresetSemesters(1)}
                class="neo-btn bg-[#FAF7EE] hover:bg-[#FFDE59] text-black text-[11px] font-mono font-bold px-2 py-0.5"
              >
                1 Sem
              </button>
              <button 
                onclick={() => setPresetSemesters(2)}
                class="neo-btn bg-[#FAF7EE] hover:bg-[#FFDE59] text-black text-[11px] font-mono font-bold px-2 py-0.5"
              >
                2 Sems
              </button>
              <button 
                onclick={() => setPresetSemesters(3)}
                class="neo-btn bg-[#FAF7EE] hover:bg-[#FFDE59] text-black text-[11px] font-mono font-bold px-2 py-0.5"
              >
                3 Sems
              </button>
            </div>
          </div>

          <!-- Semesters List -->
          <div class="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {#each upcomingSemesters as sem, index (sem.id)}
              {@const calcSem = mathResult.semesterBreakdown.find(s => s.id === sem.id)}
              <div class="neo-box bg-[#FAF7EE] p-3 space-y-2 border-1.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2 flex-1 min-w-[160px]">
                    <span class="w-5 h-5 bg-black text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <input 
                      type="text"
                      bind:value={sem.name}
                      class="neo-input text-xs font-mono font-bold py-1 bg-white"
                      placeholder="Semester Name"
                    />
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="flex items-center gap-1">
                      <label for="sem-credits-{sem.id}" class="text-[11px] font-mono font-bold text-zinc-600">Credits:</label>
                      <input 
                        id="sem-credits-{sem.id}"
                        type="number"
                        min="1"
                        max="60"
                        bind:value={sem.credits}
                        class="neo-input text-xs font-mono font-bold py-1 w-16 bg-white text-center"
                      />
                    </div>

                    {#if upcomingSemesters.length > 1}
                      <button 
                        onclick={() => removeUpcomingSemester(sem.id)}
                        class="neo-btn bg-[#FF70A6] text-white p-1"
                        title="Remove Semester"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Per-Semester Result & Optional Simulation -->
                <div class="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-black/20 text-xs font-mono">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-zinc-700">Target Required:</span>
                    {#if calcSem}
                      <span class="font-display font-black text-sm px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000] {calcSem.isPossible ? (calcSem.isSimulated ? 'bg-[#C084FC] text-white' : 'bg-[#86EFAC] text-black') : 'bg-[#FF70A6] text-white'}">
                        {calcSem.requiredSgpa.toFixed(2)} SGPA
                      </span>
                    {/if}
                  </div>

                  <!-- Optional Target Simulation Input -->
                  <div class="flex items-center gap-1.5 ml-auto">
                    <span class="text-[10px] text-zinc-500 font-bold">Simulate Custom:</span>
                    <input 
                      type="number"
                      step="0.05"
                      min="0"
                      max={$gpaStore.maxGpa}
                      placeholder="Auto"
                      value={sem.customSgpa ?? ''}
                      oninput={(e) => {
                        const val = e.target.value;
                        sem.customSgpa = (val === '' || isNaN(parseFloat(val))) ? null : parseFloat(val);
                      }}
                      class="neo-input text-[11px] font-mono font-bold py-0.5 w-16 bg-white text-center"
                    />
                    {#if sem.customSgpa !== null}
                      <button 
                        onclick={() => clearCustomSimulation(sem.id)}
                        class="text-[10px] font-bold text-zinc-500 hover:text-black underline"
                        title="Reset to Auto"
                      >
                        Reset
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <!-- Add Semester Button & Total Credits Summary -->
          <div class="flex items-center justify-between pt-1">
            <button 
              onclick={addUpcomingSemester}
              class="neo-btn bg-[#FFDE59] text-black font-black text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Plus class="w-4 h-4 stroke-[3]" />
              <span>Add Upcoming Semester</span>
            </button>

            <div class="text-xs font-mono font-bold text-zinc-700 bg-[#FAF7EE] border border-black px-2.5 py-1">
              Total Upcoming: <span class="text-black font-black">{totalUpcomingCredits} Credits</span> ({upcomingSemesters.length} sem{upcomingSemesters.length > 1 ? 's' : ''})
            </div>
          </div>
        </div>

        <!-- SECTION 4: Final Evaluation Result Card -->
        {#if mathResult}
          <div class="neo-box {mathResult.isPossible ? 'bg-[#86EFAC]' : 'bg-[#FF70A6]'} p-4 text-black border-2.5">
            <div class="flex items-start gap-3">
              {#if mathResult.isPossible}
                <CheckCircle2 class="w-7 h-7 shrink-0 mt-0.5" />
                <div class="space-y-1">
                  <span class="text-xs font-mono font-black uppercase tracking-wider block">Target Feasible & Achievable</span>
                  <div class="font-display font-black text-3xl">
                    {mathResult.requiredAverageSgpa.toFixed(2)} <span class="text-sm font-bold">Average SGPA Needed</span>
                  </div>
                  <p class="text-xs font-mono font-semibold">
                    To reach <strong>{mathResult.targetG.toFixed(2)} CGPA</strong> from your current <strong>{mathResult.currentG.toFixed(2)} CGPA</strong> ({mathResult.currentC} credits completed), you need an average SGPA of <strong>{mathResult.requiredAverageSgpa.toFixed(2)}</strong> across your remaining {mathResult.upC} credits ({upcomingSemesters.length} semester{upcomingSemesters.length > 1 ? 's' : ''}).
                  </p>
                  {#if mathResult.hasCustomSimulation}
                    <p class="text-[11px] font-mono text-purple-900 font-bold pt-1">
                      ✨ Custom simulation active: Unadjusted semesters require an average SGPA of <strong>{mathResult.remRequiredAvg.toFixed(2)}</strong>.
                    </p>
                  {/if}
                </div>
              {:else}
                <AlertTriangle class="w-7 h-7 shrink-0 mt-0.5" />
                <div class="space-y-1">
                  <span class="text-xs font-mono font-black uppercase tracking-wider block">Target Exceeds Maximum Scale Limit</span>
                  <div class="font-display font-black text-3xl">
                    {mathResult.requiredAverageSgpa.toFixed(2)} <span class="text-sm font-bold">SGPA</span>
                  </div>
                  <p class="text-xs font-mono font-semibold">
                    The required SGPA exceeds your university's max ceiling of {$gpaStore.maxGpa}.00. Try adding more credits or adjusting your target CGPA goal.
                  </p>
                </div>
              {/if}
            </div>
          </div>
        {/if}

      </div>

      <!-- Modal Footer -->
      <div class="bg-[#FAF7EE] border-t-3 border-black p-4 flex items-center justify-between shrink-0">
        <div class="text-[11px] font-mono text-zinc-500 hidden sm:block">
          All calculations update dynamically in real time
        </div>
        <button 
          onclick={onClose}
          class="neo-btn bg-[#FFDE59] text-black px-6 py-2 text-xs font-black ml-auto"
        >
          Got it!
        </button>
      </div>

    </div>
  </div>
{/if}
