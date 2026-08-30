<script>
  import { AlertTriangle, Trash2, RotateCcw, Info, X, Check } from 'lucide-svelte';

  let { 
    isOpen = false, 
    title = 'Are you sure?', 
    message = 'This action cannot be undone.', 
    type = 'delete', // 'delete' | 'reset' | 'info' | 'confirm'
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm = () => {}, 
    onClose = () => {} 
  } = $props();

  function handleConfirm() {
    onConfirm();
    onClose();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
    <div class="neo-box-xl bg-[#FAF7EE] w-full max-w-md flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header Banner -->
      <div class="p-3.5 border-b-3 border-black flex items-center justify-between text-black 
        {type === 'delete' ? 'bg-[#FF4757] text-white' : type === 'reset' ? 'bg-[#FFDE59]' : type === 'info' ? 'bg-[#38BDF8]' : 'bg-[#86EFAC]'}">
        
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-black text-white border-2 border-black flex items-center justify-center font-bold text-sm shadow-[1.5px_1.5px_0px_0px_#000]">
            {#if type === 'delete'}
              <Trash2 class="w-4 h-4 text-[#FF4757]" />
            {:else if type === 'reset'}
              <RotateCcw class="w-4 h-4 text-[#FFDE59]" />
            {:else if type === 'info'}
              <Info class="w-4 h-4 text-[#38BDF8]" />
            {:else}
              <Check class="w-4 h-4 text-[#86EFAC]" />
            {/if}
          </div>
          <h3 class="font-display font-black text-lg">
            {title}
          </h3>
        </div>

        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-black hover:text-white text-black p-1 rounded-xs"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body Message -->
      <div class="p-5 space-y-3">
        <p class="font-mono text-xs font-bold text-zinc-800 leading-relaxed">
          {message}
        </p>

        {#if type === 'delete' || type === 'reset'}
          <div class="neo-box bg-[#FFF4B8] p-2.5 text-[11px] font-mono font-bold text-zinc-700 flex items-center gap-2 border">
            <AlertTriangle class="w-4 h-4 text-[#FF8E3C] shrink-0" />
            <span>Warning: This change will immediately update your saved workspace.</span>
          </div>
        {/if}
      </div>

      <!-- Action Footer -->
      <div class="bg-[#FAF7EE] border-t-3 border-black p-3.5 flex items-center justify-end gap-2.5">
        {#if cancelText}
          <button 
            onclick={onClose}
            class="neo-btn bg-white hover:bg-zinc-100 text-black px-4 py-1.5 text-xs font-bold"
          >
            {cancelText}
          </button>
        {/if}

        <button 
          onclick={handleConfirm}
          class="neo-btn px-5 py-1.5 text-xs font-black flex items-center gap-1.5
            {type === 'delete' ? 'bg-[#FF4757] hover:bg-red-600 text-white' : type === 'reset' ? 'bg-[#FFDE59] hover:bg-amber-400 text-black' : 'bg-[#4ADE80] hover:bg-emerald-500 text-black'}"
        >
          <span>{confirmText}</span>
        </button>
      </div>

    </div>
  </div>
{/if}
