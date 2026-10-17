import { Character, EducationStep, FinishingStep } from '../../src/common/character';
import { Stereotype } from '../../src/common/construct';
import { Track } from '../../src/helpers/trackEnum';
import { Source } from '../../src/helpers/sources';
import { setSources } from '../../src/state/contextActions';
import { setCharacter, StepContext } from '../../src/state/characterActions';
import { store } from '../../src/state/store';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChooseTalentLater, DeferredTalentResolver, LifepathTalentPicker } from '../../src/components/deferredTalentSelection';

jest.mock('../../src/components/singleTalentSelectionList', () => ({
  SingleTalentSelectionList: ({ talents, onSelection }) => <div data-testid="talent-list">{talents.map(t => <button key={t.name} onClick={() => onSelection(t)}>{t.name}</button>)}</div>,
}));
jest.mock('../../src/components/simpleAttributeSelector', () => ({ SimpleAttributeSelector: () => <div>Attribute selection</div> }));
Object.defineProperty(global, 'window', { value: { localStorage: { getItem: () => null, setItem: () => {} } }, writable: true });

function createCharacter() {
  const c = new Character(); c.version = 2;
  c.educationStep = new EducationStep(Track.Command);
  c.finishingStep = new FinishingStep();
  return c;
}
beforeEach(() => { store.dispatch(setSources([Source.Core2ndEdition])); });

test('choose-later control dispatches deferral and choose-now returns to an explicitly unfinished slot', () => {
  store.dispatch(setCharacter(createCharacter()));
  let c = store.getState().character.currentCharacter;
  let control = ChooseTalentLater({ character: c, context: StepContext.Education }) as React.ReactElement<any>;
  expect(renderToStaticMarkup(control)).toContain('Choose talent later');
  control.props.children[0].props.onClick();
  c = store.getState().character.currentCharacter;
  expect(c.educationStep.talentDeferred).toBe(true);
  control = ChooseTalentLater({ character: c, context: StepContext.Education }) as React.ReactElement<any>;
  const html = renderToStaticMarkup(control);
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('Deferred until finishing touches');
  control.props.children[0].props.onClick();
  expect(store.getState().character.currentCharacter.educationStep.talentDeferred).toBe(false);
  expect(store.getState().character.currentCharacter.educationStep.talent).toBeUndefined();
});

test('resolver shows origin and final validation messages even for undeferred missing talents', () => {
  const html = renderToStaticMarkup(<DeferredTalentResolver character={createCharacter()} />);
  expect(html).toContain('Lifepath talents');
  expect(html).toContain('Education: Choose a talent');
  expect(html).toContain('2 talent choice(s) need attention');
  expect(html).toContain('Select a talent before finishing');
});

test('resolver selection writes back to education, clears deferral, and leaves finishing talent alone', () => {
  const c = createCharacter(); c.educationStep.talentDeferred = true;
  store.dispatch(setCharacter(c));
  const picker = LifepathTalentPicker({ character: c, context: StepContext.Education }) as React.ReactElement<any>;
  const list = picker.props.children[2];
  const choice = list.props.talents.find(t => t.name === 'Tough');
  expect(choice).toBeDefined();
  list.props.onSelection(choice);
  const result = store.getState().character.currentCharacter;
  expect(result.educationStep.talent.talent).toBe('Tough');
  expect(result.educationStep.talentDeferred).toBe(false);
  expect(result.finishingStep.talent).toBeUndefined();
});

test.each(['1e', 'solo'])('new controls are absent in %s', mode => {
  const c = createCharacter();
  if (mode === '1e') c.version = 1; else c.stereotype = Stereotype.SoloCharacter;
  expect(renderToStaticMarkup(<ChooseTalentLater character={c} context={StepContext.Education} />)).toBe('');
  expect(renderToStaticMarkup(<DeferredTalentResolver character={c} />)).toBe('');
});
