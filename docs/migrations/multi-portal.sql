-- Run this in your Supabase SQL editor to enable multi-portal support.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS source_portals TEXT[] DEFAULT ARRAY['san-brothers'];

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS portal_source TEXT DEFAULT 'san-brothers';

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS portal_source TEXT DEFAULT 'san-brothers';

CREATE TABLE IF NOT EXISTS public.portal_configurations (
  portal_slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tagline TEXT,
  services_available TEXT[] DEFAULT ARRAY[]::TEXT[],
  support_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.portal_configurations TO anon, authenticated;
GRANT ALL ON public.portal_configurations TO service_role;

ALTER TABLE public.portal_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_configs_public" ON public.portal_configurations;
CREATE POLICY "portal_configs_public" ON public.portal_configurations
  FOR SELECT USING (true);

INSERT INTO public.portal_configurations (portal_slug, name, display_name, tagline, services_available) VALUES
  ('san-brothers', 'San Brothers', 'San Brothers',
   'Professional Services - We Speak Your Language',
   ARRAY['tourist-visa','business-visa','student-visa','work-permit','visa-consultation',
         'company-registration','document-processing','trade-investment','business-planning','administrative-support',
         'document-translation','certified-translation','live-interpreter',
         'bookkeeping','tax-filing','financial-reporting','audit-support']),
  ('translate', 'Translate', 'Translate Portal',
   'Need help in your language? - We Speak Your Language',
   ARRAY['live-interpreter','document-translation','certified-translation']),
  ('consultancy', 'Consultancy', 'Business Consultancy',
   'Expert Business Solutions - We Speak Your Language',
   ARRAY['company-registration','document-processing','trade-investment','business-planning','administrative-support'])
ON CONFLICT (portal_slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  tagline = EXCLUDED.tagline,
  services_available = EXCLUDED.services_available,
  updated_at = now();
