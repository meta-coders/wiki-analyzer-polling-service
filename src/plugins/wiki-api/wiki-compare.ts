import axios from 'axios';
import { WikiEditEvent } from '../../interfaces/WikiEvent';

interface CompareSuccess {
  compare: {
    body: string;
  };
}

interface CompareFailure {
  error: {
    code: string;
    info: string;
    docref: string;
  };
  servedby: string;
}

type CompareDTO = CompareSuccess | CompareFailure;

export default async function wikiCompare(
  editEvent: WikiEditEvent,
): Promise<string> {
  const { revision, server_url } = editEvent;

  const { data: response } = await axios.get<CompareDTO>(
    `${server_url}/w/api.php`,
    {
      timeout: 3000,
      params: {
        action: 'compare',
        format: 'json',
        formatversion: 2,
        utf8: 1,
        prop: 'diff',
        fromrev: revision.old,
        torev: revision.new,
      },
    },
  );

  if ((response as CompareFailure).error) {
    throw new Error((response as CompareFailure).error.info);
  }

  return (response as CompareSuccess).compare.body;
}
