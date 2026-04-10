interface SearchBarProps {
  label: string;
  name: string;
  placeholder: string;
}

export function SearchBar({ label, name, placeholder }: SearchBarProps) {
  return (
    <label className="search-bar">
      <span className="search-bar__label">{label}</span>
      <input className="search-bar__input" type="search" name={name} placeholder={placeholder} />
    </label>
  );
}
