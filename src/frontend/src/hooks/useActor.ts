import { useActor as useActorBase } from "@caffeineai/core-infrastructure";
import type { CreateActorOptions } from "@caffeineai/core-infrastructure";
import { Actor } from "@icp-sdk/core/agent";
import type { ExternalBlob } from "../backend";
import { Backend } from "../backend";
import { idlFactory } from "../declarations/backend.did";
import type { _SERVICE } from "../declarations/backend.did.d.ts";

function createBackendActor(
  canisterId: string,
  uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
  options: CreateActorOptions,
): Backend {
  const agent = options.agent;
  const agentOptions = options.agentOptions ?? {};

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId,
    ...agentOptions,
    ...options.actorOptions,
  });

  return new Backend(actor, uploadFile, downloadFile, options.processError);
}

export function useActor() {
  return useActorBase<Backend>(createBackendActor);
}
