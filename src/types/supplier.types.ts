export interface Supplier {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierData {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSupplierData {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}
