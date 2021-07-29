export type MediatorResponse = {
  data: {
    '@id': string,
    '@type': string,
    label: string,
    recipientKeys: string[],
    routingKeys: string[],
    serviceEndpoint: string
  },
  message: string,
  success: boolean
}