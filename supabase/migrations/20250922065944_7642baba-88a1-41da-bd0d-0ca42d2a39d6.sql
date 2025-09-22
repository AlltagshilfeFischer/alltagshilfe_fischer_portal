-- Ensure approve/reject functions derive user from auth.uid() when session GUC is not set
CREATE OR REPLACE FUNCTION public.approve_termin_change(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  change_rec RECORD;
  current_user_id UUID;
BEGIN
  -- Resolve current user from session GUC or fallback to auth.uid()
  BEGIN
    current_user_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF current_user_id IS NULL THEN
    current_user_id := auth.uid();
  END IF;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User context not set';
  END IF;
  
  -- Get the change request
  SELECT * INTO change_rec FROM public.termin_aenderungen 
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change request not found or already processed';
  END IF;
  
  -- Apply the changes to the appointment (will fail if overlapping due to constraints)
  UPDATE public.termine SET
    kunden_id = COALESCE(change_rec.new_kunden_id, kunden_id),
    mitarbeiter_id = COALESCE(change_rec.new_mitarbeiter_id, mitarbeiter_id),
    start_at = COALESCE(change_rec.new_start_at, start_at),
    end_at = COALESCE(change_rec.new_end_at, end_at)
  WHERE id = change_rec.termin_id;
  
  -- Mark the request as approved
  UPDATE public.termin_aenderungen SET
    status = 'approved',
    approved_at = now(),
    approver_id = current_user_id
  WHERE id = p_request_id;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_termin_change(p_request_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
BEGIN
  -- Resolve current user from session GUC or fallback to auth.uid()
  BEGIN
    current_user_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF current_user_id IS NULL THEN
    current_user_id := auth.uid();
  END IF;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User context not set';
  END IF;

  -- Mark the request as rejected
  UPDATE public.termin_aenderungen SET
    status = 'rejected',
    approved_at = now(),
    approver_id = current_user_id,
    reason = COALESCE(p_reason, reason)
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change request not found or already processed';
  END IF;
  
  RETURN TRUE;
END;
$function$;