import { fileURLToPath } from 'node:url';
import { parseFeatureFile } from '../bdd/parseFeature.js';
import { findStepDefinition } from '../bdd/framework.js';
import { createWorld } from '../bdd/world.js';

const FEATURE_PATH = fileURLToPath(new URL('../features/tic_tac_toe.feature', import.meta.url));

async function loadStepDefinitions() {
  await import('../bdd/steps.js');
}

function formatStep(step) {
  const table = step.table
    ? `\n${step.table.map((row) => `| ${row.join(' | ')} |`).join('\n')}`
    : '';
  return `${step.keyword} ${step.text}${table}`;
}

async function run() {
  await loadStepDefinitions();
  const scenarios = await parseFeatureFile(FEATURE_PATH);
  let failures = 0;

  for (const scenario of scenarios) {
    const world = createWorld();
    console.log(`\n場景: ${scenario.name}`);
    for (const step of scenario.steps) {
      const definition = findStepDefinition(step.text);
      if (!definition) {
        console.error(`  未找到步驟定義: ${formatStep(step)}`);
        failures += 1;
        break;
      }

      try {
        await definition.handler(world, ...definition.match.slice(1), step.table);
        console.log(`  ✓ ${formatStep(step)}`);
      } catch (error) {
        failures += 1;
        console.error(`  ✗ ${formatStep(step)}`);
        console.error(`    ${error.message}`);
        break;
      }
    }
  }

  if (failures > 0) {
    console.error(`\n共有 ${failures} 個步驟失敗`);
    process.exitCode = 1;
  } else {
    console.log('\n所有步驟皆已通過');
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
