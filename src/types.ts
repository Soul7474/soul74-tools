export type SectionId =
  | "overview"
  | "network"
  | "password"
  | "hash"
  | "encoding"
  | "jwt"
  | "text"
  | "timestamp"
  | "file"
  | "reference"
  | "extras";

export type ToolSection = {
  id: SectionId;
  label: string;
  category: string;
  short: string;
};

export type NetworkSummary = {
  original: string;
  prefix: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  binary: string;
  hex: string;
};

export type SubnetSlice = {
  network: string;
  prefix: number;
  mask: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  usableHosts: number;
  totalAddresses: number;
  waste: number;
};
