// User roles
export type UserRole = 'designer' | 'constructor' | 'buyer' | 'manager' | 'china_office' | 'factory';

// Model statuses
export type ModelStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'ds'
  | 'pps'
  | 'in_production';

// Product types
export type ProductType = 'textile' | 'denim' | 'sweater' | 'knitwear';

// Collection types
export type CollectionType = 'kids' | 'men' | 'women';

// Season types
export type SeasonType = 'spring_summer' | 'autumn_winter';

// Stage types
export type StageType = 'ds' | 'pps';

// Approval statuses
export type ApprovalStatus = 'pending' | 'not_approved' | 'approved' | 'approved_with_comments';

// User interface
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  factory_id?: number;
  is_active: boolean;
  created_at: string;
}

// Auth response
export interface AuthResponse {
  user: User;
  token: string;
}

// Season interface
export interface Season {
  id: number;
  code: string;
  name: string;
  year: number;
  season_type: SeasonType;
  is_active: boolean;
  created_at: string;
}

// Collection interface
export interface Collection {
  id: number;
  season_id: number;
  type: CollectionType;
  age_group?: string;
  name: string;
  description?: string;
  created_at: string;
}

// Model interface
export interface Model {
  id: number;
  collection_id: number;
  model_number: string;
  model_name?: string;
  product_type: ProductType;
  category?: string;
  fit_type?: string;
  product_group?: string;
  product_group_code?: string;
  status: ModelStatus;
  brand?: string;
  prototype_number?: string;
  assigned_factory_id?: number;
  designer_id?: number;
  created_by?: number;
  date_created: string;
  created_at: string;
  updated_at: string;

  // Approval fields
  buyer_approval?: ApprovalStatus;
  constructor_approval?: ApprovalStatus;
  buyer_approval_comment?: string;
  constructor_approval_comment?: string;
  buyer_approved_at?: string;
  constructor_approved_at?: string;

  // Joined fields
  collection_name?: string;
  collection_type?: CollectionType;
  season_code?: string;
  season_name?: string;
  designer_name?: string;
  factory_name?: string;

  // Related data
  colors?: ModelColor[];
  fabrics?: ModelFabric[];
  accessories?: ModelAccessory[];
  prints?: ModelPrint[];
}

// Color interface
export interface ModelColor {
  id: number;
  model_id: number;
  pantone_code: string;
  color_name?: string;
  zone?: string;
  hex_color?: string;
  created_at: string;
}

// Fabric interface
export interface ModelFabric {
  id: number;
  model_id: number;
  fabric_id: number;
  fabric_weight_id?: number;
  fabric_type: string;
  color_pantone?: string;
  fabric_name?: string;
  weight?: number;
  created_at: string;
}

// Accessory interface
export interface ModelAccessory {
  id: number;
  model_id: number;
  accessory_id: number;
  quantity: number;
  color_option?: string;
  accessory_name?: string;
  category?: string;
  image_url?: string;
  created_at: string;
}

// Print interface
export interface ModelPrint {
  id: number;
  model_id: number;
  print_name?: string;
  file_url: string;
  file_format?: string;
  position?: string;
  uploaded_by?: number;
  created_at: string;
}

// Stage comment interface
export interface StageComment {
  id: number;
  model_id: number;
  stage: StageType;
  user_id: number;
  user_role: string;
  comment_text?: string;
  user_name?: string;
  created_at: string;
  attachments?: CommentAttachment[];
}

// Comment attachment interface
export interface CommentAttachment {
  id: number;
  comment_id: number;
  file_url: string;
  file_name?: string;
  file_type?: string;
  created_at: string;
}

// China Office upload interface
export interface ChinaOfficeUpload {
  id: number;
  model_id: number;
  stage: StageType;
  upload_type: string;
  file_url: string;
  file_name?: string;
  description?: string;
  uploaded_by?: number;
  uploaded_by_name?: string;
  created_at: string;
}

// PPS approval interface
export interface PPSApproval {
  id: number;
  model_id: number;
  approver_role: 'buyer' | 'constructor';
  approver_id: number;
  is_approved: boolean;
  comment?: string;
  approver_name?: string;
  created_at: string;
  attachments?: ApprovalAttachment[];
}

// Approval attachment interface
export interface ApprovalAttachment {
  id: number;
  approval_id: number;
  file_url: string;
  file_name?: string;
  file_type?: string;
  created_at: string;
}

// Factory price interface
export interface FactoryPrice {
  id: number;
  model_id: number;
  factory_id: number;
  price: number;
  currency: string;
  moq?: number;
  lead_time_days?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
