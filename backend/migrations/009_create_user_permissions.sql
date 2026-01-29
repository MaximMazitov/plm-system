-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Dashboard permissions
  can_view_dashboard BOOLEAN DEFAULT true,

  -- Models permissions
  can_view_models BOOLEAN DEFAULT true,
  can_create_models BOOLEAN DEFAULT false,
  can_edit_models BOOLEAN DEFAULT false,
  can_delete_models BOOLEAN DEFAULT false,
  can_edit_model_status BOOLEAN DEFAULT false,

  -- Files permissions
  can_view_files BOOLEAN DEFAULT true,
  can_upload_files BOOLEAN DEFAULT false,
  can_delete_files BOOLEAN DEFAULT false,

  -- Materials permissions
  can_view_materials BOOLEAN DEFAULT true,
  can_edit_materials BOOLEAN DEFAULT false,
  can_delete_materials BOOLEAN DEFAULT false,

  -- Comments permissions
  can_view_comments BOOLEAN DEFAULT true,
  can_create_comments BOOLEAN DEFAULT false,
  can_edit_own_comments BOOLEAN DEFAULT false,
  can_delete_own_comments BOOLEAN DEFAULT false,
  can_delete_any_comments BOOLEAN DEFAULT false,

  -- Collections and Seasons permissions
  can_view_collections BOOLEAN DEFAULT true,
  can_edit_collections BOOLEAN DEFAULT false,
  can_view_seasons BOOLEAN DEFAULT true,
  can_edit_seasons BOOLEAN DEFAULT false,

  -- Users management permissions (only for buyers)
  can_view_users BOOLEAN DEFAULT false,
  can_create_users BOOLEAN DEFAULT false,
  can_edit_users BOOLEAN DEFAULT false,
  can_delete_users BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_permissions_timestamp
BEFORE UPDATE ON user_permissions
FOR EACH ROW
EXECUTE FUNCTION update_user_permissions_updated_at();

-- Create default permissions for existing users based on their roles
INSERT INTO user_permissions (
  user_id,
  can_view_dashboard,
  can_view_models,
  can_create_models,
  can_edit_models,
  can_delete_models,
  can_edit_model_status,
  can_view_files,
  can_upload_files,
  can_delete_files,
  can_view_materials,
  can_edit_materials,
  can_delete_materials,
  can_view_comments,
  can_create_comments,
  can_edit_own_comments,
  can_delete_own_comments,
  can_delete_any_comments,
  can_view_collections,
  can_edit_collections,
  can_view_seasons,
  can_edit_seasons,
  can_view_users,
  can_create_users,
  can_edit_users,
  can_delete_users
)
SELECT
  id,
  true, -- can_view_dashboard
  true, -- can_view_models
  CASE WHEN role IN ('designer', 'buyer') THEN true ELSE false END, -- can_create_models
  CASE WHEN role IN ('designer', 'constructor', 'buyer') THEN true ELSE false END, -- can_edit_models
  CASE WHEN role = 'buyer' THEN true ELSE false END, -- can_delete_models
  CASE WHEN role = 'buyer' THEN true ELSE false END, -- can_edit_model_status
  true, -- can_view_files
  CASE WHEN role IN ('designer', 'constructor', 'china_office', 'buyer') THEN true ELSE false END, -- can_upload_files
  CASE WHEN role IN ('buyer', 'designer') THEN true ELSE false END, -- can_delete_files
  true, -- can_view_materials
  CASE WHEN role IN ('designer', 'constructor', 'buyer') THEN true ELSE false END, -- can_edit_materials
  CASE WHEN role IN ('buyer', 'designer') THEN true ELSE false END, -- can_delete_materials
  true, -- can_view_comments
  true, -- can_create_comments
  true, -- can_edit_own_comments
  true, -- can_delete_own_comments
  CASE WHEN role = 'buyer' THEN true ELSE false END, -- can_delete_any_comments
  true, -- can_view_collections
  CASE WHEN role = 'buyer' THEN true ELSE false END, -- can_edit_collections
  true, -- can_view_seasons
  CASE WHEN role = 'buyer' THEN true ELSE false END, -- can_edit_seasons
  CASE WHEN role = 'buyer' THEN true ELSE false END, -- can_view_users
  CASE WHEN role = 'buyer' THEN true ELSE false END, -- can_create_users
  CASE WHEN role = 'buyer' THEN true ELSE false END, -- can_edit_users
  CASE WHEN role = 'buyer' THEN true ELSE false END  -- can_delete_users
FROM users
ON CONFLICT (user_id) DO NOTHING;
