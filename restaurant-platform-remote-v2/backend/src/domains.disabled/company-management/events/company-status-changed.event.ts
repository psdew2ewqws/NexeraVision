export class CompanyStatusChangedEvent {
  constructor(
    public readonly companyId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
  ) {}
}