<script>
  import { gpaStore } from '../store/gpaStore.js';
  import CourseRow from './CourseRow.svelte';
  import ConfirmModal from './ConfirmModal.svelte';
  import { Plus, Trash2, ScanLine, CheckCircle, AlertTriangle } from 'lucide-svelte';

  let { 
    semester,
    onOpenOcrForSemester = () => {}
  } = $props();

  let isEditingTitle = $state(false);
  let titleInputValue = $state('');
  let isDeleteConfirmOpen = $state(false);

  $effect(() => {
    if (!isEditingTitle) {
      titleInputValue = semester.name;
    }
  });

  function handleSaveTitle() {
    isEditingTitle = false;
    if (titleInputValue.trim()) {
      gpaStore.renameSemester(semester.id, titleInputValue.trim());
    } else {
      titleInputValue = semester.name;
    }
  }

  function handleAddCourse() {
    gpaStore.addCourse(semester.id);
  }

  function confirmDeleteSemester() {
    gpaStore.removeSemester(semester.id);
  }

  let sgpaFormatted = $derived((semester.sgpa || 0).toFixed(2));
</script>

<div class="neo-box bg-white overflow-hidden mb-5 border-2.5 border-black shadow-brutal hover:shadow-brutal-lg transition-shadow">
  
  <!-- Semester Header Banner -->
  <div class="bg-[#FAF7EE] border-b-2.5 border-black px-3.5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
    
    <!-- Title & Edit -->
    <div class="flex items-center gap-2 max-w-full overflow-hidden">
      <div class="w-6 h-6 sm:w-7 sm:h-7 bg-black text-[#FFDE59] border-2 border-black flex items-center justify-center font-mono font-black text-xs shadow-[1px_1px_0px_0px_#000] shrink-0">
        §
      </div>

      {#if isEditingTitle}
        <form onsubmit={(e) => { e.preventDefault(); handleSaveTitle(); }} class="flex items-center gap-1.5 min-w-0">
          <input 
            type="text" 
            bind:value={titleInputValue} 
            class="neo-input text-xs sm:text-sm font-bold py-1 px-2 max-w-[130px] sm:max-w-[200px]"
            onblur={handleSaveTitle}
          />
          <button type="submit" class="neo-btn bg-[#86EFAC] p-1 px-1.5 text-xs font-bold shrink-0">
            <CheckCircle class="w-4 h-4" />
          </button>
        </form>
      {:else}
        <button 
          onclick={() => { isEditingTitle = true; titleInputValue = semester.name; }} 
          class="group flex items-center gap-1.5 text-left min-w-0"
          title="Click to rename semester"
        >
          <h2 class="font-display font-black text-base sm:text-lg text-black group-hover:underline truncate max-w-[130px] sm:max-w-xs whitespace-nowrap overflow-hidden">
            {semester.name}
          </h2>
          <span class="text-xs font-mono font-bold text-zinc-400 group-hover:text-black shrink-0">✎</span>
        </button>
      {/if}

      <span class="neo-badge bg-white text-zinc-700 text-[10px] sm:text-xs py-0.5 px-1.5 shrink-0 font-mono font-bold border">
        {semester.gradedCount || 0}/{semester.courses.length} graded
      </span>

      {#if semester.arrearCount > 0}
        <span class="neo-badge bg-[#FF4757] text-white text-[10px] sm:text-xs py-0.5 px-1.5 flex items-center gap-1 shrink-0 font-bold" title="{semester.arrearCount} Arrear/Fail subjects excluded from earned credits">
          <AlertTriangle class="w-3 h-3" />
          <span>{semester.arrearCount} Arrear (0 pts)</span>
        </span>
      {/if}
    </div>

    <!-- Stats & Actions Toolbar (Scrollable horizontally on mobile!) -->
    <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto max-w-full no-scrollbar whitespace-nowrap py-0.5 justify-start sm:justify-end">
      
      <!-- SGPA Score Pill -->
      <div class="flex items-center border-2 border-black bg-[#FFDE59] px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000] shrink-0 text-xs font-mono font-bold">
        <span class="text-black/80 mr-1">SGPA:</span>
        <span class="font-black font-display text-sm sm:text-base text-black">{sgpaFormatted}</span>
      </div>

      <!-- Semester Points Pill -->
      <div class="flex items-center border-2 border-black bg-[#38BDF8] px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000] text-xs font-mono font-bold text-black shrink-0" title="Sum of (Credits × GradePoints)">
        <span class="text-black/80 mr-1">Pts:</span>
        <span class="text-black font-black">{(semester.totalQualityPoints || 0).toFixed(1)}</span>
      </div>

      <!-- Semester Earned Credits Pill -->
      <div class="flex items-center border-2 border-black bg-[#86EFAC] px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000] text-xs font-mono font-bold text-black shrink-0" title="Earned Credits for passed courses">
        <span class="text-black/80 mr-1">Cred:</span>
        <span class="text-black font-black">{semester.totalCredits || 0}</span>
      </div>

      <!-- Scan Marksheet for this Semester -->
      <button 
        onclick={() => onOpenOcrForSemester(semester.id)}
        class="neo-btn bg-[#FF70A6] text-white px-2 py-1 text-xs font-bold flex items-center gap-1 shrink-0"
        title="Scan marksheet image into this semester"
      >
        <ScanLine class="w-3.5 h-3.5" />
        <span class="hidden md:inline">Scan Sheet</span>
      </button>

      <!-- Add Course Button -->
      <button 
        onclick={handleAddCourse}
        class="neo-btn bg-[#4ADE80] text-black px-2 py-1 text-xs font-black flex items-center gap-1 shrink-0"
        title="Add course row"
      >
        <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
        <span class="hidden sm:inline">Add Row</span>
      </button>

      <!-- Delete Semester Button -->
      <button 
        onclick={() => isDeleteConfirmOpen = true}
        class="neo-btn bg-white hover:bg-[#FF4757] hover:text-white text-zinc-600 p-1 text-xs shrink-0"
        title="Delete semester"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>

    </div>
  </div>

  <!-- Courses Table -->
  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse min-w-[620px]">
      <thead>
        <tr class="bg-black text-white text-[11px] font-mono font-bold uppercase tracking-wider">
          <th class="py-1.5 px-2 text-center border-r border-zinc-700 w-16">#</th>
          <th class="py-1.5 px-2 border-r border-zinc-700 w-32 sm:w-36">Course Code</th>
          <th class="py-1.5 px-2 border-r border-zinc-700">Course Name</th>
          <th class="py-1.5 px-2 border-r border-zinc-700 text-center w-20 sm:w-24">Credits</th>
          <th class="py-1.5 px-2 border-r border-zinc-700 w-32 sm:w-36">Grade</th>
          <th class="py-1.5 px-2 border-r border-zinc-700 text-center w-20">Points</th>
          <th class="py-1.5 px-2 text-center w-16">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if semester.courses.length === 0}
          <tr>
            <td colspan="7" class="py-6 text-center bg-[#FAF7EE]/50">
              <p class="font-mono text-xs font-bold text-zinc-500 mb-2">No courses in this semester</p>
              <button 
                onclick={handleAddCourse}
                class="neo-btn bg-[#FFDE59] text-black px-3 py-1 text-xs font-bold"
              >
                + Add Course
              </button>
            </td>
          </tr>
        {:else}
          {#each semester.courses as course, rowIndex (course.id)}
            <CourseRow 
              {course} 
              semesterId={semester.id} 
              {rowIndex} 
              totalRows={semester.courses.length}
              onAddRow={handleAddCourse}
            />
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Table Footer -->
  <div class="bg-[#FAF7EE] border-t-2 border-black px-3.5 py-1.5 flex flex-wrap items-center justify-between text-xs font-mono font-semibold text-zinc-600 gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <span class="bg-white px-1.5 py-0.2 border border-black font-bold">Ctrl + ↑ ↓ ← →</span>
      <span>Grid Navigate</span>
      <span class="bg-white px-1.5 py-0.2 border border-black font-bold ml-1">Ctrl+Enter</span>
      <span>Insert</span>
      <span class="bg-white px-1.5 py-0.2 border border-black font-bold ml-1">Ctrl+Del</span>
      <span>Delete</span>
    </div>
    <div class="text-zinc-700 font-bold">
      {(semester.totalQualityPoints || 0).toFixed(1)} / {semester.totalCredits || 0} = {sgpaFormatted}
    </div>
  </div>

</div>

<!-- Custom Delete Semester Confirmation Modal -->
<ConfirmModal 
  isOpen={isDeleteConfirmOpen}
  title="Delete {semester.name}?"
  message="Are you sure you want to delete {semester.name} and all its {semester.courses.length} courses? This action cannot be undone."
  type="delete"
  confirmText="Delete Semester"
  onConfirm={confirmDeleteSemester}
  onClose={() => isDeleteConfirmOpen = false}
/>
