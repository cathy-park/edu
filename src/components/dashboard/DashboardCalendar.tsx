'use client';

import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay,
  differenceInDays, parseISO
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Edit3, Calendar as CalIcon } from 'lucide-react';
import { Schedule, Todo } from '@/lib/types';
import ScheduleModal from './ScheduleModal';
import toast from 'react-hot-toast';

interface Props {
  schedules: Schedule[];
  todos: Todo[];
  onAdd: (data: Omit<Schedule, 'id' | 'created_at'>) => void;
  onUpdate: (id: number, data: Omit<Schedule, 'id' | 'created_at'>) => void;
  onDelete: (id: number) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onUpdateProjectDate?: (id: number, start: string, end: string) => Promise<void>;
  onUpdateSchedule?: (id: number, data: Partial<Schedule>) => Promise<void>;
  // v8.32: Support todo date updates from calendar
  onUpdateTodoDate?: (id: number, date: string) => Promise<void>;
}

export default function DashboardCalendar({ 
  schedules, todos, onAdd, onUpdate, onDelete, selectedDate, onSelectDate, onUpdateProjectDate, onUpdateSchedule, onUpdateTodoDate 
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'add'; date: string } | { mode: 'edit'; schedule: Schedule } | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: number, start: string, end: string, title: string } | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = startDate;
  while (d <= endDate) { days.push(d); d = addDays(d, 1); }

  const getEventsForDay = (date: Date) => {
    const targetStr = format(date, 'yyyy-MM-dd');
    const daySchedules = schedules.filter((s) => {
      const startStr = s.start_date.split('T')[0];
      const endStr = (s.end_date || s.start_date).split('T')[0];
      return targetStr >= startStr && targetStr <= endStr;
    }).map(s => ({
      ...s,
      is_start: s.start_date.split('T')[0] === targetStr
    }));
    
    const dayTodos = todos.filter((t) => t.due_date && t.due_date.split('T')[0] === targetStr);
    const todoEvents = dayTodos.map(t => ({
      id: -1000000 - t.id, // Offset to avoid collisions
      realTodoId: t.id,
      title: `[할일] ${t.title}`,
      start_date: t.due_date!,
      category: 'todo' as any,
      is_dday: false,
      is_start: true,
      is_todo_item: true
    }));
    
    return [...daySchedules, ...todoEvents] as (Schedule & { is_start: boolean, is_project?: boolean, originalProjectId?: number, is_todo_item?: boolean, realTodoId?: number })[];
  };

  // v8.32: Handle Drag Start (Only for Todos)
  const handleDragStart = (e: React.DragEvent, event: any) => {
    if (!event.is_todo_item) {
       e.preventDefault();
       return;
    }
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: event.realTodoId,
      isTodo: true,
      title: event.title,
      currentDate: event.start_date
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const data = JSON.parse(raw);
      
      if (data.isTodo && onUpdateTodoDate) {
        await onUpdateTodoDate(data.id, targetDate);
        toast.success('할 일이 이동되었습니다');
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleSave = (data: Omit<Schedule, 'id' | 'created_at'>) => {
    if (modal?.mode === 'edit') onUpdate(modal.schedule.id, data);
    else onAdd(data);
    setModal(null);
  };

  const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div>
      <div className="card">
        <div className="cal-header">
          <button className="cal-nav" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16} /></button>
          <span className="cal-title">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</span>
          <button className="cal-nav" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} /></button>
        </div>

        <div className="cal-grid">
          {dayLabels.map((label, i) => (
            <div key={label} className={`cal-day-label ${i === 6 ? 'sun' : ''}`}>{label}</div>
          ))}

          {days.map((day, idx) => {
            const events = getEventsForDay(day);
            const isSun = day.getDay() === 0;
            const isOther = !isSameMonth(day, currentMonth);
            const dateStr = format(day, 'yyyy-MM-dd');
            const isHovered = hoveredDay === dateStr;
            const isSelected = isSameDay(day, selectedDate);

            return (
              <div
                key={idx}
                className={`cal-cell${isToday(day) ? ' today' : ''}${isOther ? ' other-month' : ''}${isSun ? ' sun' : ''}${isSelected ? ' selected' : ''}`}
                onMouseEnter={() => setHoveredDay(dateStr)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => onSelectDate(day)}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={e => handleDrop(e, dateStr)}
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div className="cal-num">{format(day, 'd')}</div>
                  {(isHovered || isSelected) && (
                    <button onClick={(e) => { e.stopPropagation(); setModal({ mode: 'add', date: dateStr }); }} style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={10} color="white" />
                    </button>
                  )}
                </div>
                {events.slice(0, 3).map((ev) => {
                  const isTodo = ev.is_todo_item;
                  const isStart = ev.is_start;
                  const isProject = ev.is_project;
                  
                  return (
                    <div key={ev.id} 
                      className={`cal-event ev-${ev.category} ${!isStart ? 'duration-bar' : ''}`} 
                      title={isTodo ? `${ev.title}\n(드래그하여 이동 가능)` : ev.title}
                      draggable={isTodo}
                      onDragStart={e => handleDragStart(e, ev)}
                      onClick={(e) => { 
                        if (isTodo) return;
                        e.stopPropagation(); 
                        if (isProject && ev.originalProjectId) {
                          setEditingProject({ id: ev.originalProjectId, start: ev.start_date, end: ev.end_date || ev.start_date, title: ev.title });
                        } else {
                          setModal({ mode: 'edit', schedule: ev as Schedule }); 
                        }
                      }}
                      style={{ 
                        backgroundColor: ev.color ? `${ev.color}33` : undefined,
                        borderLeftColor: ev.color || undefined,
                        color: ev.color || undefined,
                        cursor: isTodo ? 'move' : 'pointer'
                      }}>
                      {isStart && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pointerEvents: 'none' }}>
                           <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                           {isProject && <Edit3 size={10} style={{ opacity: 0.6 }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {editingProject && (
        <div className="modal-overlay" onClick={() => setEditingProject(null)}>
           <div className="modal card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3 className="modal-title">프로젝트 일정 수정</h3></div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div className="form-field">
                    <label className="form-label">시작일</label>
                    <input type="date" className="form-input" value={editingProject.start} onChange={e => setEditingProject(p => p ? {...p, start: e.target.value} : null)} />
                 </div>
                 <div className="form-field">
                    <label className="form-label">종료일</label>
                    <input type="date" className="form-input" value={editingProject.end} onChange={e => setEditingProject(p => p ? {...p, end: e.target.value} : null)} />
                 </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                 <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingProject(null)}>취소</button>
                 <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                    if (onUpdateProjectDate) {
                       await onUpdateProjectDate(editingProject.id, editingProject.start, editingProject.end);
                       setEditingProject(null);
                    }
                 }}>저장</button>
              </div>
           </div>
        </div>
      )}

      {modal && (
        <ScheduleModal
          schedule={modal.mode === 'edit' ? modal.schedule : null}
          defaultDate={modal.mode === 'add' ? modal.date : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={id => { onDelete(id); setModal(null); }}
        />
      )}
    </div>
  );
}
