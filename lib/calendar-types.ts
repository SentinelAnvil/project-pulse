export type CalendarCategory = "fixed" | "protected" | "focus" | "flexible" | "routine";

export type CalendarBlock = {
  id: string;
  title: string;
  notes: string;
  category: CalendarCategory;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  source: "manual" | "import";
  createdAt: string;
  updatedAt: string;
};

export type CalendarBlockInput = {
  title: string;
  notes: string;
  category: CalendarCategory;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ImportedCalendarBlock = CalendarBlockInput & { sourceIndex: number };

export type CalendarImportPreview = {
  valid: boolean;
  version: 1 | null;
  timezone: string | null;
  blocks: ImportedCalendarBlock[];
  errors: string[];
  warnings: string[];
  duplicateCount: number;
};
