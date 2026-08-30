<script>
  import { gpaStore } from '../store/gpaStore.js';
  import { Trash2, Plus } from 'lucide-svelte';
  import { handleGridKeyDown } from '../utils/keyboardNav.js';
  import { DEFAULT_GRADE_COLORS } from '../types/defaults.js';

  let { 
    course, 
    semesterId, 
    rowIndex, 
    totalRows = 1,
    onAddRow = () => {} 
  } = $props();

  function onKeyDown(event, colIndex) {
    handleGridKeyDown(event, {
      semesterId,
      rowIndex,
      colIndex,
      onAddRow,
      onInsertAfter: () => gpaStore.insertCourseAfter(semesterId, course.id),
      onDeleteRow: () => gpaStore.removeCourse(semesterId, course.id)
    });
  }

  function handleCodeChange(e) {
    gpaStore.updateCourse(semesterId, course.id, 'code', e.target.value.toUpperCase());
  }

  function handleNameChange(e) {
    gpaStore.updateCourse(semesterId, course.id, 'name', e.target.value);
  }

  function handleCreditsChange(e) {
    const val = parseFloat(e.target.value);
    gpaStore.updateCourse(semesterId, course.id, 'credits', isNaN(val) ? 0 : val);
  }

  function handleGradeChange(e) {
    gpaStore.updateCourse(semesterId, course.id, 'grade', e.target.value);
  }

  function handleDelete() {
    gpaStore.removeCourse(semesterId, course.id);
  }

  function handleInsertAfter() {
    gpaStore.insertCourseAfter(semesterId, course.id);
  }

  function handleMoveUp() {
    gpaStore.moveCourse(semesterId, course.id, 'up');
  }

  function handleMoveDown() {
    gpaStore.moveCourse(semesterId, course.id, 'down');
  }

  let gradePoint = $derived(
    course.grade && $gpaStore.gradePoints[course.grade] !== undefined 
      ? $gpaStore.gradePoints[course.grade] 
      : null
  );

  let qualityPoints = $derived(
    gradePoint !== null ? (parseFloat(course.credits) || 0) * gradePoint : 0
  );

  let gradeColorClass = $derived(
    course.grade ? (DEFAULT_GRADE_COLORS[course.grade] || 'bg-zinc-100 text-black') : 'bg-white text-zinc-400'
  );
</script>

<tr class="border-b-2 border-black hover:bg-[#FFFDF5] transition-colors group">
  
  <!-- Order Index & Simple Compact Arrows -->
  <td class="px-1.5 py-1.5 border-r-2 border-black w-16 bg-zinc-50/80">
    <div class="flex items-center justify-between gap-1">
      <span class="text-xs font-mono font-bold text-zinc-600 w-4 text-center">
        {rowIndex + 1}
      </span>
      <div class="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <button 
          onclick={handleMoveUp}
          disabled={rowIndex === 0}
          class="px-1.5 py-0.5 hover:bg-zinc-200 disabled:opacity-20 border border-black text-xs font-bold leading-none shadow-[1px_1px_0px_0px_#000]"
          title="Move Up"
        >
          ↑
        </button>
        <button 
          onclick={handleMoveDown}
          disabled={rowIndex === totalRows - 1}
          class="px-1.5 py-0.5 hover:bg-zinc-200 disabled:opacity-20 border border-black text-xs font-bold leading-none shadow-[1px_1px_0px_0px_#000]"
          title="Move Down"
        >
          ↓
        </button>
      </div>
    </div>
  </td>

  <!-- Col 0: Course Code -->
  <td class="p-1.5 border-r-2 border-black w-32 sm:w-36">
    <input 
      type="text" 
      data-grid-cell="{semesterId}-{rowIndex}-0"
      value={course.code}
      oninput={handleCodeChange}
      onkeydown={(e) => onKeyDown(e, 0)}
      placeholder="CS23904" 
      class="neo-input text-xs font-mono font-bold uppercase py-1 px-2 h-8"
    />
  </td>

  <!-- Col 1: Course Title / Name -->
  <td class="p-1.5 border-r-2 border-black min-w-[180px]">
    <input 
      type="text" 
      data-grid-cell="{semesterId}-{rowIndex}-1"
      value={course.name}
      oninput={handleNameChange}
      onkeydown={(e) => onKeyDown(e, 1)}
      placeholder="Course Name..." 
      class="neo-input text-xs font-semibold py-1 px-2 h-8"
    />
  </td>

  <!-- Col 2: Credits (Manual Input) -->
  <td class="p-1.5 border-r-2 border-black w-20 sm:w-24">
    <input 
      type="number" 
      min="0" 
      max="30" 
      step="0.5"
      data-grid-cell="{semesterId}-{rowIndex}-2"
      value={course.credits}
      oninput={handleCreditsChange}
      onkeydown={(e) => onKeyDown(e, 2)}
      placeholder="3" 
      class="neo-input text-xs font-mono font-bold text-center py-1 px-1 h-8"
    />
  </td>

  <!-- Col 3: Grade Selection -->
  <td class="p-1.5 border-r-2 border-black w-32 sm:w-36">
    <select 
      data-grid-cell="{semesterId}-{rowIndex}-3"
      value={course.grade}
      onchange={handleGradeChange}
      onkeydown={(e) => onKeyDown(e, 3)}
      class="w-full border-2 border-black font-black text-xs h-8 px-1.5 font-mono {gradeColorClass} shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer outline-none focus:bg-[#FFF4B8] focus:ring-2 focus:ring-black"
    >
      <option value="" class="bg-white text-zinc-400 font-normal">-- Select Grade --</option>
      {#each Object.entries($gpaStore.gradePoints) as [gradeKey, point]}
        <option value={gradeKey} class="bg-white text-black font-bold">
          {gradeKey} ({point} pts)
        </option>
      {/each}
    </select>
  </td>

  <!-- Quality Points (Calculated) -->
  <td class="px-2 py-1.5 text-center text-xs font-mono font-bold border-r-2 border-black w-20 bg-zinc-50">
    <span class="inline-block px-1.5 py-0.5 border border-black bg-white shadow-[1px_1px_0px_0px_#000] text-xs">
      {gradePoint !== null ? qualityPoints.toFixed(1) : '-'}
    </span>
  </td>

  <!-- Compact Action Buttons -->
  <td class="px-1.5 py-1.5 text-center w-16">
    <div class="flex items-center justify-center gap-1">
      <button 
        onclick={handleInsertAfter}
        class="neo-btn bg-white hover:bg-[#86EFAC] text-black p-1 text-xs"
        title="Insert row below (Ctrl + Enter)"
      >
        <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button 
        onclick={handleDelete}
        class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white text-zinc-600 p-1 text-xs"
        title="Delete row (Ctrl + Delete)"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>
  </td>

</tr>
