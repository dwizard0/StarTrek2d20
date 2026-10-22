import React from 'react';
import { t } from 'i18next';
import { Department } from '../helpers/department';
import { TalentCategory } from '../helpers/talentCategory';
import type { TalentModel } from '../helpers/talentModel';

export type TalentFilter = 'all' | 'general' | Department;

export function matchesTalentFilter(talent: TalentModel, filter: TalentFilter) {
  if (filter === 'all') return true;
  if (filter === 'general')
    return talent.category.category === TalentCategory.General;
  return (
    talent.category.category === TalentCategory.Department &&
    talent.category.includes(filter)
  );
}

export const TalentCategoryFilter: React.FC<{
  heading: string;
  value: TalentFilter;
  onChange: (value: TalentFilter) => void;
}> = ({ heading, value, onChange }) => (
  <h2 className="header-text talent-filter-heading">
    <div>{heading}</div>
    <label>
      <span>{t('TalentFilter.label')}</span>
      <select
        value={value}
        onChange={(event) => {
          const value = event.target.value;
          onChange(
            value === 'all' || value === 'general'
              ? value
              : (Number(value) as Department),
          );
        }}
      >
        <option value="all">{t('TalentFilter.all')}</option>
        <option value="general">{t('TalentCategory.general')}</option>
        {[
          Department.Command,
          Department.Conn,
          Department.Security,
          Department.Engineering,
          Department.Science,
          Department.Medicine,
        ].map((department) => (
          <option key={department} value={department}>
            {t('Construct.discipline.' + Department[department].toLowerCase())}
          </option>
        ))}
      </select>
    </label>
  </h2>
);
