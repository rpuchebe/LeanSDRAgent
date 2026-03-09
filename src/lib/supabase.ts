import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://hgucfqabqjqzkrrkcxxl.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhndWNmcWFicWpxemtycmtjeHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzM1MTUsImV4cCI6MjA4ODY0OTUxNX0.CCgUHgeMBFqmSeoa2e0AiKPu-to4G0t76Nuu5DaY_qw';

// Validate URL format for build process
const isValidUrl = (url: string) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const supabase = createClient(
    isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-build-only.supabase.co',
    supabaseKey || 'placeholder'
);
