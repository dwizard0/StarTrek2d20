import type { Character } from '../common/character';
import { Stereotype } from '../common/construct';
import { CharacterType } from '../common/characterType';
import type { SelectedTalent } from '../common/selectedTalent';
import { StepContext } from '../state/stepContext';

export interface LifepathTalentStep {
  talent?: SelectedTalent;
  talentDeferred?: boolean;
}

export const supportsDeferredTalents = (character: Character) =>
  character.version === 2 && character.stereotype === Stereotype.MainCharacter;

export const lifepathTalentContexts = [
  StepContext.Species,
  StepContext.EarlyOutlook,
  StepContext.Education,
  StepContext.Career,
  StepContext.FinishingTouches,
];

export function getLifepathTalentStep(
  character: Character,
  context: StepContext,
): LifepathTalentStep | undefined {
  switch (context) {
    case StepContext.Species:
      return character.speciesStep;
    case StepContext.EarlyOutlook:
      return character.upbringingStep;
    case StepContext.Education:
      return character.educationStep;
    case StepContext.Career:
      return character.careerStep;
    case StepContext.FinishingTouches:
      return character.finishingStep;
    default:
      return undefined;
  }
}

export function lifepathTalentLabel(context: StepContext) {
  switch (context) {
    case StepContext.Species:
      return 'Species';
    case StepContext.EarlyOutlook:
      return 'Upbringing / early outlook';
    case StepContext.Education:
      return 'Education';
    case StepContext.Career:
      return 'Career length';
    default:
      return 'Finishing touches';
  }
}

export function requiresLifepathTalent(
  character: Character,
  context: StepContext,
) {
  if (!getLifepathTalentStep(character, context)) return false;
  // Child education supplies age adjustments, not an education talent.
  if (
    context === StepContext.Education &&
    character.type === CharacterType.Child
  )
    return false;
  return (
    context !== StepContext.Species ||
    !character.speciesStep.ability ||
    !!character.speciesStep.ability.talentNames?.length
  );
}

export function canDeferTalent(character: Character, context: StepContext) {
  return (
    supportsDeferredTalents(character) &&
    context !== StepContext.FinishingTouches &&
    requiresLifepathTalent(character, context)
  );
}

export function isTalentDeferred(character: Character, context: StepContext) {
  return (
    canDeferTalent(character, context) &&
    getLifepathTalentStep(character, context)?.talentDeferred === true
  );
}
