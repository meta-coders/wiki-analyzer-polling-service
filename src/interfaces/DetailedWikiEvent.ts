import {
  WikiCategorizeEvent,
  WikiEditEvent,
  WikiExternalEvent,
  WikiLogEvent,
  WikiNewEvent,
} from './WikiEvent';

// export interface DetailedWikiNewEvent extends WikiNewEvent {
//   revision: {
//     new: number;
//     content: string;
//   };
// }

export interface DetailedWikiEditEvent extends WikiEditEvent {
  revision: {
    new: number;
    old: number;
    missing: boolean;
    diff?: string;
  };
}

// export interface DetailedWikiExternalEvent extends WikiExternalEvent {
//   revision: {
//     new: number;
//     content: string;
//   };
// }

type DetailedWikiEvent =
  | WikiLogEvent
  | WikiCategorizeEvent
  | WikiNewEvent
  | DetailedWikiEditEvent
  | WikiExternalEvent;

export default DetailedWikiEvent;
