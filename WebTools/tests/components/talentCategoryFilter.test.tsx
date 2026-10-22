import { Character } from '../../src/common/character';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import translations from '../../src/i18n/locales/en/translations.json';
import {
  TalentCategoryFilter,
  matchesTalentFilter,
} from '../../src/components/talentCategoryFilter';
import { SingleTalentSelectionList } from '../../src/components/singleTalentSelectionList';
import { TalentsHelper } from '../../src/helpers/talents';
import { RankedTalent } from '../../src/helpers/rankedTalent';
import { Department } from '../../src/helpers/department';
import { SelectedTalent } from '../../src/common/selectedTalent';
import { SimpleTalentSelectionList } from '../../src/components/simpleTalentSelectionList';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../src/components/richTextEditor', () => ({
  RichTextEditor: () => null,
}));
Object.defineProperty(global, 'window', {
  value: { localStorage: { getItem: () => null } },
  writable: true,
});
beforeAll(async () => {
  await i18next
    .use(initReactI18next)
    .init({ lng: 'en', resources: { en: { translation: translations } } });
});
afterEach(() => jest.restoreAllMocks());

it('distinguishes General from specific disciplines', () => {
  const tough = TalentsHelper.getTalent('Tough');
  const advisor = TalentsHelper.getTalent('Advisor');
  expect(matchesTalentFilter(tough, 'general')).toBe(true);
  expect(matchesTalentFilter(tough, Department.Command)).toBe(false);
  expect(matchesTalentFilter(advisor, 'general')).toBe(false);
  expect(matchesTalentFilter(advisor, Department.Command)).toBe(true);
  expect(matchesTalentFilter(advisor, Department.Conn)).toBe(false);
});

it.each(['In the Nick of Time', 'Intense Scrutiny'])(
  'includes %s in both relevant disciplines',
  (name) => {
    const talent = TalentsHelper.getTalent(name);
    expect(matchesTalentFilter(talent, Department.Engineering)).toBe(true);
    expect(matchesTalentFilter(talent, Department.Science)).toBe(true);
    expect(matchesTalentFilter(talent, Department.Medicine)).toBe(false);
  },
);

it('All retains career choices that are neither General nor Department', () => {
  const veteran = TalentsHelper.getTalent('Veteran');
  expect(matchesTalentFilter(veteran, 'all')).toBe(true);
  expect(matchesTalentFilter(veteran, 'general')).toBe(false);
  expect(matchesTalentFilter(veteran, Department.Command)).toBe(false);
});

it('renders a labelled select in the orange heading with all eight choices', () => {
  const html = renderToStaticMarkup(
    <TalentCategoryFilter heading="Talents" value="all" onChange={() => {}} />,
  );
  expect(html).toContain('header-text talent-filter-heading');
  expect(html).toContain('<label>');
  expect(html).toContain('Filter talents');
  expect(html.match(/<option /g)).toHaveLength(8);
  expect(html).toContain('General');
  expect(html).toContain('Medicine');
});

function renderFilteredList(filter, selected?: SelectedTalent) {
  jest
    .spyOn(React, 'useState')
    .mockImplementationOnce(() => [filter, jest.fn()]);
  const change = jest.fn();
  const character = new Character();
  character.version = 2;
  const talents = ['Tough', 'Advisor'].map(
    (name) => new RankedTalent(TalentsHelper.getTalent(name)),
  );
  const order = talents.map((t) => t.name);
  const html = renderToStaticMarkup(
    <SingleTalentSelectionList
      heading="Talent"
      talents={talents}
      construct={character}
      initialSelection={selected}
      onSelection={change}
    />,
  );
  expect(talents.map((t) => t.name)).toEqual(order);
  expect(change).not.toHaveBeenCalled();
  return html;
}

it('filters rows without mutating eligibility or invoking selection updates', () => {
  const html = renderFilteredList('general');
  expect(html).toContain('Tough');
  expect(html).not.toContain('Advisor');
});

it('retains the selected talent outside the filter with an explanation', () => {
  const html = renderFilteredList('general', new SelectedTalent('Advisor'));
  expect(html).toContain('Advisor');
  expect(html).toContain('Tough');
  expect(html).toContain('outside this filter');
  expect(html).toContain('checked');
});

it('explains an empty result and how to restore the full list', () => {
  const html = renderFilteredList(Department.Medicine);
  expect(html).not.toContain('Advisor');
  expect(html).not.toContain('Tough');
  expect(html).toContain('No available talents match');
  expect(html).toContain('Choose All talents');
});

function renderFilteredEditor(filter, selected?: string, heading = 'Talents') {
  jest
    .spyOn(React, 'useState')
    .mockImplementationOnce(() => [filter, jest.fn()]);
  const change = jest.fn();
  const talents = ['Tough', 'Advisor'].map((name) =>
    TalentsHelper.getTalent(name),
  );
  const html = renderToStaticMarkup(
    <SimpleTalentSelectionList
      heading={heading}
      talents={talents}
      construct={new Character()}
      initialSelection={selected}
      allowDeselect={false}
      onSelection={change}
    />,
  );
  expect(talents.map((talent) => talent.name)).toEqual(['Tough', 'Advisor']);
  expect(change).not.toHaveBeenCalled();
  return html;
}

it('filters the shared editor choices by discipline without changing selection', () => {
  const html = renderFilteredEditor(Department.Command);
  expect(html).toContain('Advisor');
  expect(html).not.toContain('Tough');
  expect(html).toContain('Filter talents');
});

it('keeps the current editor talent visible and checked outside the filter', () => {
  const html = renderFilteredEditor('general', 'Advisor');
  expect(html).toContain('Advisor');
  expect(html).toContain('Tough');
  expect(html).toContain('outside this filter');
  expect(html).toContain('checked');
});

it('explains empty editor results', () => {
  const html = renderFilteredEditor(Department.Medicine);
  expect(html).toContain('No available talents match');
  expect(html).not.toContain('Advisor');
  expect(html).not.toContain('Tough');
});

it('leaves other simple selection lists unfiltered without an opt-in heading', () => {
  const html = renderFilteredEditor(Department.Medicine, undefined, '');
  expect(html).toContain('Advisor');
  expect(html).toContain('Tough');
  expect(html).not.toContain('Filter talents');
});
