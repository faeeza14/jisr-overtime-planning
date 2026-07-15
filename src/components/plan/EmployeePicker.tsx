// Step 2 — employee selection (brief §7.2). Jisr target-by pattern with group bulk-add.
// DS shim has no Combobox/MultiSelect (confirmed) → composed from SegmentedControl + Input +
// Item/Avatar rows + Tag chips (the fallback build-spec.md pre-authorised).

import { useMemo, useState } from 'react';
import { SegmentedControl, Input, Button, Tag, Avatar, Item } from '@jisr-hr/ds-web';
import { Search, AlertTriangle, Plus, Check } from 'lucide-react';
import type { Employee, Group } from '../../types';

type TargetBy = 'employees' | 'group' | 'branch' | 'jobtitle';

const KIND_FOR: Record<Exclude<TargetBy, 'employees'>, Group['kind']> = {
  group: 'group',
  branch: 'branch',
  jobtitle: 'jobtitle',
};

const membersOfGroup = (employees: Employee[], group: Group): Employee[] => {
  if (group.kind === 'group') return employees.filter((e) => e.groupId === group.id);
  if (group.kind === 'branch') return employees.filter((e) => e.branchId === group.id);
  return employees.filter((e) => e.role.toLowerCase().startsWith(group.name.toLowerCase().slice(0, 5)));
};

export const EmployeePicker = ({
  employees,
  groups,
  selected,
  onChange,
  conflicts,
}: {
  employees: Employee[];
  groups: Group[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** employeeIds already committed on another plan — surfaced with a warning icon. */
  conflicts: Set<string>;
}) => {
  const [targetBy, setTargetBy] = useState<TargetBy>('employees');
  const [query, setQuery] = useState('');
  const [onlyAdded, setOnlyAdded] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const add = (ids: string[]) => onChange(Array.from(new Set([...selected, ...ids])));
  const remove = (ids: string[]) => {
    const drop = new Set(ids);
    onChange(selected.filter((id) => !drop.has(id)));
  };
  const toggle = (id: string) =>
    selectedSet.has(id) ? remove([id]) : add([id]);

  const q = query.trim().toLowerCase();

  const employeeRows = useMemo(() => {
    let list = employees;
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q));
    if (onlyAdded) list = list.filter((e) => selectedSet.has(e.id));
    return list;
  }, [employees, q, onlyAdded, selectedSet]);

  const groupRows = useMemo(() => {
    if (targetBy === 'employees') return [];
    return groups
      .filter((g) => g.kind === KIND_FOR[targetBy])
      .filter((g) => (q ? g.name.toLowerCase().includes(q) : true));
  }, [groups, targetBy, q]);

  return (
    <div className="space-y-4">
      <SegmentedControl<TargetBy>
        value={targetBy}
        onChange={setTargetBy}
        options={[
          { value: 'employees', label: 'Employees' },
          { value: 'group', label: 'Group' },
          { value: 'branch', label: 'Branch' },
          { value: 'jobtitle', label: 'Job title' },
        ]}
      />

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const e = empById.get(id);
            if (!e) return null;
            return (
              <Tag
                key={id}
                avatar={<Avatar size="s" name={e.name} />}
                onDismiss={() => remove([id])}
              >
                {e.name}
              </Tag>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <Input
          size="sm"
          placeholder={targetBy === 'employees' ? 'Search employees' : `Search ${targetBy}s`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          startAddon={<Search className="size-3.5" />}
          className="w-56"
        />
        <div className="flex items-center gap-2">
          <span className="text-11 text-app-mute">
            {selected.length} of {employees.length} added
          </span>
          {targetBy === 'employees' && (
            <>
              <Button variant="tertiary" size="sm" onClick={() => add(employeeRows.map((e) => e.id))}>
                <Plus className="size-3.5" /> Add all
              </Button>
              <Button
                variant={onlyAdded ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setOnlyAdded((v) => !v)}
              >
                Show only added
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="rounded-card hairline divide-y divide-app-line dark:divide-app-line-dark max-h-[360px] overflow-y-auto">
        {targetBy === 'employees'
          ? employeeRows.map((e) => {
              const isSel = selectedSet.has(e.id);
              return (
                <Item
                  key={e.id}
                  media={<Avatar size="m" name={e.name} />}
                  description={`${e.role} · #${e.roleNumber}`}
                  actions={
                    <div className="flex items-center gap-2">
                      {conflicts.has(e.id) && (
                        <span title="Already planned on another plan" className="text-warn-ink">
                          <AlertTriangle className="size-4" />
                        </span>
                      )}
                      <Button
                        variant={isSel ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => toggle(e.id)}
                      >
                        {isSel ? (
                          <>
                            <Check className="size-3.5" /> Added
                          </>
                        ) : (
                          'Add'
                        )}
                      </Button>
                    </div>
                  }
                >
                  {e.name}
                </Item>
              );
            })
          : groupRows.map((g) => {
              const members = membersOfGroup(employees, g);
              const addedCount = members.filter((m) => selectedSet.has(m.id)).length;
              const allAdded = members.length > 0 && addedCount === members.length;
              return (
                <Item
                  key={g.id}
                  description={`${members.length} member${members.length === 1 ? '' : 's'} · ${addedCount} added`}
                  actions={
                    <Button
                      variant={allAdded ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() =>
                        allAdded ? remove(members.map((m) => m.id)) : add(members.map((m) => m.id))
                      }
                    >
                      {allAdded ? 'Remove all' : `Add all (${members.length})`}
                    </Button>
                  }
                >
                  {g.name}
                </Item>
              );
            })}
        {((targetBy === 'employees' && employeeRows.length === 0) ||
          (targetBy !== 'employees' && groupRows.length === 0)) && (
          <div className="p-6 text-center text-13 text-app-faint">No matches.</div>
        )}
      </div>
    </div>
  );
};
