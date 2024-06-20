<template>
  <div>
    <table class="ob-table">

      <!-- Headers -->
      <tr>
        <th class="ob-table-header"></th>
        <th
          v-for="(_, i) in data[0]"
          :key="i"
          class="ob-table-header"
          :class="{ 'ob-table-selection-header': selection !== null && i >= selection.from.col && i <= selection.to.col }"
        >
          {{ String.fromCharCode(65 + i) }}
        </th>
      </tr>

      <!-- Content -->
      <tr v-for="(row, i) in data" :key="i">
        <th
          class="ob-table-header"
          :class="{ 'ob-table-selection-header': selection !== null && i >= selection.from.row && i <= selection.to.row }"
        >
          {{ i + 1 }}
        </th>
        <td
          v-for="(cell, j) in row"
          :key="j"
          :class="getCellClasses(i, j)"
          :data-row="i"
          :data-col="j"
        >
          {{ cell }}
        </td>
      </tr>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ARROW_KEYS, DELETE_KEYS, TEXT_KEYS } from '../open-book-constants';
import type { Ref } from 'vue';
import type { CellContent, CellPosition, SelectionFragment } from '../open-book-types';

const data: Ref<CellContent[][]> = defineModel('data', { required: true });

onMounted(() => {
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keydown', handleKeyPressed);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('copy', handleCopy);
  document.addEventListener('cut', handleCut);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('keydown', handleKeyPressed);
  document.removeEventListener('paste', handlePaste);
  document.removeEventListener('copy', handleCopy);
  document.removeEventListener('cut', handleCut);
});

const selection: Ref<SelectionFragment | null> = ref(null);
const focusedCell: Ref<CellPosition | null> = ref(null);
const activeCell: Ref<CellPosition | null> = ref(null);

const getCellClasses = (row: number, col: number): string[] => {
  const classes: string[] = [];
  classes.push('ob-table-cell');
  if (row === focusedCell.value?.row && col === focusedCell.value?.col)
    classes.push('ob-table-cell-focused');
  if (
    selection.value !== null
    && row >= selection.value.from.row
    && row <= selection.value.to.row
    && col >= selection.value.from.col
    && col <= selection.value.to.col
    && ( col !== activeCell.value?.col || row !== activeCell.value?.row )
  )
    classes.push('ob-table-cell-selected');
  return classes;
};

// Handlers
// TODO: Is it necessary for handlers to return a boolean value?
const handleMouseDown = (e: MouseEvent): boolean => {
  const target = e.target as HTMLElement;
  if (target.closest('.ob-table-cell')) {
    const col = parseInt(target.dataset.col!);
    const row = parseInt(target.dataset.row!);
    focusedCell.value = { row, col };
    selection.value = { from: { row, col }, to: { row, col } };
    if (activeCell.value !== null && activeCell.value.col !== col && activeCell.value.row !== row) {
      const { col: activeCol, row: activeRow } = activeCell.value;
      const el = document.querySelector(`[data-col="${activeCol}"][data-row="${activeRow}"]`)! as HTMLElement;
      const content = el.textContent;
      data.value[activeRow][activeCol] = content;
      el.contentEditable = 'false';
      activeCell.value = null;
    }
  }
  else {
    if (activeCell.value !== null) {
      const { col, row } = activeCell.value;
      const el = document.querySelector(`[data-col="${col}"][data-row="${row}"]`)! as HTMLElement;
      const content = el.textContent;
      data.value[row][col] = content;
      el.contentEditable = 'false';
    }
    selection.value = null;
    focusedCell.value = null;
    activeCell.value = null;
  }
  document.addEventListener('mousemove', handleMouseMove);
  return true;
};

const handleMouseMove = (e: MouseEvent): boolean => {
  const target = e.target as HTMLElement;
  if (target.closest('.ob-table-cell') && focusedCell.value !== null && activeCell.value === null) {
    const col = parseInt(target.dataset.col!);
    const row = parseInt(target.dataset.row!);
    const { col: focusedCol, row: focusedRow } = focusedCell.value;
    const fromCol = Math.min(col, focusedCol);
    const fromRow = Math.min(row, focusedRow);
    const toCol = Math.max(col, focusedCol);
    const toRow = Math.max(row, focusedRow);
    selection.value = { from: { col: fromCol, row: fromRow }, to: { col: toCol, row: toRow } };
  }
  return true;
};

