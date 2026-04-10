import type { FilterGroup, FilterState } from "@/types/quiz";

interface FilterBarProps {
  filters: FilterGroup[];
  values: FilterState;
  searchPlaceholder: string;
  onChange: (key: keyof FilterState, value: string) => void;
}

function pluralize(word: string): string {
  if (word.endsWith("y")) return word.slice(0, -1) + "ies";
  if (word.endsWith("s") || word.endsWith("x")) return word + "es";
  return word + "s";
}

export function FilterBar({ filters, values, searchPlaceholder, onChange }: FilterBarProps) {
  return (
    <div className="toolbar">
      <div className="filter-bar">
        {filters.map((filter) => (
          <label key={filter.name} className="filter-control">
            <span className="filter-control__label">{filter.label}</span>
            <select
              className="filter-control__input"
              name={filter.name}
              value={values[filter.name as keyof FilterState] ?? ""}
              onChange={(e) => onChange(filter.name as keyof FilterState, e.target.value)}
            >
              <option value="">All {pluralize(filter.label)}</option>
              {filter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}

        <label className="search-bar">
          <span className="search-bar__label">Search</span>
          <input
            className="search-bar__input"
            type="search"
            placeholder={searchPlaceholder}
            value={values.search}
            onChange={(e) => onChange("search", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

