import * as core from "@actions/core";

export function validateAuth(): string {
  const apiKey = core.getInput("kiro_api_key", { required: true });
  if (!apiKey.trim()) {
    throw new Error(
      "kiro_api_key is empty. Add KIRO_API_KEY as a repository secret and pass it via the kiro_api_key input."
    );
  }
  return apiKey;
}
