import { useState } from 'react';
import { Icon } from './Icon';

/**
 * Tags as chips, typed one at a time.
 *
 * A plain comma-separated text box would be less code and worse: you cannot see what you have
 * committed to, and a stray comma silently makes two tags out of one. Chips make the current set
 * the thing on screen.
 *
 * Normalisation is mirrored from the server (`tagList` in transcript.validation.ts) so the chip
 * shows what will actually be stored. The server is still the authority — this is feedback, not a
 * second implementation of the rule, and if the two ever disagree the stored value wins.
 */
export function TagInput({
  tags,
  suggestions,
  disabled,
  onChange,
}: {
  tags: string[];
  /** Tags already in use elsewhere, offered so the same idea is not spelled two ways. */
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
          // Comma and Enter both commit, because both are what people type after a tag.
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add(draft);
          }
          // Backspace on an empty box removes the last chip — the convention for this control.
          if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        // Committing on blur too: a typed-but-unconfirmed tag that vanishes when you click
        // Generate is a tag you would swear you added.
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

/** The server's rule, mirrored: uppercase, spaces and underscores to hyphens, nothing else. */
function normalize(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 40);
}
