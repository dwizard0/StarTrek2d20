import type { Character } from '../common/character';
import { CharacterType } from '../common/characterType';
import { determineSelectedTalentExtraErrors } from '../common/selectedTalentExtraCheck';
import { StepContext } from '../state/stepContext';
import { hasSource } from '../state/contextFunctions';
import { Career } from './careerEnum';
import { isMultiSelectionTalent } from './isMultiSelectionTalent';
import { RankedTalent } from './rankedTalent';
import { Source } from './sources';
import { SpeciesHelper } from './species';
import type { TalentModel } from './talentModel';
import { TalentsHelper } from './talents';

import {
  supportsDeferredTalents,
  requiresLifepathTalent,
  getLifepathTalentStep,
  isTalentDeferred,
  lifepathTalentContexts,
  lifepathTalentLabel,
} from './lifepathTalentState';

export * from './lifepathTalentState';

// Remove only this slot: its own effects cannot satisfy its prerequisites or
// count against its rank limit. Other stages remain part of the final character.
export function getLifepathTalentChoices(
  character: Character,
  context: StepContext,
): RankedTalent[] {
  if (!requiresLifepathTalent(character, context)) return [];
  const candidate = character.copy();
  getLifepathTalentStep(candidate, context).talent = undefined;
  // Cadets use the novice page without a career-length choice.
  if (context === StepContext.Career && candidate.type === CharacterType.Cadet) {
    candidate.careerStep.career = Career.Young;
  }
  let restricted: TalentModel[] | undefined;
  if (context === StepContext.Species) {
    const ability = candidate.speciesStep.ability;
    restricted = ability
      ? ability.talentNames?.map((name) => TalentsHelper.getTalent(name))
      : SpeciesHelper.getSpeciesByType(candidate.speciesStep.species).talents;
    if (!restricted?.length) restricted = undefined;
  } else if (context === StepContext.Career) {
    if (candidate.type === CharacterType.Child) {
      restricted = [TalentsHelper.getTalent('Childhood Insight')];
    } else if (
      candidate.careerStep.career === Career.Young ||
      candidate.type === CharacterType.Cadet
    ) {
      restricted = [TalentsHelper.getTalent('Untapped Potential')];
    } else if (candidate.careerStep.career === Career.Veteran) {
      restricted = [TalentsHelper.getTalent('Veteran')];
      if (hasSource(Source.TechnicalManual))
        restricted.push(TalentsHelper.getTalent('Wrote the Book'));
      if (hasSource(Source.ExplorationGuide))
        restricted.push(TalentsHelper.getTalent('Life Lessons'));
    }
  }
  return (
    restricted ?? TalentsHelper.getAllAvailableTalentsForCharacter(candidate)
  )
    .filter((t) => {
      if (!t) return false;
      // Species abilities explicitly grant these choices (for example,
      // Betazoid telepathy); their general GM-permission filters do not apply.
      // Childhood Insight is likewise an automatic grant whose repository
      // prerequisite deliberately excludes it from ordinary selection lists.
      const granted =
        (context === StepContext.Species &&
          candidate.speciesStep.ability?.talentNames.includes(t.name)) ||
        (context === StepContext.Career &&
          candidate.type === CharacterType.Child && t.name === 'Childhood Insight');
      return granted || t.isPrerequisiteFulfilled(candidate);
    })
    .filter(
      (t) =>
        isMultiSelectionTalent(t) ||
        candidate.getRankForTalent(t.name) < t.maxRank,
    )
    .map(
      (t) =>
        new RankedTalent(
          t,
          t.maxRank > 1 ? candidate.getRankForTalent(t.name) + 1 : 1,
        ),
    );
}

export function lifepathTalentError(
  character: Character,
  context: StepContext,
  final = false,
): string | undefined {
  if (
    !supportsDeferredTalents(character) ||
    !requiresLifepathTalent(character, context)
  )
    return undefined;
  const step = getLifepathTalentStep(character, context);
  if (isTalentDeferred(character, context) && !final && !step.talent)
    return undefined;
  if (step.talentDeferred)
    return 'Choose the deferred talent before finishing.';
  if (!step.talent)
    return final
      ? 'Select a talent before finishing.'
      : 'Select a talent or explicitly choose it later.';
  if (
    !getLifepathTalentChoices(character, context).some(
      (t) => t.name === step.talent.talent,
    )
  ) {
    return 'This talent no longer meets this stage’s restrictions, prerequisites, or rank limit.';
  }
  const extra = determineSelectedTalentExtraErrors(step.talent, character);
  if (extra) return extra;
  if (
    step.talent.focuses.some((f) => !f?.trim()) ||
    (step.talent.value != null && !step.talent.value.trim()) ||
    (step.talent.isCustom &&
      (!step.talent.customTalentName?.trim() ||
        !step.talent.customTalentDescription?.trim()))
  ) {
    return 'Complete the talent’s required details.';
  }
  if (isMultiSelectionTalent(step.talent) && !step.talent.isCustom) {
    const selection = step.talent;
    const duplicates = character.talents.filter(
      (t) => t !== selection && t.talent === selection.talent,
    );
    if (
      duplicates.some(
        (t) =>
          t.attribute === selection.attribute &&
          t.department === selection.department &&
          t.selection === selection.selection,
      )
    )
      return 'Choose a different option for this repeated talent.';
  }
  return undefined;
}

export function finalLifepathTalentErrors(character: Character): string[] {
  if (!supportsDeferredTalents(character)) return [];
  return lifepathTalentContexts.flatMap((context) => {
    const error = lifepathTalentError(character, context, true);
    return error ? [`${lifepathTalentLabel(context)}: ${error}`] : [];
  });
}
