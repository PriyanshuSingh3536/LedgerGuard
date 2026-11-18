export interface Me {
  userId: string;
  organizationId: string;
  role: string;
}

export interface ApiSuccess<T> { success: true; data: T }