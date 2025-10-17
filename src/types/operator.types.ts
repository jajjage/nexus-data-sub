export interface Operator {
  id: string;
  code: string;
  name: string;
  isoCountry: string;
  createdAt: Date;
}

export interface CreateOperatorData {
  code: string;
  name: string;
  isoCountry?: string;
}

export interface UpdateOperatorData {
  name?: string;
  isoCountry?: string;
}
