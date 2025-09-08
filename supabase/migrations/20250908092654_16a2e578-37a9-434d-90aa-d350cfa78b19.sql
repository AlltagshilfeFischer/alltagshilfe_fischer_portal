-- Function to approve appointment changes
CREATE OR REPLACE FUNCTION public.approve_termin_change(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change_rec RECORD;
  current_user_id UUID;
BEGIN
  -- Get current user from context
  BEGIN
    current_user_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'User context not set';
  END;
  
  -- Get the change request
  SELECT * INTO change_rec FROM public.termin_aenderungen 
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change request not found or already processed';
  END IF;
  
  -- Apply the changes to the appointment
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
$$;

-- Function to reject appointment changes
CREATE OR REPLACE FUNCTION public.reject_termin_change(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user from context
  BEGIN
    current_user_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'User context not set';
  END;
  
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
$$;