export enum WikiNamespace {
  MAIN = 0,
  TALK = 1,
  USER = 2,
  USER_TALK = 3,
  WIKIPEDIA = 4,
  WIKIPEDIA_TALK = 5,
  TEMPLATE = 10,
  TEMPLATE_TALK = 11,
  HELP = 12,
  HELP_TALK = 13,
  CATEGORY = 14,
  CATEGORY_TALK = 15,
  PORTAL = 100,
  PORTAL_TALK = 101,
  DRAFT = 118,
  DRAFT_TALK = 119,
  TIMED_TEXT = 710,
  TIMED_TEXT_TALK = 711,
  MODULE = 828,
  MODULE_TALK = 829,
  SPECIAL = -1,
  MEDIA = -2,
}

export enum WikiEventType {
  EDIT = 'edit',
  NEW = 'new',
  LOG = 'log',
  CATEGORIZE = 'categorize',
  EXTERNAL = 'external',
}

export interface WikiBaseEvent {
  server_name: string;
  title: string;
  $schema: string;
  namespace: WikiNamespace;
  comment: string;
  parsedcomment: string;
  timestamp: number;
  user: string;
  bot: boolean;
  server_url: string;
  meta: {
    // TODO: topic,partition,offset
    uri: string;
    request_id: string;
    id: string;
    dt: string;
    domain: string;
    stream: string;
  };
  server_script_path: string;
  wiki: string;
  type: WikiEventType;
}

export interface WikiLogEvent extends WikiBaseEvent {
  id?: number;
  log_params: any;
  log_id: number;
  log_type: string;
  log_action: string;
  type: WikiEventType.LOG;
  log_action_comment: string;
}

export interface WikiCategorizeEvent extends WikiBaseEvent {
  id: number;
  type: WikiEventType.CATEGORIZE;
}

export interface WikiNewEvent extends WikiBaseEvent {
  id: number;
  type: WikiEventType.NEW;
  minor: boolean;
  patrolled?: boolean;
  length: {
    new: number;
  };
  revision: {
    new: number;
  };
}

export interface WikiEditEvent extends WikiBaseEvent {
  id: number;
  type: WikiEventType.EDIT;
  minor: boolean;
  patrolled?: boolean;
  length: {
    old: number;
    new: number;
  };
  revision: {
    new: number;
    old: number;
  };
}

export interface WikiExternalEvent extends WikiBaseEvent {
  id: number;
  type: WikiEventType.EXTERNAL;
  minor: boolean;
  length: {
    new: number;
  };
  revision: {
    new: number;
  };
}

type WikiEvent =
  | WikiLogEvent
  | WikiCategorizeEvent
  | WikiNewEvent
  | WikiEditEvent
  | WikiExternalEvent;

export default WikiEvent;
