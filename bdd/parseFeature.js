import { readFile } from 'node:fs/promises';

const STEP_KEYWORDS = ['假如', '當', '那麼', '而且'];

export async function parseFeatureFile(path) {
  const content = await readFile(path, 'utf-8');
  return parseFeature(content);
}

export function parseFeature(source) {
  const lines = source.split(/\r?\n/);
  const backgroundSteps = [];
  const scenarios = [];
  let currentScenario = null;
  let readingExamples = false;
  let exampleHeaders = null;
  let activeStep = null;
  let mode = 'feature';

  const pushScenario = () => {
    if (currentScenario) {
      scenarios.push(currentScenario);
      currentScenario = null;
    }
    readingExamples = false;
    exampleHeaders = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('#') || line === '') {
      if (line === '') {
        activeStep = null;
        readingExamples = readingExamples && !!currentScenario?.outline;
      }
      continue;
    }

    if (line.startsWith('背景:')) {
      pushScenario();
      mode = 'background';
      continue;
    }

    if (line.startsWith('場景大綱:')) {
      pushScenario();
      mode = 'scenario-outline';
      currentScenario = {
        name: line.split(':')[1]?.trim() ?? '未命名場景大綱',
        steps: [],
        outline: true,
        examples: [],
      };
      readingExamples = false;
      exampleHeaders = null;
      continue;
    }

    if (line.startsWith('場景:')) {
      pushScenario();
      mode = 'scenario';
      currentScenario = {
        name: line.split(':')[1]?.trim() ?? '未命名場景',
        steps: [],
        outline: false,
      };
      continue;
    }

    if (line.startsWith('例子:')) {
      if (!currentScenario || !currentScenario.outline) {
        throw new Error('Found examples without a preceding scenario outline.');
      }
      readingExamples = true;
      exampleHeaders = null;
      continue;
    }

    if (line.startsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

      if (readingExamples) {
        if (!exampleHeaders) {
          exampleHeaders = cells;
        } else {
          const row = {};
          exampleHeaders.forEach((header, index) => {
            row[header.trim()] = cells[index];
          });
          currentScenario.examples.push(row);
        }
      } else if (activeStep) {
        activeStep.table = activeStep.table ?? [];
        activeStep.table.push(cells);
      } else {
        throw new Error('Encountered table rows without a preceding step.');
      }
      continue;
    }

    const keyword = STEP_KEYWORDS.find((step) => line.startsWith(step));
    if (keyword) {
      const text = line.slice(keyword.length).trim();
      const step = { keyword, text };
      activeStep = step;
      if (mode === 'background') {
        backgroundSteps.push(step);
      } else if (currentScenario) {
        currentScenario.steps.push(step);
      } else {
        throw new Error(`Step found outside of scenario: ${line}`);
      }
      continue;
    }
  }

  pushScenario();

  const expandedScenarios = [];
  for (const scenario of scenarios) {
    if (scenario.outline) {
      scenario.examples.forEach((example, index) => {
        const steps = scenario.steps.map((step) => substituteStep(step, example));
        expandedScenarios.push({
          name: `${scenario.name} (例子 ${index + 1})`,
          steps: [...backgroundSteps.map(cloneStep), ...steps],
        });
      });
    } else {
      expandedScenarios.push({
        name: scenario.name,
        steps: [...backgroundSteps.map(cloneStep), ...scenario.steps.map(cloneStep)],
      });
    }
  }

  return expandedScenarios;
}

function substituteStep(step, replacements) {
  const replacePlaceholders = (value) =>
    value.replace(/<([^>]+)>/g, (_, key) => replacements[key.trim()] ?? '');

  const cloned = cloneStep(step);
  cloned.text = replacePlaceholders(cloned.text);
  if (cloned.table) {
    cloned.table = cloned.table.map((row) => row.map((cell) => replacePlaceholders(cell)));
  }
  return cloned;
}

function cloneStep(step) {
  return {
    keyword: step.keyword,
    text: step.text,
    table: step.table ? step.table.map((row) => [...row]) : undefined,
  };
}
