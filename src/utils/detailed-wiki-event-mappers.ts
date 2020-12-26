import { DetailedWikiEditEvent } from '../interfaces/DetailedWikiEvent';
import { WikiEditEvent } from '../interfaces/WikiEvent';
import wikiCompare from '../plugins/wiki-api/wiki-compare';
import wikiPageExistence from '../plugins/wiki-api/wiki-page-existence';

export const mapWikiEditEventToDetailedWikiEditEvent = async (
  editEvent: WikiEditEvent,
): Promise<DetailedWikiEditEvent> => {
  const { revision, ...props } = editEvent;
  const isExist = await wikiPageExistence(editEvent);

  const detailedEditEvent: DetailedWikiEditEvent = {
    ...props,
    revision: {
      ...revision,
      missing: !isExist,
    },
  };

  if (isExist) {
    const diff = await wikiCompare(editEvent);
    if (diff.length === 0) {
      detailedEditEvent.revision.missing = true;
    } else {
      detailedEditEvent.revision.diff = diff;
    }
  }

  return detailedEditEvent;
};
