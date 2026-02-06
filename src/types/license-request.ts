export type LicenseRequestRecord = {
  id: string | null
  code: string | null
  status: string | null
  stage: string | null
  priority: string | null
  department: string | null
  estimatedCompletionDate: string | null
  createdAt: string | null
  evaluationStartedAt: string | null
  quantity: number | null
  totalPrice: number | null
  currency: string | null
  justification: string | null
}

export type LicenseRequestFormSnapshot = {
  licenseName: string
  offerName: string
  companyName: string
  companyMappingId: string | null
  entitlementName: string | null
  quantity: number
  totalPrice: number | null
  currencyCode: string | null
  formattedPricePerSeat: string | null
  priceCondition: string | null
  department: string | null
  justification: string | null
}

export type LicenseRequestFollowUpState = {
  request: LicenseRequestRecord | null
  form: LicenseRequestFormSnapshot
}
