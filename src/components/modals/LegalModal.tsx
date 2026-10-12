import { useEffect, useRef } from 'react';
import type { LegalBlock, LegalContent, LegalInline } from '../../data/legal';
import { ModalCloseButton, ModalOverlay } from '../common/ModalOverlay';

function renderInline(content: LegalInline[], keyPrefix: string) {
  return content.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (typeof part === 'string') return part;
    if ('strong' in part) return <strong key={key}>{part.strong}</strong>;
    return <a key={key} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a>;
  });
}

function renderBlock(block: LegalBlock, sectionIndex: number, blockIndex: number) {
  const key = `${sectionIndex}-${blockIndex}`;
  if (block.type === 'paragraph') return <p key={key}>{renderInline(block.content, key)}</p>;
  if (block.type === 'list') {
    const List = block.ordered ? 'ol' : 'ul';
    return <List key={key} className={block.plain ? 'legal-modal-list-plain' : undefined}>{block.items.map((item, index) => <li key={`${key}-${index}`}>{renderInline(item, `${key}-${index}`)}</li>)}</List>;
  }
  return (
    <div className="legal-modal-table-wrap" key={key}>
      <table>
        <thead><tr>{block.headers.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr></thead>
        <tbody>{block.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function LegalModal({ content, onClose }: { content: LegalContent | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!content) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });

    const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => element.getClientRects().length > 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === 'Tab') {
        const elements = focusableElements();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); dialog.focus({ preventScroll: true }); return; }
        if (!dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
        }
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) (focusableElements()[0] ?? dialog).focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [content]);

  return (
    <ModalOverlay id="legalModalOverlay" className="map-modal-overlay" open={!!content} onClose={onClose}>
      <div className="course-modal legal-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="legalModalTitle" tabIndex={-1}>
        <div className="legal-modal-head">
          <h2 id="legalModalTitle">{content?.title}</h2>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="legal-modal-body" tabIndex={0} role="region" aria-label="안내 본문">
          {content?.sections.map((section, index) => (
            <section className="legal-modal-section" key={index}>
              {section.heading && <h3>{section.heading}</h3>}
              {section.body !== undefined && <p>{section.body}</p>}
              {section.blocks?.map((block, blockIndex) => renderBlock(block, index, blockIndex))}
            </section>
          ))}
        </div>
      </div>
    </ModalOverlay>
  );
}
