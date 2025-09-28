export class CompanyCreatedEvent {
  constructor(
    public readonly companyId: string,
    public readonly companyName: string,
    public readonly slug: string,
  ) {}
}