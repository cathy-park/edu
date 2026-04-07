'use client';

import { useState } from 'react';
import { Plus, Trash2, ExternalLink, Copy, X, Pencil, SquareTerminal, MinusCircle, PlusCircle } from 'lucide-react';
import { WorkTask } from '@/lib/types';
import { mockWorkTasks } from '@/lib/mockData';
import toast from 'react-hot-toast';

export default function WorkTaskSection() {
  const [tasks, setTasks] = useState<WorkTask[]>(mockWorkTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewTask, setViewTask] = useState<WorkTask | null>(null);
  
  const [form, setForm] = useState({
    title: '',
    gpts_link: '',
    prompts: ['']
  });

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('업무명을 입력해주세요');
      return;
    }

    const filteredPrompts = form.prompts.filter(p => p.trim() !== '');
    if (filteredPrompts.length === 0) {
      toast.error('최소 하나의 프롬프트를 입력해주세요');
      return;
    }
    
    if (editId) {
      setTasks(prev => prev.map(t => t.id === editId ? { ...t, ...form, prompts: filteredPrompts } : t));
      toast.success('업무가 수정됐습니다');
      setEditId(null);
    } else {
      const newTask: WorkTask = {
        id: Date.now(),
        title: form.title,
        gpts_link: form.gpts_link,
        prompts: filteredPrompts,
        created_at: new Date().toISOString()
      };
      setTasks(prev => [...prev, newTask]);
      toast.success('업무가 추가됐습니다');
    }
    
    setForm({ title: '', gpts_link: '', prompts: [''] });
    setShowAdd(false);
    setViewTask(null);
  };

  const handleEdit = (t: WorkTask, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditId(t.id);
    setForm({ 
      title: t.title, 
      gpts_link: t.gpts_link || '', 
      prompts: t.prompts && t.prompts.length > 0 ? [...t.prompts] : [''] 
    });
    setShowAdd(true);
    setViewTask(null);
  };

  const handleDelete = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('업무를 삭제하시겠습니까?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('삭제됐습니다');
    setViewTask(null);
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('프롬프트가 복사되었습니다');
  };

  const addPromptField = () => {
    setForm(f => ({ ...f, prompts: [...f.prompts, ''] }));
  };

  const removePromptField = (index: number) => {
    if (form.prompts.length <= 1) {
      toast.error('최소 하나의 프롬프트는 있어야 합니다');
      return;
    }
    const next = [...form.prompts];
    next.splice(index, 1);
    setForm(f => ({ ...f, prompts: next }));
  };

  const updatePrompt = (index: number, val: string) => {
    const next = [...form.prompts];
    next[index] = val;
    setForm(f => ({ ...f, prompts: next }));
  };

  return (
    <div className="detail-section" style={{ marginTop: 40, borderTop: '2px solid var(--border)', paddingTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <SquareTerminal size={24} className="text-accent" style={{ color: 'var(--accent)' }} />
            업무 & AI 프롬프트 메모
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>자주 사용하는 GPTs 링크와 프롬프트를 관리하세요.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setEditId(null); setForm({ title: '', gpts_link: '', prompts: [''] }); }}>
          <Plus size={18} /> 업무 추가
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {tasks.map(t => (
          <div 
            key={t.id} 
            className="stat-card" 
            style={{ cursor: 'pointer', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', border: '1.5px solid var(--border)' }}
            onClick={() => setViewTask(t)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                }}
              >
                <SquareTerminal size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>프롬프트 {t.prompts?.length || 0}개</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {t.gpts_link && <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />}
              <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
              <Pencil size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Task View Modal */}
      {viewTask && !showAdd && (
        <div className="modal-overlay" onClick={() => setViewTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SquareTerminal size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div className="modal-title">{viewTask.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(viewTask.created_at).toLocaleDateString()} 등록</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="action-btn" onClick={() => handleEdit(viewTask)}><Pencil size={16} /></button>
                <button className="action-btn danger" onClick={() => handleDelete(viewTask.id)}><Trash2 size={16} /></button>
                <button className="action-btn" onClick={() => setViewTask(null)}><X size={20} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ gap: 24 }}>
              {viewTask.gpts_link && (
                <div className="detail-section">
                  <div className="detail-section-title">GPTs Shortcut</div>
                  <a 
                    href={viewTask.gpts_link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ 
                      width: '100%', justifyContent: 'center', height: 48, fontSize: 14, gap: 10,
                      background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent-glow)' 
                    }}
                  >
                    <ExternalLink size={16} /> GPTs에서 업무 시작하기
                  </a>
                </div>
              )}

              <div className="detail-section">
                <div className="detail-section-title">Prompt List ({viewTask.prompts?.length}개)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {viewTask.prompts?.map((p, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 4 }}>Prompt #{i + 1}</div>
                        <button 
                          className="btn btn-ghost" 
                          style={{ fontSize: 12, padding: '4px 10px', height: 'auto', border: '1px solid var(--border)' }}
                          onClick={() => copyPrompt(p)}
                        >
                          <Copy size={13} style={{ marginRight: 6 }} /> 복사하기
                        </button>
                      </div>
                      <div style={{ 
                        background: 'var(--bg-elevated)', 
                        padding: 16, 
                        borderRadius: 'var(--radius-lg)', 
                        fontSize: 14, 
                        lineHeight: 1.6, 
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid var(--border)',
                        maxHeight: 200,
                        overflowY: 'auto'
                      }}>
                        {p}
                      </div>
                    </div>
                  ))}
                  {(!viewTask.prompts || viewTask.prompts.length === 0) && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>등록된 프롬프트가 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">{editId ? '업무 수정' : '새 업무 추가'}</span>
              <button className="action-btn" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label className="form-label">업무명 *</label>
                <input 
                  className="form-input" 
                  placeholder="예: 과제 피드백 생성기"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label className="form-label">GPTs 링크</label>
                <input 
                  className="form-input" 
                  placeholder="https://chatgpt.com/g/..."
                  value={form.gpts_link}
                  onChange={e => setForm(f => ({ ...f, gpts_link: e.target.value }))}
                />
              </div>
              
              <div className="detail-section" style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>전용 프롬프트 리스트 *</label>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12, height: 'auto' }} onClick={addPromptField}>
                    <PlusCircle size={14} style={{ marginRight: 6 }} /> 추가
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {form.prompts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <textarea 
                          className="form-input" 
                          rows={4} 
                          placeholder={`프롬프트 #${i+1} 내용을 입력하세요`}
                          value={p}
                          onChange={e => updatePrompt(i, e.target.value)}
                          style={{ resize: 'none' }}
                        />
                      </div>
                      <button 
                        className="action-btn danger" 
                        style={{ marginTop: 8, opacity: form.prompts.length > 1 ? 1 : 0.3 }} 
                        onClick={() => removePromptField(i)}
                        disabled={form.prompts.length <= 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSave}>저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
