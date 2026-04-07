'use client';

import { X, Plus } from 'lucide-react';
import { Student, StudentStatus } from '@/lib/types';
import { mockCohorts } from '@/lib/mockData';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useData } from '@/context/DataContext';
import { useCohort } from '@/context/CohortContext';

interface Props {
  student?: Student | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function StudentModal({ student, onClose, onSave }: Props) {
  const isEdit = Boolean(student);
  const { tags: allTags } = useData();
  const { cohorts } = useCohort();
  
  const activeCohorts = cohorts
    .filter(c => c !== '전체')
    .map(name => mockCohorts.find(mc => mc.name === name) || { id: Date.now(), name });

  const initialTags = student ? allTags.filter(t => t.student_id === student.id).map(t => t.tag) : [];
  
  const [form, setForm] = useState({
    name: student?.name ?? '',
    age: student?.age?.toString() ?? '',
    phone: student?.phone ?? '',
    email: student?.email ?? '',
    cohort_id: student?.cohort_id?.toString() ?? '2',
    status: (student?.status ?? '수강중') as StudentStatus,
    note: student?.note ?? '',
  });

  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const addTag = () => {
    const fresh = tagInput.trim();
    if (!fresh) return;
    const formatted = fresh.startsWith('#') ? fresh : `#${fresh}`;
    if (tags.includes(formatted)) {
      toast.error('이미 존재하는 태그입니다');
      return;
    }
    setTags([...tags, formatted]);
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('이름을 입력해주세요'); return; }
    
    onSave({
      name: form.name,
      age: form.age ? parseInt(form.age) : undefined,
      phone: form.phone,
      email: form.email,
      cohort_id: parseInt(form.cohort_id),
      status: form.status,
      note: form.note,
      inputTags: tags,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? '수강생 정보 수정' : '수강생 추가'}</span>
          <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">이름 *</label>
              <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="홍길동" />
            </div>
            <div className="form-field">
              <label className="form-label">나이</label>
              <input className="form-input" type="number" value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="24" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">연락처</label>
              <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="010-0000-0000" />
            </div>
            <div className="form-field">
              <label className="form-label">이메일</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="example@email.com" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">소속 기수</label>
              <select className="form-select" value={form.cohort_id} onChange={(e) => set('cohort_id', e.target.value)}>
                {activeCohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">상태</label>
              <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value as StudentStatus)}>
                <option value="수강중">수강중</option>
                <option value="수료">수료</option>
                <option value="탈퇴">탈퇴</option>
              </select>
            </div>
          </div>

          <div className="form-field full" style={{ marginTop: 12 }}>
            <label className="form-label">역량 태그</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input 
                className="form-input" 
                placeholder="태그 입력 (엔터로 추가)" 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isComposing) return;
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button className="btn btn-secondary" style={{ padding: '0 12px' }} onClick={addTag}>
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map((t) => (
                <span 
                  key={t} 
                  className="tag-chip tag-default" 
                  style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'default' }}
                >
                  {t}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTag(t)} />
                </span>
              ))}
              {tags.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>등록된 태그가 없습니다.</span>}
            </div>
          </div>

          <div className="form-field full" style={{ marginTop: 12 }}>
            <label className="form-label">강사 메모 (특이사항)</label>
            <textarea
              className="form-input"
              rows={4}
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="특이사항이나 세부 정보를 입력하세요..."
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {isEdit ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
