import { useState } from 'react';
import { Icon } from './Icon';

export function TagInput({
  tags,
  suggestions,
  disabled,
  onChange,
}: {
  tags: string[];

  suggestions: string[];
  disabled: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = (value: string) => {
    const tag = normalize(value);
    if (!tag || tags.includes(tag) || tags.length >= 10) return;

    onChange([...tags, tag]);
    setDraft('');
  };

  const unused = suggestions.filter((tag) => !tags.includes(tag)).slice(0, 8);

  return (
    <div className="taginput">
      {tags.length > 0 && (
        <div className="taginput__chips">
          {tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
              <button
                type="button"
                className="tag__x"
                aria-label={`Remove ${tag}`}
                disabled={disabled}
                onClick={() => onChange(tags.filter((other) => other !== tag))}
              >
                <Icon name="close" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        className="field__input"
        value={draft}
        disabled={disabled || tags.length >= 10}
        placeholder={tags.length >= 10 ? 'Ten tags is the limit' : 'Add a tag and press Enter'}
        aria-label="Add a tag"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {

          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add(draft);
          }

          if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}

        onBlur={() => add(draft)}
      />

      {unused.length > 0 && (
        <div className="taginput__suggest">
          <span className="taginput__suggestlabel">Used before</span>
          {unused.map((tag) => (
            <button
              type="button"
              className="chip chip--tiny"
              key={tag}
              disabled={disabled}
              onClick={() => add(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function normalize(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 40);
}
