import React from 'react';
import Button from 'react-bootstrap/Button';
import type { Character } from '../common/character';
import {
  StepContext,
  addCharacterTalent,
  deferCharacterTalent,
} from '../state/characterActions';
import { store } from '../state/store';
import {
  canDeferTalent,
  finalLifepathTalentErrors,
  getLifepathTalentChoices,
  getLifepathTalentStep,
  isTalentDeferred,
  lifepathTalentContexts,
  lifepathTalentError,
  lifepathTalentLabel,
  requiresLifepathTalent,
  supportsDeferredTalents,
} from '../helpers/lifepathTalents';
import { SingleTalentSelectionList } from './singleTalentSelectionList';
import { SimpleAttributeSelector } from './simpleAttributeSelector';

export const ChooseTalentLater: React.FC<{
  character: Character;
  context: StepContext;
}> = ({ character, context }) => {
  if (!canDeferTalent(character, context)) return null;
  const deferred = isTalentDeferred(character, context);
  return (
    <div className="my-3">
      <Button
        variant="outline-secondary"
        aria-pressed={deferred}
        onClick={() => store.dispatch(deferCharacterTalent(context, !deferred))}
      >
        {deferred ? 'Choose talent now' : 'Choose talent later'}
      </Button>
      {deferred && (
        <p role="status" className="mt-2">
          Deferred until finishing touches. This stage’s talent restrictions
          still apply.
        </p>
      )}
    </div>
  );
};

export const LifepathTalentPicker: React.FC<{
  character: Character;
  context: StepContext;
}> = ({ character, context }) => {
  const step = getLifepathTalentStep(character, context);
  const error = lifepathTalentError(character, context, true);
  return (
    <section
      className="my-4"
      aria-label={`${lifepathTalentLabel(context)} talent`}
    >
      <h3>{lifepathTalentLabel(context)}</h3>
      {error && (
        <p className="text-warning" role="status">
          {error}
        </p>
      )}
      <SingleTalentSelectionList
        key={`${context}-${step?.talentDeferred ? 'deferred' : 'active'}`}
        talents={getLifepathTalentChoices(character, context)}
        construct={character}
        initialSelection={step?.talent}
        onSelection={(talent) =>
          store.dispatch(addCharacterTalent(talent, context))
        }
      />
      {step?.talent?.talent === 'Untapped Potential' && (
        <>
          <p>Select the attribute for Untapped Potential.</p>
          <SimpleAttributeSelector
            character={character}
            isChecked={(a) => step.talent.attribute === a}
            isUpdateable={() => true}
            onSelectAttribute={(a) => {
              const talent = step.talent.copy();
              talent.attribute = a;
              store.dispatch(addCharacterTalent(talent, context));
            }}
          />
        </>
      )}
    </section>
  );
};

export const DeferredTalentResolver: React.FC<{ character: Character }> = ({
  character,
}) => {
  if (!supportsDeferredTalents(character)) return null;
  const contexts = lifepathTalentContexts.filter(
    (c) =>
      c !== StepContext.FinishingTouches &&
      requiresLifepathTalent(character, c),
  );
  const errors = finalLifepathTalentErrors(character);
  return (
    <section className="my-4" aria-label="Lifepath talent review">
      <h2>Lifepath talents</h2>
      <p>
        Resolve deferred choices and review earlier talents using your completed
        attributes and disciplines. Each choice stays with the stage that
        granted it.
      </p>
      <p role="status">
        {errors.length
          ? `${errors.length} talent choice(s) need attention before finishing.`
          : 'All lifepath talents are complete.'}
      </p>
      {contexts.map((context) => (
        <details
          key={context}
          open={
            lifepathTalentError(character, context, true) ? true : undefined
          }
        >
          <summary>
            {lifepathTalentLabel(context)}:{' '}
            {getLifepathTalentStep(character, context)?.talent?.displayName ||
              'Choose a talent'}
          </summary>
          <LifepathTalentPicker character={character} context={context} />
        </details>
      ))}
    </section>
  );
};
