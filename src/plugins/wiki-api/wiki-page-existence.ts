import axios from 'axios';
import { WikiEditEvent } from '../../interfaces/WikiEvent';

export default async function wikiPageExistence(
  event: WikiEditEvent,
): Promise<boolean> {
  const { server_url, revision } = event;
  const { data: response } = await axios.get(`${server_url}/w/api.php`, {
    params: {
      action: 'query',
      format: 'json',
      formatversion: 2,
      revids: revision.old + '|' + revision.new,
    },
  });

  return !(
    !!response.query.badrevids ||
    (!!response.query.pages && response.query.pages.length !== 1)
  );
}
