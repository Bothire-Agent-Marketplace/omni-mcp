export interface NotionItemResource {
  id: string;
  title: string;
  description?: string;
  uri: string;
  mimeType: string;
}

export interface NotionProjectResource {
  id: string;
  name: string;
  description?: string;
  uri: string;
  mimeType: string;
}
