import WebSocket from "ws";
import { GoogleGenAI } from "@google/genai";
import {
  createLiveAgent as core,
  type LiveAgentOptions,
} from "../../../packages/provider-client/live-agent";
export {
  liveInstructions,
  resample16To24,
} from "../../../packages/provider-client/live-agent";
export type {
  LiveEvent,
  LiveTool,
  LiveAgentOptions,
} from "../../../packages/provider-client/live-agent";
export function createLiveAgent(options: LiveAgentOptions) {
  return core({
    ...options,
    connectGemini:
      options.connectGemini ??
      (({ apiKey, ...config }: any) =>
        new GoogleGenAI({ apiKey }).live.connect(config)),
    createSocket:
      options.createSocket ?? ((url, config) => new WebSocket(url, config)),
  });
}
