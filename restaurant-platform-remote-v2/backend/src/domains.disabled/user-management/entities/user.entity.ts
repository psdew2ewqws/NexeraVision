export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_OWNER = 'company_owner',
  BRANCH_MANAGER = 'branch_manager',
  CASHIER = 'cashier',
  CALL_CENTER = 'call_center'
}

export class User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}