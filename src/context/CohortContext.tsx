'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface CohortContextType {
  selectedCohort: string;
  setSelectedCohort: (cohort: string) => void;
  cohorts: string[];
  addCohort: (name: string) => void;
  updateCohort: (oldName: string, newName: string) => void;
  deleteCohort: (name: string, skipConfirm?: boolean) => boolean;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

export function CohortProvider({ children }: { children: React.ReactNode }) {
  const [cohorts, setCohorts] = useState<string[]>(['전체', '25기', '24기', '23기']);
  const [selectedCohort, setSelectedCohort] = useState<string>('25기');

  useEffect(() => {
    const savedCohorts = localStorage.getItem('availableCohorts');
    if (savedCohorts) {
      try {
        setCohorts(JSON.parse(savedCohorts));
      } catch (e) {
        console.error('Failed to parse cohorts', e);
      }
    }

    const savedSelected = localStorage.getItem('selectedCohort');
    if (savedSelected) setSelectedCohort(savedSelected);
  }, []);

  const handleSetCohort = (cohort: string) => {
    setSelectedCohort(cohort);
    localStorage.setItem('selectedCohort', cohort);
  };

  const addCohort = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (cohorts.includes(cleanName)) {
      toast.error('이미 존재하는 기수입니다');
      return;
    }
    const newCohorts = [cleanName, ...cohorts.filter(c => c !== '전체'), '전체'];
    // Keep '전체' at the end or handle it logically. 
    // Let's put new cohorts at the start of the list (after sorting or just prepending)
    const updated = [...new Set([...cohorts, cleanName])];
    setCohorts(updated);
    localStorage.setItem('availableCohorts', JSON.stringify(updated));
    setSelectedCohort(cleanName);
    localStorage.setItem('selectedCohort', cleanName);
    toast.success(`${cleanName}가 추가되었습니다`);
  };

  const updateCohort = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    if (cohorts.includes(newName)) {
      toast.error('이미 존재하는 기수입니다');
      return;
    }
    const updated = cohorts.map(c => c === oldName ? newName : c);
    setCohorts(updated);
    localStorage.setItem('availableCohorts', JSON.stringify(updated));
    if (selectedCohort === oldName) handleSetCohort(newName);
    toast.success('기수 이름이 변경되었습니다');
  };

  const deleteCohort = (name: string, skipConfirm = false) => {
    if (name === '전체') {
      toast.error('전체 기수는 삭제할 수 없습니다');
      return false;
    }
    if (!skipConfirm && !window.confirm(`'${name}' 기수를 정말 삭제하시겠습니까?`)) return false;
    
    // In our new inline UI, skipConfirm will be true, bypassing native confirm.
    const updated = cohorts.filter(c => c !== name);
    setCohorts(updated);
    localStorage.setItem('availableCohorts', JSON.stringify(updated));
    if (selectedCohort === name) handleSetCohort('전체');
    toast.success('기수가 삭제되었습니다');
    return true;
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
