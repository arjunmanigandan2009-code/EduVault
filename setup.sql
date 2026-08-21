-- ============================================
-- EduVault - Supabase Database Setup
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    file_path TEXT NOT NULL,
    download_url TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    uploaded_by UUID REFERENCES auth.users(id),
    uploader_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2b. Add thumbnail column (run if table already exists)
ALTER TABLE files ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';

-- 3. Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - allow all authenticated users
-- Profiles
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Files
CREATE POLICY "Authenticated users can view files"
    ON files FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert files"
    ON files FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update files"
    ON files FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete files"
    ON files FOR DELETE
    TO authenticated
    USING (true);

-- Comments
CREATE POLICY "Authenticated users can view comments"
    ON comments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert comments"
    ON comments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete comments"
    ON comments FOR DELETE
    TO authenticated
    USING (true);

-- 6. Storage bucket
-- Run this AFTER the SQL above, or create via Dashboard > Storage > New Bucket
-- Bucket name: "files" (set Public: ON)
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'files');

CREATE POLICY "Anyone can view files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'files');

CREATE POLICY "Authenticated users can delete files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'files');