const handleMouseUp = (_: MouseEvent): boolean => {
  document.removeEventListener('mousemove', handleMouseMove);
  return true;
};

const handleKeyPressed = (e: KeyboardEvent): boolean => {
  if (e.metaKey) return true;
  if (e.key === 'Enter') {
    if (activeCell.value) {
      const { col, row } = activeCell.value;
      const cell = document.querySelector(`[data-col="${col}"][data-row="${row}"]`)! as HTMLElement;
      data.value[row][col] = cell.textContent;
      cell.contentEditable = 'false';
      activeCell.value = null;
    }
    if (focusedCell.value) {
      let { col, row } = focusedCell.value;
      const nBookRows = data.value.length;
      if (row < nBookRows - 1) {
        focusedCell.value = { col, row: row + 1 };
      }
      const { col: newCol, row: newRow } = focusedCell.value;
      selection.value = { from: { col: newCol, row: newRow }, to: { col: newCol, row: newRow } };
    }
  }
  else if (ARROW_KEYS.includes(e.key)) {
    if (focusedCell.value !== null && activeCell.value === null) {
      if (e.ctrlKey) {
        switch (e.key) {
          case 'ArrowUp':
            focusedCell.value.row = 0;
            break;
          case 'ArrowRight':
            focusedCell.value.col = data.value[0].length - 1;
            break;
          case 'ArrowDown':
            focusedCell.value.row = data.value.length - 1;
            break;
          case 'ArrowLeft':
            focusedCell.value.col = 0;
            break;
        }
        const { col, row } = focusedCell.value;
        selection.value = { from: { row, col }, to: { row, col } };
      }
      else if (e.shiftKey) {
        switch (e.key) {
          case 'ArrowUp':
            if (selection.value!.from.row > 0) selection.value!.from.row--;
            break;
          case 'ArrowRight':
            if (selection.value!.to.col < data.value[0].length - 1) selection.value!.to.col++;
            break;
          case 'ArrowDown':
            if (selection.value!.to.row < data.value.length - 1) selection.value!.to.row++;
            break;
          case 'ArrowLeft':
            if (selection.value!.from.col > 0) selection.value!.from.col--;
            break;
        }
      }
      else {
        e.preventDefault();
        switch (e.key) {
          case 'ArrowUp':
            if (focusedCell.value.row > 0) focusedCell.value.row--;
            break;
          case 'ArrowRight':
            if (focusedCell.value.col < data.value[0].length - 1) focusedCell.value.col++;
            break;
          case 'ArrowDown':
            if (focusedCell.value.row < data.value.length - 1) focusedCell.value.row++;
            break;
          case 'ArrowLeft':
            if (focusedCell.value.col > 0) focusedCell.value.col--;
            break;
        }
        const { col, row } = focusedCell.value;
        selection.value = { from: { row, col }, to: { row, col } };
      }
    }
  }
  else if (DELETE_KEYS.includes(e.key)) {
    if (selection.value !== null && activeCell.value === null) {
      let tmpData = JSON.parse(JSON.stringify(data.value));
      for (let i=selection.value.from.row; i<=selection.value.to.row; i++)
        for (let j=selection.value.from.col; j<=selection.value.to.col; j++)
          tmpData[i][j] = null;
      data.value = tmpData;
    }
  }
  else if (TEXT_KEYS.includes(e.key) && !e.ctrlKey) {
    if (activeCell.value === null && focusedCell.value !== null) {
      e.preventDefault();
      const { col, row } = focusedCell.value;
      const cell = document.querySelector(`[data-col="${col}"][data-row="${row}"]`)! as HTMLElement;
      cell.textContent = e.key;
      cell.contentEditable = 'true';
      cell.focus();
      const sel = window.getSelection()!;
      sel.selectAllChildren(cell);
      sel.collapseToEnd();
      activeCell.value = { col, row };
      return false;
    }
  }
  else if (e.key === 'F2') {
    if (activeCell.value === null && focusedCell.value !== null) {
      e.preventDefault();
      const { col, row } = focusedCell.value;
      const cell = document.querySelector(`[data-col="${col}"][data-row="${row}"]`)! as HTMLElement;
      cell.contentEditable = 'true';
      cell.focus();
      const sel = window.getSelection()!;
      sel.selectAllChildren(cell);
      sel.collapseToEnd();
      activeCell.value = { col, row };
      return false;
    }
  }
  return true;
};

