export interface OperatorProduct {
  id: string;
  operatorId: string;
  productCode: string;
  name: string;
  productType: string;
  denomAmount?: number;
  dataMb?: number;
  validityDays?: number;
  isActive: boolean;
  metadata?: any;
  slug?: string;
  createdAt: Date;
}

export interface CreateOperatorProductData {
  operatorId: string;
  productCode: string;
  name: string;
  productType: string;
  denomAmount?: number;
  dataMb?: number;
  validityDays?: number;
  isActive?: boolean;
  metadata?: any;
  slug?: string;
}

export interface UpdateOperatorProductData {
  name?: string;
  productCode?: string;
  productType?: string;
  denomAmount?: number;
  dataMb?: number;
  validityDays?: number;
  isActive?: boolean;
  metadata?: any;
  slug?: string;
}

export interface SupplierProductMapping {
  id: string;
  supplierId: string;
  operatorProductId: string;
  supplierProductCode?: string;
  supplierPrice: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  leadTimeSeconds?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateSupplierProductMappingData {
  supplierId: string;
  operatorProductId: string;
  supplierProductCode?: string;
  supplierPrice: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  leadTimeSeconds?: number;
  isActive?: boolean;
}

export interface UpdateSupplierProductMappingData {
  supplierProductCode?: string;
  supplierPrice?: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  leadTimeSeconds?: number;
  isActive?: boolean;
}
