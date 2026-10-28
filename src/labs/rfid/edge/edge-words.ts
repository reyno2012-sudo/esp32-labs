/** An experiment's panel text (edge.experiments.<key> in the labs-rfid catalogue). */
export interface EdgeWords {
  readonly label: string;
  readonly unit: string;
  readonly xTitle: string;
  readonly what: string;
  readonly look: string;
  readonly markText?: string;
  readonly betweenText?: string;
  readonly ghostText?: string;
}