const handlePaste = (e: ClipboardEvent): boolean => {
  if (focusedCell.value !== null && activeCell.value === null) {
    e.preventDefault();
    const content = e.clipboardData!.getData('text');
    const contentRows = content.split('\n').map((row) => row.split('\t'));
    const nRows = contentRows.length;
    const nCols = Math.max(...contentRows.map((row) => row.length));

    let tmpData = JSON.parse(JSON.stringify(data.value));
    const nBookRows = tmpData.length;
    const nBookCols = tmpData[0].length;

    const { col, row } = focusedCell.value;
    const missingCols = col + nCols - nBookCols;
    const missingRows = row + nRows - nBookRows;

    for (let i=0; i<nBookRows; i++) {
      for (let j=0; j<missingCols; j++) {
        tmpData[i].push(null);
      }
    }
    for (let i=0; i<missingRows; i++) {
      tmpData.push([]);
      for (let j=0; j<Math.max(nBookCols+missingCols, nBookCols); j++) {
        tmpData[nBookRows+i].push(null);
      }
    }

    for (let i=0; i<nRows; i++) {
      for (let j=0; j<nCols; j++) {
        tmpData[row+i][col+j] = contentRows[i][j];
      }
    }
    data.value = tmpData;
    return false;
  }
  return true;
};

const handleCopy = (e: ClipboardEvent): boolean => {
  if (selection.value !== null && activeCell.value === null) {
    e.preventDefault();
    const copyContent = buildClipboardContent();
    if (copyContent !== null) {
      navigator.clipboard.writeText(copyContent);
      return false;
    }
  }
  return true;
};

const handleCut = (e: ClipboardEvent): boolean => {
  if (selection.value !== null && activeCell.value === null) {
    e.preventDefault();
    const copyContent = buildClipboardContent();
    if (copyContent !== null) {
      navigator.clipboard.writeText(copyContent);
      deleteSelectionContent();
      return false;
    }
  }
  return true;
};

// Helper methods
const buildClipboardContent = (): string | null => {
  if (selection.value !== null) {
    let copyContent = '';
    for (let i=selection.value.from.row; i<=selection.value.to.row; i++) {
      for (let j=selection.value.from.col; j<=selection.value.to.col; j++) {
        copyContent += data.value![i][j] !== undefined && data.value![i][j] !== null
          ? data.value![i][j] : '';
        if (j<selection.value.to.col) copyContent += '\t';
      }
      if (i<selection.value.to.row) copyContent += '\n';
    }
    return copyContent;
  }
  return null;
};

const deleteSelectionContent = (): void => {
  if (selection.value !== null && activeCell.value === null) {
    let tmpData = JSON.parse(JSON.stringify(data.value));
    for (let i=selection.value.from.row; i<=selection.value.to.row; i++)
      for (let j=selection.value.from.col; j<=selection.value.to.col; j++)
        tmpData[i][j] = null;
    data.value = tmpData;
  }
};
</script>

<style scoped>
:root {
  --cell-font-color: #000;
  --cell-selection-border-color: #5566fd;
  --header-border-color: #c2c2c2;
  --header-font-color: #333;
}

.ob-table-header, .ob-table-cell, .ob-table {
  border: 1px solid var(--header-border-color);
}
.ob-table-header, .ob-table-cell {
  height: 22px;
  margin: 0;
  max-height: 22px;
  /* max-width: 100px; */
  padding: 0 5px;
  user-select: none;
  width: 48px;
  min-width: 48px;
}
.ob-table-header {
  background-color: #e7e7e7;
  color: var(--header-font-color);
}
.ob-table-selection-header {
  background-color: #d0d0d0;
  color: var(--header-font-color);
}
.ob-table {
  border-collapse: collapse;
}
.ob-table-cell {
  overflow-x: clip;
  color: var(--cell-font-color);
  box-sizing: border-box;
}
.ob-table-cell-focused {
  border: 3px solid var(--cell-selection-border-color);
}
.ob-table-cell-selected {
  background-color: #e4eeff;
}
.ob-table-selection-top {
  border-top: 3px solid var(--cell-selection-border-color);
}
.ob-table-selection-bottom {
  border-bottom: 3px solid var(--cell-selection-border-color);
}
.ob-table-selection-right {
  border-right: 3px solid var(--cell-selection-border-color);
}
.ob-table-selection-left {
  border-left: 3px solid var(--cell-selection-border-color);
}
.ob-table-header {
  font-weight: bold;
}

</style>
