export class SiteError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "SiteError"
    this.status = status
  }
}
