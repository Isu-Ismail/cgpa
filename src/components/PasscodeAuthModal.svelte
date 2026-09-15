<script>
  import { hashPasscode, checkTemplateIdExists } from '../utils/firebaseService.js';
  import { Lock, X, KeyRound, ShieldAlert, Sparkles } from 'lucide-svelte';

  let { isOpen = false, template = null, onSuccess = () => {}, onClose = () => {} } = $props();

  let enteredPasscode = $state('');
  let isChecking = $state(false);
  let authError = $state('');

  let wasOpen = false;
  $effect(() => {
    if (isOpen && !wasOpen) {
      wasOpen = true;
      enteredPasscode = '';
      authError = '';
      isChecking = false;
    } else if (!isOpen) {
      wasOpen = false;
    }
  });

  async function handleVerifyPasscode() {
    if (!enteredPasscode || enteredPasscode.trim().length < 4) {
      authError = 'Passcode must be at least 4 characters.';
      return;
    }

    if (!template) return;

    isChecking = true;
    authError = '';

    try {
      const docId = template.docId || template.id;
      const userHash = await hashPasscode(enteredPasscode.trim());

      let targetHash = template.passcodeHash;

      // If passcodeHash isn't in local template object, fetch fresh status from Firestore
      if (!targetHash && docId) {
        const checkRes = await checkTemplateIdExists(docId);
        targetHash = checkRes.passcodeHash;
      }

      // If document exists on cloud and has a stored passcode hash, verify it!
      if (targetHash && userHash !== targetHash) {
        authError = '❌ Incorrect Secret Passcode! You do not have permission to edit this template.';
        return;
      }

      // Authorization successful!
      onSuccess(enteredPasscode.trim());
      onClose();
    } catch (err) {
      authError = err.message || 'Failed to verify passcode.';
    } finally {
      isChecking = false;
    }
  }
</script>

{#if isOpen && template}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
    
    <div class="neo-box-lg bg-[#FAF7EE] w-full max-w-md p-6 relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header -->
      <div class="flex items-center justify-between border-b-2 border-black pb-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-[#FF70A6] text-white border-2 border-black flex items-center justify-center font-bold">
            <Lock class="w-4 h-4" />
          </div>
          <div>
            <h3 class="font-display font-black text-base text-black">Passcode Required</h3>
            <p class="text-[11px] font-mono text-zinc-600 font-bold">Document: {template.docId || template.id}</p>
          </div>
        </div>

        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-black hover:text-white text-black p-1"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Description -->
      <p class="text-xs font-mono text-zinc-700 leading-relaxed">
        This cloud template is locked. Enter the <strong>Secret Passcode</strong> set by the publisher to unlock the Editor Studio.
      </p>

      <!-- Passcode Input -->
      <div>
        <label for="auth-passcode-input" class="block text-xs font-mono font-bold text-black mb-1 flex items-center gap-1">
          <KeyRound class="w-3.5 h-3.5 text-amber-600" />
          <span>Secret Passcode *</span>
        </label>
        <input 
          id="auth-passcode-input"
          type="password"
          placeholder="Enter secret passcode..."
          bind:value={enteredPasscode}
          onkeydown={(e) => e.key === 'Enter' && handleVerifyPasscode()}
          class="neo-input text-xs font-mono font-bold py-2 w-full"
        />
      </div>

      <!-- Error Message -->
      {#if authError}
        <div class="neo-box bg-[#FFD1D1] border-2 border-black p-3 text-xs font-mono font-black text-black flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]">
          <ShieldAlert class="w-4 h-4 text-red-700 shrink-0 stroke-[2.5]" />
          <span class="text-black font-black">{authError}</span>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-2 pt-2">
        <button 
          onclick={onClose}
          class="neo-btn bg-white hover:bg-zinc-100 text-black px-4 py-2 text-xs font-bold"
        >
          Cancel
        </button>

        <button 
          onclick={handleVerifyPasscode}
          disabled={isChecking}
          class="neo-btn bg-[#FFDE59] hover:bg-amber-400 disabled:opacity-50 text-black px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000]"
        >
          <Lock class="w-3.5 h-3.5" />
          <span>{isChecking ? 'Verifying...' : 'Unlock Editor Studio'}</span>
        </button>
      </div>

    </div>
  </div>
{/if}
