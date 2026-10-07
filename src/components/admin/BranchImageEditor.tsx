import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { Branch } from '../../data/branches';
import { branchImagePublicUrl, type BranchImageSlot, type BranchImageSettings } from '../../data/branchDirectory';
import './BranchImageEditor.css';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export function BranchImageEditor({ slug, branch, onUpload, onDelete, onSaveSettings }: {
  slug: string;
  branch: Branch;
  onUpload: (slot: BranchImageSlot, file: File) => Promise<void>;
  onDelete: (slot: BranchImageSlot) => Promise<void>;
  onSaveSettings: (slot: BranchImageSlot, settings: BranchImageSettings) => Promise<void>;
}) {
  return <>{([1, 2] as const).map(slot => <ImageSlotEditor key={slot} slug={slug} slot={slot}
    imagePath={slot === 1 ? branch.imagePath : branch.imagePath2}
    settings={slot === 1 ? { zoom: branch.imageZoom, positionX: branch.imagePositionX, positionY: branch.imagePositionY }
      : { zoom: branch.image2Zoom, positionX: branch.image2PositionX, positionY: branch.image2PositionY }}
    onUpload={file => onUpload(slot, file)} onDelete={() => onDelete(slot)} onSaveSettings={settings => onSaveSettings(slot, settings)} />)}</>;
}

function ImageSlotEditor({ slug, slot, imagePath, settings, onUpload, onDelete, onSaveSettings }: {
  slug: string;
  slot: BranchImageSlot;
  imagePath: string | null;
  settings: BranchImageSettings;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  onSaveSettings: (settings: BranchImageSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => { setDraft({ zoom: settings.zoom, positionX: settings.positionX, positionY: settings.positionY }); }, [imagePath, settings.zoom, settings.positionX, settings.positionY]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'delete' | 'settings' | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const select = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    setError('');
    setStatus('');
    setFile(null);
    setDraft({ zoom: settings.zoom, positionX: settings.positionX, positionY: settings.positionY });
    if (!selected) return;
    if (!IMAGE_TYPES.includes(selected.type)) {
      setError('JPEG, PNG, WebP 사진만 선택할 수 있습니다.');
      event.target.value = '';
    } else if (selected.size > MAX_SIZE) {
      setError('사진 크기는 5MB 이하여야 합니다.');
      event.target.value = '';
    } else { setFile(selected); setDraft({ zoom: 1, positionX: 50, positionY: 50 }); }
  };

  const run = async (operation: 'upload' | 'delete' | 'settings') => {
    if (pending.current || (operation === 'upload' && !file) || (operation === 'settings' && (!imagePath || file))) return;
    if (operation === 'delete' && !window.confirm('사진 ' + slot + '을 삭제하시겠습니까?')) return;
    pending.current = true;
    setBusy(operation);
    setError('');
    setStatus('');
    try {
      if (operation === 'upload') await onUpload(file!);
      else if (operation === 'settings') await onSaveSettings(draft);
      else await onDelete();
      if (active.current) {
        setFile(null);
        if (input.current) input.current.value = '';
        if (operation !== 'settings') setDraft({ zoom: 1, positionX: 50, positionY: 50 });
        setStatus(operation === 'upload' ? '사진이 저장되었습니다.' : operation === 'settings' ? '사진 설정이 저장되었습니다.' : '사진이 삭제되었습니다.');
      }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : '사진 처리 중 오류가 발생했습니다.');
    } finally {
      pending.current = false;
      if (active.current) setBusy(null);
    }
  };
  const source = preview || branchImagePublicUrl(imagePath);
  const dirty = draft.zoom !== settings.zoom || draft.positionX !== settings.positionX || draft.positionY !== settings.positionY;

  return (
    <section className="admin-card branch-image-editor" aria-labelledby={'branch-image-title-' + slot} data-image-slot={slot} aria-busy={!!busy}>
      <h3 id={'branch-image-title-' + slot} className="admin-card-title">사진 {slot}</h3>
      <div className="branch-image-preview">
        {source ? <img src={source} alt={slug + ' 사진 ' + slot + (file ? ' 저장 전 미리보기' : '')} style={{ objectPosition: draft.positionX + '% ' + draft.positionY + '%', transform: 'scale(' + draft.zoom + ')', transformOrigin: draft.positionX + '% ' + draft.positionY + '%' }} /> : <span>등록된 대표사진이 없습니다.</span>}
      </div>
      <label htmlFor={'branch-image-file-' + slot}>대표사진 파일 선택</label>
      <input id={'branch-image-file-' + slot} ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={select} disabled={!!busy} />
      <p>JPEG·PNG·WebP, 최대 5MB. 파일 선택 후 사진 저장을 눌러주세요.</p>
      {file && <p>새 사진 미리보기입니다. 저장하면 기존 대표사진이 교체됩니다.</p>}
      {source && <fieldset className="branch-image-settings" disabled={!!busy}>
        <legend>표시 영역 조정</legend>
        {([
          { key: 'zoom', label: '확대/축소', min: 1, max: 3, step: .01 },
          { key: 'positionX', label: '가로 위치', min: 0, max: 100, step: 1 },
          { key: 'positionY', label: '세로 위치', min: 0, max: 100, step: 1 },
        ] as const).map(control => <div key={control.key}>
          <label htmlFor={'branch-image-' + control.key + '-' + slot}>{control.label}: {control.key === 'zoom' ? draft.zoom.toFixed(2) + '배' : draft[control.key]}</label>
          <input id={'branch-image-' + control.key + '-' + slot} type="range" min={control.min} max={control.max} step={control.step}
            value={draft[control.key]} onChange={event => setDraft(current => ({ ...current, [control.key]: Number(event.target.value) }))} />
        </div>)}
        <p>미리보기에만 반영됩니다. 등록된 사진의 설정은 사진 설정 저장을 눌러 적용하세요. 새 사진 저장 시 1배·중앙으로 초기화됩니다.</p>
      </fieldset>}
      <div className="branch-image-buttons">
        <button type="button" className="admin-save-btn" disabled={!file || !!busy} onClick={() => { void run('upload'); }}>{busy === 'upload' ? '사진 저장 중...' : '사진 저장'}</button>
        {imagePath && <button type="button" className="branch-image-delete" disabled={!!busy} onClick={() => { void run('delete'); }}>{busy === 'delete' ? '사진 삭제 중...' : '사진 삭제'}</button>}
      </div>
      {imagePath && <button type="button" className="admin-save-btn branch-image-settings-save" disabled={!!busy || !!file || !dirty} onClick={() => { void run('settings'); }}>{busy === 'settings' ? '설정 저장 중...' : '사진 설정 저장'}</button>}
      {error && <p className="branch-image-error" role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
