import { readFileSync } from 'node:fs';
import {
  validateQuestions,
  type ValidationMode,
  type ValidationReport,
} from '../src/content/validate';

export const PROD_FILE = 'content/questions.json';
export const DEV_FILE = 'content/questions.dev.json';

export function loadAndValidate(file: string, mode: ValidationMode): ValidationReport {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    return {
      ok: false,
      errors: [`não foi possível ler ${file}: ${(err as Error).message}`],
      warnings: [],
      questions: [],
    };
  }
  return validateQuestions(raw, mode);
}

export function printReport(file: string, report: ValidationReport): void {
  for (const w of report.warnings) console.warn(`aviso: ${w}`);
  for (const e of report.errors) console.error(`erro:  ${e}`);
  const n = report.questions.length;
  console.log(
    report.ok
      ? `✔ ${file}: ${n} perguntas válidas (${report.warnings.length} avisos)`
      : `✖ ${file}: ${report.errors.length} erro(s)`,
  );
}
