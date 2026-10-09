import { VaultError } from "./settings-vault";
export class ProviderFailure extends VaultError {
  constructor(
    status: number,
    message: string,
    public retryable: boolean,
  ) {
    super(status, message);
  }
}
