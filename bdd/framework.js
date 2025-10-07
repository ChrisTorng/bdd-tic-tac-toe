const stepDefinitions = [];

export function defineStep(pattern, handler) {
  stepDefinitions.push({ pattern, handler });
}

export const Given = defineStep;
export const When = defineStep;
export const Then = defineStep;
export const And = defineStep;

export function findStepDefinition(text) {
  for (const definition of stepDefinitions) {
    definition.pattern.lastIndex = 0;
    const match = definition.pattern.exec(text);
    if (match) {
      return { ...definition, match };
    }
  }
  return null;
}

export function clearDefinitions() {
  stepDefinitions.length = 0;
}
