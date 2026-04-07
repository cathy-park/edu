'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Cohort } from '@/lib/types';
import toast from 'react-hot-toast';

interface CohortContextType {
  selectedCohort: string;
  setSelectedCohort: (cohort: string) => void;
  cohorts: Cohort[];
  addCohort: (name: string) => Promise<void>;
  updateCohort: (oldName: string, newName: string) => Promise<void>;
  deleteCohort: (name: string, skipConfirm?: boolean) => Promise<boolean>;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

export function CohortProvider({ children }: { children: React.ReactNode }) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('전체');

  // Fetch cohorts from Supabase on mount
  useEffect(() => {
    async function fetchCohorts() {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*')
        .order('name', { ascending: false });

      if (error) {
        console.error('Error fetching cohorts:', error);
        toast.error('기수 정보를 불러오지 못했습니다');
      } else {
        setCohorts(data || []);
        
        // Restore last selected from localStorage (UI preference)
        const savedSelected = localStorage.getItem('selectedCohort');
        if (savedSelected) {
          setSelectedCohort(savedSelected);
        } else if (data && data.length > 0) {
          setSelectedCohort(data[0].name);
        }
      }
    }

    fetchCohorts();
  }, []);

  const handleSetCohort = (cohort: string) => {
    setSelectedCohort(cohort);
    localStorage.setItem('selectedCohort', cohort);
  };

  const addCohort = async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    
    if (cohorts.some(c => c.name === cleanName)) {
      toast.error('이미 존재하는 기수입니다');
      return;
    }

    const { data, error } = await supabase
      .from('cohorts')
      .insert([{ name: cleanName }])
      .select()
      .single();

    if (error) {
      toast.error('기수 추가에 실패했습니다');
    } else if (data) {
      setCohorts(prev => [data, ...prev]);
      handleSetCohort(cleanName);
      toast.success(`${cleanName}가 추가되었습니다`);
    }
  };

  const updateCohort = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    
    if (cohorts.some(c => c.name === newName)) {
      toast.error('이미 존재하는 기수입니다');
      return;
    }

    const cohortToUpdate = cohorts.find(c => c.name === oldName);
    if (!cohortToUpdate) return;

    const { error } = await supabase
      .from('cohorts')
      .update({ name: newName })
      .eq('id', cohortToUpdate.id);

    if (error) {
      toast.error('기수 수정에 실패했습니다');
    } else {
      setCohorts(prev => prev.map(c => c.id === cohortToUpdate.id ? { ...c, name: newName } : c));
      if (selectedCohort === oldName) handleSetCohort(newName);
      toast.success('기수 이름이 변경되었습니다');
    }
  };

  const deleteCohort = async (name: string, skipConfirm = false) => {
    if (name === '전체') {
      toast.error('전체 기수는 삭제할 수 없습니다');
      return false;
    }

    if (!skipConfirm && !window.confirm(`'${name}' 기수를 정말 삭제하시겠습니까?`)) return false;
    
    const cohortToDelete = cohorts.find(c => c.name === name);
    if (!cohortToDelete) return false;

    const { error } = await supabase
      .from('cohorts')
      .delete()
      .eq('id', cohortToDelete.id);

    if (error) {
      toast.error('기수 삭제에 실패했습니다');
      return false;
    } else {
      setCohorts(prev => prev.filter(c => c.id !== cohortToDelete.id));
      if (selectedCohort === name) handleSetCohort('전체');
      toast.success('기수가 삭제되었습니다');
      return true;
    }
  };

  return (
    <CohortContext.Provider value={{ 
      selectedCohort, 
      setSelectedCohort: handleSetCohort,
      cohorts,
      addCohort,
      updateCohort,
      deleteCohort
    }}>
      {children}
    </CohortContext.Provider>
  );
}

export function useCohort() {
  const context = useContext(CohortContext);
  if (context === undefined) {
    throw new Error('useCohort must be used within a CohortProvider');
  }
  return context;
}
