'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Consultation, ConsultationType, Student } from '@/lib/types';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Consultation>) => void;
  editingCons: Consultation | null;
  student?: Student; // Optional: If provided, student pick is hidden
  allStudents?: Student[]; // Optional: List for student picker
  initialStudentId?: number;
}

export default function ConsultationModal({ 
  isOpen, onClose, onSave, editingCons, student, allStudents, initialStudentId 
}: Props) {
  const [form, setForm] = useState({
    student_id: student?.id || initialStudentId || 0,
    type: '개인상담' as ConsultationType,
    date: new Date().toISOString().split('T')[0],
    content: '',
    follow_up: ''
  });

  useEffect(() => {
    if (editingCons) {
      setForm({
        student_id: editingCons.student_id,
        type: editingCons.type,
        date: editingCons.consulted_at,
        content: editingCons.content,
        follow_up: editingCons.follow_up || ''
      });
    } else {
      setForm({
        student_id: student?.id || initialStudentId || 0,
        type: '개인상담',
        date: new Date().toISOString().split('T')[0],
        content: '',
        follow_up: ''
      });
    }
  }, [editingCons, student, initialStudentId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (form.student_id === 0 && !student) return toast.error('수강생을 선택하세요');
    if (!form.content.trim()) return toast.error('상담 내용을 입력하세요');
    
    onSave({
      student_id: student?.id || form.student_id,
      type: form.type,
      consulted_at: form.date,
      content: form.content,
      follow_up: form.follow_up
    });
  };

  return (
    <div className="p-modal-overlay" onClick={onClose}>
      <div className="p-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="p-modal-header">
          <h3>{editingCons ? '상담 이력 수정' : '새 상담 이력 등록'}</h3>
          <button className="p-m-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-modal-body">
          {!student && allStudents && (
            <div className="p-field">
              <label>수강생 선택</label>
              <select 
                className="p-select" 
                value={form.student_id} 
                onChange={e => setForm(f => ({ ...f, student_id: Number(e.target.value) }))}
              >
                <option value={0}>수강생을 선택하세요</option>
                {allStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.cohort?.name})</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="p-field">
            <label>상담 유형</label>
            <select 
              className="p-select" 
              value={form.type} 
              onChange={e => setForm(f => ({ ...f, type: e.target.value as ConsultationType }))}
            >
              {['개인상담', '진로상담', '학습점검', '기타'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div className="p-field">
            <label>날짜</label>
            <input 
              type="date" 
              className="p-input" 
              value={form.date} 
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} 
            />
          </div>
          
          <div className="p-field">
            <label>상담 내용 (Markdown 지원)</label>
            <textarea 
              className="p-input" 
              rows={6} 
              value={form.content} 
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} 
              placeholder="내용을 입력하세요..." 
            />
          </div>
          
          <div className="p-field">
            <label>조치 사항 (Markdown 지원)</label>
            <textarea 
              className="p-input" 
              rows={6} 
              value={form.follow_up} 
              onChange={e => setForm(f => ({ ...f, follow_up: e.target.value }))} 
              placeholder="액션 아이템을 입력하세요..." 
            />
          </div>
        </div>
        <div className="p-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSubmit}>저장하기</button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .p-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: pFade 0.3s; }
        .p-modal { background: var(--bg-surface); border-radius: 32px; width: 90%; max-width: 500px; box-shadow: 0 40px 100px rgba(0,0,0,0.4); overflow: hidden; animation: pModalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid var(--border); }
        .p-modal-header { padding: 32px 32px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .p-modal-header h3 { margin: 0; font-size: 18px; font-weight: 950; color: var(--text-primary); }
        .p-m-close { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .p-m-close:hover { color: var(--text-primary); transform: rotate(90deg); }
        .p-modal-body { padding: 32px; display: flex; flex-direction: column; gap: 20px; max-height: 70vh; overflow-y: auto; }
        .p-modal-footer { padding: 24px 32px; background: var(--bg-elevated); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; }
        .p-field { display: flex; flex-direction: column; gap: 8px; }
        .p-field label { font-size: 11px; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .p-select, .p-input { width: 100%; padding: 12px 16px; border: 2px solid var(--border); background: var(--bg-elevated); border-radius: 14px; font-size: 14px; font-weight: 700; color: var(--text-primary); outline: none; transition: border-color 0.2s; }
        .p-select:focus, .p-input:focus { border-color: var(--accent); }
        textarea.p-input { resize: vertical; min-height: 120px; }

        @keyframes pFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pModalIn { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
      `}} />
    </div>
  );
}
