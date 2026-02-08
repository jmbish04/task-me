interface ImportMetaEnv {
  readonly PROD: boolean;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
