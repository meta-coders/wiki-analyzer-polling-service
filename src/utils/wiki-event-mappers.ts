import {
  WikiBaseEvent,
  WikiCategorizeEvent,
  WikiEditEvent,
  WikiEventType,
  WikiExternalEvent,
  WikiLogEvent,
  WikiNewEvent,
} from '../interfaces/WikiEvent';

const parseEventBasePart = (event: any): WikiBaseEvent => {
  const { meta: eventMetaInfo } = event;

  const meta = {
    uri: eventMetaInfo.uri,
    request_id: eventMetaInfo.request_id,
    id: eventMetaInfo.id,
    dt: eventMetaInfo.dt,
    domain: eventMetaInfo.domain,
    stream: eventMetaInfo.stream,
  };

  return {
    server_name: event.server_name,
    title: event.title,
    $schema: event.$schema,
    namespace: event.namespace,
    comment: event.comment,
    parsedcomment: event.parsedcomment,
    timestamp: event.timestamp,
    user: event.user,
    bot: event.bot,
    server_url: event.server_url,
    meta,
    server_script_path: event.server_script_path,
    wiki: event.wiki,
    type: event.type,
  };
};

export const mapEventToWikiLogEvent = (event: any): WikiLogEvent => {
  const base = parseEventBasePart(event);
  return {
    ...base,
    id: event.id,
    log_params: event.log_params,
    log_id: event.log_id,
    log_type: event.log_type,
    log_action: event.log_action,
    type: WikiEventType.LOG,
    log_action_comment: event.log_action_comment,
  };
};

export const mapEventToWikiCategorizeEvent = (
  event: any,
): WikiCategorizeEvent => {
  const base = parseEventBasePart(event);
  return {
    ...base,
    id: event.id,
    type: WikiEventType.CATEGORIZE,
  };
};

export const mapEventToWikiNewEvent = (event: any): WikiNewEvent => {
  const base = parseEventBasePart(event);
  const { id, length, minor, patrolled, revision } = event;

  const newEvent: WikiNewEvent = {
    ...base,
    id,
    type: WikiEventType.NEW,
    minor,
    length: {
      new: length.new,
    },
    revision: {
      new: revision.new,
    },
  };

  return patrolled !== undefined ? { ...newEvent, patrolled } : newEvent;
};

export const mapEventToWikiEditEvent = (event: any): WikiEditEvent => {
  const base = parseEventBasePart(event);
  const { id, length, minor, patrolled, revision } = event;

  const editEvent: WikiEditEvent = {
    ...base,
    id,
    type: WikiEventType.EDIT,
    minor,
    length: {
      old: length.old,
      new: length.new,
    },
    revision: {
      old: revision.old,
      new: revision.new,
    },
  };

  return patrolled !== undefined ? { ...editEvent, patrolled } : editEvent;
};

export const mapEventToWikiExternalEvent = (event: any): WikiExternalEvent => {
  const base = parseEventBasePart(event);
  const { length, revision } = event;
  return {
    ...base,
    id: event.id,
    type: WikiEventType.EXTERNAL,
    minor: event.minor,
    length: {
      new: length.new,
    },
    revision: {
      new: revision.new,
    },
  };
};
