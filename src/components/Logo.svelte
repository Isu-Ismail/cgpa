<script>
  let { size = 'md', class: className = '' } = $props();

  let dimClass = $derived(
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-11 h-11 sm:w-12 sm:h-12'
  );
</script>

<div class="inline-block relative shrink-0 {dimClass} {className}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="w-full h-full drop-shadow-[2.5px_2.5px_0px_#000000]">
    <!-- Outer Yellow Frame -->
    <rect x="3" y="3" width="54" height="54" rx="12" fill="#FFDE59" stroke="#000000" stroke-width="3" />
    
    <!-- Inner Orange Background -->
    <rect x="6" y="6" width="48" height="48" rx="9" fill="#FF8E3C" stroke="#000000" stroke-width="2.5" />
    
    <!-- Calculator Body (Larger & Centered) -->
    <rect x="17" y="21" width="30" height="31" rx="4.5" fill="#121212" stroke="#000000" stroke-width="2.5" />
    
    <!-- Calculator LCD Display Screen -->
    <rect x="20.5" y="25" width="23" height="9.5" rx="2" fill="#86EFAC" stroke="#000000" stroke-width="1.8" />
    <text x="32" y="32.5" font-family="monospace" font-size="7" font-weight="900" fill="#121212" text-anchor="middle">10.0</text>
    
    <!-- Calculator Buttons (Row 1) -->
    <rect x="20.5" y="37" width="6" height="5" rx="1.2" fill="#FFDE59" stroke="#000" stroke-width="0.8" />
    <rect x="29" y="37" width="6" height="5" rx="1.2" fill="#FF70A6" stroke="#000" stroke-width="0.8" />
    <rect x="37.5" y="37" width="6" height="5" rx="1.2" fill="#38BDF8" stroke="#000" stroke-width="0.8" />
    
    <!-- Calculator Buttons (Row 2) -->
    <rect x="20.5" y="44" width="6" height="5" rx="1.2" fill="#FFFFFF" stroke="#000" stroke-width="0.8" />
    <rect x="29" y="44" width="6" height="5" rx="1.2" fill="#FFFFFF" stroke="#000" stroke-width="0.8" />
    <rect x="37.5" y="44" width="6" height="5" rx="1.2" fill="#4ADE80" stroke="#000" stroke-width="0.8" />
    
    <!-- Graduation Cap (Base Band touching top of calculator) -->
    <path d="M 20 19 C 20 24 44 24 44 19" fill="#121212" stroke="#000000" stroke-width="2.2" />
    
    <!-- Graduation Cap (Diamond Top Larger & Centered) -->
    <path d="M 32 9 L 51 16 L 32 23 L 13 16 Z" fill="#121212" stroke="#000000" stroke-width="2.5" stroke-linejoin="round" />
    
    <!-- Tassel -->
    <path d="M 46 17 V 25" stroke="#FFDE59" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="46" cy="26.5" r="1.8" fill="#FFDE59" stroke="#000" stroke-width="0.8" />
  </svg>
</div>
