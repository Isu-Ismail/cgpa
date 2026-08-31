/**
 * Arrow-Key & Ctrl+Arrow Spreadsheet Navigation & Hotkey Helper
 * Supports seamless grid navigation across text inputs, number inputs, and Grade select dropdowns!
 */

export function handleGridKeyDown(event, { semesterId, rowIndex, colIndex, onAddRow, onInsertAfter, onDeleteRow, onUndo }) {
  const { key, target, ctrlKey, metaKey } = event;
  const isCtrl = ctrlKey || metaKey;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT';
  if (!isInput) return;

  const isSelect = target.tagName === 'SELECT';
  const isNumberInput = target.type === 'number';
  
  const isAtStart = isNumberInput ? true : (target.selectionStart === 0 && target.selectionEnd === 0);
  const isAtEnd = isNumberInput ? true : (target.selectionStart === (target.value || '').length && target.selectionEnd === (target.value || '').length);

  const focusCell = (r, c) => {
    const selector = `[data-grid-cell="${semesterId}-${r}-${c}"]`;
    /** @type {any} */
    const nextElem = document.querySelector(selector);
    if (nextElem && typeof nextElem.focus === 'function') {
      nextElem.focus();
      if (nextElem.tagName === 'INPUT' && typeof nextElem.select === 'function') {
        nextElem.select();
      }
      return true;
    }
    return false;
  };

  // Hotkey 1: Ctrl + Enter -> Insert new row immediately below current cell
  if (isCtrl && key === 'Enter') {
    event.preventDefault();
    if (onInsertAfter) {
      onInsertAfter();
      setTimeout(() => focusCell(rowIndex + 1, colIndex), 50);
    }
    return;
  }

  // Hotkey 2: Ctrl + Delete -> Delete current row
  if (isCtrl && key === 'Delete') {
    event.preventDefault();
    if (onDeleteRow) {
      onDeleteRow();
      setTimeout(() => {
        const prevRow = Math.max(0, rowIndex - 1);
        focusCell(prevRow, colIndex);
      }, 50);
    }
    return;
  }

  // Hotkey 3: Ctrl + Z -> Undo up to 5 steps back
  if (isCtrl && key.toLowerCase() === 'z') {
    if (isSelect || target.type === 'checkbox' || target.type === 'number') {
      event.preventDefault();
      if (onUndo) onUndo();
      return;
    }
  }

  // Hotkey 3: Ctrl + Arrow Keys (Forces Cell Navigation across ALL cells including Grade Select Dropdowns!)
  if (isCtrl) {
    switch (key) {
      case 'ArrowDown': {
        event.preventDefault();
        const moved = focusCell(rowIndex + 1, colIndex);
        if (!moved && onAddRow) {
          onAddRow();
          setTimeout(() => focusCell(rowIndex + 1, colIndex), 50);
        }
        return;
      }
      case 'ArrowUp': {
        if (rowIndex > 0) {
          event.preventDefault();
          focusCell(rowIndex - 1, colIndex);
        }
        return;
      }
      case 'ArrowRight': {
        event.preventDefault();
        focusCell(rowIndex, colIndex + 1);
        return;
      }
      case 'ArrowLeft': {
        if (colIndex > 0) {
          event.preventDefault();
          focusCell(rowIndex, colIndex - 1);
        }
        return;
      }
    }
  }

  // Standard Arrow & Enter Navigation (when Ctrl is not held)
  switch (key) {
    case 'ArrowDown': {
      if (!isSelect) {
        event.preventDefault();
        const moved = focusCell(rowIndex + 1, colIndex);
        if (!moved && onAddRow) {
          onAddRow();
          setTimeout(() => focusCell(rowIndex + 1, colIndex), 50);
        }
      }
      break;
    }

    case 'ArrowUp': {
      if (!isSelect && rowIndex > 0) {
        event.preventDefault();
        focusCell(rowIndex - 1, colIndex);
      }
      break;
    }

    case 'ArrowRight': {
      if (isSelect || isNumberInput || isAtEnd) {
        const nextCol = colIndex + 1;
        if (document.querySelector(`[data-grid-cell="${semesterId}-${rowIndex}-${nextCol}"]`)) {
          event.preventDefault();
          focusCell(rowIndex, nextCol);
        }
      }
      break;
    }

    case 'ArrowLeft': {
      if (isSelect || isNumberInput || isAtStart) {
        if (colIndex > 0) {
          event.preventDefault();
          focusCell(rowIndex, colIndex - 1);
        }
      }
      break;
    }

    case 'Enter': {
      // In Grade select box (<select>), allow Enter to open dropdown menu natively!
      if (isSelect) {
        return;
      }

      event.preventDefault();
      const nextCol = colIndex + 1;
      const movedNextCol = focusCell(rowIndex, nextCol);
      if (!movedNextCol) {
        const movedNextRow = focusCell(rowIndex + 1, 0);
        if (!movedNextRow && onAddRow) {
          onAddRow();
          setTimeout(() => focusCell(rowIndex + 1, 0), 50);
        }
      }
      break;
    }

    default:
      break;
  }
}
