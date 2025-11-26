import { OperatorProductModel } from '../models/OperatorProduct';

export interface PublicProductFilters {
  operatorId?: string;
  productType?: string;
  isActive?: boolean;
  q?: string;
  page?: number;
  perPage?: number;
}

export class ProductService {
  static async getPublicProducts(filters: PublicProductFilters) {
    // Delegate DB querying and mapping to the model layer
    return OperatorProductModel.findPublic(filters);
  }
}
