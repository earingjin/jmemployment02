import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { branchImagePublicUrl } from '../../data/branchDirectory';
import './BranchImageEditor.css';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export function BranchImageEditor({ slug, imagePath, onUpload, onDelete }: {
  slug: string;
  imagePath: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null);
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
    if (!selected) return;
    if (!IMAGE_TYPES.includes(selected.type)) {
      setError('JPEG, PNG, WebP 사진만 선택할 수 있습니다.');
      event.target.value = '';
    } else if (selected.size > MAX_SIZE) {
      setError('사진 크기는 5MB 이하여야 합니다.');
      event.target.value = '';
    } else { setFile(selected); }
  };

  const run = async (operation: 'upload' | 'delete') => {
    if (pending.current || (operation === 'upload' && !file)) return;
    if (operation === 'delete' && !window.confirm('대표사진을 삭제하시겠습니까?')) return;
    pending.current = true;
    setBusy(operation);
    setError('');
    setStatus('');
    try {
      if (operation === 'upload') await onUpload(file!);
      else await onDelete();
      if (active.current) {
        setFile(null);
        if (input.current) input.current.value = '';
        setStatus(operation === 'upload' ? '대표사진이 저장되었습니다.' : '대표사진이 삭제되었습니다.');
      }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : '사진 처리 중 오류가 발생했습니다.');
    } finally {
      pending.current = false;
      if (active.current) setBusy(null);
    }
  };
  const source = preview || branchImagePublicUrl(imagePath);

  return (
    <section className="admin-card branch-image-editor" aria-labelledby="branch-image-title" aria-busy={!!busy}>
      <h3 id="branch-image-title" className="admin-card-title">대표사진</h3>
      <div className="branch-image-preview">
        {source ? <img src={source} alt={file ? slug + ' 대표사진 저장 전 미리보기' : slug + ' 대표사진'} /> : <span>등록된 대표사진이 없습니다.</span>}
      </div>
      <label htmlFor="branch-image-file">대표사진 파일 선택</label>
      <input id="branch-image-file" ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={select} disabled={!!busy} />
      <p>JPEG·PNG·WebP, 최대 5MB. 파일 선택 후 사진 저장을 눌러주세요.</p>
      {file && <p>새 사진 미리보기입니다. 저장하면 기존 대표사진이 교체됩니다.</p>}
      <div className="branch-image-buttons">
        <button type="button" className="admin-save-btn" disabled={!file || !!busy} onClick={() => { void run('upload'); }}>{busy === 'upload' ? '사진 저장 중...' : '사진 저장'}</button>
        {imagePath && <button type="button" className="branch-image-delete" disabled={!!busy} onClick={() => { void run('delete'); }}>{busy === 'delete' ? '사진 삭제 중...' : '사진 삭제'}</button>}
      </div>
      {error && <p className="branch-image-error" role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
