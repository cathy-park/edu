'use client';

import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Schedule, Todo } from '@/lib/types';
import ScheduleModal from './ScheduleModal';

interface Props {
  schedules: Schedule[];
  todos: Todo[];
  onAdd: (data: Omit<Schedule, 'id' | 'created_at'>) => void;
  onUpdate: (id: number, data: Omit<Schedule, 'id' | 'created_at'>) => void;
  onDelete: (id: number) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function DashboardCalendar({ 
  schedules, todos, onAdd, onUpdate, onDelete, selectedDate, onSelectDate 
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'add'; date: string } | { mode: 'edit'; schedule: Schedule } | null>(null);

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
    
    // Wrap todos as pseudo-schedules for UI display
    const todoEvents = dayTodos.map(t => ({
      id: -t.id, // Marker for todo
      title: `[할일] ${t.title}`,
      start_date: t.due_date!,
      category: 'todo' as any,
      is_dday: false,
      is_start: true
    }));
    
    return [...daySchedules, ...todoEvents] as (Schedule & { is_start: boolean })[];
  };

  const ddayItems = schedules
    .filter((s) => s.is_dday)
    .map((s) => {
      const diff = Math.ceil((new Date(s.start_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
      return { ...s, diff };
    })
    .filter((s) => s.diff >= 0)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 4);

  const handleSave = (data: Omit<Schedule, 'id' | 'created_at'>) => {
    if (modal?.mode === 'edit') {
      onUpdate(modal.schedule.id, data);
    } else {
      onAdd(data);
    }
    setModal(null);
  };

  const handleDelete = (id: number) => {
    onDelete(id);
    setModal(null);
  };

  const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div>
      {/* D-Day Strip */}
      {ddayItems.length > 0 && (
        <div className="dday-strip">
          {ddayItems.map((item) => (
            <div key={item.id} className="dday-item" style={{ cursor: 'pointer' }}
              onClick={() => setModal({ mode: 'edit', schedule: item })}>
              <span className="dday-label">{item.diff === 0 ? 'D-Day' : `D-${item.diff}`}</span>
              <span className="dday-title">{item.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="card">
        <div className="cal-header">
          <button className="cal-nav" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={16} />
          </button>
          <span className="cal-title">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</span>
          <button className="cal-nav" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={16} />
          </button>
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
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div className="cal-num">{format(day, 'd')}</div>
                  {(isHovered || isSelected) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setModal({ mode: 'add', date: dateStr }); }}
                      style={{
                        width: 16, height: 16, borderRadius: 4,
                        background: 'var(--accent)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        zIndex: 2
                      }}
                      title="일정 추가"
                    >
                      <Plus size={10} color="white" />
                    </button>
                  )}
                </div>
                {events.slice(0, 3).map((ev) => {
                  const isTodo = ev.id < 0;
                  const isStart = (ev as any).is_start;
                  
                  return ev.is_dday ? (
                    <div key={ev.id} className={`dday-chip ${!isStart ? 'duration-bar' : ''}`} title={ev.title}
                      onClick={(e) => { 
                        if (isTodo) return;
                        e.stopPropagation(); 
                        setModal({ mode: 'edit', schedule: ev as Schedule }); 
                      }}
                      style={{ cursor: isTodo ? 'default' : 'pointer', height: isStart ? 'auto' : 6 }}>
                      {isStart && ev.title}
                    </div>
                  ) : (
                    <div key={ev.id} className={`cal-event ev-${ev.category} ${!isStart ? 'duration-bar' : ''}`} title={ev.title}
                      onClick={(e) => { 
                        if (isTodo) return;
                        e.stopPropagation(); 
                        setModal({ mode: 'edit', schedule: ev as Schedule }); 
                      }}
                      style={{ cursor: isTodo ? 'default' : 'pointer', height: isStart ? 'auto' : 6, margin: isStart ? '3px 0' : '1px 0' }}>
                      {isStart ? ev.title : ''}
                    </div>
                  );
                })}
                {events.length > 3 && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 2 }}>
                    +{events.length - 3}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        .cal-cell.selected {
          border: 1.5px solid var(--accent);
          background: var(--accent-light);
        }
        .cal-event.duration-bar {
          padding: 0;
          opacity: 0.6;
          border-left: none;
          min-height: 6px;
        }
        .dday-chip.duration-bar {
          padding: 0;
          opacity: 0.4;
          min-height: 6px;
        }
        .cal-event.ev-todo {
          background: rgba(124, 58, 237, 0.1);
          color: var(--accent);
          border-left: 3px solid var(--accent);
          font-weight: 600;
        }
      `}</style>

      {/* Modal */}
      {modal && (
        <ScheduleModal
          schedule={modal.mode === 'edit' ? modal.schedule : null}
          defaultDate={modal.mode === 'add' ? modal.date : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
