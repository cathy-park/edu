'use client';

import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Todo, TodoCategory } from '@/lib/types';
import toast from 'react-hot-toast';
import { format, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  todos: Todo[];
  onChange: (todos: Todo[]) => void;
  selectedDate: Date;
}

export default function TodoList({ todos, onChange, selectedDate }: Props) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TodoCategory>('개인업무');
  const [newPriority, setNewPriority] = useState<'높음' | '보통' | '낮음'>('보통');

  const toggle = (id: number) => {
    onChange(todos.map((t) => (t.id === id ? { ...t, is_done: !t.is_done } : t)));
  };

  const remove = (id: number) => {
    onChange(todos.filter((t) => t.id !== id));
    toast.success('삭제됐습니다');
  };

  const addTodo = () => {
    if (!newTitle.trim()) { toast.error('내용을 입력해주세요'); return; }
    const newTodo: Todo = {
      id: Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      is_done: false,
      priority: newPriority,
      created_at: new Date().toISOString(),
      due_date: format(selectedDate, 'yyyy-MM-dd'),
    };
    onChange([...todos, newTodo]);
    setNewTitle('');
    setAdding(false);
    toast.success('할 일이 추가됐습니다');
  };

  // Filter todos by selected date
  const filteredTodos = todos.filter(t => 
    t.due_date && isSameDay(new Date(t.due_date), selectedDate)
  );

  const personal = filteredTodos.filter((t) => t.category === '개인업무');
  const studentMgmt = filteredTodos.filter((t) => t.category === '수강생관리');

  const renderItems = (items: Todo[]) =>
    items.map((todo) => (
      <div key={todo.id} className="todo-item" style={{ gap: 8 }}>
        <button
          className={`todo-checkbox ${todo.is_done ? 'checked' : ''}`}
          onClick={() => toggle(todo.id)}
        >
          {todo.is_done && <Check size={10} color="white" strokeWidth={3} />}
        </button>
        <span className={`todo-text ${todo.is_done ? 'done' : ''}`} style={{ flex: 1 }}>{todo.title}</span>
        <span className={`todo-priority ${todo.priority}`}>{todo.priority}</span>
        <button
          className="action-btn danger"
          style={{ width: 24, height: 24, flexShrink: 0 }}
          onClick={() => remove(todo.id)}
          title="삭제"
        >
          <Trash2 size={12} />
        </button>
      </div>
    ));

  const dateLabel = format(selectedDate, 'M월 d일', { locale: ko });

  return (
    <div className="card" style={{ height: '100%', minHeight: 400 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{dateLabel} 할일</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          {filteredTodos.filter((t) => t.is_done).length}/{filteredTodos.length} 완료
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {personal.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div className="todo-section-label">개인업무</div>
            {renderItems(personal)}
          </div>
        )}
        {studentMgmt.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div className="todo-section-label">수강생관리</div>
            {renderItems(studentMgmt)}
          </div>
        )}
        {filteredTodos.length === 0 && (
          <div className="empty-state" style={{ padding: '40px 0', opacity: 0.6 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🍃</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
              이 날은 할 일이 없습니다
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        {adding ? (
          <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--border)' }}>
            <input
              className="form-input"
              placeholder="무엇을 해야 하나요?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              autoFocus
              style={{ background: 'var(--bg-surface)' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <select className="form-select" value={newCategory} onChange={(e) => setNewCategory(e.target.value as TodoCategory)} style={{ flex: 1, background: 'var(--bg-surface)' }}>
                <option value="개인업무">개인업무</option>
                <option value="수강생관리">수강생관리</option>
              </select>
              <select className="form-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value as '높음' | '보통' | '낮음')} style={{ flex: 1, background: 'var(--bg-surface)' }}>
                <option value="높음">높음</option>
                <option value="보통">보통</option>
                <option value="낮음">낮음</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, height: 36 }} onClick={addTodo}>추가</button>
              <button className="btn btn-secondary" style={{ flex: 1, height: 36 }} onClick={() => { setAdding(false); setNewTitle(''); }}>취소</button>
            </div>
          </div>
        ) : (
          <button 
            className="add-todo-btn" 
            onClick={() => setAdding(true)} 
            style={{ 
              width: '100%', justifyContent: 'center', background: 'var(--bg-elevated)', 
              borderRadius: 10, height: 40, border: '1px dashed var(--border)', fontWeight: 600
            }}
          >
            <Plus size={14} /> 할 일 추가
          </button>
        )}
      </div>
    </div>
  );
}
