-- Add capacity fields to customers table
ALTER TABLE public.customers 
ADD COLUMN capacity_per_day integer DEFAULT 1,
ADD COLUMN operating_days text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
ADD COLUMN operating_hours_start time DEFAULT '08:00:00',
ADD COLUMN operating_hours_end time DEFAULT '18:00:00';

-- Add capacity fields to employees table  
ALTER TABLE public.employees
ADD COLUMN max_appointments_per_day integer DEFAULT 8,
ADD COLUMN working_days text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
ADD COLUMN working_hours_start time DEFAULT '08:00:00',
ADD COLUMN working_hours_end time DEFAULT '17:00:00',
ADD COLUMN vacation_days date[] DEFAULT ARRAY[]::date[];

-- Create a schedule_templates table for recurring schedules
CREATE TABLE public.schedule_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  day_of_week text NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on schedule_templates
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for schedule_templates
CREATE POLICY "Employees can view schedule templates" 
ON public.schedule_templates 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM employees 
  WHERE employees.user_id = auth.uid() AND employees.is_active = true
));

CREATE POLICY "Employees can create schedule templates" 
ON public.schedule_templates 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1 FROM employees 
  WHERE employees.user_id = auth.uid() AND employees.is_active = true
));

CREATE POLICY "Employees can update schedule templates" 
ON public.schedule_templates 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1 FROM employees 
  WHERE employees.user_id = auth.uid() AND employees.is_active = true
));

CREATE POLICY "Employees can delete schedule templates" 
ON public.schedule_templates 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1 FROM employees 
  WHERE employees.user_id = auth.uid() AND employees.is_active = true
));

-- Create trigger for schedule_templates updated_at
CREATE TRIGGER update_schedule_templates_updated_at
BEFORE UPDATE ON public.schedule_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();