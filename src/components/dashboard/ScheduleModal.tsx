'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Schedule, ScheduleCategory } from '@/lib/types';
import toast from 'react-hot-toast';

interface Props {
  schedule?: Schedule | null; // null = add mode, Schedule = edit mode
  defaultDate?: string;
  onClose: () => void;
  onSave: (data: Omit<Schedule, 'id' | 'created_at'>) => void;
  onDelete?: (id: number) => void;
}

const CATEGORIES: ScheduleCategory[] = ['수업', '평가', '행사', '팀활동', '기타'];

export default function ScheduleModal({ schedule, defaultDate, onClose, onSave, onDelete }: Props) {
  const isEdit = Boolean(schedule);
  const [form, setForm] = useState({
    title: schedule?.title ?? '',
    start_date: schedule?.start_date ?? defaultDate ?? new Date().toISOString().split('T')[0],
    end_date: schedule?.end_date ?? '',
    category: (schedule?.category ?? '수업') as ScheduleCategory,
    is_dday: schedule?.is_dday ?? false,
    color: schedule?.color ?? '',
  });

  const set = (key: string, val: string | boolean) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('제목을 입력해주세요'); return; }
    if (!form.start_date) { toast.error('날짜를 선택해주세요'); return; }
    onSave({ ...form });
  };

  const handleDelete = () => {
    if (!schedule || !onDelete) return;
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    onDelete(schedule.id);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? '일정 수정' : '일정 추가'}</span>
          <button className="btn btn-ghost" style={{ padding: 4 }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label className="form-label">제목 *</label>
            <input className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="예: 중간발표, 수업 - 리액트 심화" />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">날짜 *</label>
              <input className="form-input" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">종료일 (선택)</label>
              <input className="form-input" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">카테고리</label>
              <select className="form-select" value={form.category} onChange={(e) => set('category', e.target.value as ScheduleCategory)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field" style={{ justifyContent: 'flex-end' }}>
              <label className="form-label">D-Day 설정</label>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
                onClick={() => set('is_dday', !form.is_dday)}
              >
                <div style={{
                  width: 36, height: 20, borderRadius: 10, background: form.is_dday ? 'var(--accent)' : 'var(--bg-hover)',
                  position: 'relative', transition: '0.2s',
                }}>
                  <div style={{
                    position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: 'white',
                    top: 3, left: form.is_dday ? 19 : 3, transition: '0.2s',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: form.is_dday ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {form.is_dday ? 'D-Day 활성' : 'D-Day 비활성'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {isEdit && onDelete && (
            <button className="btn" onClick={handleDelete} style={{ background: 'var(--red-light)', color: 'var(--red)', marginRight: 'auto' }}>
              삭제
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave}>{isEdit ? '저장' : '추가'}</button>
        </div>
      </div>
    </div>
  );
}
