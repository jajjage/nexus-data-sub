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
