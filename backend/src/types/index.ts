// User roles
export type UserRole = 'designer' | 'constructor' | 'buyer' | 'china_office' | 'factory';

// Model statuses
export type ModelStatus =
  | 'draft'           // Технический эскиз
  | 'pending_review'  // На проверке
  | 'approved'        // Утверждено
  | 'ds_stage'       // DS
  | 'pps_stage'      // PPS
  | 'in_production'  // В производстве
  | 'shipped';       // Отгружено

// Product types
export type ProductType = 'textile' | 'denim' | 'sweater' | 'knitwear';

// Collection types
export type CollectionType = 'kids' | 'men' | 'women';

// Season types
export type SeasonType = 'spring_summer' | 'autumn_winter';

// Stage types
export type StageType = 'ds' | 'pps';

// User interface
export interface IUser {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  factory_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Factory interface
export interface IFactory {
  id: number;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
}

// Season interface
export interface ISeason {
  id: number;
  code: string;
  name: string;
  year: number;
  season_type: SeasonType;
  is_active: boolean;
  created_at: Date;
}

// Collection interface
export interface ICollection {
  id: number;
  season_id: number;
  type: CollectionType;
  age_group?: string;
  name: string;
  description?: string;
  created_at: Date;
}

// Model interface
export interface IModel {
  id: number;
  collection_id: number;
  model_number: string;
  model_name?: string;
  product_type: ProductType;
  category?: string;
  fit_type?: string;
  status: ModelStatus;
  assigned_factory_id?: number;
  designer_id?: number;
  created_by?: number;
  date_created: Date;
  created_at: Date;
  updated_at: Date;
}

// Fabric interface
export interface IFabric {
  id: number;
  name: string;
  composition?: string;
  supplier?: string;
  code?: string;
  is_active: boolean;
  created_at: Date;
}

// Accessory interface
export interface IAccessory {
  id: number;
  category: string;
  name: string;
  code?: string;
  image_url?: string;
  supplier?: string;
  is_active: boolean;
  created_at: Date;
}

// Print interface
export interface IModelPrint {
  id: number;
  model_id: number;
  print_name?: string;
  file_url: string;
  file_format?: string;
  position?: string;
  uploaded_by?: number;
  created_at: Date;
}

// Color interface
export interface IModelColor {
  id: number;
  model_id: number;
  pantone_code: string;
  color_name?: string;
  zone?: string;
  hex_color?: string;
  created_at: Date;
}

// Stage comment interface
export interface IStageComment {
  id: number;
  model_id: number;
  stage: StageType;
  user_id: number;
  user_role: string;
  comment_text?: string;
  created_at: Date;
}

// PPS approval interface
export interface IPPSApproval {
  id: number;
  model_id: number;
  approver_role: 'buyer' | 'constructor';
  approver_id: number;
  is_approved: boolean;
  comment?: string;
  created_at: Date;
}

// Factory price interface
export interface IFactoryPrice {
  id: number;
  model_id: number;
  factory_id: number;
  price: number;
  currency: string;
  moq?: number;
  lead_time_days?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Request with user
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
    factory_id?: number;
  };
}

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
