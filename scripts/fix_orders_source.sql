-- Normalize existing orders sources and delete orphaned rows

-- Move non-standard sources into source_meta and set source='app'
UPDATE public.orders
SET source_meta = source,
    source = 'app'
WHERE source IS NULL OR source = '' OR lower(source) NOT IN ('app','pos','portal');

-- Canonicalize allowed sources to lowercase without meta
UPDATE public.orders
SET source = lower(source),
    source_meta = NULL
WHERE source IS NOT NULL AND source <> '' AND lower(source) IN ('app','pos','portal');

-- Remove rows missing required identifiers
DELETE FROM public.orders WHERE user_id IS NULL OR order_id IS NULL;

-- Validate the CHECK constraint on source
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_source_check;
