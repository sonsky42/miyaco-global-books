import { useActor as useActorBase } from "@caffeineai/core-infrastructure";
import type { CreateActorOptions } from "@caffeineai/core-infrastructure";
import { Actor } from "@icp-sdk/core/agent";
import type { ExternalBlob } from "../backend";
import { Backend } from "../backend";
import { idlFactory } from "../declarations/backend.did";
import type { _SERVICE } from "../declarations/backend.did.d.ts";

type CustomerPhotoAPI = {
  getCustomerPhoto(bookId: string, name: string): Promise<string>;
  setCustomerPhoto(bookId: string, name: string, photo: string): Promise<void>;
};
type AppBackend = Backend & CustomerPhotoAPI;

function createBackendActor(
  canisterId: string,
  uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
  options: CreateActorOptions,
): AppBackend {
  const agent = options.agent;
  const agentOptions = options.agentOptions ?? {};

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId,
    ...agentOptions,
    ...options.actorOptions,
  });

  // Keep additive photo methods separate from Caffeine's generated bindings.
  const photos = Actor.createActor<CustomerPhotoAPI>(({ IDL }) => IDL.Service({
    getCustomerPhoto: IDL.Func([IDL.Text, IDL.Text], [IDL.Text], ["query"]),
    setCustomerPhoto: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [], []),
  }), { agent, canisterId, ...agentOptions, ...options.actorOptions });
  return Object.assign(new Backend(actor, uploadFile, downloadFile, options.processError), {
    getCustomerPhoto: (bookId: string, name: string) => photos.getCustomerPhoto(bookId, name),
    setCustomerPhoto: (bookId: string, name: string, photo: string) => photos.setCustomerPhoto(bookId, name, photo),
  });
}

export function useActor() {
  return useActorBase<AppBackend>(createBackendActor);
}
