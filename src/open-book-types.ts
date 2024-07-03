export type CellContent = string | number | null | undefined;

export interface CellPosition {
  col: number;
  row: number;
};

export interface SelectionFragment {
  from: CellPosition;
  to: CellPosition;
};
