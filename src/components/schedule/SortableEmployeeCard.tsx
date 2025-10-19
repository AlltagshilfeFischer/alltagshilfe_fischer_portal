import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  vorname?: string;
  nachname?: string;
  name: string;
  telefon: string;
  ist_aktiv: boolean;
  max_termine_pro_tag: number;
  farbe_kalender: string;
  workload: number;
  benutzer?: {
    email: string;
    vorname: string;
    nachname: string;
  };
}

interface Appointment {
  id: string;
  mitarbeiter_id: string | null;
}

interface SortableEmployeeCardProps {
  id: string;
  employee: Employee;
  currentAppointments: Appointment[];
  children: React.ReactNode;
}

export function SortableEmployeeCard({ id, employee, currentAppointments, children }: SortableEmployeeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'transition-all duration-200',
        isDragging && 'opacity-50 scale-105 shadow-lg z-50'
      )}
    >
      {children}
    </div>
  );
}