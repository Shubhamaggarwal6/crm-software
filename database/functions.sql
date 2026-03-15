-- BillSaathi Database Functions & Triggers

-- ============================================
-- FUNCTION: is_super_admin (security definer to avoid RLS recursion)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'super_admin'
  )
$$;

-- ============================================
-- FUNCTION: get_owner_id (get owner_id for an employee)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_owner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.employees WHERE id = _user_id LIMIT 1
$$;

-- ============================================
-- FUNCTION: handle_new_user (auto-create profile on signup)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner'),
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: get_next_sequence (atomic counter for invoice/receipt numbers)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_next_sequence(p_user_id uuid, p_type text, p_fy text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val integer;
BEGIN
  INSERT INTO sequence_counters (user_id, counter_type, financial_year, current_value)
  VALUES (p_user_id, p_type, p_fy, 1)
  ON CONFLICT (user_id, counter_type, financial_year)
  DO UPDATE SET current_value = sequence_counters.current_value + 1
  RETURNING current_value INTO next_val;
  RETURN next_val;
END;
$$;
