/**
 * Valida o banco de perguntas sem tocar no banco de dados.
 *   npm run validate            → content/questions.json, modo estrito (regras do PRD)
 *   npm run validate -- --dev   → content/questions.dev.json, modo dev
 */
import { DEV_FILE, PROD_FILE, loadAndValidate, printReport } from './questions-file';

const dev = process.argv.includes('--dev');
const file = dev ? DEV_FILE : PROD_FILE;
const report = loadAndValidate(file, dev ? 'dev' : 'strict');
printReport(file, report);
process.exit(report.ok ? 0 : 1);
