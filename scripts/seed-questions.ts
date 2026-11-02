/**
 * Valida e faz upsert das perguntas na tabela `questions` (por id).
 *   npm run seed            → content/questions.json, validação estrita
 *   npm run seed -- --dev   → content/questions.dev.json (fixture; só no projeto de dev)
 */
import { seed } from './seed';

await seed(process.argv.includes('--dev'));
